import React, { useState } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { AlertCircle, Check, X } from 'lucide-react';

export const DailyCheckInDialog: React.FC = () => {
  const { missedTasks, autoRescheduleMissed, dismissCheckIn, isRebalancing } = usePlanner();
  const [updatedNotice, setUpdatedNotice] = useState(false);

  if (missedTasks.length === 0 && !updatedNotice) return null;

  const handleReschedule = async () => {
    await autoRescheduleMissed();
    setUpdatedNotice(true);
    setTimeout(() => {
      setUpdatedNotice(false);
    }, 3500);
  };

  if (updatedNotice) {
    return (
      <div className="border border-[var(--accent)] bg-[var(--card)] p-4 flex items-center justify-between gap-4 transition-all duration-150 animate-in fade-in">
        <div className="flex items-center gap-3">
          <Check className="w-4 h-4 text-[var(--accent)] stroke-[3]" />
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              PLAN UPDATED
            </div>
            <div className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">
              Your remaining study sessions have been rebalanced without compromising exam buffers.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--accent)] bg-[var(--card)] p-5 sm:p-6 space-y-4 transition-all duration-150 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              MISSED STUDY SESSION
            </div>
            <div className="text-sm font-bold text-[var(--foreground)] mt-1">
              {missedTasks.map(t => `${t.subjectName} — ${t.topicTitle}`).join(', ')}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] font-mono mt-1">
              "This topic was scheduled for today."
            </div>
          </div>
        </div>

        <button
          onClick={dismissCheckIn}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
        <button
          onClick={dismissCheckIn}
          className="btn-secondary text-xs py-2 px-4"
        >
          KEEP CURRENT PLAN
        </button>

        <button
          onClick={handleReschedule}
          disabled={isRebalancing}
          className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
        >
          {isRebalancing ? 'REBALANCING PLAN...' : 'RESCHEDULE AUTOMATICALLY'}
        </button>
      </div>
    </div>
  );
};
