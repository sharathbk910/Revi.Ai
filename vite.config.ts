import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';

dotenv.config();

function groqDevApiPlugin(): Plugin {
  return {
    name: 'groq-dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai')) {
          return next();
        }

        // Handle JSON body
        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const { generateAIStudyPlan, queryAIAssistant } = await import('./server/groqService.ts');

            res.setHeader('Content-Type', 'application/json');

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
    groqDevApiPlugin(),
  ],
});
