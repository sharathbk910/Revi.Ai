import React from 'react';
import { usePlanner } from '../../context/PlannerContext';
import type { Exam } from '../../types';
import { Plus, Edit3, Trash2, Eye } from 'lucide-react';

interface ExamsViewProps {
  onOpenAddExam: () => void;
  onOpenEditExam: (exam: Exam) => void;
  onViewPlan: () => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  onOpenAddExam,
  onOpenEditExam,
  onViewPlan,
}) => {
  const { exams, deleteExam, topics, referenceDate } = usePlanner();

  const getExamStats = (exam: Exam) => {
    const subTopics = topics.filter(t => t.subjectId === exam.subjectId);
    const completed = subTopics.filter(t => t.completed).length;
    const total = subTopics.length;
    const prepPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const [y1, m1, d1] = referenceDate.split('-').map(Number);
    const [y2, m2, d2] = exam.date.split('-').map(Number);
    const diffDays = Math.ceil(
      (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) /
        (1000 * 3600 * 24)
    );

    // Format Month & Day
    const dateObj = new Date(y2, m2 - 1, d2);
    const day = d2 < 10 ? `0${d2}` : `${d2}`;
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    return { completed, total, prepPercent, diffDays, day, month };
  };

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <section className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              [ OFFICIAL SEMESTER TIMETABLE ]
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
              EXAMS.
            </h1>
            <div className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)] mt-3">
              {exams.length} examinations scheduled • Anchoring all revision timelines
            </div>
          </div>

          <button
            onClick={onOpenAddExam}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam</span>
          </button>
        </div>
      </section>

      {/* Oversized Date Typography Exam Cards */}
      {sortedExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sortedExams.map(exam => {
            const { prepPercent, diffDays, day, month } = getExamStats(exam);
            const isImminent = diffDays <= 3 && diffDays >= 0;

            return (
              <div
                key={exam.id}
                className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-[var(--accent)] transition-colors duration-150"
              >
                <div>
                  {/* Top Bar: Oversized Date Typography + Countdown */}
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
                    {/* Oversized Date Box */}
                    <div className="flex items-baseline gap-2">
                      <div className="font-display text-5xl sm:text-6xl text-[var(--foreground)] leading-none">
                        {day}
                      </div>
                      <div className="font-mono text-base font-bold text-[var(--accent)] uppercase tracking-wider">
                        {month}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className={`font-bold uppercase ${isImminent ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                        {diffDays < 10 && diffDays >= 0 ? `0${diffDays}` : diffDays} DAYS REMAINING
                      </div>
                      <div className="text-[var(--muted-foreground)] text-[10px] uppercase mt-0.5">
                        {exam.priority} PRIORITY
                      </div>
                    </div>
                  </div>

                  {/* Exam Details */}
                  <div className="space-y-2 my-4">
                    <h2 className="font-display text-2xl sm:text-3xl text-[var(--foreground)] tracking-tight uppercase leading-snug">
                      {exam.name}
                    </h2>

                    <div className="font-mono text-xs text-[var(--muted-foreground)] flex items-center gap-3">
                      <span>{exam.time}</span>
                      <span>•</span>
                      <span>{exam.durationMinutes} MINUTES</span>
                    </div>

                    {exam.notes && (
                      <p className="font-mono text-xs text-[var(--muted-foreground)] pt-2 line-clamp-2">
                        {exam.notes}
                      </p>
                    )}
                  </div>

                  {/* Preparation Score */}
                  <div className="pt-4 border-t border-[var(--border)] font-mono text-xs flex items-center justify-between">
                    <span className="text-[var(--muted-foreground)] uppercase">PREPARATION:</span>
                    <span className="font-bold text-[var(--foreground)]">{prepPercent}% PREPARED</span>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEditExam(exam)}
                      className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="btn-ghost text-xs py-1 px-2.5 text-[var(--muted-foreground)] hover:text-[#FF3D00] flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <button
                    onClick={onViewPlan}
                    className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Plan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
            TIMETABLE EMPTY
          </div>
          <div className="font-display text-2xl text-[var(--foreground)] uppercase">
            NO EXAMS SCHEDULED.
          </div>
          <p className="font-mono text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
            Add your semester examinations to calculate an adaptive revision schedule.
          </p>
          <button
            onClick={onOpenAddExam}
            className="btn-primary text-xs py-2.5 px-6"
          >
            + Add First Exam
          </button>
        </div>
      )}
    </div>
  );
};
