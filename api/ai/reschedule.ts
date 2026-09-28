import { generateAIStudyPlan } from '../../server/groqService.ts';

export default async function handler(req: any, res: any) {
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
      try { body = JSON.parse(body); } catch { body = {}; }
    } else if (!body) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      body = raw ? JSON.parse(raw) : {};
    }

    const { missedTasks, upcomingExams, availableHours } = body;
    const result = await generateAIStudyPlan({
      exams: upcomingExams || [],
      subjects: [],
      topics: missedTasks || [],
      dailyHours: availableHours || 4,
      preferences: { deepWork: true, revisionSessions: true, practiceSessions: true, sessionDuration: 45 },
    });

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({
      recommendations: result.recommendations,
      rescheduledCount: (missedTasks || []).length,
      fallback: result.fallback,
    }));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown server error';
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: errMsg, fallback: true }));
  }
}
