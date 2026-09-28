import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const {
    exams,
    topics,
    subjects,
    availability,
    preferences,
    updateAvailability,
    updatePreferences,
    recalculateSchedule,
  } = usePlanner();

  const [step, setStep] = useState<number>(1);
  const [dailyHours, setDailyHours] = useState<number>(availability.dailyHours || 4);
  const [morning, setMorning] = useState<boolean>(availability.slots.morning);
  const [afternoon, setAfternoon] = useState<boolean>(availability.slots.afternoon);
  const [evening, setEvening] = useState<boolean>(availability.slots.evening);
  const [night, setNight] = useState<boolean>(availability.slots.night);

  const [deepWork, setDeepWork] = useState<boolean>(preferences.deepWork);
  const [practiceSessions] = useState<boolean>(preferences.practiceSessions);
  const [revisionSessions, setRevisionSessions] = useState<boolean>(preferences.revisionSessions);
  const [autoRescheduling, setAutoRescheduling] = useState<boolean>(preferences.autoRescheduling);
  const sessionDuration = preferences.sessionDuration || 45;

  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsGenerating(true);
    await updateAvailability({
      dailyHours,
      slots: { morning, afternoon, evening, night },
    });
    await updatePreferences({
      deepWork,
      practiceSessions,
      revisionSessions,
      autoRescheduling,
      sessionDuration,
    });

    await new Promise(r => setTimeout(r, 600));
    recalculateSchedule();
    setIsGenerating(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ ONBOARDING PROTOCOL ]
            </div>
            <h2 className="font-display text-2xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              PLAN INITIALIZATION WIZARD
            </h2>
            <div className="font-mono text-xs text-[var(--muted-foreground)] mt-1">
              STEP 0{step} OF 04
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Tabs */}
        <div className="grid grid-cols-4 gap-2 font-mono text-xs">
          {[
            { n: 1, label: 'EXAMS' },
            { n: 2, label: 'SYLLABUS' },
            { n: 3, label: 'HOURS' },
            { n: 4, label: 'PREFERENCES' },
          ].map(s => (
            <div
              key={s.n}
              className={`p-2.5 border text-center transition-colors ${
                step === s.n
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] font-bold'
                  : step > s.n
                  ? 'border-[var(--border)] text-[var(--foreground)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] opacity-50'
              }`}
            >
              <div className="text-[10px] text-[var(--accent)]">0{s.n}</div>
              <div className="text-[11px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 font-mono text-xs">
          {/* STEP 1: EXAMS */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Revisionly distributes your syllabus around your exam deadlines. Review your semester examinations below:
              </p>

              <div className="border border-[var(--border)] divide-y divide-[var(--border)] max-h-60 overflow-y-auto">
                {exams.map((e, idx) => (
                  <div key={e.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[var(--foreground)]">
                        0{idx + 1}. {e.name}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        {e.date} • {e.time} ({e.durationMinutes} min)
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--accent)] font-semibold uppercase">
                      {e.priority} PRIORITY
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-[var(--muted-foreground)]">
                {exams.length} examinations registered in planning kernel.
              </div>
            </div>
          )}

          {/* STEP 2: SYLLABUS */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Your syllabus topics are loaded and categorized by academic course:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {subjects.map(s => {
                  const subTopics = topics.filter(t => t.subjectId === s.id);
                  return (
                    <div key={s.id} className="p-4 border border-[var(--border)]">
                      <div className="font-bold text-[var(--foreground)] truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-[var(--accent)] mt-1">
                        {subTopics.length} TOPICS SCHEDULED
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-[var(--muted-foreground)]">
                Total: {topics.length} syllabus topics registered.
              </div>
            </div>
          )}

          {/* STEP 3: DAILY STUDY HOURS */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block uppercase text-[var(--foreground)] font-bold mb-2">
                  Daily Study Capacity: <span className="text-[var(--accent)]">{dailyHours}h</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={dailyHours}
                  onChange={e => setDailyHours(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                  <span>1h (Light)</span>
                  <span>4h (Balanced)</span>
                  <span>10h (Intensive)</span>
                </div>
              </div>

              <div>
                <div className="uppercase text-[var(--foreground)] font-bold mb-3">
                  Preferred Time Blocks
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Morning (08:00 - 12:00)', state: morning, set: setMorning },
                    { label: 'Afternoon (13:00 - 17:00)', state: afternoon, set: setAfternoon },
                    { label: 'Evening (17:00 - 21:00)', state: evening, set: setEvening },
                    { label: 'Night (21:00 - 00:00)', state: night, set: setNight },
                  ].map((block, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => block.set(!block.state)}
                      className={`p-3 border text-left transition-colors ${
                        block.state
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] font-bold'
                          : 'border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="text-[10px] uppercase text-[var(--muted-foreground)]">Slot 0{i + 1}</div>
                      <div className="text-xs mt-1">{block.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PREFERENCES */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Configure adaptive planner behaviors:
              </p>

              <div className="space-y-3">
                {[
                  {
                    title: 'Autonomous Rescheduling',
                    desc: 'Automatically rebalance missed topics into upcoming open slots before exam dates.',
                    state: autoRescheduling,
                    set: setAutoRescheduling,
                  },
                  {
                    title: 'Pre-Exam Revision Buffers',
                    desc: 'Pre-allocate dedicated revision blocks 24-48 hours before each exam.',
                    state: revisionSessions,
                    set: setRevisionSessions,
                  },
                  {
                    title: 'Deep Work Focus Prioritization',
                    desc: 'Prioritize challenging high-priority topics during primary morning blocks.',
                    state: deepWork,
                    set: setDeepWork,
                  },
                ].map((pref, idx) => (
                  <div
                    key={idx}
                    onClick={() => pref.set(!pref.state)}
                    className={`p-4 border cursor-pointer flex items-start justify-between gap-4 transition-colors ${
                      pref.state
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] opacity-60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[var(--foreground)] uppercase">
                        {pref.title}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        {pref.desc}
                      </div>
                    </div>
                    <span className="font-bold text-[var(--accent)] shrink-0">
                      {pref.state ? '[ON]' : '[OFF]'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="p-4 border border-[var(--accent)] bg-[var(--card)] font-mono text-xs text-[var(--accent)] space-y-1">
              <div>&gt; Compiling deterministic study timetable...</div>
              <div>&gt; Enforcing 0px radius layout constraints...</div>
              <div className="text-[var(--foreground)] font-bold">&gt; Complete. Redirecting to Dashboard...</div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="btn-secondary text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="btn-primary text-xs"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isGenerating}
              className="btn-primary text-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Study Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
