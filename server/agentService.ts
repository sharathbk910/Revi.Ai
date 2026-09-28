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
  const key = process.env.GROQ_API_KEY?.trim() || process.env.VITE_GROQ_API_KEY?.trim();
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
    return 'EXTRACT_TIMETABLE';
  }

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

/**
 * Intelligent dynamic contextual engine when Groq is offline or API key is absent
 * Generates rich, varied, and personalized replies tailored to user query and timetable context
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
    q.includes('highest priority') ||
    q.includes('start study') ||
    q.includes('where do i start') ||
    q.includes('recommend') ||
    q.includes('study now')
  ) {
    if (!targetTopic) {
      return `### 🎯 Syllabus Complete!\n\nAll registered topics are marked complete (${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0}).\n\n**Recommended Next Action:**\n* Run a full mock test for **${nextExam ? nextExam.name : 'your upcoming exam'}**.\n* Create active-recall flashcards for high-yield formulas and definitions.`;
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
    q.includes('next exam') ||
    q.includes('exam') ||
    q.includes('date') ||
    q.includes('when is') ||
    q.includes('countdown')
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
    q.includes('missed') ||
    q.includes('yesterday') ||
    q.includes('catch up') ||
    q.includes('behind') ||
    q.includes('late')
  ) {
    if (!ctx.missedTasks || ctx.missedTasks.length === 0) {
      return `### ✅ Perfect Discipline!\n\nZero overdue study sessions detected for today (${ctx.referenceDate}). Your revision schedule is completely synchronized and on track.`;
    }

    const missedList = ctx.missedTasks.slice(0, 3).map(t => `• **${t.topicTitle}** (${t.subjectName})`).join('\n');
    return `### 🔄 Missed Sessions Detected (${ctx.missedTasks.length})\n\n${missedList}\n\n**Recovery Protocol:**\nClick **"I MISSED A DAY"** or use the **Daily Check-In** dialog to trigger autonomous rebalancing. Your remaining study slots will be dynamically recalculated without overflowing your daily study limit.`;
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
    return `### 👋 Welcome to Revisionly AI Command Center\n\nI am your live academic planner and exam strategist.\n\n**Current Live Snapshot:**\n* **Next Exam:** ${nextExam ? `**${nextExam.name}** in **${daysToNextExam} day(s)**` : 'None scheduled'}\n* **Syllabus Progress:** **${ctx.completedCount || 0}/${ctx.totalTopicsCount || 0} topics** complete (${ctx.overallProgressPercent || 0}%)\n* **Daily Study Window:** **${ctx.dailyHours || 3} hours/day**\n\n**Try asking:**\n* *"What should I study right now?"*\n* *"How much syllabus do I have left?"*\n* *"Explain the Feynman technique"*\n* Or upload a timetable image / syllabus PDF!`;
  }

  // 7. General Academic Coaching & Guidance
  return `### 💡 Academic Strategy (${nextExam ? nextExam.name : 'Revisionly'})\n\nRegarding: *"${query}"*\n\n**Key Strategic Guidance:**\n* **Focus Target:** Direct your prime energy towards **${targetTopic ? targetTopic.title : 'high-yield concepts'}** for your upcoming exam.\n* **Time Management:** Break study time into **${ctx.sessionDuration || 45}-minute** focused intervals followed by 10-minute active breaks.\n* **Self-Testing:** Spend at least 60% of study time on active recall questions rather than passive reading.\n\nNeed to adjust your timetable? Type *"Rebuild my plan"* or specify *"I can study 4 hours a day"*.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM General Chat (contextual, not refusal-based)
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
    ? ctx.tasks.filter(t => t.date === ctx.referenceDate).map(t => `${t.topicTitle} [${t.status}]`).join('; ')
    : 'No tasks allocated for today';

  const systemPrompt = `You are REVISIONLY AI — an elite academic planning and study coaching agent embedded in the Revisionly study planner app.

STUDENT PROFILE & LIVE CONTEXT:
- Today's Date: ${ctx.referenceDate}
- Exams Scheduled: ${examsSummary}
- Syllabus Coverage: ${topicsSummary}
- Daily Study Availability: ${ctx.dailyHours || 3} hours/day
- Missed Revision Sessions: ${missedSummary}
- Scheduled Tasks for Today: ${todayTasksSummary}

YOUR ROLE & INSTRUCTIONS:
- You are speaking directly to a student. Be supportive, concise, analytically sharp, and highly actionable.
- NEVER give generic, repetitive, or canned responses. Always tailor your reply specifically to what the student is asking right now.
- If asked "What to study now?" or "What should I study?": Check their earliest upcoming exam and pending topics. Recommend a concrete study session with duration and active recall strategy.
- If asked about progress: Give a direct, encouraging evaluation with realistic countdown guidance.
- If they ask general academic or study questions (e.g., explaining a concept, study techniques like Feynman or Pomodoro), explain clearly and concisely.
- Keep responses readable using clean formatting (bullet points, bold text). Keep under 200 words unless a detailed breakdown is requested.`;

  if (!groq) {
    return {
      message: generateDynamicContextualReply(request.message, ctx),
    };
  }

  try {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...request.history.slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: request.message },
    ];

    const result = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const replyContent = result.choices[0]?.message?.content?.trim();
    if (replyContent && replyContent.length > 0) {
      return { message: replyContent };
    }

    return {
      message: generateDynamicContextualReply(request.message, ctx),
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Agent] Chat error from Groq, using dynamic contextual fallback:', errMsg);
    return {
      message: generateDynamicContextualReply(request.message, ctx),
    };
  }
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
    case 'REBUILD_PLAN':      return handleRebuildPlan();
    case 'RESCHEDULE_MISSED': return handleRescheduleMissed(ctx);
    case 'UPDATE_HOURS':      return handleUpdateHours(message);
    case 'EXTRACT_TIMETABLE':
    case 'EXTRACT_SYLLABUS':  return extractFromFiles({ ...req, message, context: ctx, history: req.history || [] }, intent);
    default:                  return handleGeneralChat({ ...req, message, context: ctx, history: req.history || [] });
  }
}
