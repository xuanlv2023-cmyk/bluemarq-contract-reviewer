export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Tự động gom TẤT CẢ các biến môi trường Gemini (GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2,...)
  const geminiKeyList: string[] = [];

  const directGeminiVars = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GOOGLE_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.GEMINI_KEY,
  ];

  directGeminiVars.forEach(v => {
    if (v && v.trim().length > 8) {
      v.split(',').forEach(k => {
        const clean = k.trim();
        if (clean.length > 8 && !geminiKeyList.includes(clean)) {
          geminiKeyList.push(clean);
        }
      });
    }
  });

  // Quét toàn diện Object.keys(process.env) cho bất kỳ biến nào bắt đầu bằng GEMINI_API_KEY
  Object.keys(process.env).forEach(envName => {
    const upper = envName.toUpperCase();
    if (upper.startsWith('GEMINI_API_KEY') || upper.startsWith('GOOGLE_API_KEY')) {
      const val = process.env[envName]?.trim();
      if (val && val.length > 8) {
        val.split(',').forEach(k => {
          const clean = k.trim();
          if (clean.length > 8 && !geminiKeyList.includes(clean)) {
            geminiKeyList.push(clean);
          }
        });
      }
    }
  });

  // 2. OpenAI / ChatGPT Keys (tự động nhận OPENAI_API_KEY, OPENAI_API_KEY_1, CHATGPT_API_KEY,...)
  const openaiKeyList: string[] = [];
  Object.keys(process.env).forEach(envName => {
    const upper = envName.toUpperCase();
    if (upper.startsWith('OPENAI_API_KEY') || upper.startsWith('CHATGPT_API_KEY') || upper === 'OPENAI_KEY') {
      const val = process.env[envName]?.trim();
      if (val && val.length > 8) {
        val.split(',').forEach(k => {
          const clean = k.trim();
          if (clean.length > 8 && !openaiKeyList.includes(clean)) openaiKeyList.push(clean);
        });
      }
    }
  });

  // 3. Anthropic / Claude Keys (tự động nhận CLAUDE_API_KEY, ANTHROPIC_API_KEY, CLAUDE_API_KEY_1,...)
  const claudeKeyList: string[] = [];
  Object.keys(process.env).forEach(envName => {
    const upper = envName.toUpperCase();
    if (upper.startsWith('ANTHROPIC_API_KEY') || upper.startsWith('CLAUDE_API_KEY') || upper === 'CLAUDE_KEY') {
      const val = process.env[envName]?.trim();
      if (val && val.length > 8) {
        val.split(',').forEach(k => {
          const clean = k.trim();
          if (clean.length > 8 && !claudeKeyList.includes(clean)) claudeKeyList.push(clean);
        });
      }
    }
  });

  const geminiCombined = geminiKeyList.join(',');
  const openaiCombined = openaiKeyList.join(',');
  const claudeCombined = claudeKeyList.join(',');

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.json({ 
    geminiKey: geminiCombined,
    openaiKey: openaiCombined,
    claudeKey: claudeCombined,
    // Tương thích ngược với client cũ
    key: geminiKeyList[0] || '',
    totalGeminiKeysFound: geminiKeyList.length,
  });
}
