export interface MediaFilePayload {
  mimeType: string;
  base64: string;
  label?: string;
}

export interface ReviewRequestParams {
  prompt: string;
  mediaFiles?: MediaFilePayload[];
  apiKey?: string;
  engine?: 'auto' | 'gemini' | 'chatgpt' | 'claude';
  model?: string;
}

export const AVAILABLE_ENGINES = [
  { id: 'auto', name: '⚡ Tự Động Thông Minh (Tự xoay Nền tảng & Key)', desc: 'Tự động thử Gemini ➔ ChatGPT ➔ Claude, tự xoay key dự phòng' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Xoay key tự động, xử lý văn bản dài & PDF scan' },
  { id: 'chatgpt', name: 'OpenAI ChatGPT', desc: 'Xử lý logic điều khoản và cấu trúc pháp lý' },
  { id: 'claude', name: 'Anthropic Claude', desc: 'Chuyên sâu văn phong pháp chế doanh nghiệp' },
];

export const AVAILABLE_MODELS = AVAILABLE_ENGINES;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJsonArray(rawText: string): any[] {
  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsedMatch = JSON.parse(match[0]);
        return Array.isArray(parsedMatch) ? parsedMatch : [];
      } catch {}
    }
  }
  throw new Error('AI không trả về đúng định dạng danh sách lỗi JSON.');
}

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

  if (text.includes('503') || text.includes('high demand') || text.includes('UNAVAILABLE')) {
    return 'Cụm máy chủ AI đang bận tạm thời do quá tải cục bộ. Hệ thống đã tự động xoay key và thử lại. Vui lòng bấm "Thử lại ngay" sau vài giây.';
  }

  if (text.includes('429') || text.includes('RESOURCE_EXHAUSTED') || text.includes('insufficient_quota')) {
    return 'Hạn ngạch API Key hiện tại tạm thời hết lượt (Lỗi 429). Hệ thống đang kích hoạt key dự phòng hoặc vui lòng đợi 30 giây.';
  }

  if (text.includes('Failed to fetch') || text.includes('NetworkError')) {
    return 'Đường truyền kết nối tới AI bị gián đoạn. Vui lòng kiểm tra lại kết nối mạng hoặc bấm "Thử lại ngay".';
  }

  return text;
}

/**
 * Lấy danh sách API Keys dạng mảng để xoay vòng (hỗ trợ nhiều key cách nhau bởi dấu phẩy)
 */
export async function resolveApiKeys(engine: 'auto' | 'gemini' | 'chatgpt' | 'claude' = 'gemini', customKey?: string): Promise<string[]> {
  const keys: string[] = [];

  const addKeysFromString = (str?: string | null) => {
    if (!str) return;
    str.split(',').forEach(k => {
      const clean = k.trim();
      if (clean.length > 8 && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  };

  // 1. Key từ tham số truyền vào
  addKeysFromString(customKey);

  // 2. Key từ LocalStorage
  const storageKeyName = engine === 'chatgpt' ? 'bmq_openai_api_key' : engine === 'claude' ? 'bmq_claude_api_key' : 'bmq_gemini_api_key';
  addKeysFromString(localStorage.getItem(storageKeyName));

  // 3. Key từ Env Client (nếu có)
  const envKey = engine === 'chatgpt' 
    ? (import.meta as any).env?.VITE_OPENAI_API_KEY
    : engine === 'claude'
      ? (import.meta as any).env?.VITE_ANTHROPIC_API_KEY
      : (import.meta as any).env?.VITE_GEMINI_API_KEY;
  addKeysFromString(envKey);

  // 4. Lấy key từ Vercel serverless /api/key (hỗ trợ nhiều key trên Vercel)
  try {
    const res = await fetch('/api/key');
    if (res.ok) {
      const data = await res.json();
      if (engine === 'chatgpt') addKeysFromString(data?.openaiKey);
      else if (engine === 'claude') addKeysFromString(data?.claudeKey);
      else {
        addKeysFromString(data?.geminiKey);
        addKeysFromString(data?.key);
      }
    }
  } catch (e) {
    console.warn('Không thể nạp key từ /api/key:', e);
  }

  return keys;
}

/**
 * Gọi Google Gemini với cơ chế TỰ ĐỘNG XOAY KEY và TỰ ĐỘNG FALLBACK MODEL
 */
async function callGeminiWithRotation(
  keys: string[],
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const { prompt, mediaFiles = [] } = params;

  // Model chuẩn duy nhất theo chỉ định: Gemini 3.8 Flash
  const GEMINI_MODELS = ['gemini-3.8-flash'];

  const parts: any[] = [];
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

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
    },
  };

  let lastError = '';

  for (let mIdx = 0; mIdx < GEMINI_MODELS.length; mIdx++) {
    const currentModel = GEMINI_MODELS[mIdx];

    for (let kIdx = 0; kIdx < keys.length; kIdx++) {
      const currentKey = keys[kIdx];
      const keyLabel = keys.length > 1 ? ` (Key ${kIdx + 1}/${keys.length})` : '';

      try {
        if (onStatusUpdate) {
          onStatusUpdate(`Đang kết nối Google Gemini tự động${keyLabel}...`);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (res.ok) {
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
          return cleanJsonArray(candidateText);
        }

        const rawErr = data?.error?.message || JSON.stringify(data?.error || data);
        lastError = rawErr;

        // Nếu model không tồn tại (404), chuyển ngay lập tức sang model tiếp theo trong 0.1 giây (không xoay key vô ích)
        if (res.status === 404 || rawErr.includes('not found') || rawErr.includes('not supported')) {
          break; // Thoát vòng lặp key để thử ngay model tiếp theo
        }

        // Nếu lỗi 503 (quá tải) hoặc 429 (hết quota), tự động xoay sang key kế tiếp ngay lập tức
        if (res.status === 503 || res.status === 429 || rawErr.includes('503') || rawErr.includes('429') || rawErr.includes('demand')) {
          if (kIdx < keys.length - 1) {
            if (onStatusUpdate) onStatusUpdate(`Key ${kIdx + 1} bận/hết lượt. Đang tự động xoay sang Key ${kIdx + 2}...`);
            await wait(300);
            continue; // Thử key tiếp theo
          }
        } else {
          throw new Error(formatGeminiErrorMessage(rawErr));
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (kIdx < keys.length - 1) {
          await wait(300);
          continue;
        }
      }
    }

    // Nếu model này bị lỗi và còn model dự phòng khác, chuyển ngay
    if (mIdx < GEMINI_MODELS.length - 1) {
      if (onStatusUpdate) onStatusUpdate(`Đang chuyển sang luồng AI tốc độ cao...`);
      await wait(200);
    }
  }

  throw new Error(formatGeminiErrorMessage(lastError));
}

/**
 * Gọi OpenAI ChatGPT (Tự động GPT-4o / GPT-4o-mini)
 */
async function callChatGptWithRotation(
  keys: string[],
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const { prompt } = params;
  let lastError = '';

  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const key = keys[kIdx];
    try {
      if (onStatusUpdate) {
        onStatusUpdate(`Đang kết nối OpenAI ChatGPT (Tự động)...`);
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia rà soát hợp đồng của BLUEMARQ GROUP. Luôn trả về duy nhất 1 JSON array hợp lệ tuân thủ đúng yêu cầu prompt.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const text = data?.choices?.[0]?.message?.content || '[]';
        // OpenAI json_object có thể trả về { "findings": [...] } hoặc [...]
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && Array.isArray(parsed.findings)) return parsed.findings;
        } catch {}
        return cleanJsonArray(text);
      }

      lastError = data?.error?.message || JSON.stringify(data);
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  throw new Error(`Lỗi gọi ChatGPT: ${lastError || 'Không thể kết nối tới OpenAI.'}`);
}

/**
 * Gọi Anthropic Claude (Tự động Claude 3.5 Sonnet)
 */
async function callClaudeWithRotation(
  keys: string[],
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const { prompt } = params;
  let lastError = '';

  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const key = keys[kIdx];
    try {
      if (onStatusUpdate) {
        onStatusUpdate(`Đang kết nối Anthropic Claude (Tự động)...`);
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const text = data?.content?.[0]?.text || '[]';
        return cleanJsonArray(text);
      }

      lastError = data?.error?.message || JSON.stringify(data);
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  throw new Error(`Lỗi gọi Claude: ${lastError || 'Không thể kết nối tới Anthropic.'}`);
}

/**
 * Thực hiện gọi Soát xét Hợp đồng thông minh
 * - Tự động nhận diện Động cơ AI (Gemini, ChatGPT, Claude)
 * - Tự động xoay API Key khi hết hạn ngạch hoặc bận 503
 */
export async function executeContractReview(
  params: ReviewRequestParams,
  onStatusUpdate?: (status: string) => void
): Promise<any[]> {
  const engine = params.engine || 'auto';

  // CHẾ ĐỘ TỰ ĐỘNG THÔNG MINH: TỰ XOAY NỀN TẢNG (GEMINI -> CHATGPT -> CLAUDE) VÀ TỰ XOAY KEY
  if (engine === 'auto') {
    const geminiKeys = await resolveApiKeys('gemini', params.apiKey);
    const openaiKeys = await resolveApiKeys('chatgpt');
    const claudeKeys = await resolveApiKeys('claude');

    const failReasons: string[] = [];

    // ƯU TIÊN 1: Google Gemini (tốt nhất cho văn bản dài & PDF scan, tự động xoay key)
    if (geminiKeys.length > 0) {
      try {
        if (onStatusUpdate) onStatusUpdate('Đang chạy chế độ Tự Động Thông Minh qua Google Gemini...');
        return await callGeminiWithRotation(geminiKeys, params, onStatusUpdate);
      } catch (err: any) {
        failReasons.push(`Gemini: ${err?.message || err}`);
        if (onStatusUpdate) onStatusUpdate('Gemini tạm bận. Đang tự động chuyển tiếp nền tảng sang OpenAI ChatGPT...');
      }
    }

    // ƯU TIÊN 2: OpenAI ChatGPT
    if (openaiKeys.length > 0) {
      try {
        if (onStatusUpdate) onStatusUpdate('Đang tự động chuyển tiếp qua OpenAI ChatGPT...');
        return await callChatGptWithRotation(openaiKeys, params, onStatusUpdate);
      } catch (err: any) {
        failReasons.push(`ChatGPT: ${err?.message || err}`);
        if (onStatusUpdate) onStatusUpdate('ChatGPT bận. Đang tự động chuyển tiếp sang Anthropic Claude...');
      }
    }

    // ƯU TIÊN 3: Anthropic Claude
    if (claudeKeys.length > 0) {
      try {
        if (onStatusUpdate) onStatusUpdate('Đang tự động chuyển tiếp qua Anthropic Claude...');
        return await callClaudeWithRotation(claudeKeys, params, onStatusUpdate);
      } catch (err: any) {
        failReasons.push(`Claude: ${err?.message || err}`);
      }
    }

    if (geminiKeys.length === 0 && openaiKeys.length === 0 && claudeKeys.length === 0) {
      throw new Error('Chưa tìm thấy API Key nào trên Vercel hoặc Cài đặt. Vui lòng cấu hình GEMINI_API_KEY (hoặc OPENAI_API_KEY / ANTHROPIC_API_KEY).');
    }

    throw new Error(`Tất cả các nền tảng AI đều bận hoặc gặp sự cố:\n• ${failReasons.join('\n• ')}`);
  }

  // NẾU NGƯỜI DÙNG CHỈ ĐỊNH CỤ THỂ NỀN TẢNG:
  const keys = await resolveApiKeys(engine, params.apiKey);

  if (keys.length === 0) {
    const engineName = engine === 'chatgpt' ? 'OpenAI ChatGPT' : engine === 'claude' ? 'Anthropic Claude' : 'Google Gemini';
    throw new Error(`Chưa cấu hình API Key cho ${engineName}. Vui lòng bấm vào biểu tượng Cài đặt ở góc trên bên phải để dán Key hoặc cấu hình trên Vercel.`);
  }

  if (engine === 'chatgpt') {
    return await callChatGptWithRotation(keys, params, onStatusUpdate);
  }

  if (engine === 'claude') {
    return await callClaudeWithRotation(keys, params, onStatusUpdate);
  }

  // Google Gemini với cơ chế Tự động xoay Key & Fallback Model
  return await callGeminiWithRotation(keys, params, onStatusUpdate);
}
