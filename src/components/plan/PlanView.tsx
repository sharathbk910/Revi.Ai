import React, { useState, useMemo, useEffect } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { addDays } from '../../utils/scheduler';
import type { StudyTask } from '../../types';
import { TaskCard } from '../dashboard/TaskCard';
import { Download, Printer, RotateCcw, Clock } from 'lucide-react';

export const PlanView: React.FC = () => {
  const {
    tasks,
    referenceDate,
    recalculateSchedule,
    syncToRealTime,
    exportPlanAsCSV,
  } = usePlanner();

  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'TODAY' | 'THIS_WEEK' | 'CALENDAR'>('TODAY');

  const endOfWeekDate = useMemo(() => addDays(referenceDate, 7), [referenceDate]);

  // Tasks filtered by tab
  const tabTasks = useMemo(() => {
    switch (activeTab) {
      case 'TODAY':
        return tasks.filter(t => t.date === referenceDate);
      case 'THIS_WEEK':
        return tasks.filter(t => t.date >= referenceDate && t.date <= endOfWeekDate);
      case 'CALENDAR':
      default:
        return tasks;
    }
  }, [tasks, activeTab, referenceDate, endOfWeekDate]);

  // Group tasks by Date for Day-by-Day Editorial View
  const groupedByDate = useMemo(() => {
    const groups: Record<string, StudyTask[]> = {};
    const sorted = [...tabTasks].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    for (const t of sorted) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return groups;
  }, [tabTasks]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  const formatEditorialDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = d < 10 ? `0${d}` : `${d}`;
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return { weekday, day, month };
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <section className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              [ DAY-BY-DAY REVISION TIMETABLE ]
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
              MY STUDY PLAN.
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)]">
                Active Date: {referenceDate}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE {liveTime}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={syncToRealTime}
              className="btn-secondary text-xs"
              title="Synchronize timetable with real-time live clock"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Sync</span>
            </button>

            <button
              onClick={exportPlanAsCSV}
              className="btn-secondary text-xs"
              title="Export schedule as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs"
              title="Print schedule"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={recalculateSchedule}
              className="btn-primary text-xs"
              title="Recalculate schedule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rebalance</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tabs: TODAY | THIS WEEK | CALENDAR */}
      <div className="border-b border-[var(--border)]">
        <div className="flex items-center gap-8 font-mono text-xs">
          {[
            { id: 'TODAY', label: 'TODAY' },
            { id: 'THIS_WEEK', label: 'THIS WEEK' },
            { id: 'CALENDAR', label: 'CALENDAR' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Days Timeline */}
      {sortedDates.length > 0 ? (
        <div className="space-y-12">
          {sortedDates.map(dateStr => {
            const dayTasks = groupedByDate[dateStr];
            const { weekday, day, month } = formatEditorialDate(dateStr);
            const isToday = dateStr === referenceDate;

            return (
              <div key={dateStr} className="space-y-4">
                {/* Editorial Day Header */}
                <div className="border-b border-[var(--border)] pb-2 flex items-baseline justify-between">
                  <div>
                    <div className="font-display text-xl sm:text-2xl text-[var(--foreground)] tracking-tight uppercase">
                      {weekday}
                    </div>
                    <div className="font-mono text-xs text-[var(--accent)] font-semibold mt-0.5">
                      {day} {month} {isToday && '• TODAY'}
                    </div>
                  </div>

                  <div className="font-mono text-xs text-[var(--muted-foreground)]">
                    {dayTasks.filter(t => t.status === 'COMPLETED').length} OF {dayTasks.length} COMPLETED
                  </div>
                </div>

                {/* Day Tasks List */}
                <div className="divide-y divide-[var(--border)]">
                  {dayTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-3 font-mono">
          <div className="text-xs uppercase text-[var(--muted-foreground)] tracking-wider">
            NO SESSIONS SCHEDULED
          </div>
          <div className="font-display text-xl text-[var(--foreground)] uppercase">
            NO TASKS FOUND FOR THIS FILTER.
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Click "Rebalance" to recompute your revision calendar around all remaining topics.
          </p>
        </div>
      )}
    </div>
  );
};
