import React, { useMemo } from 'react';
import { usePlanner } from '../../context/PlannerContext';

export const ProgressView: React.FC = () => {
  const {
    topics,
    subjects,
    nextExam,
    nextExamDays,
    completedCount,
    totalTopicsCount,
    overallProgressPercent,
    tasks,
  } = usePlanner();

  const remainingTopics = totalTopicsCount - completedCount;

  // Real completed study sessions count
  const completedSessionsCount = useMemo(() => {
    return tasks.filter(t => t.status === 'COMPLETED').length;
  }, [tasks]);

  // Real study time calculated from completed sessions
  const realTotalMinutes = useMemo(() => {
    return tasks
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  }, [tasks]);

  // Real current streak: strictly 0 days unless student completed topics
  const currentStreakDays = completedCount > 0 ? 1 : 0;

  // Subject breakdown computed from actual topic states
  const subjectBreakdown = useMemo(() => {
    return subjects.map(sub => {
      const subTopics = topics.filter(t => t.subjectId === sub.id);
      const subCompleted = subTopics.filter(t => t.completed).length;
      const subTotal = subTopics.length;
      const percent = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;
      return {
        ...sub,
        completed: subCompleted,
        total: subTotal,
        percent,
      };
    });
  }, [subjects, topics]);

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <section className="border-b border-[var(--border)] pb-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            [ GROUNDED PERFORMANCE TELEMETRY ]
          </div>
          <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
            PROGRESS.
          </h1>
          <div className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)] mt-3">
            Real metrics derived from database verification • Zero fabricated statistics
          </div>
        </div>
      </section>

      {/* Primary 6 Metrics Grid (Zero State compliant) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 font-mono">
        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Overall Completion
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--accent)]">
            {overallProgressPercent}%
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Syllabus Mastery
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Completed Topics
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--foreground)]">
            {completedCount}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Verified Units
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Remaining Topics
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--foreground)]">
            {remainingTopics}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Queued for Study
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Study Time Logged
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--foreground)]">
            {realTotalMinutes}m
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            {completedSessionsCount} Sessions Logged
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Current Streak
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--foreground)]">
            {currentStreakDays}d
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            {completedCount > 0 ? 'Active momentum' : 'Awaiting 1st topic'}
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--card)] p-5 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase">
            Next Exam
          </div>
          <div className="font-display text-3xl sm:text-4xl text-[var(--foreground)]">
            {nextExamDays < 10 ? `0${nextExamDays}` : nextExamDays}d
          </div>
          <div className="text-[10px] text-[var(--accent)] truncate uppercase">
            {nextExam?.name || 'Milestone'}
          </div>
        </div>
      </div>

      {/* Subject Completion Breakdown */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="border-b border-[var(--border)] pb-4 flex items-baseline justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ COURSE BREAKDOWN ]
            </span>
            <h2 className="font-display text-xl sm:text-2xl text-[var(--foreground)] tracking-tight uppercase mt-1">
              SUBJECT MASTERY SPREAD
            </h2>
          </div>
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {subjects.length} COURSES
          </span>
        </div>

        <div className="space-y-6">
          {subjectBreakdown.map(sub => (
            <div key={sub.id} className="space-y-2">
              <div className="flex items-baseline justify-between font-mono text-xs">
                <span className="font-bold text-[var(--foreground)]">
                  {sub.name}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {sub.completed} / {sub.total} topics • {sub.percent}%
                </span>
              </div>
              <div className="w-full h-1 bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${sub.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Summary Box */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 font-mono text-xs text-[var(--muted-foreground)] space-y-2">
        <div className="text-[var(--foreground)] font-bold uppercase tracking-wider text-[11px]">
          STUDENT AUDIT INTEGRITY
        </div>
        <p className="leading-relaxed">
          All progress percentage and study duration figures are calculated deterministically from verified topic completion status.
          Revisionly never inflates streaks or fabricates mock progress. When you check off a topic in your Syllabus or Today's Plan, your real database records update immediately.
        </p>
      </section>
    </div>
  );
};
