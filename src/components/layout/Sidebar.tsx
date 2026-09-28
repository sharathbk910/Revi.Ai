import React from 'react';
import { usePlanner } from '../../context/PlannerContext';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  CheckSquare,
  BarChart3,
  Settings,
  RotateCcw,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const {
    nextExam,
    nextExamDays,
    overallProgressPercent,
    completedCount,
    totalTopicsCount,
    resetDemoData,
  } = usePlanner();

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plan', label: 'My Plan', icon: Calendar },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen, count: totalTopicsCount },
    { id: 'exams', label: 'Exams', icon: CheckSquare },
    { id: 'progress', label: 'Progress', icon: BarChart3, badge: `${overallProgressPercent}%` },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--card)] p-6 shrink-0 min-h-[calc(100vh-4rem)] justify-between transition-colors duration-150">
      <div className="space-y-8">
        {/* Navigation Section */}
        <div>
          <div className="font-mono text-[10px] text-[var(--muted-foreground)] tracking-widest uppercase mb-3">
            DIRECTORY
          </div>
          <nav className="space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[var(--foreground)] text-[var(--background)] font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="font-mono text-[10px]">
                      {link.badge}
                    </span>
                  )}
                  {link.count !== undefined && !link.badge && (
                    <span className="font-mono text-[10px]">
                      {link.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Next Exam Sidebar Summary */}
        <div className="border border-[var(--border)] p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-[var(--accent)] font-bold uppercase tracking-wider">
            <span>NEXT EXAM</span>
            <span>{nextExamDays < 10 ? `0${nextExamDays}` : nextExamDays}D</span>
          </div>
          <div className="font-bold text-[var(--foreground)] truncate">
            {nextExam?.name || 'No Exam Scheduled'}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">
            {nextExam?.date} • {nextExam?.time}
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="text-[var(--muted-foreground)] uppercase">Readiness</span>
            <span className="font-bold text-[var(--foreground)]">{overallProgressPercent}%</span>
          </div>
          <div className="w-full h-1 bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            {completedCount} of {totalTopicsCount} topics completed
          </div>
        </div>
      </div>

      {/* Bottom Technical Status & Reset Demo */}
      <div className="pt-6 border-t border-[var(--border)] space-y-3 font-mono text-xs">
        <button
          onClick={resetDemoData}
          className="w-full py-2 px-3 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--accent)] text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          title="Restore default NxtWave demo dataset with 0% progress"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo (0%)</span>
        </button>

        <div className="text-[10px] text-[var(--muted-foreground)] text-center">
          POSTER DESIGN // 0PX RADIUS
        </div>
      </div>
    </aside>
  );
};
