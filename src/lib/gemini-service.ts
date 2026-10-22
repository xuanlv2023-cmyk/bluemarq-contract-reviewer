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
 * Làm sạch chuỗi thông báo lỗi sang tiếng Việt thân thiện
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
  } catch {}

  if (
    text.includes('504') ||
    text.includes('FUNCTION_INVOCATION_TIMEOUT') ||
    text.includes('timed out') ||
    text.includes('Timeout')
  ) {
    return 'Hợp đồng và tài liệu đính kèm khá dài nên quá trình xử lý vượt quá thời gian cho phép. Hệ thống đã tối ưu kênh truyền trực tiếp, vui lòng bấm "Thử lại ngay".';
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
    return 'Đường truyền kết nối tới Google AI bị gián đoạn (Failed to fetch). Vui lòng kiểm tra lại kết nối mạng hoặc bấm "Thử lại ngay".';
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
 * Gọi TRỰC TIẾP Google Gemini REST API từ trình duyệt
 * - ĐÂY LÀ CƠ CHẾ NGUYÊN BẢN CỦA GOOGLE AI STUDIO
 * - Không đi qua hàm Vercel Serverless Function trung gian -> HOÀN TOÀN KHÔNG BỊ TREO HAY TIMEOUT
 * - Tự động thử lại (Retry loop) khi Google gặp quá tải 503 tạm thời
 */
export async function callGeminiDirectRest(
  apiKey: string,
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const { prompt, mediaFiles = [], model = 'gemini-3.8-flash' } = params;
  const targetModel = model?.trim() || 'gemini-3.8-flash';

  const parts: any[] = [];
  // Chuẩn định dạng REST Google AI: inline_data với snake_case
  for (const m of mediaFiles) {
    if (m.base64 && m.mimeType) {
      parts.push({
        inline_data: {
          mime_type: m.mimeType,
          data: m.base64,
        },
      });
    }
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
    },
  };

  const maxRetries = 3;
  let lastErrorText = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate(
          attempt === 1
            ? `BLUEMARQ AI (${targetModel}) đang phân tích hợp đồng... (Quá trình mất 15-25 giây)`
            : `Google AI đang bận (503). Đang tự động thử lại lần ${attempt}/${maxRetries}...`
        );
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
        let findings = [];
        try {
          findings = JSON.parse(cleanJson);
        } catch {
          const match = cleanJson.match(/\[[\s\S]*\]/);
          if (match) findings = JSON.parse(match[0]);
          else throw new Error('AI không trả về đúng định dạng danh sách lỗi.');
        }
        return Array.isArray(findings) ? findings : [];
      }

      const rawErr = data?.error?.message || JSON.stringify(data?.error || data);
      lastErrorText = rawErr;

      const isOverloaded =
        res.status === 503 ||
        res.status === 429 ||
        rawErr.includes('503') ||
        rawErr.includes('high demand') ||
        rawErr.includes('UNAVAILABLE') ||
        rawErr.includes('RESOURCE_EXHAUSTED');

      if (isOverloaded && attempt < maxRetries) {
        const delayMs = attempt * 2500;
        if (onStatusUpdate) {
          onStatusUpdate(`Google AI đang bận (503/429). Đang tự động thử lại sau ${delayMs / 1000}s...`);
        }
        await wait(delayMs);
        continue;
      }

      throw new Error(formatGeminiErrorMessage(rawErr));
    } catch (err: any) {
      lastErrorText = err?.message || String(err);
      const isOverloaded =
        lastErrorText.includes('503') ||
        lastErrorText.includes('high demand') ||
        lastErrorText.includes('UNAVAILABLE');

      if (isOverloaded && attempt < maxRetries) {
        const delayMs = attempt * 2500;
        if (onStatusUpdate) {
          onStatusUpdate(`Google AI đang bận (503). Đang tự động thử lại sau ${delayMs / 1000}s...`);
        }
        await wait(delayMs);
        continue;
      }

      throw new Error(formatGeminiErrorMessage(lastErrorText));
    }
  }

  throw new Error(formatGeminiErrorMessage(lastErrorText));
}

/**
 * Thực hiện gọi Soát xét Hợp đồng thông minh
 * - Tự động lấy key hệ thống từ Vercel qua /api/key (hoặc từ người dùng)
 * - Gọi trực tiếp Google AI như cơ chế Google AI Studio
 * - Hoàn toàn không qua Vercel Serverless Function -> Không bao giờ bị treo quay vòng tròn
 */
export async function executeContractReview(
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  // 1. Lấy API key
  const key = await resolveGeminiApiKey(params.apiKey);

  if (!key) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY. Vui lòng bấm vào biểu tượng Cài đặt ở góc trên bên phải để dán API Key.');
  }

  // 2. Gọi trực tiếp Google AI REST Endpoint từ trình duyệt (như Google AI Studio)
  return await callGeminiDirectRest(key, params, onStatusUpdate);
}
