import { GoogleGenAI } from '@google/genai';

export interface MediaFilePayload {
  mimeType: string;
  base64: string;
  label?: string;
}

export interface ReviewRequestParams {
  prompt: string;
  mediaFiles?: MediaFilePayload[];
  apiKey?: string;
  model?: string;
}

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Mới nhất - Enterprise)', context: '1M tokens' },
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Làm sạch chuỗi thông báo lỗi (bóc tách JSON hoặc mã lỗi Google sang tiếng Việt thân thiện)
 */
export function formatGeminiErrorMessage(rawMsg: any): string {
  if (!rawMsg) return 'Đã xảy ra lỗi không xác định.';
  let text = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) {
      text = parsed.error.message;
    } else if (parsed?.error && typeof parsed.error === 'string') {
      text = parsed.error;
    }
  } catch { }

  if (
    text.includes('504') ||
    text.includes('FUNCTION_INVOCATION_TIMEOUT') ||
    text.includes('timed out') ||
    text.includes('Timeout')
  ) {
    return 'Hợp đồng và tài liệu đính kèm khá dài nên quá trình phân tích cần thêm thời gian. Hệ thống đã tối ưu kênh truyền trực tiếp, vui lòng bấm nút "Thử lại ngay" bên dưới.';
  }

  if (
    text.includes('503') ||
    text.includes('high demand') ||
    text.includes('UNAVAILABLE') ||
    text.includes('temporarily unavailable')
  ) {
    return 'Cụm máy chủ Google AI (Gemini 3.8 Flash) đang có lượng truy cập tăng đột biến tạm thời (Lỗi 503 - Spikes in demand). Hệ thống đã tự động thử lại nhưng máy chủ Google vẫn đang bận. Vui lòng bấm "Thử lại ngay" sau vài giây.';
  }

  if (text.includes('429') || text.includes('RESOURCE_EXHAUSTED')) {
    return 'Hạn mức gọi API Google Gemini tạm thời hết lượt (Lỗi 429). Vui lòng đợi khoảng 30 giây rồi thử lại.';
  }

  if (text.includes('Failed to fetch') || text.includes('NetworkError') || text.includes('Load failed')) {
    return 'Đường truyền kết nối tới máy chủ AI bị gián đoạn (Failed to fetch). Vui lòng kiểm tra lại kết nối mạng hoặc bấm "Thử lại ngay".';
  }

  return text;
}

/**
 * Lấy API Key khả dụng (Ưu tiên: Key người dùng nhập -> localStorage -> VITE_GEMINI_API_KEY -> Endpoint /api/key)
 */
export async function resolveGeminiApiKey(customKey?: string): Promise<string> {
  if (customKey && customKey.trim().length > 10) {
    return customKey.trim();
  }

  const storedKey = localStorage.getItem('bmq_gemini_api_key');
  if (storedKey && storedKey.trim().length > 10) {
    return storedKey.trim();
  }

  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey.trim().length > 10) {
    return viteKey.trim();
  }

  try {
    const res = await fetch('/api/key');
    if (res.ok) {
      const data = await res.json();
      if (data?.key && data.key.trim().length > 10) {
        return data.key.trim();
      }
    }
  } catch (e) {
    console.warn('Không thể lấy key từ /api/key:', e);
  }

  return '';
}

/**
 * Gọi Google Gemini trực tiếp từ trình duyệt qua SDK chính thức @google/genai
 * - Bỏ qua hoàn toàn giới hạn 10s của Vercel Serverless (Không còn lỗi FUNCTION_INVOCATION_TIMEOUT 504)
 * - Tự động thử lại (Retry loop) khi Google gặp quá tải 503 tạm thời
 */
export async function callGeminiClientSdk(
  apiKey: string,
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const { prompt, mediaFiles = [], model = 'gemini-3.8-flash' } = params;
  const targetModel = model?.trim() || 'gemini-3.8-flash';

  const ai = new GoogleGenAI({ apiKey });

  const contentsParts: any[] = [];
  for (const m of mediaFiles) {
    if (m.base64 && m.mimeType) {
      contentsParts.push({
        inlineData: {
          mimeType: m.mimeType,
          data: m.base64,
        },
      });
    }
  }
  contentsParts.push({ text: prompt });

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate(
          attempt === 1
            ? `BLUEMARQ AI Engine (${targetModel}) đang rà soát hợp đồng... (Thời gian ước tính 15 - 30 giây)`
            : `Google AI đang bận (503). Tự động thử lại lần ${attempt}/${maxRetries}...`
        );
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: contentsParts,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text || '[]';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      let findings = [];
      try {
        findings = JSON.parse(cleanJson);
      } catch {
        const match = cleanJson.match(/\[[\s\S]*\]/);
        if (match) findings = JSON.parse(match[0]);
        else throw new Error('AI không trả về đúng định dạng danh sách lỗi.');
      }

      return Array.isArray(findings) ? findings : [];
    } catch (err: any) {
      lastError = err;
      const rawErr = String(err?.message || err || '');
      const isOverload =
        rawErr.includes('503') ||
        rawErr.includes('high demand') ||
        rawErr.includes('UNAVAILABLE') ||
        rawErr.includes('429');

      if (isOverload && attempt < maxRetries) {
        const delayMs = attempt * 2500;
        if (onStatusUpdate) {
          onStatusUpdate(`Máy chủ Google AI đang bận (503). Chờ ${delayMs / 1000}s để tự động thử lại...`);
        }
        await wait(delayMs);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Gọi máy chủ backend /api/review (Vercel/Render)
 */
export async function callBackendReview(
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const maxRetries = 2;
  let lastErrorText = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate(`Đang kết nối qua máy chủ xử lý (${params.model || 'gemini-3.8-flash'})...`);
      }

      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 504 || rawText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
          throw new Error('504: FUNCTION_INVOCATION_TIMEOUT');
        }
        throw new Error(`Lỗi phản hồi máy chủ (${res.status}): ${rawText.slice(0, 120)}`);
      }

      if (res.ok) {
        return data.findings || [];
      }

      const err = data?.error || `Lỗi máy chủ (${res.status})`;
      lastErrorText = typeof err === 'string' ? err : JSON.stringify(err);
      throw new Error(formatGeminiErrorMessage(lastErrorText));
    } catch (err: any) {
      lastErrorText = err?.message || String(err);
      if (lastErrorText.includes('504') || lastErrorText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
        throw new Error(formatGeminiErrorMessage(lastErrorText));
      }
      if (attempt === maxRetries) {
        throw new Error(formatGeminiErrorMessage(lastErrorText));
      }
      await wait(2000);
    }
  }

  throw new Error(formatGeminiErrorMessage(lastErrorText));
}

/**
 * Thực hiện gọi Soát xét Hợp đồng thông minh
 * 1. Tự động lấy API key (từ cấu hình Vercel qua /api/key hoặc từ cài đặt người dùng)
 * 2. Gọi trực tiếp bằng SDK chính thức @google/genai -> Không bị giới hạn Timeout 10s của Vercel
 * 3. Nếu không có key hoặc xảy ra lỗi môi trường, tự động chuyển hướng qua /api/review
 */
export async function executeContractReview(
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  // 1. Phân giải API Key
  const key = await resolveGeminiApiKey(params.apiKey);

  // 2. Chạy qua Client SDK nếu có key (Giải pháp tối ưu nhất cho tài liệu dài)
  if (key) {
    try {
      return await callGeminiClientSdk(key, params, onStatusUpdate);
    } catch (sdkErr: any) {
      console.warn('Gọi qua client SDK gặp lỗi, chuyển sang thử kênh máy chủ...', sdkErr);
      const errMsg = String(sdkErr?.message || sdkErr || '');
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        throw new Error(formatGeminiErrorMessage(errMsg));
      }
      // Tiếp tục fallback sang backend nếu lỗi khác
    }
  }

  // 3. Fallback sang /api/review máy chủ
  return await callBackendReview(params, onStatusUpdate);
}
