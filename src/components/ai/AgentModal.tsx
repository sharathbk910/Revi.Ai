import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import {
  callAgent,
  fileToBase64,
  formatFileSize,
  isAcceptableFile,
  type AgentAttachment,
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
  thinking: 'ANALYZING...',
  executing: 'EXECUTING...',
  error: 'ERROR',
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalId = useId();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Build context payload ────────────────────────────────────────────────

  const buildContext = () => ({
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
  });

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

  // ── Submit message ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = (messageText ?? inputText).trim();
    if (!text && attachments.length === 0) return;
    if (status === 'thinking' || status === 'executing') return;

    // Add user message
    addMessage({
      type: 'user',
      content: text || (attachments.length > 0 ? `[${attachments.length} file(s) attached]` : ''),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    });

    const userHistoryEntry: AgentHistoryMessage = { role: 'user', content: text };
    setInputText('');
    setAttachments([]);
    setStatus('thinking');

    try {
      const response = await callAgent(text, buildContext(), history, attachments.length > 0 ? attachments : undefined);

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
        // Safe auto-execute (non-destructive)
        addMessage({ type: 'agent', content: response.message });
        setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);

        // Execute after a brief moment
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
      } else {
        addMessage({ type: 'agent', content: response.message, extractedExams: response.extractedExams, extractedTopics: response.extractedTopics });
        setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
        if (response.fallback) setStatus('idle');
      }
    } catch (err: unknown) {
      addMessage({
        type: 'agent',
        content: `> CONNECTION ERROR\n\nI couldn't reach the server. Check that the dev server is running.\n\nYou can still use quick actions below.`,
      });
    } finally {
      setStatus('idle');
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative flex flex-col bg-[var(--card)] border-l border-[var(--border)] w-full max-w-md shadow-2xl"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/90 border-2 border-dashed border-[var(--accent)] pointer-events-none">
            <div className="text-center">
              <UploadCloud className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
              <div className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest">DROP FILES HERE</div>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <div>
            <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-widest mb-0.5">
              REVISIONLY AI
            </div>
            <div
              className={`font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${
                isbusy ? 'text-[var(--accent)]' : status === 'error' ? 'text-red-500' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {isbusy ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'idle' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              )}
              {STATUS_LABELS[status]}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1.5 -mr-1"
            aria-label="Close AI assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div className="p-3 border-b border-[var(--border)] flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => handleSubmit(action.prompt)}
              disabled={isbusy}
              className="shrink-0 px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-mono text-[9px] uppercase tracking-wide whitespace-nowrap transition-colors disabled:opacity-40"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--accent)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              {status === 'thinking' ? 'ANALYZING REQUEST...' : 'EXECUTING ACTION...'}
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
        <div className="border-t border-[var(--border)] p-3 shrink-0 bg-[var(--card)]">
          <div className="flex items-end gap-2">
            {/* File buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                id={`${modalId}-doc-btn`}
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                title="Upload document (PDF, TXT, CSV, DOCX)"
                aria-label="Upload document"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                id={`${modalId}-img-btn`}
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                title="Upload image (JPG, PNG, WEBP)"
                aria-label="Upload image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Text input */}
            <textarea
              ref={inputRef}
              id={`${modalId}-input`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... or upload a file"
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] min-h-[36px] max-h-[120px] py-2 leading-relaxed"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              disabled={isbusy}
              aria-label="Message input"
            />

            {/* Send button */}
            <button
              id={`${modalId}-send-btn`}
              onClick={() => handleSubmit()}
              disabled={isbusy || (!inputText.trim() && attachments.length === 0)}
              className="btn-primary p-2 shrink-0 disabled:opacity-40"
              aria-label="Send message"
            >
              {isbusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>

          <div className="mt-1.5 font-mono text-[9px] text-[var(--muted-foreground)]">
            ENTER to send · SHIFT+ENTER for newline · Drag files here
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
