import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, mediaFiles, apiKey, model = 'gemini-3.8-flash' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu soát xét (Prompt).' });
    }

    const key = (apiKey && apiKey.trim().length > 10) 
      ? apiKey.trim() 
      : (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GOOGLE_API_KEY);
    if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY (hoặc GEMINI_API_KEY_1) trong Vercel Environment Variables. Vui lòng thêm biến môi trường trên Vercel hoặc dán API Key cá nhân.'
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // Chuẩn bị payload nội dung gửi sang Gemini
    const contentsParts: any[] = [];

    if (Array.isArray(mediaFiles) && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        if (file.base64 && file.mimeType) {
          contentsParts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.base64
            }
          });
        }
      }
    }

    contentsParts.push({ text: prompt });

    // Model chuẩn: Gemini 3.8 Flash
    const targetModel = (model && model.trim()) || 'gemini-3.8-flash';

    // Cơ chế tự động thử lại khi Google AI gặp tình trạng quá tải tạm thời (503 / 429)
    const maxRetries = 3;
    let response: any = null;
    let lastGenError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
          }
        });
        if (response?.text) {
          break;
        }
      } catch (err: any) {
        lastGenError = err;
        const errMsg = String(err?.message || err || '');
        const isOverload =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isOverload && attempt < maxRetries) {
          const delayMs = attempt * 2500;
          console.warn(`[api/review] Google 503/429 (lần ${attempt}/${maxRetries}), chờ ${delayMs}ms để tự động thử lại...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }

    const responseText = response?.text || '[]';

    if (!responseText || responseText === '[]') {
      if (lastGenError) throw lastGenError;
      throw new Error('Không nhận được nội dung phân tích từ model Google Gemini.');
    }

    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let findings = [];
    try {
      findings = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\[[\s\S]*\]/);
      if (match) findings = JSON.parse(match[0]);
      else throw new Error('AI không trả về đúng định dạng danh sách lỗi.');
    }

    res.json({
      success: true,
      totalFindings: findings.length,
      findings
    });

  } catch (error: any) {
    console.error('Lỗi trong api/review:', error);
    let errMsg = error?.message || 'Lỗi xử lý AI Soát xét Hợp đồng.';

    // Thử bóc tách JSON lỗi từ Google SDK
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch {}

    if (
      errMsg.includes('503') ||
      errMsg.includes('high demand') ||
      errMsg.includes('UNAVAILABLE')
    ) {
      errMsg = 'Mô hình Gemini 3.8 Flash của Google đang có lượng truy cập tăng đột biến tạm thời (Lỗi 503 - Spikes in demand). Hệ thống đã tự động thử lại nhiều lần nhưng máy chủ Google vẫn đang bận. Bạn vui lòng bấm nút "Thử lại ngay" sau vài giây.';
    } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      errMsg = 'Hạn mức API Google Gemini tạm thời hết lượt (Lỗi 429). Vui lòng đợi khoảng 30 giây rồi bấm thử lại.';
    }

    res.status(500).json({ error: errMsg });
  }
}
