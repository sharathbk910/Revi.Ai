export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  return res.end(JSON.stringify({
    status: 'online',
    service: 'Revisionly AI Backend',
    groqConfigured: !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_'),
    timestamp: new Date().toISOString(),
  }));
}
