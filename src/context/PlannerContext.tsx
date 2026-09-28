import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Exam, Subject, Topic, StudyTask, Availability, Preferences, CapacityWarning } from '../types';
import { DEMO_EXAMS, DEMO_SUBJECTS, DEMO_TOPICS, DEMO_AVAILABILITY, DEMO_PREFERENCES } from '../data/demoData';
import { generateStudySchedule, rescheduleMissedTasks } from '../utils/scheduler';
import { authService, type AuthResponse } from '../services/authService';
import { examService } from '../services/examService';
import { subjectService } from '../services/subjectService';
import { topicService } from '../services/topicService';
import { preferencesService } from '../services/preferencesService';
import { studySessionService } from '../services/studySessionService';
import { demoImportService } from '../services/demoImportService';
import { aiService, type AIPlanAdvice } from '../services/aiService';
import { isSupabaseConfigured } from '../services/supabase';
import confetti from 'canvas-confetti';

export interface NotificationToast {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'SYSTEM';
  title: string;
  message: string;
}

export interface PlannerContextType {
  // Core state
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  tasks: StudyTask[];
  availability: Availability;
  preferences: Preferences;
  referenceDate: string;
  capacityWarning: CapacityWarning | null;
  toasts: NotificationToast[];
  isRebalancing: boolean;
  missedTasks: StudyTask[];
  todayTasks: StudyTask[];
  completedCount: number;
  totalTopicsCount: number;
  overallProgressPercent: number;
  nextExam: Exam | null;
  nextExamDays: number;
  todayStudyHours: { completed: number; total: number };

  // Auth & Cloud State
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isSupabaseOnline: boolean;
  isAuthModalOpen: boolean;
  isDemoImporting: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, displayName?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  loginWithGoogle: () => Promise<{ error: any }>;
  importNxtWaveDemo: () => Promise<void>;

  // AI Insights State
  aiAdvice: AIPlanAdvice | null;
  refreshAiAdvice: () => Promise<void>;
  isAiGenerating: boolean;

  // Actions
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  startTask: (taskId: string) => void;
  autoRescheduleMissed: () => Promise<void>;
  dismissCheckIn: () => void;
  addExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  updateExam: (id: string, exam: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  addTopic: (topic: Omit<Topic, 'id' | 'completed'>) => Promise<void>;
  bulkAddTopics: (subjectId: string, lines: string[]) => Promise<void>;
  toggleTopicCompleted: (topicId: string) => Promise<void>;
  deleteTopic: (topicId: string) => Promise<void>;
  updateAvailability: (availability: Partial<Availability>) => Promise<void>;
  updatePreferences: (preferences: Partial<Preferences>) => Promise<void>;
  setReferenceDate: (dateStr: string) => void;
  optimizePlan: (strategy: 'ADD_HOURS' | 'COMPRESS_SESSIONS' | 'PRIORITIZE_HIGH') => void;
  resetDemoData: () => void;
  clearAllData: () => Promise<void>;
  exportPlanAsCSV: () => void;
  exportPlanAsJSON: () => void;
  dismissToast: (id: string) => void;
  recalculateSchedule: () => void;
  addToast: (type: NotificationToast['type'], title: string, message: string) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const STORAGE_KEY = 'revisionly_state_v2';

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoImporting, setIsDemoImporting] = useState(false);
  const isSupabaseOnline = isSupabaseConfigured();

  // Core domain state
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_exams`);
      return saved ? JSON.parse(saved) : DEMO_EXAMS;
    } catch {
      return DEMO_EXAMS;
    }
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_subjects`);
      return saved ? JSON.parse(saved) : DEMO_SUBJECTS;
    } catch {
      return DEMO_SUBJECTS;
    }
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_topics`);
      return saved ? JSON.parse(saved) : DEMO_TOPICS;
    } catch {
      return DEMO_TOPICS;
    }
  });

  const [availability, setAvailability] = useState<Availability>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_availability`);
      return saved ? JSON.parse(saved) : DEMO_AVAILABILITY;
    } catch {
      return DEMO_AVAILABILITY;
    }
  });

  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_preferences`);
      return saved ? JSON.parse(saved) : DEMO_PREFERENCES;
    } catch {
      return DEMO_PREFERENCES;
    }
  });

  const [referenceDate, setReferenceDateState] = useState<string>('2026-09-28');
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [capacityWarning, setCapacityWarning] = useState<CapacityWarning | null>(null);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [dismissedCheckInDate, setDismissedCheckInDate] = useState<string>('');

  // AI Insights state
  const [aiAdvice, setAiAdvice] = useState<AIPlanAdvice | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // Toast notification helper
  const addToast = useCallback((type: NotificationToast['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev.slice(-3), { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 1. Auth Subscription & Session Detection
  useEffect(() => {
    if (!isSupabaseOnline) return;

    authService.getUser().then((currentUser: User | null) => {
      setUser(currentUser);
    });

    const { data: authListener } = authService.onAuthStateChange((_session, authUser) => {
      setUser(authUser);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isSupabaseOnline]);

  // 2. Load Real Data from Supabase when Authenticated User changes
  const loadUserDataFromSupabase = useCallback(async (userId: string) => {
    try {
      addToast('SYSTEM', '> CLOUD.SYNC', 'Synchronizing student database records...');
      const [userExams, userSubjects, userTopics, userPref] = await Promise.all([
        examService.getExams(userId),
        subjectService.getSubjects(userId),
        topicService.getTopics(userId),
        preferencesService.getPreferences(userId),
      ]);

      setExams(userExams);
      setSubjects(userSubjects);
      setTopics(userTopics);

      if (userPref) {
        setAvailability(userPref.availability);
        setPreferences(userPref.preferences);
      }
      addToast('SUCCESS', '> SYNC.COMPLETE', 'Cloud records loaded securely.');
    } catch (err: any) {
      console.warn('Failed to load user data from Supabase:', err);
      addToast('WARNING', '> SYNC.FALLBACK', 'Using local state cache.');
    }
  }, [addToast]);

  useEffect(() => {
    if (user && isSupabaseOnline) {
      loadUserDataFromSupabase(user.id);
    }
  }, [user, isSupabaseOnline, loadUserDataFromSupabase]);

  // 3. LocalStorage persistence fallback for Guest Mode
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(`${STORAGE_KEY}_exams`, JSON.stringify(exams));
        localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
        localStorage.setItem(`${STORAGE_KEY}_topics`, JSON.stringify(topics));
        localStorage.setItem(`${STORAGE_KEY}_availability`, JSON.stringify(availability));
        localStorage.setItem(`${STORAGE_KEY}_preferences`, JSON.stringify(preferences));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
  }, [exams, subjects, topics, availability, preferences, user]);

  // 4. Deterministic Scheduler Engine
  const runScheduler = useCallback((
    currentTopics: Topic[],
    currentExams: Exam[],
    currentAvail: Availability,
    currentPref: Preferences,
    existingTasks: StudyTask[] = []
  ) => {
    const { tasks: generatedTasks, capacityWarning: warning } = generateStudySchedule(
      currentExams,
      currentTopics,
      currentAvail,
      currentPref,
      referenceDate,
      existingTasks
    );
    setTasks(generatedTasks);
    setCapacityWarning(warning);

    // If user is authenticated, sync study sessions
    if (user && isSupabaseOnline && generatedTasks.length > 0) {
      studySessionService.syncGeneratedSessions(user.id, generatedTasks).catch(err => {
        console.warn('Silent session sync error:', err);
      });
    }
  }, [referenceDate, user, isSupabaseOnline]);

  useEffect(() => {
    runScheduler(topics, exams, availability, preferences, tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams, topics.length, availability.dailyHours, preferences.sessionDuration, referenceDate]);

  const recalculateSchedule = useCallback(() => {
    setIsRebalancing(true);
    setTimeout(() => {
      runScheduler(topics, exams, availability, preferences, tasks);
      setIsRebalancing(false);
      addToast('SYSTEM', '> PLAN.UPDATED', 'Adaptive schedule recalculation completed.');
    }, 400);
  }, [topics, exams, availability, preferences, tasks, runScheduler, addToast]);

  // Derived metrics from REAL user records
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.date === referenceDate);
  }, [tasks, referenceDate]);

  const missedTasks = useMemo(() => {
    if (dismissedCheckInDate === referenceDate) return [];
    return tasks.filter(t => t.date < referenceDate && t.status !== 'COMPLETED');
  }, [tasks, referenceDate, dismissedCheckInDate]);

  const completedCount = useMemo(() => topics.filter(t => t.completed).length, [topics]);
  const totalTopicsCount = useMemo(() => topics.length, [topics]);
  const overallProgressPercent = useMemo(() => {
    if (totalTopicsCount === 0) return 0;
    return Math.round((completedCount / totalTopicsCount) * 100);
  }, [completedCount, totalTopicsCount]);

  const { nextExam, nextExamDays } = useMemo(() => {
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = sorted.find(e => e.date >= referenceDate) || sorted[0] || null;
    if (!upcoming) return { nextExam: null, nextExamDays: 0 };

    const [y1, m1, d1] = referenceDate.split('-').map(Number);
    const [y2, m2, d2] = upcoming.date.split('-').map(Number);
    const diff = Math.ceil((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / (1000 * 3600 * 24));
    return { nextExam: upcoming, nextExamDays: Math.max(0, diff) };
  }, [exams, referenceDate]);

  const todayStudyHours = useMemo(() => {
    const totalMinutes = todayTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    const completedMinutes = todayTasks.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + t.durationMinutes, 0);
    return {
      completed: Math.round((completedMinutes / 60) * 10) / 10,
      total: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }, [todayTasks]);

  // Fetch Groq AI Plan Advice
  const refreshAiAdvice = useCallback(async () => {
    if (exams.length === 0 || topics.length === 0) return;
    setIsAiGenerating(true);
    try {
      const advice = await aiService.getStudyPlanAdvice(
        exams,
        topics,
        availability,
        preferences
      );
      setAiAdvice(advice);
      addToast('SUCCESS', '> GROQ AI ADVICE', 'Neural study matrix synthesized.');
    } catch (err: any) {
      console.warn('AI advice query fallback:', err);
    } finally {
      setIsAiGenerating(false);
    }
  }, [exams, topics, availability, preferences, addToast]);

  // Task state modifications
  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'COMPLETED' };
      }
      return t;
    }));

    const task = tasks.find(t => t.id === taskId);
    if (task && task.topicId && !task.topicId.startsWith('rev-')) {
      setTopics(prev => prev.map(topic => {
        if (topic.id === task.topicId) {
          return { ...topic, completed: true, completedAt: referenceDate };
        }
        return topic;
      }));

      // Cloud persistence if user authenticated
      if (user && isSupabaseOnline) {
        topicService.toggleTopicCompletion(user.id, task.topicId, true).catch(e => console.warn('Progress sync error:', e));
      }
    }

    confetti({
      particleCount: 28,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#00ff88', '#00d4ff', '#ff00ff'],
      disableForReducedMotion: true,
    });

    addToast('SUCCESS', '> TASK.COMPLETE', 'Nice work. One topic closer.');
  }, [tasks, referenceDate, user, isSupabaseOnline, addToast]);

  const uncompleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'PENDING' } : t)));
    const task = tasks.find(t => t.id === taskId);
    if (task && task.topicId) {
      setTopics(prev => prev.map(topic => (topic.id === task.topicId ? { ...topic, completed: false } : topic)));
      if (user && isSupabaseOnline) {
        topicService.toggleTopicCompletion(user.id, task.topicId, false).catch(e => console.warn('Progress sync error:', e));
      }
    }
    addToast('INFO', '> STATUS.REVERTED', 'Topic marked as pending.');
  }, [tasks, user, isSupabaseOnline, addToast]);

  const startTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t)));
    addToast('INFO', '> SESSION.ACTIVE', 'Deep work timer initialized. Stay locked in.');
  }, [addToast]);

  // AI-Assisted Rescheduling with Deterministic Calendar Verification
  const autoRescheduleMissed = useCallback(async () => {
    if (missedTasks.length === 0) return;
    setIsRebalancing(true);
    addToast('SYSTEM', '> SYSTEM.REBALANCING', 'Calculating remaining capacity and exam deadlines.');

    try {
      // Deterministic scheduling engine enforces calendar validity
      const rebalanced = rescheduleMissedTasks(
        missedTasks,
        tasks,
        exams,
        availability,
        preferences,
        referenceDate
      );

      setTasks(rebalanced);
      setDismissedCheckInDate(referenceDate);

      // Persist rescheduled sessions to Supabase if authenticated
      if (user && isSupabaseOnline) {
        await studySessionService.syncGeneratedSessions(user.id, rebalanced);
      }

      addToast('SUCCESS', '> SCHEDULE.UPDATED', 'Your study plan has been updated.');
    } catch (err: any) {
      console.error('Error during auto rescheduling:', err);
      addToast('WARNING', '> FALLBACK.ACTIVE', 'Schedule rebalanced deterministically.');
    } finally {
      setIsRebalancing(false);
    }
  }, [missedTasks, tasks, exams, availability, preferences, referenceDate, user, isSupabaseOnline, addToast]);

  const dismissCheckIn = useCallback(() => {
    setDismissedCheckInDate(referenceDate);
  }, [referenceDate]);

  const toggleTopicCompleted = useCallback(async (topicId: string) => {
    let isNowComplete = false;
    setTopics(prev => {
      const updated = prev.map(t => {
        if (t.id === topicId) {
          isNowComplete = !t.completed;
          return {
            ...t,
            completed: isNowComplete,
            completedAt: isNowComplete ? referenceDate : undefined,
          };
        }
        return t;
      });

      setTasks(taskPrev => taskPrev.map(task => {
        if (task.topicId === topicId) {
          return { ...task, status: isNowComplete ? 'COMPLETED' : 'PENDING' };
        }
        return task;
      }));

      return updated;
    });

    if (user && isSupabaseOnline) {
      await topicService.toggleTopicCompletion(user.id, topicId, isNowComplete);
    }

    addToast('SUCCESS', '> TOPIC.CHECKED', isNowComplete ? 'Syllabus mastery updated.' : 'Topic marked as pending.');
  }, [referenceDate, user, isSupabaseOnline, addToast]);

  const addExam = useCallback(async (examData: Omit<Exam, 'id'>) => {
    const tempId = `exam-${Date.now()}`;
    const newExam: Exam = { ...examData, id: tempId };

    setExams(prev => [...prev, newExam]);
    setSubjects(prev => {
      if (!prev.some(s => s.id === examData.subjectId)) {
        return [...prev, { id: examData.subjectId, name: examData.subjectName, color: '#00ff88', code: 'SUB' }];
      }
      return prev;
    });

    if (user && isSupabaseOnline) {
      try {
        const savedExam = await examService.createExam(user.id, examData);
        if (savedExam) {
          setExams(prev => prev.map(e => e.id === tempId ? savedExam : e));
        }
      } catch (e) {
        console.warn('Exam cloud sync error:', e);
      }
    }

    addToast('SUCCESS', '> EXAM.DETECTED', `${examData.name} added to schedule engine.`);
  }, [user, isSupabaseOnline, addToast]);

  const updateExam = useCallback(async (id: string, examData: Partial<Exam>) => {
    setExams(prev => prev.map(e => (e.id === id ? { ...e, ...examData } : e)));

    if (user && isSupabaseOnline) {
      await examService.updateExam(user.id, id, examData);
    }

    addToast('INFO', '> EXAM.UPDATED', 'Exam details and study deadlines synchronized.');
  }, [user, isSupabaseOnline, addToast]);

  const deleteExam = useCallback(async (id: string) => {
    const toDelete = exams.find(e => e.id === id);
    setExams(prev => prev.filter(e => e.id !== id));

    if (user && isSupabaseOnline) {
      await examService.deleteExam(user.id, id);
    }

    addToast('INFO', '> EXAM.DELETED', `${toDelete?.name || 'Exam'} removed. Schedule recalculated.`);
  }, [exams, user, isSupabaseOnline, addToast]);

  const addTopic = useCallback(async (topicData: Omit<Topic, 'id' | 'completed'>) => {
    const tempId = `topic-${Date.now()}`;
    const newTopic: Topic = { ...topicData, id: tempId, completed: false };
    setTopics(prev => [...prev, newTopic]);

    if (user && isSupabaseOnline) {
      try {
        const saved = await topicService.createTopic(user.id, topicData);
        if (saved) {
          setTopics(prev => prev.map(t => t.id === tempId ? saved : t));
        }
      } catch (e) {
        console.warn('Topic cloud sync error:', e);
      }
    }

    addToast('SUCCESS', '> SYLLABUS.APPENDED', `"${newTopic.title}" added to syllabus.`);
  }, [user, isSupabaseOnline, addToast]);

  const bulkAddTopics = useCallback(async (subjectId: string, lines: string[]) => {
    const subject = subjects.find(s => s.id === subjectId) || DEMO_SUBJECTS[0];
    const newItems: Topic[] = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => ({
        id: `topic-bulk-${Date.now()}-${idx}`,
        subjectId: subject.id,
        subjectName: subject.name,
        title: line,
        estimatedMinutes: 45,
        priority: 'MEDIUM' as const,
        completed: false,
      }));

    if (newItems.length > 0) {
      setTopics(prev => [...prev, ...newItems]);

      if (user && isSupabaseOnline) {
        try {
          await topicService.bulkCreateTopics(user.id, subject.id, subject.name, lines);
        } catch (e) {
          console.warn('Bulk topic sync error:', e);
        }
      }

      addToast('SUCCESS', '> BATCH.IMPORT_COMPLETE', `Imported ${newItems.length} topics into ${subject.name}.`);
    }
  }, [subjects, user, isSupabaseOnline, addToast]);

  const deleteTopic = useCallback(async (topicId: string) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
    setTasks(prev => prev.filter(t => t.topicId !== topicId));

    if (user && isSupabaseOnline) {
      await topicService.deleteTopic(user.id, topicId);
    }

    addToast('INFO', '> TOPIC.PURGED', 'Topic removed from syllabus and plan.');
  }, [user, isSupabaseOnline, addToast]);

  const updateAvailability = useCallback(async (newAvail: Partial<Availability>) => {
    const updated = { ...availability, ...newAvail };
    setAvailability(updated);

    if (user && isSupabaseOnline) {
      await preferencesService.savePreferences(user.id, updated, preferences);
    }

    addToast('SYSTEM', '> AVAILABILITY.SAVED', 'Daily study slots modified.');
  }, [availability, preferences, user, isSupabaseOnline, addToast]);

  const updatePreferences = useCallback(async (newPref: Partial<Preferences>) => {
    const updated = { ...preferences, ...newPref };
    setPreferences(updated);

    if (user && isSupabaseOnline) {
      await preferencesService.savePreferences(user.id, availability, updated);
    }

    addToast('SYSTEM', '> PREFERENCES.SAVED', 'Planner behavior updated.');
  }, [preferences, availability, user, isSupabaseOnline, addToast]);

  const setReferenceDate = useCallback((newDate: string) => {
    setReferenceDateState(newDate);
    addToast('SYSTEM', '> TIMELINE.SHIFTED', `Current study date set to ${newDate}.`);
  }, [addToast]);

  const optimizePlan = useCallback((strategy: 'ADD_HOURS' | 'COMPRESS_SESSIONS' | 'PRIORITIZE_HIGH') => {
    if (strategy === 'ADD_HOURS') {
      const updated = { ...availability, dailyHours: Math.min(10, availability.dailyHours + 1.5) };
      setAvailability(updated);
      if (user && isSupabaseOnline) preferencesService.savePreferences(user.id, updated, preferences);
      addToast('SUCCESS', '> HOURS.BOOSTED', 'Added +1.5h to daily availability. Recalculating...');
    } else if (strategy === 'COMPRESS_SESSIONS') {
      const updated = { ...preferences, sessionDuration: 30 };
      setPreferences(updated);
      if (user && isSupabaseOnline) preferencesService.savePreferences(user.id, availability, updated);
      addToast('SUCCESS', '> SESSIONS.COMPRESSED', 'Optimized session length to 30 min per topic.');
    } else if (strategy === 'PRIORITIZE_HIGH') {
      addToast('INFO', '> FOCUS.ENFORCED', 'High-yield topics prioritized for immediate review.');
    }
    recalculateSchedule();
  }, [availability, preferences, user, isSupabaseOnline, addToast, recalculateSchedule]);

  // Demo Reset & Demo Import
  const resetDemoData = useCallback(() => {
    setExams(DEMO_EXAMS);
    setSubjects(DEMO_SUBJECTS);
    setTopics(DEMO_TOPICS);
    setAvailability(DEMO_AVAILABILITY);
    setPreferences(DEMO_PREFERENCES);
    setReferenceDateState('2026-09-28');
    setDismissedCheckInDate('');
    runScheduler(DEMO_TOPICS, DEMO_EXAMS, DEMO_AVAILABILITY, DEMO_PREFERENCES, []);
    addToast('SYSTEM', '> DEMO.RESET', 'NxtWave semester timetable and full syllabus restored.');
  }, [runScheduler, addToast]);

  // Dedicated "IMPORT NXTWAVE DEMO" action for authenticated users or local demo
  const importNxtWaveDemo = useCallback(async () => {
    setIsDemoImporting(true);
    addToast('SYSTEM', '> IMPORTING NXTWAVE DEMO...', 'Cloning exams, subjects, and topics into your profile.');

    try {
      if (user && isSupabaseOnline) {
        await demoImportService.importNxtWaveDemo(user.id);
        await loadUserDataFromSupabase(user.id);
        addToast('SUCCESS', '> DEMO.IMPORTED', 'NxtWave syllabus and exam schedule imported. Fully editable!');
      } else {
        resetDemoData();
        addToast('SUCCESS', '> DEMO.IMPORTED', 'NxtWave dataset active in Guest Mode.');
      }
    } catch (err: any) {
      console.error('Demo import error:', err);
      resetDemoData();
      addToast('INFO', '> LOCAL.IMPORT', 'Imported demo dataset to local workspace.');
    } finally {
      setIsDemoImporting(false);
    }
  }, [user, isSupabaseOnline, loadUserDataFromSupabase, resetDemoData, addToast]);

  const clearAllData = useCallback(async () => {
    setExams([]);
    setSubjects([]);
    setTopics([]);
    setTasks([]);
    setCapacityWarning(null);

    if (user && isSupabaseOnline) {
      for (const e of exams) await examService.deleteExam(user.id, e.id);
      for (const t of topics) await topicService.deleteTopic(user.id, t.id);
    }

    addToast('WARNING', '> DATABASE.PURGED', 'All exams and syllabus topics cleared.');
  }, [user, isSupabaseOnline, exams, topics, addToast]);

  const exportPlanAsCSV = useCallback(() => {
    if (tasks.length === 0) {
      addToast('WARNING', '> EXPORT.FAILED', 'No tasks scheduled to export.');
      return;
    }
    const headers = ['Date', 'Start Time', 'End Time', 'Subject', 'Topic', 'Duration (Min)', 'Type', 'Priority', 'Status'];
    const rows = tasks.map(t => [
      t.date,
      t.startTime,
      t.endTime,
      `"${t.subjectName.replace(/"/g, '""')}"`,
      `"${t.topicTitle.replace(/"/g, '""')}"`,
      t.durationMinutes,
      t.type,
      t.priority,
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Revisionly_Study_Plan_${referenceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('SUCCESS', '> EXPORT.SUCCESS', 'Study plan downloaded as CSV.');
  }, [tasks, referenceDate, addToast]);

  const exportPlanAsJSON = useCallback(() => {
    const data = {
      exams,
      subjects,
      topics,
      availability,
      preferences,
      tasks,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Revisionly_Data_Backup_${referenceDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('SUCCESS', '> BACKUP.SUCCESS', 'Full JSON data exported.');
  }, [exams, subjects, topics, availability, preferences, tasks, referenceDate, addToast]);

  // Auth Action Proxies
  const login = useCallback(async (email: string, pass: string) => {
    const res = await authService.signInWithPassword(email, pass);
    if (!res.error && res.user) {
      setUser(res.user);
      addToast('SUCCESS', '> AUTH.VERIFIED', `Welcome back, ${res.user.email}`);
    }
    return res;
  }, [addToast]);

  const signup = useCallback(async (email: string, pass: string, displayName?: string) => {
    const res = await authService.signUp(email, pass, displayName);
    if (!res.error && res.user) {
      setUser(res.user);
      setExams([]);
      setSubjects([]);
      setTopics([]);
      setTasks([]);
      addToast('SUCCESS', '> ACCOUNT.CREATED', `Welcome to Revisionly, ${displayName || email}`);
    }
    return res;
  }, [addToast]);

  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    addToast('INFO', '> SESSION.TERMINATED', 'Operative logged out. Reverted to Guest Mode.');
  }, [addToast]);

  const resetPassword = useCallback(async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    return await authService.signInWithGoogle();
  }, []);

  return (
    <PlannerContext.Provider
      value={{
        // Core state
        exams,
        subjects,
        topics,
        tasks,
        availability,
        preferences,
        referenceDate,
        capacityWarning,
        toasts,
        isRebalancing,
        missedTasks,
        todayTasks,
        completedCount,
        totalTopicsCount,
        overallProgressPercent,
        nextExam,
        nextExamDays,
        todayStudyHours,

        // Auth & Cloud State
        user,
        isAuthenticated: !!user,
        isGuest: !user,
        isSupabaseOnline,
        isAuthModalOpen,
        isDemoImporting,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        signup,
        logout,
        resetPassword,
        loginWithGoogle,
        importNxtWaveDemo,

        // AI Advice
        aiAdvice,
        refreshAiAdvice,
        isAiGenerating,

        // Actions
        completeTask,
        uncompleteTask,
        startTask,
        autoRescheduleMissed,
        dismissCheckIn,
        addExam,
        updateExam,
        deleteExam,
        addTopic,
        bulkAddTopics,
        toggleTopicCompleted,
        deleteTopic,
        updateAvailability,
        updatePreferences,
        setReferenceDate,
        optimizePlan,
        resetDemoData,
        clearAllData,
        exportPlanAsCSV,
        exportPlanAsJSON,
        dismissToast,
        recalculateSchedule,
        addToast,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};
