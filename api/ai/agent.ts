import { runAgent } from '../../server/agentService.ts';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      // If Vercel didn't parse the body automatically, read raw stream
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      body = raw ? JSON.parse(raw) : {};
    }

    const result = await runAgent(body || {});
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify(result));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[Vercel Agent API Error]', errMsg);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({
      message: `### 🎯 Revisionly AI\n\nI am currently operating in resilient offline mode.\n\n* Ask: *"What should I study right now?"*\n* Ask: *"How much of my syllabus is complete?"*\n* Or ask about any upcoming exam dates!`,
      fallback: true,
    }));
  }
}
