import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAIStudyPlan, queryAIAssistant, AIPlanRequest, AIAssistantRequest } from './groqService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Revisionly AI Backend',
    groqConfigured: !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_'),
    timestamp: new Date().toISOString(),
  });
});

// POST /api/ai/study-plan
app.post('/api/ai/study-plan', async (req: Request, res: Response) => {
  try {
    const planRequest = req.body as AIPlanRequest;
    const result = await generateAIStudyPlan(planRequest);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    res.status(500).json({ error: errorMsg, fallback: true });
  }
});

// POST /api/ai/assistant
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const assistantRequest = req.body as AIAssistantRequest;
    const result = await queryAIAssistant(assistantRequest);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    res.status(500).json({ error: errorMsg, fallback: true });
  }
});

// POST /api/ai/reschedule
app.post('/api/ai/reschedule', async (req: Request, res: Response) => {
  try {
    const { missedTasks, upcomingExams, availableHours } = req.body;
    const result = await generateAIStudyPlan({
      exams: upcomingExams || [],
      subjects: [],
      topics: missedTasks || [],
      dailyHours: availableHours || 4,
      preferences: { deepWork: true, revisionSessions: true, practiceSessions: true, sessionDuration: 45 },
    });
    res.json({
      recommendations: result.recommendations,
      rescheduledCount: (missedTasks || []).length,
      fallback: result.fallback,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    res.status(500).json({ error: errorMsg, fallback: true });
  }
});

// POST /api/ai/recommendations
app.post('/api/ai/recommendations', async (req: Request, res: Response) => {
  try {
    const planRequest = req.body as AIPlanRequest;
    const result = await generateAIStudyPlan(planRequest);
    res.json({ recommendations: result.recommendations, priority_topics: result.priority_topics });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    res.status(500).json({ error: errorMsg, fallback: true });
  }
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Revisionly Server] Secure AI API running on http://127.0.0.1:${PORT}`);
  });
}
