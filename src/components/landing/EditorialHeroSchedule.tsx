import React from 'react';
import { usePlanner } from '../../context/PlannerContext';

export const EditorialHeroSchedule: React.FC = () => {
  const { exams, topics, referenceDate } = usePlanner();

  const nextExams = [...exams]
    .filter(e => e.date >= referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const totalTopics = topics.length;

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6 select-none">
      {/* Editorial Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
          [ 01 // EXAM TIMETABLE MATRIX ]
        </span>
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
          AUTONOMOUS REVISION KERNEL
        </span>
      </div>

      {/* Hero Exam List or Empty */}
      <div className="space-y-4">
        {nextExams.length > 0 ? (
          nextExams.map((exam, idx) => (
            <div
              key={exam.id}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-3 group"
            >
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-mono text-xs text-[var(--muted-foreground)] font-semibold shrink-0">
                  0{idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-sm sm:text-base text-[var(--foreground)] truncate tracking-tight">
                    {exam.name}
                  </div>
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {exam.time} • {exam.durationMinutes} MIN
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs font-bold text-[var(--accent)]">
                  {exam.date.split('-').slice(1).join('/')}
                </div>
                <div className="font-mono text-[10px] text-[var(--muted-foreground)] uppercase">
                  {exam.priority}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center">
            <div className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-widest">
              NO EXAMS ADDED YET
            </div>
            <div className="font-mono text-[10px] text-[var(--muted-foreground)] mt-1">
              Add your exam timetable to get started.
            </div>
          </div>
        )}
      </div>

      {/* Live Telemetry Box */}
      <div className="pt-2 grid grid-cols-2 gap-4 border-t border-[var(--border)]">
        <div>
          <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)] tracking-wider">
            Syllabus Topics
          </div>
          <div className="font-display text-2xl text-[var(--foreground)] mt-0.5">
            {totalTopics}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-[var(--muted-foreground)] tracking-wider">
            Engine Mode
          </div>
          <div className="font-mono text-sm font-semibold text-[var(--accent)] mt-1.5 uppercase">
            Adaptive 0px
          </div>
        </div>
      </div>
    </div>
  );
};
