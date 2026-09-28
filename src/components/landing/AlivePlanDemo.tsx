import React, { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';

export const AlivePlanDemo: React.FC = () => {
  const [state, setState] = useState<'initial' | 'missed' | 'rebalanced'>('initial');

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
            [ INTERACTIVE ENGINE DEMONSTRATION ]
          </span>
          <h3 className="font-display text-2xl sm:text-4xl text-[var(--foreground)] tracking-tight-poster uppercase mt-2">
            YOUR STUDY PLAN IS ALIVE.
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-xl font-mono">
            Static calendars break the moment you miss a single evening. Revisionly recalculates your remaining study slots so you never fall behind.
          </p>
        </div>

        {/* Action button */}
        <div className="shrink-0 flex items-center gap-3">
          {state === 'initial' && (
            <button
              onClick={() => setState('missed')}
              className="btn-secondary text-xs"
            >
              Simulate Missed Topic
            </button>
          )}

          {state === 'missed' && (
            <button
              onClick={() => setState('rebalanced')}
              className="btn-primary text-xs"
            >
              Auto-Reschedule Plan
            </button>
          )}

          {state === 'rebalanced' && (
            <button
              onClick={() => setState('initial')}
              className="btn-ghost text-xs"
            >
              Reset Simulation
            </button>
          )}
        </div>
      </div>

      {/* Two Column Days Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Monday Column */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              MONDAY 28 SEP
            </span>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {state === 'missed' ? '1 MISSED' : 'TARGET: 3 TOPICS'}
            </span>
          </div>

          <div className="space-y-2">
            {/* Slot 1 */}
            <div
              className={`p-3.5 border transition-colors duration-150 ${
                state === 'missed'
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : state === 'rebalanced'
                  ? 'border-[var(--border)] opacity-30 line-through'
                  : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  Python — Nested Loops
                </span>
                <span className="font-mono text-[11px]">
                  {state === 'missed' ? (
                    <span className="text-[var(--accent)] font-semibold">[MISSED]</span>
                  ) : state === 'rebalanced' ? (
                    <span className="text-[var(--muted-foreground)]">[MOVED TO TUE]</span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">09:00 — 09:45</span>
                  )}
                </span>
              </div>
              <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                45 MIN • CS-PY • HIGH PRIORITY
              </div>
            </div>

            {/* Slot 2 */}
            <div className="p-3.5 border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  Maths — Decimal &amp; Binary Systems
                </span>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  10:00 — 10:45
                </span>
              </div>
              <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                45 MIN • MA-CS • SCHEDULED
              </div>
            </div>

            {/* Slot 3 */}
            <div className="p-3.5 border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  Web Dev — HTML Semantic Elements
                </span>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  18:00 — 18:45
                </span>
              </div>
              <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                45 MIN • CS-WEB • SCHEDULED
              </div>
            </div>
          </div>
        </div>

        {/* Tuesday Column */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              TUESDAY 29 SEP
            </span>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {state === 'rebalanced' ? 'REBALANCED // 3 TOPICS' : 'TARGET: 2 TOPICS'}
            </span>
          </div>

          <div className="space-y-2">
            {/* Auto-Rescheduled Slot (Appears on Tuesday) */}
            {state === 'rebalanced' && (
              <div className="p-3.5 border border-[var(--accent)] bg-[var(--accent)]/5 transition-all duration-150 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--foreground)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)]" />
                    Python — Nested Loops
                  </span>
                  <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">
                    08:00 — 08:45 [REALLOCATED]
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                  Slotted into morning buffer • Exam buffer preserved
                </div>
              </div>
            )}

            {/* Slot 2 */}
            <div className="p-3.5 border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  Maths — GCD &amp; Modulo Arithmetic
                </span>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  {state === 'rebalanced' ? '09:00 — 09:45' : '09:00 — 09:45'}
                </span>
              </div>
              <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                45 MIN • MA-CS • SCHEDULED
              </div>
            </div>

            {/* Slot 3 */}
            <div className="p-3.5 border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  Web Dev — CSS Specificity &amp; Cascade
                </span>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  10:00 — 10:45
                </span>
              </div>
              <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                45 MIN • CS-WEB • SCHEDULED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Status Message */}
      <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--muted-foreground)]">
        <div>
          {state === 'initial' && 'Status: Schedule synchronized. All sessions on track.'}
          {state === 'missed' && (
            <span className="text-[var(--accent)] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Missed session detected. Click "Auto-Reschedule Plan" to rebalance workload.
            </span>
          )}
          {state === 'rebalanced' && (
            <span className="text-[var(--foreground)] font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[var(--accent)] stroke-[3]" />
              Plan updated. Python — Nested Loops slotted into Tuesday before exam deadline.
            </span>
          )}
        </div>
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          Kernel 2.6
        </span>
      </div>
    </div>
  );
};
