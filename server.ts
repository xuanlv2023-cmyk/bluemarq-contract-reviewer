import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Tăng limit để nhận file PDF/DOCX chuyển đổi sang base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint cho Render / Railway / Cloud Run
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'BLUEMARQ Contract Reviewer API',
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint cung cấp API key cấu hình hệ thống cho Client SDK
  app.get('/api/key', (req, res) => {
    const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2;
    if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
      return res.status(404).json({ error: 'Chưa cấu hình GEMINI_API_KEY (hoặc GEMINI_API_KEY_1).' });
    }
    return res.json({ key: key.trim() });
  });

  /**
   * Endpoint Soát xét Hợp đồng chuyên sâu
   */
  app.post('/api/review', async (req, res) => {
    try {
      const {
        prompt,
        mediaFiles,
        apiKey,
        model = 'gemini-3.8-flash'
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Thiếu nội dung yêu cầu soát xét (Prompt).' });
      }

      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng nhập API Key trong phần Cài đặt hoặc cấu hình biến môi trường trên server.'
        });
      }

      const ai = new GoogleGenAI({ apiKey: key });

      // Chuẩn bị nội dung gửi lên Gemini (Hỗ trợ Multimodal: PDF, Ảnh, Text)
      const contentsParts: any[] = [];

      // Đính kèm các file PDF / Ảnh scan nếu có
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

      // Đính kèm prompt phân tích chi tiết
      contentsParts.push({ text: prompt });

      // Model chuẩn duy nhất: Gemini 3.8 Flash
      const targetModel = (model && model.trim()) || 'gemini-3.8-flash';

      // Tự động thử lại khi gặp 503/429
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
            console.warn(`[server.ts] Google 503/429 (lần ${attempt}/${maxRetries}), chờ ${delayMs}ms để tự động thử lại...`);
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }
          throw err;
        }
      }

      const responseText = response?.text || '[]';

      if (!responseText || responseText === '[]') {
        if (lastGenError) throw lastGenError;
        throw new Error('Không thể kết nối tới các model AI của Google.');
      }

      // Làm sạch và parse JSON
      const cleanJson = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      let findings = [];
      try {
        findings = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.error('Lỗi parse JSON từ Gemini:', responseText);
        // Cố gắng tìm mảng [...] trong chuỗi
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          findings = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error('AI không trả về đúng định dạng JSON danh sách lỗi.');
        }
      }

      res.json({
        success: true,
        totalFindings: findings.length,
        findings: findings
      });

    } catch (error: any) {
      console.error('Lỗi trong /api/review:', error);
      let errMsg = error.message || 'Lỗi xử lý AI Soát xét Hợp đồng.';

      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        errMsg = 'API Key của bạn đã chạm hạn mức sử dụng (Lỗi 429 - Quota Exceeded). Vui lòng đợi 1 phút hoặc đổi sang API Key khác.';
      } else if (errMsg.includes('403') || errMsg.includes('API_KEY_INVALID')) {
        errMsg = 'Khóa API Gemini không hợp lệ hoặc thiếu quyền hạn (Lỗi 403). Vui lòng kiểm tra lại.';
      } else if (errMsg.includes('503') || errMsg.includes('overloaded')) {
        errMsg = 'Hệ thống máy chủ Gemini của Google đang tạm thời quá tải (Lỗi 503). Vui lòng thử lại sau vài giây.';
      }

      res.status(500).json({ error: errMsg });
    }
  });

  // Tương thích ngược với /api/gemini
  app.post('/api/gemini', async (req, res) => {
    try {
      const { prompt, apiKey, model = 'gemini-3.8-flash' } = req.body;
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(400).json({ error: 'Vui lòng cung cấp Gemini API Key' });
      }

      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt
      });

      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Lỗi gọi Gemini API' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BLUEMARQ] Contract Reviewer Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
