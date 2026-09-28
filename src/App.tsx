import React, { useState } from 'react';
import { PlannerProvider, usePlanner } from './context/PlannerContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { PlanView } from './components/plan/PlanView';
import { SyllabusView } from './components/syllabus/SyllabusView';
import { ExamsView } from './components/exams/ExamsView';
import { ProgressView } from './components/progress/ProgressView';
import { SettingsView } from './components/settings/SettingsView';
import { NexAssistantModal } from './components/ai/NexAssistantModal';
import { AddExamModal } from './components/modals/AddExamModal';
import { EditExamModal } from './components/modals/EditExamModal';
import { AddTopicModal } from './components/modals/AddTopicModal';
import { BulkSyllabusModal } from './components/modals/BulkSyllabusModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { AuthModal } from './components/auth/AuthModal';
import type { Exam } from './types';
import { MessageSquare } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal } = usePlanner();
  const [activeTab, setActiveTab] = useState<string>('landing');

  // Modals state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [addTopicSubjectId, setAddTopicSubjectId] = useState<string | undefined>(undefined);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportSubjectId, setBulkImportSubjectId] = useState<string | undefined>(undefined);

  const handleOpenAddTopic = (subjectId?: string) => {
    setAddTopicSubjectId(subjectId);
    setIsAddTopicOpen(true);
  };

  const handleOpenBulkImport = (subjectId?: string) => {
    setBulkImportSubjectId(subjectId);
    setIsBulkImportOpen(true);
  };

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExam(exam);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col font-['Inter_Tight',sans-serif] relative transition-colors duration-150 editorial-grain selection:bg-[var(--accent)] selection:text-white">
      {/* Floating Global Toasts */}
      <ToastContainer />

      {/* Top Navbar with Theme Toggle */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenNexAssistant={() => setIsAiOpen(true)}
      />

      {/* Landing Page View */}
      {activeTab === 'landing' ? (
        <main className="flex-1 pb-16">
          <LandingPage
            onStartPlanning={() => setIsOnboardingOpen(true)}
            onExploreDemo={() => setActiveTab('dashboard')}
          />
        </main>
      ) : (
        /* Workspace Shell with Desktop Sidebar */
        <div className="flex-1 flex max-w-7xl mx-auto w-full">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 overflow-x-hidden min-w-0">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenAddTopic={() => handleOpenAddTopic()}
                onOpenAddExam={() => setIsAddExamOpen(true)}
              />
            )}

            {activeTab === 'plan' && <PlanView />}

            {activeTab === 'syllabus' && (
              <SyllabusView
                onOpenAddTopic={handleOpenAddTopic}
                onOpenBulkImport={handleOpenBulkImport}
              />
            )}

            {activeTab === 'exams' && (
              <ExamsView
                onOpenAddExam={() => setIsAddExamOpen(true)}
                onOpenEditExam={handleOpenEditExam}
                onViewPlan={() => setActiveTab('plan')}
              />
            )}

            {activeTab === 'progress' && <ProgressView />}

            {activeTab === 'settings' && <SettingsView />}
          </main>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickAdd={() => setIsAddTopicOpen(true)}
      />

      {/* Floating AI Study Assistant Trigger Button (Editorial Minimalist) */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-20 lg:bottom-6 right-6 z-40 px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--foreground)] transition-colors shadow-sm flex items-center gap-2 text-xs font-mono font-bold"
        aria-label="Open Revisionly AI Assistant"
      >
        <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
        <span className="hidden sm:inline">REVISIONLY AI</span>
        <span className="sm:hidden">AI</span>
      </button>

      {/* Modals & Dialogs */}
      <NexAssistantModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => {
          setIsOnboardingOpen(false);
          setActiveTab('dashboard');
        }}
      />

      <AddExamModal isOpen={isAddExamOpen} onClose={() => setIsAddExamOpen(false)} />

      <EditExamModal
        exam={editingExam}
        isOpen={!!editingExam}
        onClose={() => setEditingExam(null)}
      />

      <AddTopicModal
        initialSubjectId={addTopicSubjectId}
        isOpen={isAddTopicOpen}
        onClose={() => setIsAddTopicOpen(false)}
      />

      <BulkSyllabusModal
        initialSubjectId={bulkImportSubjectId}
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <PlannerProvider>
        <AppContent />
      </PlannerProvider>
    </ThemeProvider>
  );
}

export default App;
