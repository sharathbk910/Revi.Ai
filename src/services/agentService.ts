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
  | 'EXTRACT_DATA'
  | 'GENERAL_CHAT';

function isSyllabusOrTimetableInput(m: string): boolean {
  const lower = m.toLowerCase().trim();
  if (
    lower.startsWith('how much') ||
    lower.startsWith('what should i') ||
    lower.startsWith('when is my next') ||
    lower === 'what to study' ||
    lower === 'study now' ||
    lower === 'show my progress' ||
    lower === 'my progress'
  ) {
    return false;
  }

  const indicators = [
    'syllabus', 'timetable', 'curriculum',
    'add topic', 'add topics', 'import topic', 'import topics',
    'update topic', 'update topics', 'update syllabus',
    'add exam', 'add exams', 'import exam', 'import exams',
    'my topics', 'these topics', 'here is my syllabus', 'here are my topics',
    'here is my timetable', 'my timetable is', 'my syllabus is',
    'exam date', 'exam schedule', 'chapter', 'modules', 'unit 1', 'unit 2'
  ];

  if (indicators.some(ind => lower.includes(ind))) return true;

  const lines = m.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 3) {
    const listLines = lines.filter(l => /^[*-•\d+.]/i.test(l));
    if (listLines.length >= 2) return true;
  }

  return false;
}

function classifyIntent(message: string, hasAttachments: boolean, _attachmentNames?: string[]): IntentType {
  const m = message.toLowerCase().trim();

  // Attachments or explicit text syllabus/timetable input
  if (hasAttachments || isSyllabusOrTimetableInput(m)) {
    return 'EXTRACT_DATA';
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

    const systemPrompt = `You are REVISIONLY AI — an expert academic mentor, study coach, and tutor embedded in the Revisionly study planner app.

CORE DIRECTIVE:
1. ALWAYS ANSWER THE USER'S QUESTION DIRECTLY, ACCURATELY, AND FULLY FIRST.
2. If the user asks about ANY academic subject, concept, theory, formula, code, definition, history, science, math, or study technique:
   - Provide a clear, high-quality, comprehensive, and pedagogical explanation.
   - Use clear formatting (markdown, bold text, bullet points, math equations where helpful).
   - NEVER deflect, pivot away, or ignore the question.
   - NEVER say "this is not in your syllabus" unless the user explicitly asked if something is in their syllabus.
3. If the user asks about their study plan, timetable, what to study next, or how they are doing:
   - Use the STUDENT PROFILE context below to give specific, actionable, encouraging advice.
4. Keep explanations engaging, concise yet thorough, and directly relevant to what was asked.

STUDENT PROFILE & LIVE CONTEXT (Reference when relevant to their schedule or exams):
- Reference Date: ${context.referenceDate}
- Registered Exams: ${examsSummary}
- Syllabus Coverage: ${topicsSummary}
- Daily Study Availability: ${context.dailyHours || 3} hours/day
- Missed Sessions: ${missedSummary}
- Today's Tasks: ${todayTasksSummary}`;

    const cleanHistory = (history || [])
      .filter(h => h && typeof h.content === 'string' && h.content.trim().length > 0)
      .slice(-10)
      .map(h => ({ role: h.role, content: h.content.trim() }));

    const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

    for (const model of modelsToTry) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...cleanHistory,
              { role: 'user', content: message },
            ],
            temperature: 0.6,
            max_tokens: 800,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 0) return content;
        }
      } catch {
        // try next model
      }
    }

    return null;
  } catch (err) {
    console.info('[Agent] Direct Groq fetch error (will use smart contextual engine):', err);
    return null;
  }
}

/**
 * Intelligent dynamic contextual engine when offline or API key is absent
 * Only provides schedule telemetry if the user specifically asked about their timetable/progress.
 * Never hijacks general knowledge questions with fake study tips.
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
    q.includes('highest priority topic') ||
    q.includes('where do i start') ||
    q === 'study now'
  ) {
    if (!targetTopic) {
      return `### 🎯 Syllabus Complete!\n\nAll registered topics are marked complete (${context.completedCount}/${context.totalTopicsCount}).\n\n**Recommended Next Action:**\n* Run a full mock test for **${nextExam ? nextExam.name : 'your upcoming exam'}**.\n* Create active-recall flashcards for high-yield formulas and definitions.`;
    }

    return `### 🎯 Immediate Priority: **${targetTopic.title}** (${targetTopic.subjectName})\n\nWith **${daysToNextExam} day(s)** until your **${nextExam ? nextExam.name : 'next exam'}**, this is your highest leverage topic right now.\n\n**Action Plan (${context.sessionDuration || 45}-Minute Focus Block):**\n1. **25 min — Active Retrieval:** Read the core formulas/concepts, then close your notes and write out everything you remember (blurting method).\n2. **15 min — Targeted Practice:** Solve 3–5 exam-style questions specifically on *${targetTopic.title}*.\n3. **5 min — Error Log:** Document mistakes in your revision notes to prevent repeat errors.\n\n*Lock in for ${context.sessionDuration || 45} minutes with zero notifications.*`;
  }

  // 2. Progress / How much syllabus completed / Status
  if (
    q.includes('my progress') ||
    q.includes('syllabus progress') ||
    q.includes('how much syllabus') ||
    q.includes('syllabus coverage') ||
    q.includes('readiness status')
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
    q === 'next exam' ||
    q === 'when is my next exam' ||
    q.includes('exam countdown') ||
    q.includes('exam schedule') ||
    q.includes('exam timetable')
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
    q.includes('missed yesterday') ||
    q.includes('missed sessions') ||
    q.includes('catch up on missed')
  ) {
    if (context.missedTasks.length === 0) {
      return `### ✅ Perfect Discipline!\n\nZero overdue study sessions detected for today (${context.referenceDate}). Your revision schedule is completely synchronized and on track.`;
    }

    const missedList = context.missedTasks.slice(0, 3).map(t => `• **${t.topicTitle}** (${t.subjectName})`).join('\n');
    return `### 🔄 Missed Sessions Detected (${context.missedTasks.length})\n\n${missedList}\n\n**Recovery Protocol:**\nClick **"I MISSED A DAY"** or use the **Daily Check-In** dialog to trigger autonomous rebalancing. Your remaining study slots will be dynamically recalculated without overflowing your daily study limit.`;
  }

  // 5. Greetings / Help
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q === 'who are you'
  ) {
    return `### 👋 Welcome to Revisionly AI Command Center\n\nI am your academic mentor and revision strategist.\n\n**Live Status:**\n* **Next Exam:** ${nextExam ? `**${nextExam.name}** in **${daysToNextExam} day(s)**` : 'None scheduled'}\n* **Syllabus Progress:** **${context.completedCount}/${context.totalTopicsCount} topics** complete (${context.overallProgressPercent}%)\n* **Daily Study Window:** **${context.dailyHours} hours/day**\n\nAsk me any concept question, homework problem, study advice, or ask me to adjust your timetable!`;
  }

  // 6. Honest offline fallback for any question/query
  return `### ⚠️ AI Assistant Offline\n\nI couldn't reach the AI language model to answer: *"${query}"*.\n\n**Possible solutions:**\n1. Ensure your device is connected to the internet.\n2. Verify that your **GROQ_API_KEY** is configured and active in Settings or \`.env\`.\n3. If asking about your schedule, try: *"What should I study now?"*, *"When is my next exam?"*, or *"Show my progress"*.`;
}

async function extractSyllabusAndTimetableClient(
  message: string,
  attachments?: AgentAttachment[]
): Promise<AgentServerResponse | null> {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('revision_ai_groq_key')?.trim() : null;
  const envKey = import.meta.env.VITE_GROQ_API_KEY?.trim() || import.meta.env.GROQ_API_KEY?.trim();
  const apiKey = (localKey && !localKey.startsWith('your_'))
    ? localKey
    : (envKey && !envKey.startsWith('your_'))
      ? envKey
      : null;

  if (!apiKey) return null;

  let combinedText = message;
  for (const att of attachments || []) {
    if (att.mimeType?.startsWith('text/') || att.mimeType?.includes('csv') || att.mimeType?.includes('json')) {
      try {
        const decoded = atob(att.base64Data);
        combinedText += `\n\n--- Attachment: ${att.name} ---\n${decoded.slice(0, 10000)}`;
      } catch {
        // ignore
      }
    }
  }

  const prompt = `Extract all exams and syllabus topics from this student text/document:
"""
${combinedText.slice(0, 15000)}
"""

Return ONLY a valid JSON object in this exact format with NO markdown wrapping:
{
  "exams": [
    { "name": "Exam/Subject Name", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "subjectName": "Subject Name" }
  ],
  "topics": [
    { "subjectName": "Subject Name", "title": "Topic or Chapter Title", "priority": "HIGH|MEDIUM|LOW" }
  ]
}
If no exams found, "exams": []. If no topics found, "topics": []. Default time: 09:00 AM. Default year: 2026.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const exams = Array.isArray(parsed.exams) ? parsed.exams : [];
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

    if (exams.length === 0 && topics.length === 0) return null;

    if (exams.length > 0 && topics.length > 0) {
      const subjects = [...new Set(topics.map((t: any) => t.subjectName))];
      return {
        message: `> SYLLABUS & TIMETABLE DETECTED\n\nI detected **${exams.length} exam(s)** and **${topics.length} topic(s)** across **${subjects.length} subject(s)**.\n\nClick **IMPORT ALL** below to add these to your syllabus and recalculate your study schedule.`,
        extractedExams: exams,
        extractedTopics: topics,
        tool: { name: 'import_syllabus_and_timetable', params: { exams, topics } },
      };
    }

    if (topics.length > 0) {
      const subjects = [...new Set(topics.map((t: any) => t.subjectName))];
      return {
        message: `> SYLLABUS TOPICS DETECTED\n\nI found **${topics.length} topic(s)** across **${subjects.length} subject(s)**:\n\nClick **IMPORT ${topics.length} TOPICS** below to add them to your syllabus.`,
        extractedTopics: topics,
        tool: { name: 'import_topics', params: { topics } },
      };
    }

    return {
      message: `> EXAM TIMETABLE DETECTED\n\nI found **${exams.length} exam(s)**.\n\nClick **IMPORT ALL** below to add these to your schedule.`,
      extractedExams: exams,
      tool: { name: 'import_exams', params: { exams } },
    };
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

    case 'EXTRACT_DATA': {
      const extracted = await extractSyllabusAndTimetableClient(message, attachments);
      if (extracted) {
        return extracted;
      }
      const directReply = await callGroqDirect(message, context, history);
      if (directReply) {
        return { message: directReply };
      }
      return {
        message: generateDynamicContextualReply(message, context),
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
    // 1. Try server endpoint with 35-second timeout for full LLM response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

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

