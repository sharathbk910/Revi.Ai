export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type SessionType = 'LEARN' | 'PRACTICE' | 'REVISION' | 'DEEP_WORK';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';

export interface Exam {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM"
  durationMinutes: number;
  priority: Priority;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  code: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  estimatedMinutes: number;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  rescheduledCount?: number;
}

export interface StudyTask {
  id: string;
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:45"
  type: SessionType;
  status: TaskStatus;
  priority: Priority;
  durationMinutes: number;
  rescheduledFrom?: string;
}

export interface Availability {
  dailyHours: number; // e.g. 3.5
  slots: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    night: boolean;
  };
}

export interface Preferences {
  sessionDuration: number; // minutes per session, default 45
  shortSessions: boolean;
  deepWork: boolean;
  practiceSessions: boolean;
  revisionSessions: boolean;
  autoRescheduling: boolean;
  lightDays: string[]; // e.g. ["Sunday"]
}

export interface DailyCheckInItem {
  id: string;
  topicId: string;
  topicTitle: string;
  subjectName: string;
  originalDate: string;
}

export interface CapacityWarning {
  isOverloaded: boolean;
  deficitHours: number;
  totalTopics: number;
  totalAvailableHours: number;
  earliestExamDays: number;
  message: string;
}
