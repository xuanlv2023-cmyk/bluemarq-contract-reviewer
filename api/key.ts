export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
    return res.status(404).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel.' });
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.json({ key: key.trim() });
}
