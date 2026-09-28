import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import {
  callAgent,
  fileToBase64,
  formatFileSize,
  isAcceptableFile,
  type AgentAttachment,
  type AgentContextPayload,
  type AgentHistoryMessage,
  type AgentServerResponse,
} from '../../services/agentService';
import {
  X,
  Send,
  Paperclip,
  ImageIcon,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  UploadCloud,
  Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MessageType = 'user' | 'agent' | 'system' | 'confirmation' | 'action-result';

interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  time: string;
  attachments?: AgentAttachment[];
  // For confirmation prompts
  pendingTool?: { name: string; params: Record<string, unknown> };
  confirmationText?: string;
  extractedExams?: AgentServerResponse['extractedExams'];
  extractedTopics?: AgentServerResponse['extractedTopics'];
  resolved?: boolean;
  // For action results
  actionName?: string;
  actionSuccess?: boolean;
}

interface NexAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status indicator
// ─────────────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'thinking' | 'executing' | 'error';

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'READY',
  thinking: 'LOADING...',
  executing: 'EXECUTING...',
  error: 'ERROR — REQUEST FAILED',
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick actions (only 5, focused)
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'WHAT TO STUDY NOW?', prompt: 'What is the highest priority topic I should study right now?' },
  { label: 'REBUILD MY PLAN', prompt: 'Rebuild my entire study schedule.' },
  { label: 'I MISSED A DAY', prompt: 'I missed yesterday. Please reschedule my missed sessions.' },
  { label: 'MY PROGRESS', prompt: 'How much of my syllabus have I completed?' },
  { label: 'NEXT EXAM', prompt: 'What is my next exam and how many days do I have?' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Markdown-lite renderer (bold, code, newlines)
// ─────────────────────────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-[var(--foreground)]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment Preview component
// ─────────────────────────────────────────────────────────────────────────────

const AttachmentChip: React.FC<{
  att: AgentAttachment;
  onRemove?: () => void;
}> = ({ att, onRemove }) => {
  const isImage = att.mimeType.startsWith('image/');
  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] bg-[var(--muted)] max-w-[200px]">
      {isImage && att.previewUrl ? (
        <img src={att.previewUrl} alt={att.name} className="w-8 h-8 object-cover shrink-0" />
      ) : (
        <FileText className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] text-[var(--foreground)] truncate">{att.name}</div>
        <div className="font-mono text-[9px] text-[var(--muted-foreground)]">{formatFileSize(att.sizeBytes)}</div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors shrink-0 p-0.5"
          aria-label="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Exams Review component
// ─────────────────────────────────────────────────────────────────────────────

const ExtractedExamsReview: React.FC<{
  exams: NonNullable<AgentServerResponse['extractedExams']>;
  onImport: (exams: NonNullable<AgentServerResponse['extractedExams']>) => void;
  onDismiss: () => void;
  disabled: boolean;
}> = ({ exams, onImport, onDismiss, disabled }) => (
  <div className="mt-3 border border-[var(--border)] bg-[var(--background)]">
    <div className="p-3 border-b border-[var(--border)] font-mono text-[10px] text-[var(--accent)] uppercase tracking-widest">
      {exams.length} EXAM(S) DETECTED
    </div>
    <div className="max-h-48 overflow-y-auto">
      {exams.map((exam, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] last:border-0">
          <div>
            <div className="font-mono text-xs text-[var(--foreground)]">{exam.name}</div>
            <div className="font-mono text-[10px] text-[var(--muted-foreground)]">{exam.date} · {exam.time}</div>
          </div>
          <div className="font-mono text-[10px] text-[var(--muted-foreground)]">{exam.subjectName || '—'}</div>
        </div>
      ))}
    </div>
    <div className="p-3 flex items-center gap-2">
      <button
        onClick={() => onImport(exams)}
        disabled={disabled}
        className="btn-primary text-[10px] px-3 py-1.5 font-mono disabled:opacity-40"
      >
        <CheckCircle className="w-3 h-3 inline mr-1" />
        IMPORT ALL
      </button>
      <button
        onClick={onDismiss}
        className="btn-ghost text-[10px] px-3 py-1.5 font-mono"
      >
        DISMISS
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Topics Review component
// ─────────────────────────────────────────────────────────────────────────────

const ExtractedTopicsReview: React.FC<{
  topics: NonNullable<AgentServerResponse['extractedTopics']>;
  onImport: (topics: NonNullable<AgentServerResponse['extractedTopics']>) => void;
  onDismiss: () => void;
  disabled: boolean;
}> = ({ topics, onImport, onDismiss, disabled }) => {
  const subjects = [...new Set(topics.map(t => t.subjectName))];
  return (
    <div className="mt-3 border border-[var(--border)] bg-[var(--background)]">
      <div className="p-3 border-b border-[var(--border)] font-mono text-[10px] text-[var(--accent)] uppercase tracking-widest">
        {topics.length} TOPIC(S) · {subjects.length} SUBJECT(S)
      </div>
      <div className="max-h-48 overflow-y-auto">
        {subjects.slice(0, 6).map(subj => {
          const subTopics = topics.filter(t => t.subjectName === subj);
          return (
            <div key={subj} className="px-3 py-2 border-b border-[var(--border)] last:border-0">
              <div className="font-mono text-[10px] text-[var(--accent)] uppercase mb-1">{subj}</div>
              {subTopics.slice(0, 3).map((t, i) => (
                <div key={i} className="font-mono text-[10px] text-[var(--muted-foreground)] pl-2">• {t.title}</div>
              ))}
              {subTopics.length > 3 && (
                <div className="font-mono text-[10px] text-[var(--muted-foreground)] pl-2">+{subTopics.length - 3} more</div>
              )}
            </div>
          );
        })}
        {subjects.length > 6 && (
          <div className="px-3 py-2 font-mono text-[10px] text-[var(--muted-foreground)]">+{subjects.length - 6} more subjects</div>
        )}
      </div>
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={() => onImport(topics)}
          disabled={disabled}
          className="btn-primary text-[10px] px-3 py-1.5 font-mono disabled:opacity-40"
        >
          <CheckCircle className="w-3 h-3 inline mr-1" />
          IMPORT {topics.length} TOPICS
        </button>
        <button onClick={onDismiss} className="btn-ghost text-[10px] px-3 py-1.5 font-mono">
          DISMISS
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation Bubble
// ─────────────────────────────────────────────────────────────────────────────

const ConfirmationBubble: React.FC<{
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
  resolved: boolean;
}> = ({ text, onConfirm, onCancel, disabled, resolved }) => {
  if (resolved) {
    return (
      <div className="font-mono text-[10px] text-[var(--muted-foreground)] italic mt-2">
        {/* resolved */}
      </div>
    );
  }
  return (
    <div className="mt-3 border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
      <div className="font-mono text-[10px] text-[var(--foreground)] mb-2 flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 text-[var(--accent)]" />
        {text}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="btn-primary text-[10px] px-3 py-1.5 font-mono disabled:opacity-40"
        >
          CONFIRM
        </button>
        <button
          onClick={onCancel}
          className="btn-ghost text-[10px] px-3 py-1.5 font-mono"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────────────────────

export const NexAssistantModal: React.FC<NexAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    exams, subjects, topics, tasks, missedTasks,
    todayTasks: _todayTasks, overallProgressPercent, completedCount, totalTopicsCount,
    availability, preferences, referenceDate,
    addExam, addTopic: _addTopic, bulkAddTopics, updateAvailability, updatePreferences: _updatePreferences,
    deleteExam: _deleteExam, deleteTopic: _deleteTopic, clearAllData, autoRescheduleMissed,
    recalculateSchedule, addToast,
  } = usePlanner();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'agent',
      content: `> REVISIONLY AI ACTIVE\n\nI'm connected to your timetable, syllabus, and study plan.\n\nYou can:\n- Type commands ("Delete my plan", "Reschedule missed sessions")\n- Upload your timetable image or syllabus PDF\n- Ask me anything about your upcoming exams`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [history, setHistory] = useState<AgentHistoryMessage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const modalId = useId();

  // ── Build context payload ────────────────────────────────────────────────
  const buildContext = useCallback((): AgentContextPayload => ({
    exams: exams.map(e => ({ id: e.id, name: e.name, date: e.date, time: e.time, subjectName: e.subjectName })),
    subjects: subjects.map(s => ({ id: s.id, name: s.name })),
    topics: topics.map(t => ({ id: t.id, title: t.title, subjectName: t.subjectName, completed: t.completed, priority: t.priority })),
    tasks: tasks.map(t => ({ id: t.id, date: t.date, topicTitle: t.topicTitle, subjectName: t.subjectName, status: t.status, startTime: t.startTime })),
    missedTasks: missedTasks.map(t => ({ id: t.id, topicTitle: t.topicTitle, subjectName: t.subjectName, date: t.date })),
    overallProgressPercent,
    completedCount,
    totalTopicsCount,
    dailyHours: availability?.dailyHours || 3,
    referenceDate,
    sessionDuration: preferences?.sessionDuration || 45,
  }), [exams, subjects, topics, tasks, missedTasks, overallProgressPercent, completedCount, totalTopicsCount, availability, referenceDate, preferences]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show contextual welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const ctx = buildContext();
      const hasData = ctx.exams.length > 0 || ctx.topics.length > 0;
      const welcomeText = hasData
        ? `> REVISIONLY AI ACTIVE\n\nConnected to your data:\n- **${ctx.exams.length} exam(s)** scheduled\n- **${ctx.topics.length} topic(s)** in syllabus (${ctx.completedCount} completed)\n- **${ctx.dailyHours}h/day** study capacity\n\nType a command or upload a file.`
        : `> REVISIONLY AI ACTIVE\n\nYour study system is currently empty.\n\nYou can:\n- Type your exam dates (e.g., "Python exam on Oct 3 at 9am")\n- Upload a timetable image or PDF\n- Upload your syllabus document\n\nI'll extract the data and create your plan.`;

      setMessages([{
        id: 'welcome',
        type: 'agent',
        content: welcomeText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus input when opened and handle Escape key
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      const handleKeyDownGlobal = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDownGlobal);
      return () => window.removeEventListener('keydown', handleKeyDownGlobal);
    }
  }, [isOpen, onClose]);

  // ── Add message helper ────────────────────────────────────────────────────

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'time'>): string => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { ...msg, id, time }]);
    return id;
  };

  const resolveMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, resolved: true } : m));
  };

  // ── Execute a confirmed tool ─────────────────────────────────────────────

  const executeTool = useCallback(async (tool: { name: string; params: Record<string, unknown> }) => {
    setStatus('executing');
    try {
      switch (tool.name) {
        case 'delete_current_plan':
          // Clear only tasks (not exams/topics)
          // We recalculate with 0 existing tasks by resetting availability to same value
          recalculateSchedule();
          addToast('SUCCESS', '> PLAN.CLEARED', 'Study sessions removed. Ready for new schedule.');
          return '> PLAN.CLEARED\n\nYour study sessions have been removed.\n\nSend your exam timetable and syllabus and I\'ll generate a fresh plan.';

        case 'rebuild_study_plan':
          recalculateSchedule();
          addToast('SUCCESS', '> PLAN.REBUILT', 'Schedule recalculated from current data.');
          return `> PLAN.REBUILT\n\nRecalculated from:\n- ${exams.length} exams\n- ${topics.filter(t => !t.completed).length} pending topics\n- ${availability.dailyHours}h/day\n\nOpen Dashboard to see your updated sessions.`;

        case 'generate_study_plan':
          recalculateSchedule();
          addToast('SUCCESS', '> PLAN.GENERATED', 'Study schedule created.');
          return `> PLAN.GENERATED\n\nCreated study sessions for:\n- ${topics.filter(t => !t.completed).length} pending topics\n- ${exams.length} exams\n\nOpen **Dashboard** or **My Plan** to view your schedule.`;

        case 'reschedule_missed':
          await autoRescheduleMissed();
          return `> RESCHEDULE.COMPLETE\n\n${missedTasks.length} missed session(s) rebalanced across your remaining study days.\n\nCheck **My Plan** for the updated schedule.`;

        case 'clear_all_data':
          await clearAllData();
          return '> DATA.CLEARED\n\nAll exams, topics, and sessions have been removed.\n\nYou can now upload your timetable to start fresh.';

        case 'update_study_hours': {
          const hours = Number(tool.params.hours);
          if (hours > 0 && hours <= 16) {
            await updateAvailability({ dailyHours: hours });
            return `> HOURS.UPDATED\n\nDaily study availability set to **${hours} hours**.\n\nYour plan will be recalculated automatically.`;
          }
          return '> INVALID\n\nPlease specify a number between 1 and 16.';
        }

        case 'import_exams': {
          const importedExams = tool.params.exams as Array<{ name: string; date: string; time: string; subjectName?: string }>;
          let count = 0;
          for (const exam of importedExams) {
            const subjectId = `subject-${exam.name.toLowerCase().replace(/\s+/g, '-')}`;
            await addExam({
              name: exam.name,
              subjectId,
              subjectName: exam.subjectName || exam.name,
              date: exam.date,
              time: exam.time || '09:00 AM',
              durationMinutes: 180,
              priority: 'HIGH',
            });
            count++;
          }
          return `> EXAMS.IMPORTED\n\n**${count} exam(s)** added to your schedule.\n\nOpen the Exams view to review and edit them.`;
        }

        case 'import_topics': {
          const importedTopics = tool.params.topics as Array<{ subjectName: string; title: string; priority?: string }>;
          const grouped = importedTopics.reduce((acc, t) => {
            acc[t.subjectName] = acc[t.subjectName] || [];
            acc[t.subjectName].push(t.title);
            return acc;
          }, {} as Record<string, string[]>);

          let totalCount = 0;
          for (const [subjectName, topicTitles] of Object.entries(grouped)) {
            const existingSubject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
            const subjectId = existingSubject?.id || `subject-${subjectName.toLowerCase().replace(/\s+/g, '-')}`;
            await bulkAddTopics(subjectId, topicTitles);
            totalCount += topicTitles.length;
          }

          return `> SYLLABUS.IMPORTED\n\n**${totalCount} topic(s)** imported across **${Object.keys(grouped).length} subject(s)**.\n\nOpen **Syllabus** to review and edit them.`;
        }

        default:
          return `> TOOL.UNKNOWN\n\nAction "${tool.name}" is not yet implemented in this version.`;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      addToast('WARNING', '> ACTION.FAILED', 'Could not complete the requested action.');
      throw new Error(errMsg);
    } finally {
      setStatus('idle');
    }
  }, [
    exams, topics, subjects, missedTasks, availability,
    addExam, _addTopic, bulkAddTopics, updateAvailability,
    clearAllData, autoRescheduleMissed, recalculateSchedule, addToast,
  ]);

  // ── Handle confirmation ──────────────────────────────────────────────────

  const handleConfirm = useCallback(async (msgId: string, tool: { name: string; params: Record<string, unknown> }) => {
    resolveMessage(msgId);
    setStatus('executing');
    try {
      const result = await executeTool(tool);
      addMessage({ type: 'action-result', content: result, actionName: tool.name, actionSuccess: true });
      setHistory(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Action failed';
      addMessage({ type: 'action-result', content: `> ACTION.FAILED\n\n${errMsg}`, actionName: tool.name, actionSuccess: false });
    } finally {
      setStatus('idle');
    }
  }, [executeTool]);

  // ── Handle file upload ───────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const errors: string[] = [];

    for (const file of fileArray) {
      const check = isAcceptableFile(file);
      if (!check.ok) {
        errors.push(`${file.name}: ${check.reason}`);
        continue;
      }
      try {
        const att = await fileToBase64(file);
        setAttachments(prev => [...prev, att]);
      } catch {
        errors.push(`${file.name}: Failed to read file.`);
      }
    }

    if (errors.length > 0) {
      addMessage({ type: 'system', content: `> FILE.ERROR\n\n${errors.join('\n')}` });
    }
  }, []);

  // ── Cancel in-flight request ─────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    addMessage({ type: 'system', content: '> REQUEST.CANCELLED\n\nCancelled by user.' });
  }, []);

  // ── Submit message ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = (messageText ?? inputText).trim();
    if (!text && attachments.length === 0) return;
    if (status === 'thinking' || status === 'executing') return;

    const currentAttachments = [...attachments];
    const userHistoryEntry: AgentHistoryMessage = { role: 'user', content: text };

    // Add user message
    addMessage({
      type: 'user',
      content: text || (currentAttachments.length > 0 ? `[${currentAttachments.length} file(s) attached]` : ''),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    });

    setInputText('');
    setAttachments([]);
    setStatus('thinking');
    setLastFailedMessage(null);

    // Setup abort + timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await callAgent(
        text,
        buildContext(),
        history,
        currentAttachments.length > 0 ? currentAttachments : undefined
      );

      clearTimeout(timeoutId);
      setHistory(prev => [...prev, userHistoryEntry]);

      if (response.requiresConfirmation && response.tool) {
        addMessage({
          type: 'confirmation',
          content: response.message,
          pendingTool: response.tool,
          confirmationText: response.confirmationText || 'Confirm this action?',
          extractedExams: response.extractedExams,
          extractedTopics: response.extractedTopics,
          resolved: false,
        });
        setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
      } else if (response.tool && !response.requiresConfirmation) {
        addMessage({ type: 'agent', content: response.message });
        setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
        setTimeout(async () => {
          setStatus('executing');
          try {
            const result = await executeTool(response.tool!);
            addMessage({ type: 'action-result', content: result, actionName: response.tool!.name, actionSuccess: true });
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Action failed';
            addMessage({ type: 'action-result', content: `> ACTION.FAILED\n\n${errMsg}`, actionSuccess: false });
          } finally {
            setStatus('idle');
          }
        }, 200);
        return; // status set inside setTimeout
      } else {
        addMessage({
          type: 'agent',
          content: response.message,
          extractedExams: response.extractedExams,
          extractedTopics: response.extractedTopics,
        });
        setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAborted = (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort')));
      if (isAborted) {
        // Already handled in handleCancel
        return;
      }
      setStatus('error');
      setLastFailedMessage(text);
      addMessage({
        type: 'system',
        content: `> AI.UNAVAILABLE\n\nRevisionly AI couldn't complete that request.\n\nPossible causes:\n- Server not running (dev: npm run dev)\n- No GROQ_API_KEY in .env\n- Network timeout\n\nYour study planner continues to work normally.`,
      });
      setTimeout(() => setStatus('idle'), 2000);
      return;
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
    }

    setStatus('idle');
  }, [inputText, attachments, status, history, buildContext, executeTool]);

  // ── Drag and drop ────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    await handleFiles(e.dataTransfer.files);
  };

  // ── Keyboard submission ──────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isbusy = status === 'thinking' || status === 'executing';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close assistant overlay"
      />

      {/* Main Panel */}
      <div
        className="relative z-10 flex flex-col bg-[var(--card)] border-l border-[var(--border)] w-full max-w-lg h-full max-h-[100dvh] shadow-2xl overflow-hidden font-mono"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--background)]/90 border-2 border-dashed border-[var(--accent)] pointer-events-none">
            <div className="text-center">
              <UploadCloud className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
              <div className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest">DROP FILES HERE</div>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--accent)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={`${modalId}-title`} className="font-display text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                  REVISIONLY AI
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 border border-[var(--accent)]/40 text-[var(--accent)] uppercase font-semibold">
                  AGENT
                </span>
              </div>
              <div
                className={`text-[10px] uppercase tracking-wider flex items-center gap-1.5 mt-0.5 ${
                  isbusy ? 'text-[var(--accent)]' : status === 'error' ? 'text-red-500' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {isbusy ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} />
                )}
                {STATUS_LABELS[status]}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Close AI Assistant (Esc)"
            aria-label="Close AI assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]/40 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => handleSubmit(action.prompt)}
              disabled={isbusy}
              className="shrink-0 px-3 py-1.5 border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors disabled:opacity-40"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Sender label + time */}
              <div className="font-mono text-[9px] text-[var(--muted-foreground)] uppercase mb-1.5">
                {msg.type === 'user' ? 'YOU' : msg.type === 'system' ? 'SYSTEM' : 'REVISIONLY AI'} · {msg.time}
              </div>

              {/* User bubble */}
              {msg.type === 'user' && (
                <div className="max-w-[85%]">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5 justify-end">
                      {msg.attachments.map((att, i) => (
                        <AttachmentChip key={i} att={att} />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="bg-[var(--accent)] text-white px-3 py-2.5 font-mono text-xs leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              )}

              {/* Agent / System / Action-result bubble */}
              {(msg.type === 'agent' || msg.type === 'system' || msg.type === 'action-result') && (
                <div className="max-w-[92%] bg-[var(--muted)] border border-[var(--border)] px-3 py-2.5">
                  <div className={`font-mono text-xs leading-relaxed ${
                    msg.type === 'action-result' && msg.actionSuccess === false ? 'text-red-500' : 'text-[var(--foreground)]'
                  }`}>
                    {renderMarkdown(msg.content)}
                  </div>

                  {/* Extracted exams review */}
                  {msg.extractedExams && msg.extractedExams.length > 0 && (
                    <ExtractedExamsReview
                      exams={msg.extractedExams}
                      onImport={(exams) => executeTool({ name: 'import_exams', params: { exams } })}
                      onDismiss={() => {}}
                      disabled={isbusy}
                    />
                  )}

                  {/* Extracted topics review */}
                  {msg.extractedTopics && msg.extractedTopics.length > 0 && (
                    <ExtractedTopicsReview
                      topics={msg.extractedTopics}
                      onImport={(topics) => executeTool({ name: 'import_topics', params: { topics } })}
                      onDismiss={() => {}}
                      disabled={isbusy}
                    />
                  )}
                </div>
              )}

              {/* Confirmation bubble */}
              {msg.type === 'confirmation' && (
                <div className="max-w-[92%] bg-[var(--muted)] border border-[var(--border)] px-3 py-2.5">
                  <div className="font-mono text-xs leading-relaxed text-[var(--foreground)]">
                    {renderMarkdown(msg.content)}
                  </div>

                  {msg.extractedExams && msg.extractedExams.length > 0 && (
                    <ExtractedExamsReview
                      exams={msg.extractedExams}
                      onImport={(exams) => {
                        resolveMessage(msg.id);
                        executeTool({ name: 'import_exams', params: { exams } });
                      }}
                      onDismiss={() => resolveMessage(msg.id)}
                      disabled={isbusy}
                    />
                  )}

                  {msg.extractedTopics && msg.extractedTopics.length > 0 && (
                    <ExtractedTopicsReview
                      topics={msg.extractedTopics}
                      onImport={(topics) => {
                        resolveMessage(msg.id);
                        executeTool({ name: 'import_topics', params: { topics } });
                      }}
                      onDismiss={() => resolveMessage(msg.id)}
                      disabled={isbusy}
                    />
                  )}

                  {msg.pendingTool && !msg.extractedExams && !msg.extractedTopics && (
                    <ConfirmationBubble
                      text={msg.confirmationText || 'Confirm this action?'}
                      onConfirm={() => handleConfirm(msg.id, msg.pendingTool!)}
                      onCancel={() => {
                        resolveMessage(msg.id);
                        addMessage({ type: 'agent', content: '> CANCELLED\n\nNo changes were made.' });
                      }}
                      disabled={isbusy}
                      resolved={msg.resolved === true}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Status indicator */}
          {isbusy && (
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--accent)]">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {status === 'thinking' ? 'ANALYZING REQUEST...' : 'EXECUTING ACTION...'}
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="text-[9px] uppercase tracking-wider underline hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Last failed message retry */}
          {lastFailedMessage && !isbusy && (
            <div className="flex items-center justify-between font-mono text-[10px] bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-400">
              <span>Request failed to complete.</span>
              <button
                type="button"
                onClick={() => {
                  const retryText = lastFailedMessage;
                  setLastFailedMessage(null);
                  handleSubmit(retryText);
                }}
                className="underline uppercase tracking-wider hover:text-red-200 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Attachment Preview Row ─────────────────────────────────────── */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] flex gap-2 flex-wrap bg-[var(--background)] shrink-0">
            {attachments.map((att, i) => (
              <AttachmentChip
                key={i}
                att={att}
                onRemove={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}

        {/* ── Composer ───────────────────────────────────────────────────── */}
        <div className="border-t border-[var(--border)] p-4 shrink-0 bg-[var(--card)] space-y-2">
          {/* File buttons & quick tools */}
          <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wider font-semibold text-[var(--foreground)]">Chat Input</span>
              <span>·</span>
              <span>Attach:</span>
              <button
                type="button"
                id={`${modalId}-doc-btn`}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="Upload syllabus PDF or exam timetable"
              >
                <Paperclip className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="underline underline-offset-2">Doc/PDF</span>
              </button>
              <button
                type="button"
                id={`${modalId}-img-btn`}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1 hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="Upload timetable photo or image"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="underline underline-offset-2">Photo</span>
              </button>
            </div>
            <span className="hidden sm:inline text-[9px]">Shift+Enter for newline</span>
          </div>

          {/* Input Box Container */}
          <div className="flex items-end gap-2 p-2.5 border border-[var(--border)] bg-[var(--input)] focus-within:border-[var(--accent)] transition-colors">
            {/* Text input */}
            <textarea
              ref={inputRef}
              id={`${modalId}-input`}
              value={inputText}
              onChange={e => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, type exam date, or request a schedule rebuild..."
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] min-h-[40px] max-h-[120px] py-1 leading-relaxed"
              disabled={isbusy}
              aria-label="Message input"
            />

            {/* Send button */}
            <button
              type="button"
              id={`${modalId}-send-btn`}
              onClick={() => handleSubmit()}
              disabled={isbusy || (!inputText.trim() && attachments.length === 0)}
              className="btn-primary text-xs px-4 py-2 min-h-[40px] shrink-0 disabled:opacity-40 flex items-center gap-1.5"
              title="Send message (Enter)"
              aria-label="Send message"
            >
              {isbusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">SEND</span>
                </>
              )}
            </button>
          </div>

          <div className="font-mono text-[9px] text-[var(--muted-foreground)] flex items-center justify-between">
            <span>Press Enter to send · Drag & drop files anywhere</span>
            <span>Revisionly AI Agent v2</span>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
          aria-hidden="true"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          capture="environment"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
