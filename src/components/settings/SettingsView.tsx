import React, { useState } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Clock,
  Sliders,
  Sun,
  Moon,
  Globe,
  Download,
  Check,
  Bot,
  Key,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    isAuthenticated,
    openAuthModal,
    logout,
    availability,
    preferences,
    updateAvailability,
    updatePreferences,
    exportPlanAsCSV,
    exportPlanAsJSON,
    resetDemoData,
    clearAllData,
    importNxtWaveDemo,
    isDemoImporting,
  } = usePlanner();

  const { theme, setTheme } = useTheme();

  // Local form states
  const [dailyHours, setDailyHours] = useState(availability.dailyHours || 4);
  const [morning, setMorning] = useState(availability.slots.morning);
  const [afternoon, setAfternoon] = useState(availability.slots.afternoon);
  const [evening, setEvening] = useState(availability.slots.evening);
  const [night, setNight] = useState(availability.slots.night);

  const [sessionDuration, setSessionDuration] = useState(preferences.sessionDuration || 45);
  const [autoRescheduling, setAutoRescheduling] = useState(preferences.autoRescheduling);
  const [deepWork, setDeepWork] = useState(preferences.deepWork);
  const [revisionSessions, setRevisionSessions] = useState(preferences.revisionSessions);
  const [practiceSessions] = useState(preferences.practiceSessions);

  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [notifications, setNotifications] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [groqKey, setGroqKey] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('revision_ai_groq_key') : '') || '';
  });
  const [groqKeySaved, setGroqKeySaved] = useState(false);

  const handleSaveGroqKey = () => {
    if (typeof window !== 'undefined') {
      if (groqKey.trim()) {
        localStorage.setItem('revision_ai_groq_key', groqKey.trim());
      } else {
        localStorage.removeItem('revision_ai_groq_key');
      }
      setGroqKeySaved(true);
      setTimeout(() => setGroqKeySaved(false), 2500);
    }
  };

  const handleSaveSettings = async () => {
    await updateAvailability({
      dailyHours,
      slots: { morning, afternoon, evening, night },
    });

    await updatePreferences({
      sessionDuration,
      autoRescheduling,
      deepWork,
      revisionSessions,
      practiceSessions,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <section className="border-b border-[var(--border)] pb-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            [ SYSTEM CONFIGURATION ]
          </div>
          <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
            SETTINGS.
          </h1>
          <div className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)] mt-3">
            Profile • Study hours • Theme tokens • Automation preferences
          </div>
        </div>
      </section>

      {savedSuccess && (
        <div className="p-4 border border-[var(--accent)] bg-[var(--card)] font-mono text-xs text-[var(--foreground)] flex items-center gap-3 animate-in fade-in">
          <Check className="w-4 h-4 text-[var(--accent)] stroke-[3]" />
          <span>Preferences updated and synchronized across all active engines.</span>
        </div>
      )}

      {/* 1. PROFILE SECTION */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              STUDENT PROFILE
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase">
            {isAuthenticated ? 'Authenticated Account' : 'Guest Mode (Local Cache)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <div className="text-[var(--muted-foreground)] text-[10px] uppercase mb-1">
              Account Status
            </div>
            <div className="font-bold text-[var(--foreground)] text-sm">
              {isAuthenticated ? user?.email : 'Local Guest Operative'}
            </div>
            <div className="text-[var(--muted-foreground)] text-[11px] mt-1">
              {isAuthenticated
                ? 'Your timetable is backed by Supabase cloud PostgreSQL with Row Level Security.'
                : 'Data is saved to your browser local storage.'}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end">
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="btn-secondary text-xs"
              >
                Log Out
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="btn-primary text-xs"
              >
                Log In / Register
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. THEME & INTERFACE SECTION (PART 4 & 24) */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Sun className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              THEME &amp; VISUAL SYSTEM
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[var(--accent)] font-semibold uppercase">
            Active: {theme.toUpperCase()} MODE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            onClick={() => setTheme('dark')}
            className={`p-5 border cursor-pointer transition-all ${
              theme === 'dark'
                ? 'border-[var(--accent)] bg-[#0A0A0A] text-[#FAFAFA]'
                : 'border-[var(--border)] bg-[#1A1A1A] text-[#FAFAFA] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="flex items-center gap-2 font-bold uppercase">
                <Moon className="w-4 h-4 text-[var(--accent)]" />
                DARK MODE
              </span>
              {theme === 'dark' && <span className="text-[var(--accent)]">[ACTIVE]</span>}
            </div>
            <p className="font-mono text-xs text-[#737373] mt-2">
              Near-black (#0A0A0A), warm white typography, vermillion (#FF3D00) accent.
            </p>
          </div>

          <div
            onClick={() => setTheme('light')}
            className={`p-5 border cursor-pointer transition-all ${
              theme === 'light'
                ? 'border-[var(--accent)] bg-[#F8F8F6] text-[#0A0A0A]'
                : 'border-[var(--border)] bg-[#F8F8F6] text-[#0A0A0A] opacity-60'
            }`}
          >
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="flex items-center gap-2 font-bold uppercase">
                <Sun className="w-4 h-4 text-[var(--accent)]" />
                LIGHT MODE
              </span>
              {theme === 'light' && <span className="text-[var(--accent)]">[ACTIVE]</span>}
            </div>
            <p className="font-mono text-xs text-[#737373] mt-2">
              Warm white editorial paper (#F8F8F6), deep black typography, vermillion (#FF3D00) accent.
            </p>
          </div>
        </div>
      </section>

      {/* 3. STUDY AVAILABILITY & CAPACITY */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              STUDY AVAILABILITY
            </h2>
          </div>
          <span className="font-mono text-xs text-[var(--accent)] font-semibold">
            {dailyHours} HOURS / DAY
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block font-mono text-xs uppercase text-[var(--foreground)] font-bold mb-2">
              Daily Study Capacity: {dailyHours}h
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={dailyHours}
              onChange={e => setDailyHours(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between font-mono text-[10px] text-[var(--muted-foreground)] mt-1">
              <span>1h (Light)</span>
              <span>4h (Standard Balanced)</span>
              <span>10h (Intensive)</span>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs uppercase text-[var(--foreground)] font-bold mb-3">
              Preferred Study Blocks
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {[
                { label: 'Morning (08-12)', state: morning, set: setMorning },
                { label: 'Afternoon (13-17)', state: afternoon, set: setAfternoon },
                { label: 'Evening (17-21)', state: evening, set: setEvening },
                { label: 'Night (21-00)', state: night, set: setNight },
              ].map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => slot.set(!slot.state)}
                  className={`p-3 border text-left transition-colors ${
                    slot.state
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] font-bold'
                      : 'border-[var(--border)] text-[var(--muted-foreground)]'
                  }`}
                >
                  <div className="text-[10px] uppercase text-[var(--muted-foreground)]">Block 0{i + 1}</div>
                  <div className="text-xs mt-1">{slot.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SCHEDULER & REBALANCING BEHAVIOR */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              SCHEDULING ENGINE PREFERENCES
            </h2>
          </div>
        </div>

        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[var(--foreground)] uppercase">
                Autonomous Rescheduling
              </div>
              <div className="text-[var(--muted-foreground)] text-[11px] mt-0.5">
                Automatically move missed sessions into upcoming available slots before exams.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoRescheduling(!autoRescheduling)}
              className={`px-3 py-1.5 border text-xs font-bold uppercase transition-colors ${
                autoRescheduling
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              {autoRescheduling ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[var(--foreground)] uppercase">
                Session Duration
              </div>
              <div className="text-[var(--muted-foreground)] text-[11px] mt-0.5">
                Target duration for each focused study block.
              </div>
            </div>
            <select
              value={sessionDuration}
              onChange={e => setSessionDuration(Number(e.target.value))}
              className="editorial-input w-28 text-xs py-1"
            >
              <option value={30}>30 MIN</option>
              <option value={45}>45 MIN</option>
              <option value={60}>60 MIN</option>
              <option value={90}>90 MIN</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[var(--foreground)] uppercase">
                High-Yield Revision Buffers
              </div>
              <div className="text-[var(--muted-foreground)] text-[11px] mt-0.5">
                Reserve dedicated revision blocks 24-48 hours before each examination.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRevisionSessions(!revisionSessions)}
              className={`px-3 py-1.5 border text-xs font-bold uppercase transition-colors ${
                revisionSessions
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              {revisionSessions ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-[var(--border)]">
            <div>
              <div className="font-bold text-[var(--foreground)] uppercase">
                Deep Work Focus Prioritization
              </div>
              <div className="text-[var(--muted-foreground)] text-[11px] mt-0.5">
                Allocate high-priority syllabus topics during initial morning energy windows.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeepWork(!deepWork)}
              className={`px-3 py-1.5 border text-xs font-bold uppercase transition-colors ${
                deepWork
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              {deepWork ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      </section>

      {/* 5. TIMEZONE & NOTIFICATIONS */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              LOCALIZATION &amp; NOTIFICATIONS
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <label className="block text-[var(--muted-foreground)] text-[10px] uppercase mb-1">
              Academic Timezone
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="editorial-input text-xs"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              <option value="UTC">UTC (GMT +0:00)</option>
              <option value="America/New_York">America/New York (EST)</option>
              <option value="Europe/London">Europe/London (BST)</option>
            </select>
          </div>

          <div>
            <label className="block text-[var(--muted-foreground)] text-[10px] uppercase mb-1">
              Missed Session Alerts
            </label>
            <button
              type="button"
              onClick={() => setNotifications(!notifications)}
              className={`w-full p-2.5 border text-left flex items-center justify-between transition-colors ${
                notifications
                  ? 'border-[var(--accent)] text-[var(--foreground)] font-bold'
                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              <span>Daily Check-in Notifications</span>
              <span className="text-[var(--accent)]">{notifications ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="btn-primary text-xs py-2.5 px-6"
          >
            Save All Preferences
          </button>
        </div>
      </section>

      {/* 6. AI ENGINE CONFIGURATION */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Bot className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              AI ENGINE CONFIGURATION (GROQ LLM)
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[var(--accent)] font-semibold uppercase flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            {groqKey || import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY ? 'CONFIGURED' : 'NOT SET'}
          </span>
        </div>

        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[var(--muted-foreground)] text-[10px] uppercase mb-1">
              Custom Groq API Key (Optional Override)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                placeholder="gsk_..."
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
                className="editorial-input text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleSaveGroqKey}
                className="btn-primary text-xs py-2 px-4 whitespace-nowrap"
              >
                {groqKeySaved ? 'Saved!' : 'Save Key'}
              </button>
            </div>
            <p className="text-[var(--muted-foreground)] text-[11px] mt-2">
              Revisionly uses Groq (Qwen / Llama) for ultra-fast, tailored academic coaching and dynamic syllabus extraction.
              If not specified here, it automatically uses the server-configured environment key.
            </p>
          </div>
        </div>
      </section>

      {/* 7. DATA MANAGEMENT & EXPORT */}
      <section className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg sm:text-xl text-[var(--foreground)] tracking-tight uppercase">
              DATA PORTABILITY &amp; DEMO CONTROLS
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono text-xs">
          <button
            onClick={exportPlanAsCSV}
            className="p-4 border border-[var(--border)] hover:border-[var(--foreground)] text-left space-y-1 transition-colors"
          >
            <div className="font-bold text-[var(--foreground)] uppercase">Export CSV</div>
            <div className="text-[var(--muted-foreground)] text-[10px]">Spreadsheet compatible</div>
          </button>

          <button
            onClick={exportPlanAsJSON}
            className="p-4 border border-[var(--border)] hover:border-[var(--foreground)] text-left space-y-1 transition-colors"
          >
            <div className="font-bold text-[var(--foreground)] uppercase">Export JSON</div>
            <div className="text-[var(--muted-foreground)] text-[10px]">Full raw database backup</div>
          </button>

          <button
            onClick={importNxtWaveDemo}
            disabled={isDemoImporting}
            className="p-4 border border-[var(--border)] hover:border-[var(--accent)] text-left space-y-1 transition-colors disabled:opacity-50"
          >
            <div className="font-bold text-[var(--accent)] uppercase">
              {isDemoImporting ? 'Importing...' : 'Import Demo'}
            </div>
            <div className="text-[var(--muted-foreground)] text-[10px]">Load NxtWave dataset</div>
          </button>

          <button
            onClick={resetDemoData}
            className="p-4 border border-[var(--border)] hover:border-[var(--accent)] text-left space-y-1 transition-colors"
          >
            <div className="font-bold text-[var(--accent)] uppercase">Reset Demo</div>
            <div className="text-[var(--muted-foreground)] text-[10px]">Restore 0% completion</div>
          </button>

          <button
            onClick={clearAllData}
            className="p-4 border border-[var(--border)] hover:border-[#FF3D00] text-left space-y-1 transition-colors group"
          >
            <div className="font-bold text-[#FF3D00] uppercase">Clear All Data</div>
            <div className="text-[var(--muted-foreground)] text-[10px]">Purge all syllabus and exams</div>
          </button>
        </div>
      </section>
    </div>
  );
};
