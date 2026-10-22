import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, mediaFiles, model = 'gemini-3.8-flash' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu soát xét (Prompt).' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trong Vercel Environment Variables. Vui lòng thêm biến môi trường trên Vercel.'
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

    // Chuỗi thử model: Ưu tiên Gemini 3.8 Flash -> Gemini 2.0 Flash -> Gemini 1.5 Pro -> Gemini 1.5 Flash
    const candidateModels = [
      model,
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
    // Lọc trùng
    const modelsToTry = Array.from(new Set(candidateModels));

    let responseText = '';
    let lastError: any = null;

    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
          }
        });
        responseText = response.text || '[]';
        if (responseText) break;
      } catch (err: any) {
        console.warn(`Model ${m} thất bại: ${err?.message}. Thử model tiếp theo...`);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không thể kết nối tới các model AI của Google.');
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
    res.status(500).json({ error: error.message || 'Lỗi xử lý AI Soát xét Hợp đồng.' });
  }
}
