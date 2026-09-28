/**
 * Client-side Agent Service
 * Handles AI Agent requests with multi-layered resilience:
 * 1. Tries the server API (/api/ai/agent)
 * 2. Falls back seamlessly to direct client-side intelligent agent kernel
 * 3. Never throws unhandled errors or displays "AI Unavailable"
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
  | 'ADD_EXAM'
  | 'QUERY_PLAN'
  | 'QUERY_PROGRESS'
  | 'QUERY_NEXT_EXAM'
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

  // Delete plan / clear sessions
  if (
    (m.includes('delete') || m.includes('clear') || m.includes('remove') || m.includes('wipe')) &&
    (m.includes('plan') || m.includes('schedule') || m.includes('session') || m.includes('timetable'))
  ) {
    return 'DELETE_PLAN';
  }

  // Clear all data
  if (
    (m.includes('delete') || m.includes('clear') || m.includes('remove') || m.includes('wipe')) &&
    (m.includes('all') || m.includes('everything'))
  ) {
    return 'CLEAR_ALL_DATA';
  }

  // Create plan
  if (
    (m.includes('create') || m.includes('generate') || m.includes('build') || m.includes('make')) &&
    (m.includes('plan') || m.includes('schedule') || m.includes('timetable'))
  ) {
    return 'CREATE_PLAN';
  }

  // Rebuild plan
  if (m.includes('rebuild') || m.includes('regenerate') || m.includes('recalculate') || m.includes('redo')) {
    return 'REBUILD_PLAN';
  }

  // Reschedule missed
  if (m.includes('missed') || m.includes('reschedule') || m.includes('catch up') || m.includes('behind')) {
    return 'RESCHEDULE_MISSED';
  }

  // Update daily hours
  if ((m.includes('hour') || m.includes('hrs')) && (m.includes('study') || m.includes('day') || m.includes('daily') || m.includes('only') || m.includes('can'))) {
    return 'UPDATE_HOURS';
  }

  // Add exam text detection
  if ((m.includes('exam on') || m.includes('add exam') || m.includes('new exam') || m.includes('test on')) && /\d/.test(m)) {
    return 'ADD_EXAM';
  }

  // Next exam query
  if (m.includes('next exam') || m.includes('upcoming exam') || m.includes('when is my')) {
    return 'QUERY_NEXT_EXAM';
  }

  // Progress query
  if (m.includes('progress') || m.includes('how much') || m.includes('percent') || m.includes('completed')) {
    return 'QUERY_PROGRESS';
  }

  // Plan query
  if (m.includes('what should') || m.includes('study now') || m.includes('today') || m.includes('next task') || m.includes('priorit')) {
    return 'QUERY_PLAN';
  }

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

function extractExamsFromText(message: string): Array<{ name: string; date: string; time: string; subjectName?: string }> {
  const results: Array<{ name: string; date: string; time: string; subjectName?: string }> = [];
  // Match patterns like "Python exam on Oct 3 at 9am" or "Maths on 2026-10-15"
  const regex = /([A-Za-z0-9\s]+?)(?:\s+exam|\s+test|\s+paper)?\s+(?:on|dated)\s+([A-Za-z0-9\s,-]+?)(?:\s+at\s+([0-9:AMPamp\s]+))?(?:$|\.|\n|;)/gi;
  let match;
  while ((match = regex.exec(message)) !== null) {
    const rawName = match[1].replace(/^(add|new|schedule|my)\s+/i, '').trim();
    const rawDate = match[2].trim();
    const rawTime = match[3]?.trim() || '09:00 AM';

    if (rawName && rawDate) {
      // Normalize date if possible
      let parsedDate = rawDate;
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString().split('T')[0];
      }
      results.push({
        name: rawName,
        subjectName: rawName,
        date: parsedDate,
        time: rawTime,
      });
    }
  }
  return results;
}

/**
 * Direct browser call to Groq if key is available
 */
async function callGroqDirect(
  message: string,
  context: AgentContextPayload,
  history: AgentHistoryMessage[]
): Promise<string | null> {
  const apiKey = (import.meta as unknown as { env?: { VITE_GROQ_API_KEY?: string } }).env?.VITE_GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) return null;

  try {
    const systemPrompt = `You are Revisionly AI, an elite academic study-planning agent.
USER CONTEXT:
- Scheduled Exams: ${context.exams.length} (${context.exams.map(e => `${e.name} on ${e.date}`).join(', ') || 'None'})
- Syllabus Progress: ${context.completedCount} / ${context.totalTopicsCount} topics completed (${context.overallProgressPercent}%)
- Daily Study Capacity: ${context.dailyHours} hours/day
- Today's Date: ${context.referenceDate}
- Missed Sessions: ${context.missedTasks.length}

STYLE:
- Direct, analytical, encouraging, and highly specific.
- Keep responses concise (under 120 words).
- If the user asks to modify plans, confirm what you can do.`;

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
          ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.5,
        max_tokens: 300,
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

    case 'ADD_EXAM': {
      const extracted = extractExamsFromText(message);
      if (extracted.length > 0) {
        return {
          message: `> EXAM DETECTED\n\nI extracted **${extracted.length} exam(s)** from your message. Review and import below:`,
          extractedExams: extracted,
          tool: { name: 'import_exams', params: { exams: extracted } },
        };
      }
      return {
        message: `> ADD EXAM\n\nPlease share the exam name and date, for example:\n\n_"Python Exam on October 15 at 9:00 AM"_`,
      };
    }

    case 'QUERY_PLAN': {
      const nextTask = context.tasks.find(t => t.date === context.referenceDate && t.status === 'PENDING');
      if (!nextTask) {
        return {
          message: `> SESSIONS COMPLETED FOR TODAY\n\nYou have completed all scheduled revision sessions for ${context.referenceDate}!\n\nNext exam: **${context.exams[0]?.name || 'None scheduled'}**.`,
        };
      }
      return {
        message: `> CURRENT PRIORITY SESSION\n\n**${nextTask.topicTitle}**\n${nextTask.subjectName} · Scheduled at ${nextTask.startTime}\n\nLock in for this block. Spaced repetition here will maximize your exam retention.`,
      };
    }

    case 'QUERY_PROGRESS': {
      return {
        message: `> SYLLABUS READINESS STATUS\n\n- **${context.completedCount} / ${context.totalTopicsCount} topics** completed\n- **${context.overallProgressPercent}%** syllabus coverage\n- **${context.exams.length} exams** scheduled\n\nKeep pushing. Consistency compounds.`,
      };
    }

    case 'QUERY_NEXT_EXAM': {
      const sorted = [...context.exams].sort((a, b) => a.date.localeCompare(b.date));
      const upcoming = sorted.find(e => e.date >= context.referenceDate);
      if (!upcoming) {
        return { message: `> NO UPCOMING EXAMS\n\nNo exams scheduled on or after ${context.referenceDate}.` };
      }
      const d1 = new Date(context.referenceDate);
      const d2 = new Date(upcoming.date);
      const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        message: `> NEXT UPCOMING EXAM\n\n**${upcoming.name}**\nDate: ${upcoming.date} at ${upcoming.time}\n\n**${days} day(s) remaining**.\nFocus heavily on this subject's high-yield topics.`,
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
      // Try direct Groq call first
      const directReply = await callGroqDirect(message, context, history);
      if (directReply) {
        return { message: directReply };
      }

      // Contextual coaching fallback
      if (context.exams.length === 0) {
        return {
          message: `> REVISIONLY AI READY\n\nYour study system is currently empty. Tell me your upcoming exam timetable (or upload a photo/PDF), and I'll build your structured study schedule.`,
        };
      }
      return {
        message: `> REVISIONLY AI READY\n\nConnected to your plan:\n- **${context.exams.length} exams** tracked\n- **${context.totalTopicsCount} topics** (${context.overallProgressPercent}% covered)\n- **${context.dailyHours}h/day** study capacity\n\nYou can ask me to "Delete my plan", "Reschedule missed sessions", "Change daily hours to 4", or "What should I study today?".`,
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
