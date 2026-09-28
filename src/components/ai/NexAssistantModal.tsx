import React, { useState } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { aiService } from '../../services/aiService';
import { X, Send } from 'lucide-react';

interface NexAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export const NexAssistantModal: React.FC<NexAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    todayTasks,
    nextExam,
    nextExamDays,
    overallProgressPercent,
    completedCount,
    totalTopicsCount,
    missedTasks,
    autoRescheduleMissed,
    availability,
  } = usePlanner();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Revisionly AI active. Connected to your timetable and syllabus. What would you like to review or plan today?',
      time: '09:00',
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'What should I study now?',
    'I missed yesterday. Fix my plan.',
    'What should I revise before my next exam?',
    'How much of my syllabus is completed?',
    'What topics are still pending?',
  ];

  const buildContextPayload = () => ({
    nextExam: nextExam ? { name: nextExam.name, date: nextExam.date, daysRemaining: nextExamDays } : null,
    todayTasks,
    completedCount,
    totalTopicsCount,
    overallProgressPercent,
    missedTasks,
    dailyHours: availability?.dailyHours || 4,
  });

  const handleSelectPrompt = async (promptText: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text: promptText, time: timeStr }]);
    setIsThinking(true);

    try {
      if (promptText.includes('Fix my plan') || promptText.includes('missed')) {
        if (missedTasks.length > 0) {
          await autoRescheduleMissed();
        }
      }

      const res = await aiService.queryAssistant(promptText, buildContextPayload());
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Focus on your upcoming exam (${nextExam?.name || 'Milestone'} in ${nextExamDays} days). You have completed ${completedCount} of ${totalTopicsCount} topics (${overallProgressPercent}%). Complete today's pending topics in sequence.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = inputQuery.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const res = await aiService.queryAssistant(userMsg, buildContextPayload());
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Target: Prioritize topics for ${nextExam?.name || 'your upcoming examination'}. Daily capacity: ${availability?.dailyHours || 4} hours.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border-l border-[var(--border)] max-w-lg w-full h-full flex flex-col justify-between shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ ACADEMIC REASONING ENGINE ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              REVISIONLY AI
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 transition-colors"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Question Pills */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30 flex items-center gap-2 overflow-x-auto font-mono text-xs">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPrompt(prompt)}
              className="px-3 py-1.5 border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col space-y-1.5 ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="font-mono text-[10px] text-[var(--muted-foreground)] uppercase">
                {msg.sender === 'user' ? 'YOU' : 'REVISIONLY AI'} • {msg.time}
              </div>
              <div
                className={`p-4 text-xs font-mono leading-relaxed max-w-[90%] ${
                  msg.sender === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="font-mono text-xs text-[var(--accent)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] animate-ping" />
              <span>Synthesizing response from schedule engine...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleCustomSubmit}
          className="p-4 border-t border-[var(--border)] flex items-center gap-3 bg-[var(--card)]"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask about timetable, topics, or study strategy..."
            className="flex-1 editorial-input text-xs"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            className="btn-primary text-xs px-4 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
