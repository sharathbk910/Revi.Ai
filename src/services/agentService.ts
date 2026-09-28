/**
 * Client-side Agent Service
 * Handles AI Agent requests with multi-layered resilience:
 * 1. Tries the server API (/api/ai/agent)
 * 2. Falls back seamlessly to direct client-side intelligent agent kernel
 * 3. Never throws unhandled errors or displays repetitive canned responses
 */

export interface AgentAttachment {
  name: string;
  mimeType: string;
  base64Data: string;
  previewUrl?: string;
  sizeBytes: number;
}

export interface AgentContextPayload {
  exams: Array<{ id: string; name: string; date: string; time: string; subjectName: string }>;
  subjects: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; title: string; subjectName: string; completed: boolean; priority: string }>;
  tasks: Array<{ id: string; date: string; topicTitle: string; subjectName: string; status: string; startTime: string }>;
  missedTasks: Array<{ id: string; topicTitle: string; subjectName: string; date: string }>;
  overallProgressPercent: number;
  completedCount: number;
  totalTopicsCount: number;
  dailyHours: number;
  referenceDate: string;
  sessionDuration: number;
}

export interface AgentHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentServerResponse {
  message: string;
  tool?: { name: string; params: Record<string, unknown> };
  requiresConfirmation?: boolean;
  confirmationText?: string;
  extractedExams?: Array<{ name: string; date: string; time: string; subjectName?: string }>;
  extractedTopics?: Array<{ subjectName: string; title: string; priority?: string }>;
  fallback?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// File helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function fileToBase64(file: File): Promise<AgentAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
        previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
        sizeBytes: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAcceptableFile(file: File): { ok: boolean; reason?: string } {
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const ACCEPTED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `File too large (max 20MB). This file is ${formatFileSize(file.size)}.` };
  }

  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|txt|csv|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i)) {
    return { ok: false, reason: `File type not supported. Use PDF, image, or text files.` };
  }

  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// Client-Side Intelligent Agent Kernel
// ──────────────────────────────────────────────────────────────────────────────

type IntentType =
  | 'DELETE_PLAN'
  | 'CLEAR_ALL_DATA'
  | 'CREATE_PLAN'
  | 'REBUILD_PLAN'
  | 'RESCHEDULE_MISSED'
  | 'UPDATE_HOURS'
  | 'EXTRACT_TIMETABLE'
  | 'EXTRACT_SYLLABUS'
  | 'GENERAL_CHAT';

function classifyIntent(message: string, hasAttachments: boolean, attachmentNames: string[]): IntentType {
  const m = message.toLowerCase().trim();

  // File uploads
  if (hasAttachments) {
    const names = attachmentNames.map(n => n.toLowerCase()).join(' ');
    if (names.includes('syllabus') || names.includes('curriculum') || names.includes('topics')) {
      return 'EXTRACT_SYLLABUS';
    }
    return 'EXTRACT_TIMETABLE';
  }

  // Explicit action commands only (never hijack conversation/questions)
  if (
    m === 'delete my plan' || m === 'delete plan' ||
    m === 'clear my plan' || m === 'clear plan' ||
    m === 'wipe plan' || m === 'clear my schedule' || m === 'delete my schedule'
  ) {
    return 'DELETE_PLAN';
  }

  if (
    m === 'clear all data' || m === 'delete all data' ||
    m === 'delete everything' || m === 'wipe all data' || m === 'clear everything'
  ) {
    return 'CLEAR_ALL_DATA';
  }

  if (
    m === 'rebuild my plan' || m === 'rebuild plan' ||
    m === 'recalculate schedule' || m === 'rebuild my entire study schedule.' ||
    m === 'rebuild my entire study schedule'
  ) {
    return 'REBUILD_PLAN';
  }

  if (
    m === 'reschedule missed' || m === 'reschedule missed sessions' ||
    m === 'reschedule my missed sessions' || m === 'fix my missed sessions' ||
    m === 'i missed yesterday. please reschedule my missed sessions.' ||
    m === 'i missed yesterday. fix my plan.'
  ) {
    return 'RESCHEDULE_MISSED';
  }

  if (/^(?:set|change|update|make)\s+(?:daily\s+)?hours\s+(?:to\s+)?\d+/i.test(m) || /^i can (?:only\s+)?study \d+\s*(?:hours|hrs)/i.test(m)) {
    return 'UPDATE_HOURS';
  }

  // All other questions, tips, progress queries, and chat go directly to dynamic LLM!
  return 'GENERAL_CHAT';
}

function extractHours(message: string): number | null {
  const matches = message.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
  if (matches) {
    const val = parseFloat(matches[1]);
    if (val > 0 && val <= 16) return val;
  }
  return null;
}

/**
 * Direct browser call to Groq with live user context
 */
async function callGroqDirect(
  message: string,
  context: AgentContextPayload,
  history: AgentHistoryMessage[]
): Promise<string | null> {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('revision_ai_groq_key')?.trim() : null;
  const envKey = (import.meta as any).env?.VITE_GROQ_API_KEY?.trim();
  const apiKey = (localKey && !localKey.startsWith('your_'))
    ? localKey
    : (envKey && !envKey.startsWith('your_'))
      ? envKey
      : null;
  if (!apiKey) return null;

  try {
    const examsSummary = context.exams && context.exams.length > 0
      ? context.exams.map(e => `${e.name} on ${e.date} at ${e.time}`).join('; ')
      : 'None registered yet';

    const topicsSummary = `${context.completedCount || 0}/${context.totalTopicsCount || 0} completed (${context.overallProgressPercent || 0}%)`;
    const missedSummary = context.missedTasks && context.missedTasks.length > 0
      ? `${context.missedTasks.length} missed (${context.missedTasks.slice(0, 3).map(m => m.topicTitle).join(', ')})`
      : 'None';

    const todayTasksSummary = context.tasks && context.tasks.filter(t => t.date === context.referenceDate).length > 0
      ? context.tasks.filter(t => t.date === context.referenceDate).map(t => `${t.topicTitle} [${t.status}]`).join('; ')
      : 'No tasks allocated for today';

    const systemPrompt = `You are REVISIONLY AI — an elite academic planning and study coaching agent embedded in the Revisionly study planner app.

STUDENT PROFILE & LIVE CONTEXT:
- Today's Date: ${context.referenceDate}
- Exams Scheduled: ${examsSummary}
- Syllabus Coverage: ${topicsSummary}
- Daily Study Availability: ${context.dailyHours || 3} hours/day
- Missed Revision Sessions: ${missedSummary}
- Scheduled Tasks for Today: ${todayTasksSummary}

YOUR ROLE & INSTRUCTIONS:
- You are speaking directly to a student. Be supportive, concise, analytically sharp, and highly actionable.
- NEVER give generic, repetitive, or canned responses. Always tailor your reply specifically to what the student is asking right now.
- If asked "What to study now?" or "What should I study?": Check their earliest upcoming exam and pending topics. Recommend a concrete study session with duration and active recall strategy.
- If asked about progress: Give a direct, encouraging evaluation with realistic countdown guidance.
- If they ask general academic or study questions (e.g., explaining a concept, study techniques like Feynman or Pomodoro), explain clearly and concisely.
- Keep responses readable using clean formatting (bullet points, bold text). Keep under 180 words unless a detailed breakdown is requested.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 450,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Fallback intelligent client agent when server endpoint is unavailable (e.g. static hosting on Vercel)
 */
async function runClientAgent(
  message: string,
  context: AgentContextPayload,
  history: AgentHistoryMessage[],
  attachments?: AgentAttachment[]
): Promise<AgentServerResponse> {
  const hasAttachments = Boolean(attachments && attachments.length > 0);
  const attachmentNames = attachments?.map(a => a.name) || [];
  const intent = classifyIntent(message, hasAttachments, attachmentNames);

  switch (intent) {
    case 'DELETE_PLAN': {
      const sessionCount = context.tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
      return {
        message: `> CONFIRMATION REQUIRED\n\nI can clear your current study plan.\n\nThis will remove **${sessionCount} planned study sessions**.\n\nYour exams (${context.exams.length}) and syllabus (${context.totalTopicsCount} topics) will remain completely safe.`,
        requiresConfirmation: true,
        confirmationText: `Clear ${sessionCount} study sessions?`,
        tool: { name: 'delete_current_plan', params: {} },
      };
    }

    case 'CLEAR_ALL_DATA': {
      return {
        message: `> CLEAR ALL DATA?\n\nThis will permanently remove:\n- All **${context.exams.length}** exams\n- All **${context.totalTopicsCount}** syllabus topics\n- All study sessions\n\nThis gives you a completely clean slate.`,
        requiresConfirmation: true,
        confirmationText: 'Delete all exams, syllabus topics, and sessions?',
        tool: { name: 'clear_all_data', params: {} },
      };
    }

    case 'CREATE_PLAN':
    case 'REBUILD_PLAN': {
      if (context.exams.length === 0) {
        return {
          message: `> NO EXAMS FOUND\n\nBefore I can generate your study plan, I need your upcoming exam dates.\n\nYou can:\n- Type them here (e.g. "Maths exam on Oct 15 at 9am")\n- Upload your exam timetable image or PDF`,
        };
      }
      if (context.topics.length === 0) {
        return {
          message: `> NO SYLLABUS TOPICS FOUND\n\nI have ${context.exams.length} exam(s) recorded, but no topics in your syllabus.\n\nPlease upload your syllabus PDF or type your subjects to begin scheduling.`,
        };
      }
      return {
        message: `> GENERATING STUDY PLAN\n\nFound:\n- **${context.exams.length} exams**\n- **${context.topics.filter(t => !t.completed).length} pending topics**\n- **${context.dailyHours} hours/day** daily capacity\n\nCalculating optimal spaced revision schedule...`,
        tool: { name: intent === 'CREATE_PLAN' ? 'generate_study_plan' : 'rebuild_study_plan', params: { dailyHours: context.dailyHours } },
      };
    }

    case 'RESCHEDULE_MISSED': {
      if (context.missedTasks.length === 0) {
        return {
          message: `> NO MISSED SESSIONS\n\nYou're completely on track — no overdue study sessions detected for today (${context.referenceDate}). Great discipline!`,
        };
      }
      const preview = context.missedTasks.slice(0, 3).map(t => `• ${t.topicTitle} (${t.subjectName})`).join('\n');
      return {
        message: `> MISSED SESSIONS DETECTED\n\nFound **${context.missedTasks.length} missed study session(s)**:\n\n${preview}\n\nShould I rebalance your remaining days to fit them in before your exams?`,
        requiresConfirmation: true,
        confirmationText: `Reschedule ${context.missedTasks.length} missed session(s)?`,
        tool: { name: 'reschedule_missed', params: {} },
      };
    }

    case 'UPDATE_HOURS': {
      const hours = extractHours(message);
      if (!hours) {
        return {
          message: `> HOW MANY HOURS?\n\nPlease specify your daily hours, for example:\n\n_"I can study 4 hours a day"_`,
        };
      }
      return {
        message: `> UPDATING DAILY STUDY HOURS\n\nSetting your daily study availability to **${hours} hours/day**.\n\nYour study plan will adapt automatically.`,
        tool: { name: 'update_study_hours', params: { hours } },
      };
    }

    case 'EXTRACT_TIMETABLE': {
      const file = attachments?.[0];
      return {
        message: `> TIMETABLE UPLOAD RECEIVED (${file?.name || 'File'})\n\nI'm ready to parse this timetable and populate your exam schedule.\n\nYou can also type any specific exam dates directly if you want immediate scheduling.`,
      };
    }

    case 'EXTRACT_SYLLABUS': {
      const file = attachments?.[0];
      return {
        message: `> SYLLABUS UPLOAD RECEIVED (${file?.name || 'Document'})\n\nReceived your syllabus document. I'll break it down into chapter modules and prioritize high-yield exam topics.`,
      };
    }

    default: {
      // Direct call to Groq with live context
      const directReply = await callGroqDirect(message, context, history);
      if (directReply) {
        return { message: directReply };
      }

      // Dynamic contextual fallback if offline
      const upcomingExam = context.exams.find(e => e.date >= context.referenceDate) || context.exams[0];
      const examNotice = upcomingExam
        ? `Next priority exam: **${upcomingExam.name}** on **${upcomingExam.date}**.`
        : 'Tip: Add your exams first so I can build your countdown schedule.';

      return {
        message: `> REVISIONLY AI (${context.referenceDate})\n\n${examNotice}\n\nYou have **${context.completedCount}/${context.totalTopicsCount} topics** complete (${context.overallProgressPercent}%).\n\nAsk me anything: "What should I study right now?", "Explain a topic", or upload your syllabus/timetable!`,
      };
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────────────────────────────────────

export async function callAgent(
  message: string,
  context: AgentContextPayload,
  history: AgentHistoryMessage[],
  attachments?: AgentAttachment[]
): Promise<AgentServerResponse> {
  const payload = {
    message,
    context,
    history: history.slice(-12),
    attachments: attachments?.map(a => ({
      name: a.name,
      mimeType: a.mimeType,
      base64Data: a.base64Data,
    })),
  };

  try {
    // 1. Try server endpoint with 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        return data as AgentServerResponse;
      }
    }
  } catch (err) {
    console.info('[Agent] Server endpoint not reachable, running client-side agent kernel:', err);
  }

  // 2. Seamless client-side agent kernel
  return runClientAgent(message, context, history, attachments);
}
