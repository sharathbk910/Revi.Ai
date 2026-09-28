import React from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, User, LogOut, MessageSquare } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenOnboarding: () => void;
  onOpenNexAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenOnboarding,
  onOpenNexAssistant,
}) => {
  const {
    user,
    isAuthenticated,
    openAuthModal,
    logout,
  } = usePlanner();

  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plan', label: 'My Plan' },
    { id: 'syllabus', label: 'Syllabus' },
    { id: 'exams', label: 'Exams' },
    { id: 'progress', label: 'Progress' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)] transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div
          className="flex items-baseline gap-2 cursor-pointer select-none shrink-0"
          onClick={() => setActiveTab('landing')}
        >
          <span className="font-display text-xl sm:text-2xl text-[var(--foreground)] tracking-tight-poster uppercase">
            REVISIONLY
          </span>
          <span className="font-mono text-[10px] text-[var(--accent)] font-bold">
            / 2.6
          </span>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-1 uppercase tracking-wider transition-colors relative ${
                  isActive
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-5 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* AI Assistant Side Panel Trigger */}
          <button
            onClick={onOpenNexAssistant}
            className="btn-ghost text-xs px-2.5 py-1.5 min-h-[44px] flex items-center gap-1.5"
            title="Open Revisionly AI"
            aria-label="Open AI Assistant"
          >
            <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden sm:inline font-mono">AI</span>
          </button>

          {/* Visible Dark / Light Mode Toggle (Requirement 4 & 24) */}
          <button
            onClick={toggleTheme}
            className="btn-secondary text-xs px-3 py-1.5 min-h-[44px] flex items-center gap-2"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle dark and light mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-mono font-bold tracking-wider">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-mono font-bold tracking-wider">DARK</span>
              </>
            )}
          </button>

          {/* Profile / Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('settings')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] font-mono text-xs text-[var(--foreground)] min-h-[44px]"
                title={`Logged in as ${user?.email}`}
              >
                <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="truncate max-w-[110px]">{user?.email?.split('@')[0]}</span>
              </button>
              <button
                onClick={logout}
                className="btn-ghost text-xs p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#FF3D00]"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="btn-ghost text-xs px-3 py-1.5 min-h-[44px] hidden sm:flex items-center gap-1.5 font-mono"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Primary CTA */}
          <button
            onClick={onOpenOnboarding}
            className="btn-primary text-xs px-4 py-2 min-h-[44px]"
          >
            <span>Start Planning</span>
          </button>
        </div>
      </div>
    </header>
  );
};
