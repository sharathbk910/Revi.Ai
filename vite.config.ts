import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';

dotenv.config();

function agentApiPlugin(): Plugin {
  return {
    name: 'agent-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai')) {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/json');

        const rawUrl = req.url || '';
        const urlPath = rawUrl.split('?')[0].replace(/\/$/, '') || '';

        // Collect raw body
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

        req.on('end', async () => {
          try {
            const rawBuf = Buffer.concat(chunks);
            const bodyStr = rawBuf.toString('utf-8');
            const body = bodyStr ? JSON.parse(bodyStr) : {};

            // ── Agent endpoint ──────────────────────────────────────
            if (urlPath === '/api/ai/agent') {
              const { runAgent } = await import('./server/agentService.ts');
              const result = await runAgent(body);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            // ── Study plan & recommendations ─────────────────────────
            if (urlPath === '/api/ai/study-plan' || urlPath === '/api/ai/recommendations') {
              const { generateAIStudyPlan } = await import('./server/groqService.ts');
              const result = await generateAIStudyPlan(body);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            // ── Assistant endpoint ───────────────────────────────────
            if (urlPath === '/api/ai/assistant') {
              const { queryAIAssistant } = await import('./server/groqService.ts');
              const result = await queryAIAssistant(body);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            // ── Reschedule endpoint ──────────────────────────────────
            if (urlPath === '/api/ai/reschedule') {
              const { generateAIStudyPlan } = await import('./server/groqService.ts');
              const result = await generateAIStudyPlan({
                exams: body.upcomingExams || [],
                subjects: [],
                topics: body.missedTasks || [],
                dailyHours: body.availableHours || 4,
                preferences: { deepWork: true, revisionSessions: true, practiceSessions: true, sessionDuration: 45 },
              });
              res.statusCode = 200;
              res.end(JSON.stringify({
                recommendations: result.recommendations,
                rescheduledCount: (body.missedTasks || []).length,
                fallback: result.fallback,
              }));
              return;
            }

            res.statusCode = 404;
            res.end(JSON.stringify({ error: `Endpoint not found: ${urlPath}` }));
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Internal Server Error';
            console.error('[Agent API Error]', errMsg);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: errMsg, fallback: true }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    agentApiPlugin(),
  ],
});
