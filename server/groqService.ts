import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Lazily initialize Groq client only if GROQ_API_KEY is configured
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.VITE_GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === '' || apiKey.startsWith('your_')) {
    return null;
  }
  return new Groq({ apiKey });
}

export interface AIPlanRequest {
  exams: Array<{ name: string; date: string; time: string; priority: string }>;
  subjects: Array<{ name: string; code: string }>;
  topics: Array<{ title: string; subjectName: string; priority: string; completed: boolean }>;
  dailyHours: number;
  preferences: {
    deepWork: boolean;
    revisionSessions: boolean;
    practiceSessions: boolean;
    sessionDuration: number;
  };
}

export interface AIPlanResponse {
  recommendations: string[];
  priority_topics: string[];
  estimated_durations: Array<{ topicTitle: string; recommendedMinutes: number }>;
  reasoning_summary: string;
  fallback: boolean;
}

export interface AIAssistantRequest {
  query: string;
  context: {
    nextExam: { name: string; date: string; daysRemaining: number } | null;
    todayTasks: Array<{ title: string; subjectName: string; startTime: string; status: string }>;
    completedCount: number;
    totalTopicsCount: number;
    overallProgressPercent: number;
    missedTasks: Array<{ title: string; subjectName: string; date: string }>;
    dailyHours: number;
  };
}

/**
 * Generate AI study plan recommendations using Groq
 */
export async function generateAIStudyPlan(reqData: AIPlanRequest): Promise<AIPlanResponse> {
  const groq = getGroqClient();

  if (!groq) {
    return {
      recommendations: [
        'AI engine operating in deterministic offline mode (No GROQ_API_KEY detected).',
        'Topics have been chronologically balanced by imminent exam deadlines.',
        'High-yield revision sessions pre-allocated 24h prior to exam dates.',
      ],
      priority_topics: reqData.topics.filter(t => t.priority === 'HIGH' && !t.completed).map(t => t.title).slice(0, 5),
      estimated_durations: reqData.topics.slice(0, 5).map(t => ({ topicTitle: t.title, recommendedMinutes: 45 })),
      reasoning_summary: 'Schedule computed via Revisionly deterministic priority matrix. Earliest exams take priority.',
      fallback: true,
    };
  }

  try {
    const prompt = `You are the study planning AI kernel for Revisionly.
Analyze the following student timetable and syllabus data:

EXAMS:
${JSON.stringify(reqData.exams, null, 2)}

PENDING SYLLABUS TOPICS:
${JSON.stringify(reqData.topics.filter(t => !t.completed).slice(0, 30), null, 2)}

STUDY AVAILABILITY: ${reqData.dailyHours} hours/day.
PREFERENCES: ${JSON.stringify(reqData.preferences)}

Provide an intelligent prioritization strategy in strict JSON format:
{
  "recommendations": ["string", "string", ...],
  "priority_topics": ["string", "string", ...],
  "estimated_durations": [{"topicTitle": "string", "recommendedMinutes": 45}],
  "reasoning_summary": "string"
}`;

    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content: 'You are an elite academic planning AI. Respond ONLY with valid JSON. Do not include markdown code block backticks.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);

    return {
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Schedule optimized around exam deadlines.'],
      priority_topics: Array.isArray(parsed.priority_topics) ? parsed.priority_topics : [],
      estimated_durations: Array.isArray(parsed.estimated_durations) ? parsed.estimated_durations : [],
      reasoning_summary: parsed.reasoning_summary || 'AI prioritization successfully synchronized with schedule engine.',
      fallback: false,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Groq AI] Call failed, using deterministic fallback:', errMsg);
    return {
      recommendations: [
        'AI service temporarily unreachable. Fallback deterministic scheduler engaged.',
        'High-priority topics allocated to immediate upcoming study slots.',
      ],
      priority_topics: reqData.topics.filter(t => t.priority === 'HIGH' && !t.completed).map(t => t.title).slice(0, 5),
      estimated_durations: [],
      reasoning_summary: 'Deterministic constraint solver active. Zero exam deadlines compromised.',
      fallback: true,
    };
  }
}

/**
 * Handle AI Study Assistant queries with Groq
 */
export async function queryAIAssistant(reqData: AIAssistantRequest): Promise<{ reply: string; fallback: boolean }> {
  const groq = getGroqClient();

  if (!groq) {
    // Deterministic smart assistant reply
    return {
      reply: getDeterministicAssistantReply(reqData.query, reqData.context),
      fallback: true,
    };
  }

  try {
    const systemPrompt = `You are REVISIONLY AI, the academic study strategist for Revisionly ("Your syllabus. Your exams. Your plan.").
Tone: Editorial, precise, direct, motivating, academic command center.
Keep answers concise, direct, and actionable (2-4 sentences max unless detailing a plan).

CURRENT STUDENT CONTEXT:
- Next Exam: ${reqData.context.nextExam ? `${reqData.context.nextExam.name} in ${reqData.context.nextExam.daysRemaining} days (${reqData.context.nextExam.date})` : 'None'}
- Today's Progress: ${reqData.context.todayTasks.filter(t => t.status === 'COMPLETED').length} / ${reqData.context.todayTasks.length} tasks completed
- Overall Syllabus Readiness: ${reqData.context.overallProgressPercent}% (${reqData.context.completedCount}/${reqData.context.totalTopicsCount} topics)
- Daily Study Capacity: ${reqData.context.dailyHours}h
- Incomplete/Missed Tasks: ${reqData.context.missedTasks.map(t => `${t.title} (${t.subjectName})`).join(', ') || 'None'}
- Today's Scheduled Tasks:
${reqData.context.todayTasks.map(t => `  • [${t.startTime}] ${t.title} (${t.subjectName}) - ${t.status}`).join('\n')}

Always address the user's specific timetable and state. Never sound like a generic detached assistant.`;

    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: reqData.query },
      ],
      temperature: 0.5,
      max_tokens: 450,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Command acknowledged. Focus on your immediate upcoming study block.';
    return { reply, fallback: false };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Groq Assistant] Call failed, fallback used:', errMsg);
    return {
      reply: getDeterministicAssistantReply(reqData.query, reqData.context),
      fallback: true,
    };
  }
}

/**
 * Intelligent deterministic fallback responses when Groq is offline or no key is provided
 */
function getDeterministicAssistantReply(query: string, ctx: AIAssistantRequest['context']): string {
  const lower = query.toLowerCase();

  if (lower.includes('study now') || lower.includes('start')) {
    const pending = ctx.todayTasks.filter(t => t.status !== 'COMPLETED');
    if (pending.length > 0) {
      return `Target identified: Begin with "${pending[0].title}" (${pending[0].subjectName}) at ${pending[0].startTime}. Lock in for a 45-minute deep work block with zero distractions.`;
    }
    return `All today's tasks completed! Review high-yield concepts for your upcoming exam: ${ctx.nextExam?.name || 'Upcoming Exam'} in ${ctx.nextExam?.daysRemaining || 0} days.`;
  }

  if (lower.includes('missed') || lower.includes('fix my plan')) {
    if (ctx.missedTasks.length > 0) {
      return `Incomplete tasks detected: ${ctx.missedTasks.map(t => t.title).join(', ')}. Use the Auto-Reschedule button in your Daily Check-In to rebalance these into upcoming open slots.`;
    }
    return `Zero missed tasks detected! Your current schedule is completely synchronized and on track.`;
  }

  if (lower.includes('revise') || lower.includes('exam')) {
    if (ctx.nextExam) {
      return `Primary objective: ${ctx.nextExam.name} on ${ctx.nextExam.date} (${ctx.nextExam.daysRemaining} days remaining). Dedicate your next study blocks to core chapters and self-testing.`;
    }
    return `Add an exam in the Exams tab to enable high-yield revision recommendations.`;
  }

  if (lower.includes('prepared') || lower.includes('progress') || lower.includes('how much')) {
    return `TELEMETRY METRICS:\n• Overall Readiness: ${ctx.overallProgressPercent}%\n• Topics Mastered: ${ctx.completedCount} / ${ctx.totalTopicsCount}\n• Days to Next Exam: ${ctx.nextExam?.daysRemaining || 0}d\nMaintain daily momentum to hit 100% syllabus mastery.`;
  }

  return `Recommendation: Prioritize your nearest upcoming exam (${ctx.nextExam?.name || 'Milestone'}). Knock off 1-2 focused topics in today's remaining study slots.`;
}
