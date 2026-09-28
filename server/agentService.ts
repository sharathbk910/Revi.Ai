import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────────────────────────────────────────────────────────
// Clients
// ──────────────────────────────────────────────────────────────────────────────

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('your_') || key.startsWith('AQ.Ab8RN6JsDLcjISueQY1s')) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch {
    return null;
  }
}

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
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

// ──────────────────────────────────────────────────────────────────────────────
// Intent Classification (deterministic layer, no LLM needed)
// ──────────────────────────────────────────────────────────────────────────────

type IntentType =
  | 'DELETE_PLAN'
  | 'CLEAR_ALL_DATA'
  | 'CREATE_PLAN'
  | 'REBUILD_PLAN'
  | 'RESCHEDULE_MISSED'
  | 'UPDATE_HOURS'
  | 'UPDATE_PREFERENCES'
  | 'ADD_EXAM'
  | 'UPDATE_EXAM'
  | 'DELETE_EXAM'
  | 'ADD_TOPIC'
  | 'DELETE_TOPIC'
  | 'MARK_COMPLETE'
  | 'QUERY_PLAN'
  | 'QUERY_PROGRESS'
  | 'QUERY_NEXT_EXAM'
  | 'EXTRACT_TIMETABLE'
  | 'EXTRACT_SYLLABUS'
  | 'GENERAL_CHAT';

function classifyIntent(message: string, hasAttachments: boolean, attachmentNames: string[]): IntentType {
  const m = message.toLowerCase().trim();

  // File-based intents
  if (hasAttachments) {
    const names = attachmentNames.map(n => n.toLowerCase()).join(' ');
    if (names.includes('timetable') || names.includes('exam') || names.includes('schedule')) return 'EXTRACT_TIMETABLE';
    if (names.includes('syllabus') || names.includes('curriculum')) return 'EXTRACT_SYLLABUS';
    if (m.includes('timetable') || m.includes('exam') || m.includes('schedule')) return 'EXTRACT_TIMETABLE';
    if (m.includes('syllabus') || m.includes('topic') || m.includes('chapter') || m.includes('module')) return 'EXTRACT_SYLLABUS';
    return 'EXTRACT_TIMETABLE'; // default for file upload
  }

  // Delete plan
  if ((m.includes('delete') || m.includes('clear') || m.includes('remove') || m.includes('wipe')) && 
      (m.includes('plan') || m.includes('schedule') || m.includes('session') || m.includes('timetable'))) {
    return 'DELETE_PLAN';
  }

  // Clear everything
  if ((m.includes('delete') || m.includes('clear') || m.includes('remove') || m.includes('wipe')) && 
      (m.includes('all') || m.includes('everything'))) {
    return 'CLEAR_ALL_DATA';
  }

  // Create / generate plan
  if ((m.includes('create') || m.includes('generate') || m.includes('build') || m.includes('make')) &&
      (m.includes('plan') || m.includes('schedule') || m.includes('timetable'))) {
    return 'CREATE_PLAN';
  }

  // Rebuild / regenerate
  if (m.includes('rebuild') || m.includes('regenerate') || m.includes('recalculate') || m.includes('redo')) {
    return 'REBUILD_PLAN';
  }

  // Reschedule missed
  if (m.includes('missed') || m.includes('miss') || m.includes('reschedule') || m.includes('yesterday') || m.includes('catch up')) {
    return 'RESCHEDULE_MISSED';
  }

  // Update daily hours
  if ((m.includes('hour') || m.includes('hrs')) && 
      (m.includes('study') || m.includes('only') || m.includes('per day') || m.includes('daily') || m.includes('a day'))) {
    return 'UPDATE_HOURS';
  }

  // Update preferences
  if (m.includes('sunday') || m.includes('weekend') || m.includes('prefer') || m.includes('session') || 
      m.includes('minute') || m.includes('lighter') || m.includes('revision-heavy') || m.includes('morning') || m.includes('evening')) {
    return 'UPDATE_PREFERENCES';
  }

  // Move / update exam
  if ((m.includes('move') || m.includes('change') || m.includes('update') || m.includes('shift')) && 
      (m.includes('exam') || m.includes('test') || m.includes('october') || m.includes('oct'))) {
    return 'UPDATE_EXAM';
  }

  // Delete exam
  if ((m.includes('delete') || m.includes('remove') || m.includes('cancel')) && 
      (m.includes('exam') || m.includes('test'))) {
    return 'DELETE_EXAM';
  }

  // Add exam
  if ((m.includes('add') || m.includes('new') || m.includes('schedule')) && 
      (m.includes('exam') || m.includes('test'))) {
    return 'ADD_EXAM';
  }

  // Add topics
  if ((m.includes('add') || m.includes('include') || m.includes('new')) && 
      (m.includes('topic') || m.includes('chapter') || m.includes('subject'))) {
    return 'ADD_TOPIC';
  }

  // Mark complete
  if (m.includes('complete') || m.includes('done') || m.includes('finished') || m.includes('mark')) {
    return 'MARK_COMPLETE';
  }

  // Query next exam
  if (m.includes('next exam') || m.includes('upcoming exam') || m.includes('when is my')) {
    return 'QUERY_NEXT_EXAM';
  }

  // Query progress
  if (m.includes('progress') || m.includes('how much') || m.includes('percent') || m.includes('completed')) {
    return 'QUERY_PROGRESS';
  }

  // Query plan
  if (m.includes('what should') || m.includes('study now') || m.includes('today') || m.includes('priorit')) {
    return 'QUERY_PLAN';
  }

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

function handleRebuildPlan(): AgentResponse {
  return {
    message: `> REBUILDING PLAN\n\nRecalculating your entire schedule based on current exams, syllabus, and study availability.\n\nThis may take a moment...`,
    requiresConfirmation: true,
    confirmationText: 'Rebuild your entire study schedule?',
    tool: { name: 'rebuild_study_plan', params: {} },
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

function handleQueryPlan(ctx: AgentContext): AgentResponse {
  const nextTask = ctx.tasks.find(t => t.date === ctx.referenceDate && t.status === 'PENDING');
  if (!nextTask) {
    return {
      message: `> ALL DONE TODAY\n\nYou've completed all study sessions for today (${ctx.referenceDate}). Great work!\n\nYour next exam: **${ctx.exams[0]?.name || 'None scheduled'}**.`,
    };
  }
  return {
    message: `> CURRENT PRIORITY\n\nYour next study session:\n\n**${nextTask.topicTitle}**\n${nextTask.subjectName} • ${nextTask.startTime}\n\nThis is your highest-priority block right now. Lock in.`,
  };
}

function handleQueryProgress(ctx: AgentContext): AgentResponse {
  return {
    message: `> SYLLABUS READINESS\n\n**${ctx.completedCount} / ${ctx.totalTopicsCount} topics** completed\n**${ctx.overallProgressPercent}%** of your syllabus covered\n\nKeep at it — consistency compounds.`,
  };
}

function handleQueryNextExam(ctx: AgentContext): AgentResponse {
  const sortedExams = [...ctx.exams].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sortedExams.find(e => e.date >= ctx.referenceDate);
  if (!upcoming) {
    return { message: `> NO UPCOMING EXAMS\n\nNo exams scheduled after ${ctx.referenceDate}.` };
  }
  const d1 = new Date(ctx.referenceDate);
  const d2 = new Date(upcoming.date);
  const days = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return {
    message: `> NEXT EXAM\n\n**${upcoming.name}**\n${upcoming.date} at ${upcoming.time}\n\n**${days} day(s)** remaining\n\nFocus window is open. Prioritize now.`,
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

async function extractFromFiles(
  request: AgentRequest,
  intent: IntentType
): Promise<AgentResponse> {
  const gemini = getGeminiClient();

  const systemPrompt = intent === 'EXTRACT_TIMETABLE'
    ? `You are an academic timetable parser. Extract ALL exam/test entries from the provided image or document. 
Return ONLY a valid JSON object in this exact format, no markdown fences:
{
  "exams": [
    { "name": "Subject Name", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "subjectName": "Subject Name" }
  ],
  "confidence": "high|medium|low",
  "notes": "any relevant notes about ambiguous data"
}
Use YYYY-MM-DD for all dates. If year is not specified, use 2026.`
    : `You are an academic syllabus parser. Extract ALL subjects, chapters, and topics from the provided document.
Return ONLY a valid JSON object in this exact format, no markdown fences:
{
  "topics": [
    { "subjectName": "Subject Name", "title": "Topic Title", "priority": "HIGH|MEDIUM|LOW" }
  ],
  "confidence": "high|medium|low",
  "notes": "any relevant notes"
}`;

  if (!gemini && !getGroqClient()) {
    return {
      message: `> EXTRACTION UNAVAILABLE\n\nAI extraction requires a valid Gemini or Groq API key.\n\nPlease add your data manually or check your .env configuration.`,
      fallback: true,
    };
  }

  if (gemini) {
    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: systemPrompt },
        { text: `\n\nUser message: "${request.message}"\n\nExtract from the attached file(s):` },
      ];

      for (const att of request.attachments || []) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64Data,
          },
        });
      }

      const result = await gemini.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts }],
      });

      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (intent === 'EXTRACT_TIMETABLE' && parsed.exams) {
        const count = parsed.exams.length;
        const preview = parsed.exams.slice(0, 3).map((e: any) => `• **${e.name}** — ${e.date} at ${e.time}`).join('\n');
        const more = count > 3 ? `\n• ...and ${count - 3} more` : '';
        const confidence = parsed.confidence === 'low' ? '\n\n⚠️ Some dates may need review.' : '';

        return {
          message: `> TIMETABLE EXTRACTED\n\nI found **${count} exam(s)**:\n\n${preview}${more}${confidence}\n\nReview and import them into your schedule:`,
          extractedExams: parsed.exams,
          tool: { name: 'import_exams', params: { exams: parsed.exams } },
        };
      }

      if (intent === 'EXTRACT_SYLLABUS' && parsed.topics) {
        const count = parsed.topics.length;
        const subjects = [...new Set(parsed.topics.map((t: any) => t.subjectName))];
        const preview = subjects.slice(0, 4).map((s: any) => `• ${s}`).join('\n');
        const more = subjects.length > 4 ? `\n• ...and ${subjects.length - 4} more subjects` : '';

        return {
          message: `> SYLLABUS EXTRACTED\n\nI found **${count} topic(s)** across **${subjects.length} subject(s)**:\n\n${preview}${more}\n\nReady to import into your syllabus:`,
          extractedTopics: parsed.topics,
          tool: { name: 'import_topics', params: { topics: parsed.topics } },
        };
      }

      return {
        message: `> EXTRACTED\n\nHere's what I found from your file:\n\n${rawText.slice(0, 500)}`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Extraction failed';
      console.warn('[Agent] Gemini extraction error:', errMsg);
    }
  }

  // Fallback: try Groq text-only (images won't work but PDFs might have text)
  const groq = getGroqClient();
  if (groq && request.attachments?.some(a => a.mimeType === 'text/plain')) {
    try {
      const textContent = Buffer.from(
        request.attachments.find(a => a.mimeType === 'text/plain')!.base64Data,
        'base64'
      ).toString('utf-8');

      const result = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract from this text:\n\n${textContent.slice(0, 3000)}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const raw = result.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      if (intent === 'EXTRACT_TIMETABLE' && parsed.exams) {
        return {
          message: `> TIMETABLE EXTRACTED\n\nFound **${parsed.exams.length} exam(s)** from your document.`,
          extractedExams: parsed.exams,
          tool: { name: 'import_exams', params: { exams: parsed.exams } },
        };
      }
      if (intent === 'EXTRACT_SYLLABUS' && parsed.topics) {
        return {
          message: `> SYLLABUS EXTRACTED\n\nFound **${parsed.topics.length} topic(s)** from your document.`,
          extractedTopics: parsed.topics,
          tool: { name: 'import_topics', params: { topics: parsed.topics } },
        };
      }
    } catch (err: unknown) {
      console.warn('[Agent] Groq fallback extraction error:', err instanceof Error ? err.message : err);
    }
  }

  return {
    message: `> READING FILE\n\nI received your file(s).\n\nFor best results:\n- Image files need the Gemini API key configured\n- Text-based PDFs work with the current setup\n\nPlease add your Gemini API key in Settings to enable full multimodal support.`,
    fallback: true,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM General Chat (contextual, not refusal-based)
// ──────────────────────────────────────────────────────────────────────────────

async function handleGeneralChat(request: AgentRequest): Promise<AgentResponse> {
  const groq = getGroqClient();
  const ctx = request.context;

  const systemPrompt = `You are REVISIONLY AI — an intelligent academic planning agent embedded in the Revisionly study app.

You have DIRECT access to the user's study data and can perform real actions. You are NOT a generic chatbot.
You never say "I cannot modify your plan" — you either DO it or explain a specific technical reason you can't.

CURRENT USER STATE:
- Reference Date: ${ctx.referenceDate}
- Exams (${ctx.exams.length}): ${ctx.exams.slice(0, 5).map(e => `${e.name} on ${e.date}`).join('; ') || 'None'}
- Topics: ${ctx.completedCount}/${ctx.totalTopicsCount} completed (${ctx.overallProgressPercent}%)
- Daily study hours: ${ctx.dailyHours}h
- Missed sessions: ${ctx.missedTasks.length}
- Today's plan: ${ctx.tasks.filter(t => t.date === ctx.referenceDate).length} sessions

CONVERSATION HISTORY:
${request.history.slice(-6).map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}

RULES:
- Be concise, editorial, direct (2-4 sentences max unless planning)
- Use > PREFIX for system-style responses
- Never use generic AI disclaimers
- If user asks you to do something the app supports, tell them you'll handle it
- Reference their actual data (exam names, topic counts, etc.)
- Use JetBrains Mono-style technical language sparingly`;

  if (!groq) {
    return {
      message: `> AI OFFLINE\n\nGroq AI is not configured. Add GROQ_API_KEY to your .env file to enable intelligent responses.\n\nI can still execute actions — try: "delete my plan", "create my schedule", "reschedule missed sessions".`,
      fallback: true,
    };
  }

  try {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...request.history.slice(-8).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: request.message },
    ];

    const result = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.5,
      max_tokens: 400,
    });

    return {
      message: result.choices[0]?.message?.content?.trim() || '> Processing your request.',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Agent] Chat fallback:', errMsg);
    return {
      message: `> AGENT ACTIVE\n\nI'm connected to your data. What would you like me to do?\n\nTry: "Delete my plan", "Create a new schedule", "Reschedule missed sessions", or "How much of my syllabus is done?"`,
      fallback: true,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main agent handler
// ──────────────────────────────────────────────────────────────────────────────

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const hasAttachments = Boolean(request.attachments?.length);
  const attachmentNames = request.attachments?.map(a => a.name) || [];

  const intent = classifyIntent(request.message, hasAttachments, attachmentNames);
  const ctx = request.context;

  switch (intent) {
    case 'DELETE_PLAN':       return handleDeletePlan(ctx);
    case 'CLEAR_ALL_DATA':    return handleClearAllData();
    case 'CREATE_PLAN':       return handleCreatePlan(ctx);
    case 'REBUILD_PLAN':      return handleRebuildPlan();
    case 'RESCHEDULE_MISSED': return handleRescheduleMissed(ctx);
    case 'UPDATE_HOURS':      return handleUpdateHours(request.message);
    case 'UPDATE_EXAM':
    case 'DELETE_EXAM':
    case 'ADD_EXAM':
    case 'ADD_TOPIC':
    case 'DELETE_TOPIC':
    case 'MARK_COMPLETE':
    case 'UPDATE_PREFERENCES': return handleGeneralChat(request); // LLM handles complex mutations
    case 'QUERY_PLAN':        return handleQueryPlan(ctx);
    case 'QUERY_PROGRESS':    return handleQueryProgress(ctx);
    case 'QUERY_NEXT_EXAM':   return handleQueryNextExam(ctx);
    case 'EXTRACT_TIMETABLE':
    case 'EXTRACT_SYLLABUS':  return extractFromFiles(request, intent);
    default:                  return handleGeneralChat(request);
  }
}
