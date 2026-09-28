import React from 'react';
import { ArrowRight, Calendar, Brain, BookOpen, Clock, BarChart3, MessageSquare } from 'lucide-react';
import { EditorialHeroSchedule } from './EditorialHeroSchedule';
import { AlivePlanDemo } from './AlivePlanDemo';
import { usePlanner } from '../../context/PlannerContext';

interface LandingPageProps {
  onStartPlanning: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartPlanning,
  onExploreDemo,
}) => {
  const { resetDemoData, clearAllData, exams } = usePlanner();

  const howItWorksSteps = [
    {
      num: '01',
      title: 'Input Your Exams',
      desc: 'Enter exam names, dates, start times, and durations. All revision timelines anchor around these deadlines.',
    },
    {
      num: '02',
      title: 'Add Your Syllabus',
      desc: 'Paste or upload topics topic-by-topic. Categorized by priority, subject, and realistic estimated study duration.',
    },
    {
      num: '03',
      title: 'Set Your Study Time',
      desc: 'Define how many hours you can realistically study each day and your preferred energy blocks (morning, evening, deep work).',
    },
    {
      num: '04',
      title: 'Get Your Plan',
      desc: 'Revisionly automatically compiles an editorial day-by-day timetable spreading topics evenly with pre-allocated revision buffers.',
    },
    {
      num: '05',
      title: 'Track Progress',
      desc: 'Check off topics as you finish them. Watch your live readiness scores and exam countdown meters update from real records.',
    },
    {
      num: '06',
      title: 'Auto-Reschedule When Needed',
      desc: 'Life happens. Missed a topic? One click rebalances your remaining schedule into available slots with zero manual math.',
    },
  ];

  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      desc: 'Distributes syllabus topics evenly ahead of exam dates, reserving high-yield revision buffers to prevent last-minute cramming.',
    },
    {
      icon: Brain,
      title: 'Adaptive Rescheduling',
      desc: 'Missed a topic today? The engine rebuilds remaining sessions factoring in exam deadlines and your daily hours capacity.',
    },
    {
      icon: BookOpen,
      title: 'Syllabus Tracker',
      desc: 'Structured checklist of every concept and module with real-time completion telemetry and subject readiness meters.',
    },
    {
      icon: Clock,
      title: 'Exam Countdown',
      desc: 'Oversized visual countdowns for every exam. Always know exactly how many days and study blocks remain.',
    },
    {
      icon: BarChart3,
      title: 'Grounded Analytics',
      desc: 'Real completion percentages calculated strictly from finished topics. No fabricated streaks, fake hours, or mock percentages.',
    },
    {
      icon: MessageSquare,
      title: 'AI Study Assistant',
      desc: 'Contextual assistant powered by Groq and grounded in your live timetable and syllabus to guide what to study next.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Demo Notification Bar */}
      <section className="border-b border-[var(--border)] bg-[var(--muted)]/40 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[var(--foreground)]">
            <span className="w-1.5 h-1.5 bg-[var(--accent)]" />
            <span className="font-bold text-[var(--accent)]">DEMO DATA</span>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span>NxtWave semester example loaded ({exams.length} exams &amp; complete syllabus)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExploreDemo}
              className="px-2.5 py-1 text-xs font-mono border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              EXPLORE DEMO
            </button>
            <button
              onClick={clearAllData}
              className="px-2.5 py-1 text-xs font-mono border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors"
            >
              CLEAR DEMO
            </button>
            <button
              onClick={resetDemoData}
              className="px-2.5 py-1 text-xs font-mono border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
            >
              RESET DEMO
            </button>
          </div>
        </div>
      </section>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left: Headline & Editorial Copy */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-block border-b border-[var(--accent)] pb-1">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                [ INTELLIGENT EXAM PLANNING SYSTEM ]
              </span>
            </div>

            {/* Massive Responsive Typography */}
            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl text-[var(--foreground)] tracking-tight-poster uppercase leading-[0.92]">
              STOP
              <br />
              PLANNING.
              <br />
              <span className="text-[var(--accent)]">START</span>
              <br />
              STUDYING.
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg text-[var(--muted-foreground)] font-mono max-w-xl leading-relaxed">
              Give Revisionly your exam dates and syllabus topics. We turn them into an{' '}
              <strong className="text-[var(--foreground)] font-bold">adaptive study plan</strong> that automatically
              recalculates whenever life interrupts your routine.
            </p>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onStartPlanning}
                className="btn-primary text-sm py-3.5 px-8"
              >
                <span>Start Planning</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreDemo}
                className="btn-secondary text-sm py-3.5 px-8"
              >
                Explore Demo
              </button>
            </div>

            {/* Supporting Information Specs */}
            <div className="pt-8 border-t border-[var(--border)] grid grid-cols-3 gap-6 font-mono">
              <div>
                <div className="text-2xl font-display text-[var(--foreground)]">0%</div>
                <div className="text-[11px] text-[var(--muted-foreground)] uppercase mt-0.5">
                  Initial Progress
                </div>
              </div>
              <div>
                <div className="text-2xl font-display text-[var(--accent)]">0px</div>
                <div className="text-[11px] text-[var(--muted-foreground)] uppercase mt-0.5">
                  Border Radius
                </div>
              </div>
              <div>
                <div className="text-2xl font-display text-[var(--foreground)]">AUTO</div>
                <div className="text-[11px] text-[var(--muted-foreground)] uppercase mt-0.5">
                  Rescheduling
                </div>
              </div>
            </div>
          </div>

          {/* Right: Technical Editorial Schedule Widget */}
          <div className="lg:col-span-5">
            <EditorialHeroSchedule />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] pt-16">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
            [ ARCHITECTURE &amp; WORKFLOW ]
          </span>
          <h2 className="font-display text-3xl sm:text-5xl text-[var(--foreground)] tracking-tight-poster uppercase mt-2">
            HOW IT WORKS.
          </h2>
          <p className="font-mono text-sm text-[var(--muted-foreground)] mt-3">
            From raw timetable to an adaptive, deterministic revision schedule in six steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)]">
          {howItWorksSteps.map(step => (
            <div
              key={step.num}
              className="bg-[var(--card)] p-8 space-y-4 hover:bg-[var(--muted)]/30 transition-colors"
            >
              <div className="font-mono text-2xl font-bold text-[var(--accent)]">
                {step.num}
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight uppercase">
                {step.title}
              </h3>
              <p className="font-mono text-xs text-[var(--muted-foreground)] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ADAPTIVE SCHEDULING INTERACTIVE EXAMPLE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AlivePlanDemo />
      </section>

      {/* FEATURES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] pt-16">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
            [ PURPOSE-BUILT CAPABILITIES ]
          </span>
          <h2 className="font-display text-3xl sm:text-5xl text-[var(--foreground)] tracking-tight-poster uppercase mt-2">
            ENGINEERED FOR SERIOUS STUDY.
          </h2>
          <p className="font-mono text-sm text-[var(--muted-foreground)] mt-3">
            No gaming decoration. No bloated dashboards. Only clarity, structure, and focus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="border-t border-[var(--border)] pt-6 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[var(--accent)] stroke-[2]" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                    SPEC 0{idx + 1}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--foreground)] tracking-tight uppercase">
                  {feat.title}
                </h3>
                <p className="font-mono text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] pt-16 pb-8">
        <div className="border border-[var(--border)] bg-[var(--card)] p-8 sm:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ TAKE CONTROL OF YOUR TIMETABLE ]
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
              READY TO STUDY WITH COMPLETE CLARITY?
            </h2>
            <p className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)]">
              No spreadsheets. No rigid timetables that crumble when you miss one day.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <button
              onClick={onStartPlanning}
              className="btn-primary text-sm py-3.5 px-8"
            >
              Start Planning
            </button>
            <button
              onClick={onExploreDemo}
              className="btn-secondary text-sm py-3.5 px-8"
            >
              Explore Demo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border)] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--foreground)] uppercase tracking-wider">
              REVISIONLY
            </span>
            <span>•</span>
            <span>POSTER DESIGN TRANSLATED TO WEB</span>
          </div>
          <div>
            NXTWAVE SEMESTER COMPLIANT // 0% INITIAL COMPLETION
          </div>
        </div>
      </footer>
    </div>
  );
};
