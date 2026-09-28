import React from 'react';
import { LayoutDashboard, Calendar, BookOpen, CheckSquare, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'TODAY', icon: LayoutDashboard },
    { id: 'plan', label: 'PLAN', icon: Calendar },
    { id: 'syllabus', label: 'SYLLABUS', icon: BookOpen },
    { id: 'exams', label: 'EXAMS', icon: CheckSquare },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)] px-1 py-1 flex items-center justify-around">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-2 min-w-[56px] min-h-[48px] transition-colors ${
              isActive ? 'text-[var(--accent)] font-bold' : 'text-[var(--muted-foreground)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-mono tracking-wider">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
