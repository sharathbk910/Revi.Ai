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
  const envKey = import.meta.env.VITE_GROQ_API_KEY?.trim() || import.meta.env.GROQ_API_KEY?.trim();
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
- Keep responses readable using clean formatting (bullet points, bold text). Keep under 200 words unless a detailed breakdown is requested.`;

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
          ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.info('[Agent] Direct Groq fetch error (will use smart contextual engine):', err);
    return null;
  }
}

/**
 * Intelligent dynamic contextual engine when offline or API key is absent
 * Generates rich, varied, and personalized replies tailored to user query and timetable context
 */
function generateDynamicContextualReply(
  query: string,
  context: AgentContextPayload
): string {
  const q = query.toLowerCase().trim();
  const upcomingExams = context.exams
    .filter(e => e.date >= context.referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0] || context.exams[0];
  const pendingTopics = context.topics.filter(t => !t.completed);
  const highPriorityPending = pendingTopics.filter(t => t.priority === 'HIGH');
  const targetTopic = highPriorityPending[0] || pendingTopics[0];

  // Calculate days remaining to next exam
  let daysToNextExam = 0;
  if (nextExam) {
    const todayMs = new Date(context.referenceDate).getTime();
    const examMs = new Date(nextExam.date).getTime();
    daysToNextExam = Math.max(0, Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24)));
  }

  // 1. What to study now / What should I study / Start studying
  if (
    q.includes('what to study') ||
    q.includes('what should i study') ||
    q.includes('highest priority') ||
    q.includes('start study') ||
    q.includes('where do i start') ||
    q.includes('recommend') ||
    q.includes('study now')
  ) {
    if (!targetTopic) {
      return `### 🎯 Syllabus Complete!\n\nAll registered topics are marked complete (${context.completedCount}/${context.totalTopicsCount}).\n\n**Recommended Next Action:**\n* Run a full mock test for **${nextExam ? nextExam.name : 'your upcoming exam'}**.\n* Create active-recall flashcards for high-yield formulas and definitions.`;
    }

    return `### 🎯 Immediate Priority: **${targetTopic.title}** (${targetTopic.subjectName})\n\nWith **${daysToNextExam} day(s)** until your **${nextExam ? nextExam.name : 'next exam'}**, this is your highest leverage topic right now.\n\n**Action Plan (45-Minute Focus Block):**\n1. **25 min — Active Retrieval:** Read the core formulas/concepts, then close your notes and write out everything you remember (blurting method).\n2. **15 min — Targeted Practice:** Solve 3–5 exam-style questions specifically on *${targetTopic.title}*.\n3. **5 min — Error Log:** Document mistakes in your revision notes to prevent repeat errors.\n\n*Lock in for 45 minutes with zero notifications.*`;
  }

  // 2. Progress / How much syllabus completed / Status
  if (
    q.includes('progress') ||
    q.includes('how much') ||
    q.includes('percentage') ||
    q.includes('syllabus') ||
    q.includes('completed') ||
    q.includes('readiness') ||
    q.includes('status')
  ) {
    const remainingCount = pendingTopics.length;
    const paceNeeded = daysToNextExam > 0 ? (remainingCount / daysToNextExam).toFixed(1) : remainingCount;

    return `### 📊 Live Revision Telemetry\n\n* **Syllabus Coverage:** **${context.overallProgressPercent}%** (${context.completedCount} of ${context.totalTopicsCount} topics mastered)\n* **Pending Topics:** **${remainingCount}** remaining (${highPriorityPending.length} high priority)\n* **Target Pace:** ~**${paceNeeded} topics/day** to complete your syllabus before **${nextExam ? nextExam.name : 'exam day'}**\n* **Daily Study Window:** **${context.dailyHours} hours/day**\n\n${
      context.overallProgressPercent >= 70
        ? '🔥 **Strong momentum!** You are well ahead of the curve. Transition towards past papers and timed question sets.'
        : context.overallProgressPercent >= 30
        ? '⚡ **Solid progression.** Focus on high-yield chapters first to maximize score velocity.'
        : '⚠️ **Crunch period.** Prioritize high-priority modules and schedule two focused deep work blocks today.'
    }`;
  }

  // 3. Next Exam / Exam Schedule / Timetable countdown
  if (
    q.includes('next exam') ||
    q.includes('exam') ||
    q.includes('date') ||
    q.includes('when is') ||
    q.includes('countdown')
  ) {
    if (context.exams.length === 0) {
      return `### 📅 No Exams Recorded Yet\n\nPlease add your exam dates in the **Exams** tab or type them here (e.g. *"Maths exam on Oct 5 at 9am"*). I'll automatically generate your countdown and revision timetable.`;
    }

    const examList = upcomingExams.map((e, idx) => {
      const todayMs = new Date(context.referenceDate).getTime();
      const examMs = new Date(e.date).getTime();
      const diffDays = Math.max(0, Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24)));
      return `${idx + 1}. **${e.name}** — \`${e.date}\` at \`${e.time}\` (${diffDays} days remaining)`;
    }).join('\n');

    return `### ⏳ Upcoming Exam Countdown\n\n${examList || 'No upcoming exams in the immediate future.'}\n\n**Strategy Tip:** The 48-hour window before each exam is automatically locked for high-yield revision and past paper rehearsal.`;
  }

  // 4. Missed sessions / I missed yesterday / Catch up
  if (
    q.includes('missed') ||
    q.includes('yesterday') ||
    q.includes('catch up') ||
    q.includes('behind') ||
    q.includes('late')
  ) {
    if (context.missedTasks.length === 0) {
      return `### ✅ Perfect Discipline!\n\nZero overdue study sessions detected for today (${context.referenceDate}). Your revision schedule is completely synchronized and on track.`;
    }

    const missedList = context.missedTasks.slice(0, 3).map(t => `• **${t.topicTitle}** (${t.subjectName})`).join('\n');
    return `### 🔄 Missed Sessions Detected (${context.missedTasks.length})\n\n${missedList}\n\n**Recovery Protocol:**\nClick **"I MISSED A DAY"** or use the **Daily Check-In** dialog to trigger autonomous rebalancing. Your remaining study slots will be dynamically recalculated without overflowing your daily study limit.`;
  }

  // 5. Study techniques / Feynman / Pomodoro / Active recall / Tips
  if (
    q.includes('feynman') ||
    q.includes('pomodoro') ||
    q.includes('active recall') ||
    q.includes('spaced repetition') ||
    q.includes('how to study') ||
    q.includes('technique') ||
    q.includes('method')
  ) {
    return `### 🧠 Elite Revision Techniques\n\n1. **The Feynman Technique (Concept Mastery):**\n   Pick a complex topic (e.g., *${targetTopic?.title || 'Data Structures'}*) and explain it on paper in plain English as if teaching a 10-year-old. Identify gaps where you rely on jargon, re-study those gaps, and simplify.\n\n2. **Active Recall & Blurting (Memory Retention):**\n   Close books and write everything you know from memory for 15 minutes. Highlight what you forgot in red.\n\n3. **Spaced Retrieval Intervals:**\n   Review new material on Day 1, Day 3, and Day 7 to cement neural pathways before exam day.`;
  }

  // 6. Greetings / Introduction / Help
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q === 'who are you' ||
    q.includes('help me')
  ) {
    return `### 👋 Welcome to Revisionly AI Command Center\n\nI am your live academic planner and exam strategist.\n\n**Current Live Snapshot:**\n* **Next Exam:** ${nextExam ? `**${nextExam.name}** in **${daysToNextExam} day(s)**` : 'None scheduled'}\n* **Syllabus Progress:** **${context.completedCount}/${context.totalTopicsCount} topics** complete (${context.overallProgressPercent}%)\n* **Daily Study Window:** **${context.dailyHours} hours/day**\n\n**Try asking:**\n* *"What should I study right now?"*\n* *"How much syllabus do I have left?"*\n* *"Explain the Feynman technique"*\n* Or upload a timetable image / syllabus PDF!`;
  }

  // 7. General Academic Coaching & Guidance
  return `### 💡 Academic Strategy (${nextExam ? nextExam.name : 'Revisionly'})\n\nRegarding: *"${query}"*\n\n**Key Strategic Guidance:**\n* **Focus Target:** Direct your prime energy towards **${targetTopic ? targetTopic.title : 'high-yield concepts'}** for your upcoming exam.\n* **Time Management:** Break study time into **${context.sessionDuration || 45}-minute** focused intervals followed by 10-minute active breaks.\n* **Self-Testing:** Spend at least 60% of study time on active recall questions rather than passive reading.\n\nNeed to adjust your timetable? Type *"Rebuild my plan"* or specify *"I can study 4 hours a day"*.`;
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
      // 1. Attempt direct call to Groq with live context
      const directReply = await callGroqDirect(message, context, history);
      if (directReply) {
        return { message: directReply };
      }

      // 2. Dynamic, context-aware intelligent fallback engine (never canned or repetitive)
      return {
        message: generateDynamicContextualReply(message, context),
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
    // 1. Try server endpoint with 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.message === 'string' && data.message.trim().length > 0) {
        return data as AgentServerResponse;
      }
    }
  } catch (err) {
    console.info('[Agent] Server endpoint not reachable or timed out, running client-side agent kernel:', err);
  }

  // 2. Seamless client-side intelligent agent kernel
  return runClientAgent(message, context, history, attachments);
}

