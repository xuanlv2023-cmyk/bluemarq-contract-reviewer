export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const geminiKeys = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const openaiKeys = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim();
  const claudeKeys = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim();

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ 
    geminiKey: geminiKeys,
    openaiKey: openaiKeys,
    claudeKey: claudeKeys,
    // Tương thích ngược
    key: geminiKeys.split(',')[0]?.trim() || '',
  });
}
