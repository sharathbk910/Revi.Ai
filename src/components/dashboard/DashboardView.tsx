import React, { useMemo } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { TaskCard } from './TaskCard';
import { DailyCheckInDialog } from './DailyCheckInDialog';
import { Plus, AlertTriangle } from 'lucide-react';

interface DashboardViewProps {
  onOpenAddTopic: () => void;
  onOpenAddExam: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddTopic,
  onOpenAddExam,
}) => {
  const {
    exams,
    todayTasks,
    nextExam,
    nextExamDays,
    overallProgressPercent,
    completedCount,
    totalTopicsCount,
    capacityWarning,
    optimizePlan,
    referenceDate,
  } = usePlanner();

  const completedToday = todayTasks.filter(t => t.status === 'COMPLETED').length;
  const totalToday = todayTasks.length;

  // Real study time computed from completed tasks
  const realMinutesStudied = useMemo(() => {
    return todayTasks
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  }, [todayTasks]);

  // Greeting based on actual time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING.';
    if (hour < 17) return 'GOOD AFTERNOON.';
    return 'GOOD EVENING.';
  }, []);

  const upcomingExams = useMemo(() => {
    return [...exams]
      .filter(e => e.date >= referenceDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams, referenceDate]);

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* 1. GREETING & HEADER */}
      <section className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              [ REVISIONLY ACADEMIC PLANNER ]
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
              {greeting}
            </h1>
            <div className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)] mt-3">
              TODAY'S PLAN • {referenceDate}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAddTopic}
              className="btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
            <button
              onClick={onOpenAddExam}
              className="btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exam</span>
            </button>
          </div>
        </div>
      </section>

      {/* Missed Study Session Alert */}
      <DailyCheckInDialog />

      {/* Schedule Pressure Warning (Part 17) */}
      {capacityWarning && (
        <section className="border border-[var(--accent)] bg-[var(--card)] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                SCHEDULE PRESSURE
              </div>
              <p className="font-mono text-xs text-[var(--foreground)] mt-1">
                You have more remaining topics than available study time before your upcoming exam.
                <span className="text-[var(--accent)] font-bold ml-1.5">
                  ({capacityWarning.deficitHours}h deficit)
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => optimizePlan('ADD_HOURS')}
              className="btn-primary text-xs"
            >
              Add Study Time
            </button>
            <button
              onClick={() => optimizePlan('COMPRESS_SESSIONS')}
              className="btn-secondary text-xs"
            >
              Optimize Plan
            </button>
          </div>
        </section>
      )}

      {/* 2. NEXT EXAM HERO SECTION */}
      {nextExam && (
        <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                [ 01 // IMMEDIATE MILESTONE ]
              </span>
              <div className="font-mono text-xs text-[var(--muted-foreground)] uppercase mt-1">
                NEXT EXAM
              </div>
              <h2 className="font-display text-2xl sm:text-4xl text-[var(--foreground)] tracking-tight-poster uppercase mt-1">
                {nextExam.name}
              </h2>
            </div>

            <div className="text-left md:text-right font-mono">
              <div className="text-3xl sm:text-5xl font-display text-[var(--accent)]">
                {nextExamDays < 10 ? `0${nextExamDays}` : nextExamDays}
              </div>
              <div className="text-xs uppercase text-[var(--muted-foreground)] tracking-wider">
                {nextExamDays === 1 ? 'DAY REMAINING' : 'DAYS REMAINING'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-xs">
            <div>
              <div className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Exam Date
              </div>
              <div className="text-[var(--foreground)] font-bold mt-0.5">
                {nextExam.date}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Start Time
              </div>
              <div className="text-[var(--foreground)] font-bold mt-0.5">
                {nextExam.time}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Duration
              </div>
              <div className="text-[var(--foreground)] font-bold mt-0.5">
                {nextExam.durationMinutes} MIN
              </div>
            </div>
            <div>
              <div className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Priority
              </div>
              <div className="text-[var(--accent)] font-bold mt-0.5 uppercase">
                {nextExam.priority}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. TODAY'S STUDY PLAN SECTION */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl text-[var(--foreground)] tracking-tight uppercase">
              TODAY
            </h2>
            <div className="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">
              {completedToday} of {totalToday} topics completed
            </div>
          </div>

          {totalToday > 0 && (
            <div className="font-mono text-xs text-[var(--accent)] font-semibold">
              {totalToday - completedToday} REMAINING
            </div>
          )}
        </div>

        {todayTasks.length > 0 ? (
          <div>
            {todayTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="border border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-3">
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              QUEUE CLEAR
            </div>
            <div className="font-display text-xl sm:text-2xl text-[var(--foreground)] uppercase">
              ALL CAUGHT UP FOR TODAY.
            </div>
            <p className="font-mono text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
              You've satisfied all scheduled sessions for today. Take a break or preview upcoming topics in My Plan.
            </p>
          </div>
        )}
      </section>

      {/* 4. PROGRESS (PART 21 ZERO-STATE SUPPORT) */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ SYLLABUS READINESS ]
            </span>
            <div className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster mt-2">
              {overallProgressPercent}%
            </div>
            <div className="font-mono text-xs text-[var(--muted-foreground)] uppercase mt-1">
              SYLLABUS COMPLETE • {completedCount} / {totalTopicsCount} TOPICS
            </div>
          </div>

          <div className="font-mono text-xs text-left sm:text-right">
            <div className="text-[var(--muted-foreground)] uppercase text-[10px]">
              TODAY'S TARGET
            </div>
            <div className="font-display text-2xl sm:text-3xl text-[var(--foreground)] mt-0.5">
              {totalToday} TOPICS
            </div>
          </div>
        </div>

        {/* Zero state encouraging messaging */}
        {completedCount === 0 && (
          <div className="p-4 border border-[var(--border)] bg-[var(--muted)]/40 font-mono text-xs text-[var(--foreground)] flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[var(--accent)]" />
            <span>"Your plan is ready. Start with today's first topic."</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2 font-mono text-xs">
          <div>
            <div className="text-[var(--muted-foreground)] text-[10px] uppercase">
              Completed Topics
            </div>
            <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
              {completedCount}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-foreground)] text-[10px] uppercase">
              Remaining Topics
            </div>
            <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
              {totalTopicsCount - completedCount}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-foreground)] text-[10px] uppercase">
              Current Streak
            </div>
            <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
              {completedCount > 0 ? '1 Day' : '0 Days'}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-foreground)] text-[10px] uppercase">
              Study Time Today
            </div>
            <div className="text-lg font-bold text-[var(--foreground)] mt-0.5">
              {realMinutesStudied} MIN
            </div>
          </div>
        </div>
      </section>

      {/* 5. UPCOMING EXAMS SECTION */}
      {upcomingExams.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-[var(--border)] pb-3">
            <h2 className="font-display text-xl sm:text-2xl text-[var(--foreground)] tracking-tight uppercase">
              UPCOMING EXAMS
            </h2>
            <div className="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">
              {upcomingExams.length} scheduled exam deadlines
            </div>
          </div>

          <div className="border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--card)]">
            {upcomingExams.map((exam, idx) => (
              <div
                key={exam.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/30 transition-colors"
              >
                <div className="flex items-baseline gap-4 min-w-0">
                  <span className="font-mono text-xs text-[var(--muted-foreground)] font-bold">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base text-[var(--foreground)] tracking-tight">
                      {exam.name}
                    </div>
                    <div className="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">
                      {exam.time} • {exam.durationMinutes} MIN
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono shrink-0">
                  <div className="font-display text-lg sm:text-xl text-[var(--foreground)]">
                    {exam.date}
                  </div>
                  <div className="text-[10px] text-[var(--accent)] uppercase font-semibold">
                    {exam.priority} PRIORITY
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. SECONDARY ANALYTICS (LOWER ON PAGE) */}
      <section className="border-t border-[var(--border)] pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-[var(--border)] bg-[var(--card)] p-6 space-y-3 font-mono text-xs">
            <div className="text-[var(--accent)] font-bold uppercase tracking-wider text-[11px]">
              Study Configuration
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Your schedule is computed using 4.0h daily study capacity with 45-minute deep focus blocks.
              Exam buffers are automatically preserved 24-48 hours before each deadline.
            </p>
          </div>

          <div className="border border-[var(--border)] bg-[var(--card)] p-6 space-y-3 font-mono text-xs">
            <div className="text-[var(--foreground)] font-bold uppercase tracking-wider text-[11px]">
              Data Architecture
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Grounded in Postgres and Supabase Row Level Security. All topics, completions, and schedule changes persist in real-time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
