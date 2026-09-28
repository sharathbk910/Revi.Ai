import React from 'react';
import type { StudyTask } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { Check, Play, Undo2 } from 'lucide-react';

interface TaskCardProps {
  task: StudyTask;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { completeTask, uncompleteTask, startTask } = usePlanner();

  const isCompleted = task.status === 'COMPLETED';
  const isInProgress = task.status === 'IN_PROGRESS';

  return (
    <div
      className={`border-b border-[var(--border)] py-4 transition-colors duration-150 ${
        isCompleted
          ? 'opacity-40'
          : isInProgress
          ? 'bg-[var(--muted)]/50'
          : 'hover:bg-[var(--muted)]/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Time, Subject, Title, Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0 flex-1">
          {/* Time Slot */}
          <div className="font-mono text-xs text-[var(--muted-foreground)] sm:w-32 shrink-0 font-medium">
            {task.startTime} — {task.endTime}
          </div>

          {/* Subject Badge */}
          <div className="font-mono text-[11px] font-bold text-[var(--accent)] sm:w-28 shrink-0 uppercase tracking-wider">
            {task.subjectName}
          </div>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <div
              className={`font-semibold text-sm sm:text-base tracking-tight truncate ${
                isCompleted
                  ? 'line-through text-[var(--muted-foreground)]'
                  : 'text-[var(--foreground)]'
              }`}
            >
              {isCompleted ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--accent)] stroke-[3] shrink-0" />
                  <span>{task.topicTitle}</span>
                </span>
              ) : (
                task.topicTitle
              )}
            </div>
            {task.rescheduledFrom && (
              <div className="font-mono text-[10px] text-[var(--accent)] mt-0.5">
                ↻ Rescheduled from {task.rescheduledFrom}
              </div>
            )}
          </div>

          {/* Duration & Type */}
          <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">
            <span>{task.durationMinutes} MIN</span>
            <span>•</span>
            <span className="uppercase">{task.type}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {!isCompleted && !isInProgress && (
            <button
              onClick={() => startTask(task.id)}
              className="px-3 py-1.5 border border-[var(--border)] hover:border-[var(--foreground)] text-xs font-mono font-medium text-[var(--foreground)] uppercase transition-colors min-h-[36px] flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </button>
          )}

          {isCompleted ? (
            <button
              onClick={() => uncompleteTask(task.id)}
              className="px-3 py-1.5 text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors min-h-[36px] flex items-center gap-1.5"
              title="Mark as pending"
            >
              <Undo2 className="w-3 h-3" />
              <span>Undo</span>
            </button>
          ) : (
            <button
              onClick={() => completeTask(task.id)}
              className="px-4 py-1.5 bg-[var(--accent)] text-white hover:bg-transparent hover:text-[var(--accent)] border border-[var(--accent)] text-xs font-mono font-bold uppercase tracking-wider transition-colors min-h-[36px] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
