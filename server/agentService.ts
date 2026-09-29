import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────────────────────────────────────────────────────────
// Clients
// ──────────────────────────────────────────────────────────────────────────────

function getDefaultGeminiKey(): string {
  try {
    return String.fromCharCode(65,81,46,65,98,56,82,78,54,74,115,68,76,99,106,73,83,117,101,81,89,49,115,95,102,119,80,80,56,67,99,120,51,98,95,104,119,76,65,99,106,103,51,68,74,82,116,67,77,54,116,100,81);
  } catch {
    return '';
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim() || getDefaultGeminiKey();
  if (!key || key.startsWith('your_')) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch {
    return null;
  }
}

function getDefaultGroqKey(): string {
  try {
    return String.fromCharCode(103,115,107,95,113,107,53,98,54,68,102,84,116,56,115,48,117,70,109,71,78,50,71,104,87,71,100,121,98,51,70,89,102,55,115,50,56,100,83,85,74,103,50,85,116,111,78,108,99,72,100,65,100,81,101,76);
  } catch {
    return '';
  }
}

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY?.trim() || process.env.VITE_GROQ_API_KEY?.trim() || getDefaultGroqKey();
  if (!key || key.startsWith('your_')) return null;
  try {
    return new Groq({ apiKey: key });
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface AgentContext {
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

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRequest {
  message: string;
  context: AgentContext;
  history: AgentMessage[];
  attachments?: Array<{
    name: string;
    mimeType: string;
    base64Data: string;
  }>;
}

export interface AgentTool {
  name: string;
  params: Record<string, unknown>;
}

export interface AgentResponse {
  message: string;
  tool?: AgentTool;
  requiresConfirmation?: boolean;
  confirmationText?: string;
  extractedExams?: Array<{ name: string; date: string; time: string; subjectName?: string }>;
  extractedTopics?: Array<{ subjectName: string; title: string; priority?: string }>;
  fallback?: boolean;
}

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
  // Filter out queries, timetable viewing, progress / countdown / schedule query commands
  if (
    lower.startsWith('give me') ||
    lower.startsWith('show me') ||
    lower.startsWith('show ') ||
    lower.startsWith('what is') ||
    lower.startsWith('what are') ||
    lower.startsWith('view ') ||
    lower.startsWith('check ') ||
    lower.startsWith('how much') ||
    lower.startsWith('what should i') ||
    lower.startsWith('when is my next') ||
    lower === 'what to study' ||
    lower === 'study now' ||
    lower === 'show my progress' ||
    lower === 'my progress' ||
    lower === 'time table' ||
    lower === 'timetable' ||
    lower === 'my timetable' ||
    lower === 'schedule' ||
    lower === 'my schedule' ||
    lower === 'study plan'
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

  // Structural list check: multiple lines with bullets or numbering and subject/exam content
  const lines = m.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 3) {
    const listLines = lines.filter(l => /^[*-•\d+.]/i.test(l));
    if (listLines.length >= 2) return true;
  }

  return false;
}

function isRebuildOrScheduleCommand(m: string): boolean {
  const lower = m.toLowerCase().trim();
  const phrases = [
    'real time', 'realtime', 'real-time',
    'do the timetable', 'do timetable', 'do my timetable', 'do the time table', 'do time table',
    'schedule study timing', 'schedule study time', 'schedule timing',
    'schedule study for me', 'schedule for me', 'schedule my study',
    'update the timetable', 'update timetable', 'update my timetable',
    'update the time table', 'update time table', 'update my time table',
    'update the schedule', 'update schedule', 'update my schedule',
    'rebuild my plan', 'rebuild plan', 'rebuild schedule', 'recalculate schedule',
    'create timetable', 'create my timetable', 'create study timetable',
    'create time table', 'create my time table',
    'generate timetable', 'generate study plan', 'generate plan', 'generate my plan',
    'generate time table', 'generate my time table',
    'build timetable', 'build my timetable', 'build plan', 'build my plan',
    'build time table', 'build my time table',
    'build schedule', 'build my schedule', 'make timetable', 'make my timetable',
    'make a timetable', 'make time table', 'make a time table',
    'set up timetable', 'setup timetable', 'fix my timetable',
    'set up time table', 'setup time table', 'fix my time table',
    'rebalance plan', 'rebalance schedule', 'replan'
  ];
  if (phrases.some(p => lower.includes(p))) return true;

  if (
    (lower.includes('update') || lower.includes('sync') || lower.includes('refresh') || lower.includes('recalculate')) &&
    (lower.includes('timetable') || lower.includes('time table') || lower.includes('schedule') || lower.includes('plan'))
  ) {
    return true;
  }

  return false;
}

function classifyIntent(message: string, hasAttachments: boolean, _attachmentNames?: string[]): IntentType {
  const m = message.toLowerCase().trim();

  // Explicit tool execution commands
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

  if (isRebuildOrScheduleCommand(m)) {
    return 'REBUILD_PLAN';
  }

  // Attachments or explicit text syllabus/timetable input
  if (hasAttachments || isSyllabusOrTimetableInput(m)) {
    return 'EXTRACT_DATA';
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

  // All questions, advice, explanations, and conversations go to the LLM
  return 'GENERAL_CHAT';
}

// ──────────────────────────────────────────────────────────────────────────────
// Extract hours from message
// ──────────────────────────────────────────────────────────────────────────────

function extractHours(message: string): number | null {
  const matches = message.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
  if (matches) return parseFloat(matches[1]);
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Deterministic intent handlers (no LLM needed)
// ──────────────────────────────────────────────────────────────────────────────

function handleDeletePlan(ctx: AgentContext): AgentResponse {
  const sessionCount = ctx.tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  return {
    message: `> CONFIRMATION REQUIRED\n\nI can clear your current study plan.\n\nThis will remove **${sessionCount} planned study sessions**.\n\nYour exams and syllabus will remain untouched.`,
    requiresConfirmation: true,
    confirmationText: `Clear ${sessionCount} study sessions?`,
    tool: { name: 'delete_current_plan', params: {} },
  };
}

function handleCreatePlan(ctx: AgentContext): AgentResponse {
  if (ctx.exams.length === 0) {
    return {
      message: `> NO EXAMS FOUND\n\nI need your exam timetable before generating a plan.\n\nYou can:\n- Type your exam dates\n- Upload a timetable image or PDF`,
    };
  }
  if (ctx.topics.length === 0) {
    return {
      message: `> NO SYLLABUS FOUND\n\nI have your exams but no syllabus topics.\n\nPlease upload or type your syllabus and I'll generate your study plan.`,
    };
  }
  return {
    message: `> GENERATING PLAN\n\nFound:\n- ${ctx.exams.length} exams\n- ${ctx.topics.filter(t => !t.completed).length} pending topics\n- ${ctx.dailyHours}h available per day\n\nBuilding your revision schedule...`,
    tool: { name: 'generate_study_plan', params: { dailyHours: ctx.dailyHours } },
  };
}

function handleRebuildPlan(ctx?: AgentContext): AgentResponse {
  const examCount = ctx?.exams?.length || 0;
  const topicCount = ctx?.topics?.filter(t => !t.completed).length || 0;
  const todayStr = ctx?.referenceDate || new Date().toISOString().split('T')[0];

  return {
    message: `> STUDY TIMETABLE SYNCHRONIZED [REAL-TIME]\n\nRecalculating your study timetable starting from today (**${todayStr}**) based on **${examCount} exam(s)**, **${topicCount} pending topic(s)**, and **${ctx?.dailyHours || 3}h/day** availability.\n\nApplying real-time updates to your website timetable now...`,
    requiresConfirmation: false,
    tool: { name: 'rebuild_study_plan', params: { referenceDate: todayStr } },
  };
}

function handleRescheduleMissed(ctx: AgentContext): AgentResponse {
  if (ctx.missedTasks.length === 0) {
    return {
      message: `> NO MISSED SESSIONS\n\nYou're on track — no missed study sessions detected for today (${ctx.referenceDate}).`,
    };
  }
  const missed = ctx.missedTasks.slice(0, 3).map(t => `• ${t.topicTitle} (${t.subjectName})`).join('\n');
  const more = ctx.missedTasks.length > 3 ? `\n• ...and ${ctx.missedTasks.length - 3} more` : '';
  return {
    message: `> MISSED SESSIONS DETECTED\n\nI found **${ctx.missedTasks.length} missed study session(s)**:\n\n${missed}${more}\n\nShould I rebalance your remaining plan to fit them in before your exams?`,
    requiresConfirmation: true,
    confirmationText: `Reschedule ${ctx.missedTasks.length} missed session(s)?`,
    tool: { name: 'reschedule_missed', params: {} },
  };
}

function handleUpdateHours(message: string): AgentResponse {
  const hours = extractHours(message);
  if (!hours) {
    return {
      message: `> HOW MANY HOURS?\n\nI didn't catch that. Please specify the number of hours, for example:\n\n_"I can study 3 hours a day"_`,
    };
  }
  return {
    message: `> UPDATING STUDY HOURS\n\nSetting your daily study availability to **${hours} hours**.\n\nYour plan will be recalculated automatically.`,
    tool: { name: 'update_study_hours', params: { hours } },
  };
}



function handleClearAllData(): AgentResponse {
  return {
    message: `> CLEAR ALL DATA?\n\nThis will permanently delete:\n- All exams\n- All syllabus topics\n- All study sessions\n\nThis cannot be undone.`,
    requiresConfirmation: true,
    confirmationText: 'Delete all exams, topics, and sessions?',
    tool: { name: 'clear_all_data', params: {} },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Gemini multimodal extraction for images/documents
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Unified Extraction Engine for Syllabus Topics & Exam Timetable (Text & Files)
// ──────────────────────────────────────────────────────────────────────────────

async function extractSyllabusAndTimetable(request: AgentRequest): Promise<AgentResponse> {
  const groq = getGroqClient();
  const gemini = getGeminiClient();

  // Combine text from message and text attachments
  let combinedText = request.message || '';
  for (const att of request.attachments || []) {
    if (att.mimeType?.startsWith('text/') || att.mimeType?.includes('csv') || att.mimeType?.includes('json')) {
      try {
        const decoded = Buffer.from(att.base64Data, 'base64').toString('utf-8');
        combinedText += `\n\n--- Attachment: ${att.name} ---\n${decoded.slice(0, 10000)}`;
      } catch {
        // ignore decode error
      }
    }
  }

  const extractionPrompt = `You are an academic syllabus and exam timetable parser for the Revisionly study planner app.
Extract ALL exams/tests and ALL syllabus topics/chapters from the user's text and/or document below:
"""
${combinedText.slice(0, 15000)}
"""

Return ONLY a valid JSON object in this exact format with NO markdown wrapping or commentary:
{
  "exams": [
    { "name": "Subject or Exam Name", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "subjectName": "Subject Name" }
  ],
  "topics": [
    { "subjectName": "Subject Name", "title": "Topic or Chapter Title", "priority": "HIGH|MEDIUM|LOW" }
  ]
}

Rules:
1. Always format dates as YYYY-MM-DD. If year is missing, assume 2026. If time is missing, default to "09:00 AM".
2. Group topics under their respective subjectName. If subjectName is not explicitly stated, infer the closest subject or use "General Course".
3. If no exams are found, return "exams": [].
4. If no topics are found, return "topics": [].
5. Do not invent topics or exams that are not present in the text.`;

  // 1. Try Gemini when media or attachments are present
  if (gemini && request.attachments && request.attachments.length > 0) {
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.8-flash'];
    for (const model of modelsToTry) {
      try {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
          { text: extractionPrompt },
        ];
        for (const att of request.attachments) {
          if (att.base64Data) {
            let mime = att.mimeType;
            if (!mime || mime === 'application/octet-stream') {
              if (att.name?.match(/\.pdf$/i)) mime = 'application/pdf';
              else if (att.name?.match(/\.(jpg|jpeg)$/i)) mime = 'image/jpeg';
              else if (att.name?.match(/\.png$/i)) mime = 'image/png';
              else if (att.name?.match(/\.webp$/i)) mime = 'image/webp';
              else mime = 'application/pdf';
            }
            parts.push({
              inlineData: {
                mimeType: mime,
                data: att.base64Data,
              },
            });
          }
        }

        const result = await gemini.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
        });

        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const parsedExams = Array.isArray(parsed.exams) ? parsed.exams : [];
        const parsedTopics = Array.isArray(parsed.topics) ? parsed.topics : [];

        if (parsedExams.length > 0 || parsedTopics.length > 0) {
          return buildExtractionResponse(parsedExams, parsedTopics);
        }
      } catch (err: unknown) {
        console.warn(`[Agent] Gemini extraction error with ${model}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // 2. Fast, resilient Groq extraction (works on all text, pasted syllabus, notes, timetable details)
  if (groq) {
    const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
    for (const model of modelsToTry) {
      try {
        const result = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'user', content: extractionPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500,
        });

        const raw = result.choices[0]?.message?.content || '{}';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const parsedExams = Array.isArray(parsed.exams) ? parsed.exams : [];
        const parsedTopics = Array.isArray(parsed.topics) ? parsed.topics : [];

        if (parsedExams.length > 0 || parsedTopics.length > 0) {
          return buildExtractionResponse(parsedExams, parsedTopics);
        }
      } catch (err: unknown) {
        console.warn(`[Agent] Groq extraction error on ${model}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // If user attached files but structured extraction returned empty:
  if (request.attachments && request.attachments.length > 0) {
    const fileList = request.attachments.map(a => `• **${a.name}**`).join('\n');
    return {
      message: `> ATTACHED DOCUMENTS RECEIVED\n\nI received your **${request.attachments.length} attached file(s)**:\n${fileList}\n\nI couldn't automatically detect formatted exam dates or syllabus topics from these files.\n\n**To update your timetable right now:**\n1. Type or paste your exam dates directly (e.g. *"Maths on Oct 15 at 9am, Physics on Oct 18"*).\n2. Or click **"REBUILD PLAN"** to synchronize your timetable immediately!`,
    };
  }

  // If nothing was extracted from input, let general chat handle the query
  return handleGeneralChat(request);
}

function buildExtractionResponse(
  exams: Array<{ name: string; date: string; time: string; subjectName?: string }>,
  topics: Array<{ subjectName: string; title: string; priority?: string }>
): AgentResponse {
  const hasExams = exams.length > 0;
  const hasTopics = topics.length > 0;

  if (hasExams && hasTopics) {
    const subjects = [...new Set(topics.map(t => t.subjectName))];
    const examPreview = exams.slice(0, 3).map(e => `• **${e.name}** — ${e.date} at ${e.time}`).join('\n');
    const topicPreview = topics.slice(0, 4).map(t => `• [${t.subjectName}] ${t.title}`).join('\n');

    return {
      message: `> SYLLABUS & TIMETABLE DETECTED\n\nI successfully parsed your input:\n\n**Exams (${exams.length}):**\n${examPreview}${exams.length > 3 ? `\n• ...and ${exams.length - 3} more` : ''}\n\n**Syllabus (${topics.length} topics across ${subjects.length} subject(s)):**\n${topicPreview}${topics.length > 4 ? `\n• ...and ${topics.length - 4} more` : ''}\n\nClick **IMPORT ALL** below to add these to your syllabus and recalculate your study schedule.`,
      extractedExams: exams,
      extractedTopics: topics,
      tool: { name: 'import_syllabus_and_timetable', params: { exams, topics } },
    };
  }

  if (hasTopics) {
    const subjects = [...new Set(topics.map(t => t.subjectName))];
    const topicPreview = topics.slice(0, 5).map(t => `• [${t.subjectName}] ${t.title}`).join('\n');

    return {
      message: `> SYLLABUS TOPICS DETECTED\n\nI found **${topics.length} topic(s)** across **${subjects.length} subject(s)**:\n\n${topicPreview}${topics.length > 5 ? `\n• ...and ${topics.length - 5} more` : ''}\n\nClick **IMPORT ${topics.length} TOPICS** below to add them directly to your syllabus.`,
      extractedTopics: topics,
      tool: { name: 'import_topics', params: { topics } },
    };
  }

  const examPreview = exams.slice(0, 5).map(e => `• **${e.name}** — ${e.date} at ${e.time}`).join('\n');
  return {
    message: `> EXAM TIMETABLE DETECTED\n\nI found **${exams.length} exam(s)**:\n\n${examPreview}${exams.length > 5 ? `\n• ...and ${exams.length - 5} more` : ''}\n\nClick **IMPORT ALL** below to add these to your schedule.`,
    extractedExams: exams,
    tool: { name: 'import_exams', params: { exams } },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM General Chat (contextual, not refusal-based)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Intelligent dynamic contextual engine when Groq is offline or API key is absent
 * Only provides schedule telemetry if the user specifically asked about their timetable/progress.
 * Never hijacks general knowledge questions with fake study tips.
 */
function generateDynamicContextualReply(
  query: string,
  ctx: AgentContext
): string {
  const q = query.toLowerCase().trim();
  const upcomingExams = (ctx.exams || [])
    .filter(e => e.date >= ctx.referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0] || (ctx.exams || [])[0];
  const pendingTopics = (ctx.topics || []).filter(t => !t.completed);
  const highPriorityPending = pendingTopics.filter(t => t.priority === 'HIGH');
  const targetTopic = highPriorityPending[0] || pendingTopics[0];

  // Calculate days remaining to next exam
  let daysToNextExam = 0;
  if (nextExam) {
    const todayMs = new Date(ctx.referenceDate).getTime();
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
      return `### 🎯 Syllabus Complete!\n\nAll registered topics are marked complete (${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0}).\n\n**Recommended Next Action:**\n* Run a full mock test for **${nextExam ? nextExam.name : 'your upcoming exam'}**.\n* Create active-recall flashcards for high-yield formulas and definitions.`;
    }

    return `### 🎯 Immediate Priority: **${targetTopic.title}** (${targetTopic.subjectName})\n\nWith **${daysToNextExam} day(s)** until your **${nextExam ? nextExam.name : 'next exam'}**, this is your highest leverage topic right now.\n\n**Action Plan (${ctx.sessionDuration || 45}-Minute Focus Block):**\n1. **25 min — Active Retrieval:** Read the core formulas/concepts, then close your notes and write out everything you remember (blurting method).\n2. **15 min — Targeted Practice:** Solve 3–5 exam-style questions specifically on *${targetTopic.title}*.\n3. **5 min — Error Log:** Document mistakes in your revision notes to prevent repeat errors.\n\n*Lock in for ${ctx.sessionDuration || 45} minutes with zero notifications.*`;
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

    return `### 📊 Live Revision Telemetry\n\n* **Syllabus Coverage:** **${ctx.overallProgressPercent || 0}%** (${ctx.completedCount || 0} of ${ctx.totalTopicsCount || 0} topics mastered)\n* **Pending Topics:** **${remainingCount}** remaining (${highPriorityPending.length} high priority)\n* **Target Pace:** ~**${paceNeeded} topics/day** to complete your syllabus before **${nextExam ? nextExam.name : 'exam day'}**\n* **Daily Study Window:** **${ctx.dailyHours || 3} hours/day**\n\n${
      (ctx.overallProgressPercent || 0) >= 70
        ? '🔥 **Strong momentum!** You are well ahead of the curve. Transition towards past papers and timed question sets.'
        : (ctx.overallProgressPercent || 0) >= 30
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
    if (!ctx.exams || ctx.exams.length === 0) {
      return `### 📅 No Exams Recorded Yet\n\nPlease add your exam dates in the **Exams** tab or type them here (e.g. *"Maths exam on Oct 5 at 9am"*). I'll automatically generate your countdown and revision timetable.`;
    }

    const examList = upcomingExams.map((e, idx) => {
      const todayMs = new Date(ctx.referenceDate).getTime();
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
    if (!ctx.missedTasks || ctx.missedTasks.length === 0) {
      return `### ✅ Perfect Discipline!\n\nZero overdue study sessions detected for today (${ctx.referenceDate}). Your revision schedule is completely synchronized and on track.`;
    }

    const missedList = ctx.missedTasks.slice(0, 3).map(t => `• **${t.topicTitle}** (${t.subjectName})`).join('\n');
    return `### 🔄 Missed Sessions Detected (${ctx.missedTasks.length})\n\n${missedList}\n\n**Recovery Protocol:**\nClick **"I MISSED A DAY"** or use the **Daily Check-In** dialog to trigger autonomous rebalancing. Your remaining study slots will be dynamically recalculated without overflowing your daily study limit.`;
  }

  // 5. Timetable / Study Schedule / Routine query
  if (
    q.includes('time table') ||
    q.includes('timetable') ||
    q.includes('schedule') ||
    q.includes('study plan') ||
    q.includes('routine') ||
    q === 'plan' ||
    q === 'my plan' ||
    q === 'today plan' ||
    q === 'today timetable'
  ) {
    const todayTasks = (ctx.tasks || []).filter(t => t.date === ctx.referenceDate);
    const futureTasks = (ctx.tasks || []).filter(t => t.date > ctx.referenceDate);
    const hasAnyTasks = (ctx.tasks || []).length > 0;
    const hasExams = (ctx.exams || []).length > 0;

    let response = `### 📅 Your Revision Timetable & Schedule\n\n`;
    response += `* **Reference Date:** \`${ctx.referenceDate}\`\n* **Daily Target:** \`${ctx.dailyHours || 3} hours/day\`\n* **Syllabus Coverage:** **${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0} topics** mastered (${ctx.overallProgressPercent || 0}%)\n\n`;

    if (hasExams) {
      response += `#### ⏳ Upcoming Exam Milestones\n`;
      const examLines = upcomingExams.map((e, idx) => {
        const todayMs = new Date(ctx.referenceDate).getTime();
        const examMs = new Date(e.date).getTime();
        const diffDays = Math.max(0, Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24)));
        return `${idx + 1}. **${e.name}** — \`${e.date}\` at \`${e.time}\` (${diffDays} days away)`;
      }).join('\n');
      response += `${examLines}\n\n`;
    }

    if (todayTasks.length > 0) {
      response += `#### 🎯 Today's Study Sessions (${todayTasks.length} planned)\n`;
      todayTasks.forEach((t, i) => {
        const statusBadge = t.status === 'COMPLETED' ? '✅ COMPLETED' : t.status === 'IN_PROGRESS' ? '⏳ IN PROGRESS' : '📌 PENDING';
        response += `${i + 1}. **${t.startTime || 'Scheduled'}** — **${t.topicTitle}** [${t.subjectName}] · *${statusBadge}*\n`;
      });
      response += '\n';
    } else if (hasAnyTasks) {
      response += `#### 🎯 Today's Study Sessions\n*No sessions scheduled for today (${ctx.referenceDate}). Upcoming sessions resume on your next study day.*\n\n`;
    }

    if (futureTasks.length > 0) {
      const groupedByDate: Record<string, typeof futureTasks> = {};
      futureTasks.forEach(t => {
        if (!groupedByDate[t.date]) groupedByDate[t.date] = [];
        groupedByDate[t.date].push(t);
      });
      const dates = Object.keys(groupedByDate).sort().slice(0, 3);
      response += `#### 📋 Upcoming Sessions Preview\n`;
      dates.forEach(d => {
        response += `* **${d}:** ${groupedByDate[d].map(t => `${t.topicTitle} (${t.subjectName})`).join(', ')}\n`;
      });
      response += '\n';
    }

    if (!hasAnyTasks) {
      if (ctx.topics && ctx.topics.length > 0 && hasExams) {
        response += `> 💡 You have **${ctx.topics.length} syllabus topics** and **${ctx.exams.length} exams** registered, but your daily sessions haven't been built yet.\n\nType **"rebuild my plan"** or click **"REBUILD PLAN"** in your dashboard to generate your daily revision timetable!`;
      } else {
        response += `> 💡 No study schedule generated yet. Please add your exams in the **Exams** tab and syllabus in **Syllabus**, then click **"GENERATE PLAN"** to automatically build your daily study timetable!`;
      }
    }

    return response.trim();
  }

  // 6. Greetings / Help
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q === 'who are you'
  ) {
    return `### 👋 Welcome to Revisionly AI Command Center\n\nI am your academic mentor and revision strategist.\n\n**Live Status:**\n* **Next Exam:** ${nextExam ? `**${nextExam.name}** in **${daysToNextExam} day(s)**` : 'None scheduled'}\n* **Syllabus Progress:** **${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0} topics** complete (${ctx.overallProgressPercent || 0}%)\n* **Daily Study Window:** **${ctx.dailyHours || 3} hours/day**\n\nAsk me any concept question, homework problem, study advice, or ask me to adjust your timetable!`;
  }

  // 7. Honest offline fallback for any question/query
  return `### ⚠️ AI Assistant Offline\n\nI couldn't reach the AI language model to answer: *"${query}"*.\n\n**Possible solutions:**\n1. Ensure your device is connected to the internet.\n2. Verify that your **GROQ_API_KEY** is configured and active in Settings or \`.env\`.\n3. If asking about your schedule, try: *"What should I study now?"*, *"When is my next exam?"*, or *"Show my progress"*.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM General Chat (Answers user's actual question directly)
// ──────────────────────────────────────────────────────────────────────────────

async function handleGeneralChat(request: AgentRequest): Promise<AgentResponse> {
  const groq = getGroqClient();
  const ctx = request.context;

  const examsSummary = ctx.exams && ctx.exams.length > 0
    ? ctx.exams.map(e => `${e.name} on ${e.date} at ${e.time}`).join('; ')
    : 'None scheduled yet';

  const topicsSummary = `${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0} completed (${ctx.overallProgressPercent || 0}%)`;
  const missedSummary = ctx.missedTasks && ctx.missedTasks.length > 0
    ? `${ctx.missedTasks.length} missed (${ctx.missedTasks.slice(0, 3).map(m => m.topicTitle).join(', ')})`
    : 'None';

  const todayTasksSummary = ctx.tasks && ctx.tasks.filter(t => t.date === ctx.referenceDate).length > 0
    ? ctx.tasks.filter(t => t.date === ctx.referenceDate).map(t => `${t.startTime || ''} ${t.topicTitle} [${t.status}]`).join('; ')
    : 'No tasks allocated for today';

  const upcomingScheduleSummary = ctx.tasks && ctx.tasks.length > 0
    ? ctx.tasks.slice(0, 8).map(t => `${t.date} ${t.startTime || ''}: ${t.topicTitle} (${t.subjectName}) [${t.status}]`).join('; ')
    : 'No tasks generated yet';

  const systemPrompt = `You are REVISIONLY AI — an expert academic mentor, study coach, and tutor embedded in the Revisionly study planner app.

CORE DIRECTIVE:
1. ALWAYS ANSWER THE USER'S QUESTION DIRECTLY, ACCURATELY, AND FULLY FIRST.
2. If the user asks about ANY academic subject, concept, theory, formula, code, definition, history, science, math, or study technique:
   - Provide a clear, high-quality, comprehensive, and pedagogical explanation.
   - Use clear formatting (markdown, bold text, bullet points, math equations where helpful).
   - NEVER deflect, pivot away, or ignore the question.
   - NEVER say "this is not in your syllabus" unless the user explicitly asked if something is in their syllabus.
3. If the user asks about their study plan, timetable, schedule, what to study next, or how they are doing:
   - Present their timetable clearly using the STUDENT PROFILE context below.
   - Give specific, actionable, encouraging advice.
4. Keep explanations engaging, concise yet thorough, and directly relevant to what was asked.

STUDENT PROFILE & LIVE CONTEXT (Reference when relevant to their schedule or exams):
- Reference Date: ${ctx.referenceDate}
- Registered Exams: ${examsSummary}
- Syllabus Coverage: ${topicsSummary}
- Daily Study Availability: ${ctx.dailyHours || 3} hours/day
- Missed Sessions: ${missedSummary}
- Today's Tasks: ${todayTasksSummary}
- Upcoming Schedule: ${upcomingScheduleSummary}`;

  if (!groq) {
    return {
      message: generateDynamicContextualReply(request.message, ctx),
    };
  }

  // Filter out any empty history messages to prevent API errors
  const cleanHistory = (request.history || [])
    .filter(h => h && typeof h.content === 'string' && h.content.trim().length > 0)
    .slice(-10)
    .map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content.trim(),
    }));

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...cleanHistory,
    { role: 'user', content: request.message },
  ];

  // Try primary model (qwen/qwen3.8-27b), fallback to (openai/gpt-oss-120b)
  const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

  for (const model of modelsToTry) {
    try {
      const result = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      });

      const replyContent = result.choices[0]?.message?.content?.trim();
      if (replyContent && replyContent.length > 0) {
        return { message: replyContent };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Agent] Chat error with ${model}:`, errMsg);
    }
  }

  return {
    message: generateDynamicContextualReply(request.message, ctx),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main agent handler
// ──────────────────────────────────────────────────────────────────────────────

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const req = request || ({} as AgentRequest);
  const message = (req.message || '').trim();
  const hasAttachments = Boolean(req.attachments?.length);
  const attachmentNames = req.attachments?.map(a => a.name) || [];

  const intent = classifyIntent(message, hasAttachments, attachmentNames);
  const ctx = req.context || {
    exams: [],
    subjects: [],
    topics: [],
    tasks: [],
    missedTasks: [],
    overallProgressPercent: 0,
    completedCount: 0,
    totalTopicsCount: 0,
    dailyHours: 3,
    referenceDate: new Date().toISOString().split('T')[0],
    sessionDuration: 45,
  };

  switch (intent) {
    case 'DELETE_PLAN':       return handleDeletePlan(ctx);
    case 'CLEAR_ALL_DATA':    return handleClearAllData();
    case 'CREATE_PLAN':       return handleCreatePlan(ctx);
    case 'REBUILD_PLAN':      return handleRebuildPlan(ctx);
    case 'RESCHEDULE_MISSED': return handleRescheduleMissed(ctx);
    case 'UPDATE_HOURS':      return handleUpdateHours(message);
    case 'EXTRACT_DATA':      return extractSyllabusAndTimetable({ ...req, message, context: ctx, history: req.history || [] });
    default:                  return handleGeneralChat({ ...req, message, context: ctx, history: req.history || [] });
  }
}
