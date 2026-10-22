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

/**
 * Gọi trực tiếp Google Gemini REST API từ trình duyệt với model gemini-3.8-flash
 */
export async function callGeminiDirectRest(params: ReviewRequestParams): Promise<any[]> {
  const { prompt, mediaFiles = [], apiKey, model = 'gemini-3.8-flash' } = params;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Chưa cung cấp API Key.');
  }

  const targetModel = model?.trim() || 'gemini-3.8-flash';

  const parts: any[] = [];
  for (const m of mediaFiles) {
    if (m.base64 && m.mimeType) {
      parts.push({
        inlineData: {
          mimeType: m.mimeType,
          data: m.base64,
        },
      });
    }
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Lỗi từ Google API (${res.status}): ${JSON.stringify(data?.error || data)}`);
  }

  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Thực hiện gọi Soát xét Hợp đồng thông minh
 * - Tự động gọi /api/review trên Vercel/Render (đã cài sẵn System Key, Lãnh đạo/Người dùng không cần nhập mã gì)
 * - Nếu người dùng có dán API Key cá nhân thì hỗ trợ gọi trực tiếp
 */
export async function executeContractReview(params: ReviewRequestParams): Promise<any[]> {
  const { apiKey } = params;

  // Nếu có API key cá nhân và dài > 10 ký tự, ưu tiên gọi thẳng Google
  if (apiKey && apiKey.trim().length > 10) {
    try {
      return await callGeminiDirectRest(params);
    } catch (e) {
      console.warn('Gọi trực tiếp thất bại, chuyển sang gọi máy chủ backend...', e);
    }
  }

  // Mặc định gọi /api/review trên Vercel/Render (dùng Server Key cấu hình 1 lần duy nhất)
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
    if (rawText.includes('The page could not be found') || res.status === 404) {
      throw new Error('Đang cập nhật phiên bản mới trên Vercel. Hãy đảm bảo bạn đã bấm "Push origin" trên GitHub Desktop để Vercel cập nhật API.');
    }
    throw new Error(`Lỗi phản hồi máy chủ (${res.status}): ${rawText.slice(0, 120)}`);
  }

  if (res.ok) {
    return data.findings || [];
  }

  throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
}
