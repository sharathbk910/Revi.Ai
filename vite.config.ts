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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
        res.setHeader('Content-Type', 'application/json');

        // Collect raw body
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

        req.on('end', async () => {
          try {
            const rawBuf = Buffer.concat(chunks);
            const bodyStr = rawBuf.toString('utf-8');
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const { generateAIStudyPlan, queryAIAssistant } = await import('./server/groqService.ts');

            // ── NEW: Agent endpoint ──────────────────────────────────────
            if (req.url === '/api/ai/agent') {
              const { runAgent } = await import('./server/agentService.ts');
              const result = await runAgent(body);
              res.end(JSON.stringify(result));
              return;
            }

            // ── Existing endpoints ───────────────────────────────────────
            if (req.url === '/api/ai/assistant') {
              const result = await queryAIAssistant(body);
              res.end(JSON.stringify(result));
              return;
            }

            if (req.url === '/api/ai/study-plan' || req.url === '/api/ai/recommendations') {
              const result = await generateAIStudyPlan(body);
              res.end(JSON.stringify(result));
              return;
            }

            if (req.url === '/api/ai/reschedule') {
              const result = await generateAIStudyPlan({
                exams: body.upcomingExams || [],
                subjects: [],
                topics: body.missedTasks || [],
                dailyHours: body.availableHours || 4,
                preferences: { deepWork: true, revisionSessions: true, practiceSessions: true, sessionDuration: 45 },
              });
              res.end(JSON.stringify({
                recommendations: result.recommendations,
                rescheduledCount: (body.missedTasks || []).length,
                fallback: result.fallback,
              }));
              return;
            }

            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
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
