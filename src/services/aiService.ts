import type { Exam, Topic, Availability, Preferences, StudyTask } from '../types';

export interface AIPlanAdvice {
  recommendations: string[];
  priority_topics: string[];
  estimated_durations: Array<{ topicTitle: string; recommendedMinutes: number }>;
  reasoning_summary: string;
  fallback: boolean;
}

export const aiService = {
  async getStudyPlanAdvice(
    exams: Exam[],
    topics: Topic[],
    availability: Availability,
    preferences: Preferences
  ): Promise<AIPlanAdvice> {
    try {
      const response = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exams: exams.map(e => ({ name: e.name, date: e.date, time: e.time, priority: e.priority })),
          subjects: [],
          topics: topics.map(t => ({ title: t.title, subjectName: t.subjectName, priority: t.priority, completed: t.completed })),
          dailyHours: availability.dailyHours,
          preferences: {
            deepWork: preferences.deepWork,
            revisionSessions: preferences.revisionSessions,
            practiceSessions: preferences.practiceSessions,
            sessionDuration: preferences.sessionDuration,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        priority_topics: Array.isArray(data.priority_topics) ? data.priority_topics : [],
        estimated_durations: Array.isArray(data.estimated_durations) ? data.estimated_durations : [],
        reasoning_summary: data.reasoning_summary || 'Plan validated by Revisionly scheduling kernel.',
        fallback: Boolean(data.fallback),
      };
    } catch (err) {
      console.warn('[aiService] Failed to contact server AI endpoint, using client fallback:', err);
      return {
        recommendations: [
          'Deterministic schedule generated around upcoming exam deadlines.',
          'High-yield topics prioritized during peak focus blocks.',
        ],
        priority_topics: topics.filter(t => t.priority === 'HIGH' && !t.completed).map(t => t.title).slice(0, 5),
        estimated_durations: [],
        reasoning_summary: 'Deterministic scheduling engine active.',
        fallback: true,
      };
    }
  },

  async queryAssistant(
    query: string,
    context: {
      nextExam: { name: string; date: string; daysRemaining: number } | null;
      todayTasks: StudyTask[];
      completedCount: number;
      totalTopicsCount: number;
      overallProgressPercent: number;
      missedTasks: StudyTask[];
      dailyHours: number;
    }
  ): Promise<{ reply: string; fallback: boolean }> {
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: {
            nextExam: context.nextExam,
            todayTasks: context.todayTasks.map(t => ({
              title: t.topicTitle,
              subjectName: t.subjectName,
              startTime: t.startTime,
              status: t.status,
            })),
            completedCount: context.completedCount,
            totalTopicsCount: context.totalTopicsCount,
            overallProgressPercent: context.overallProgressPercent,
            missedTasks: context.missedTasks.map(t => ({
              title: t.topicTitle,
              subjectName: t.subjectName,
              date: t.date,
            })),
            dailyHours: context.dailyHours,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        reply: data.reply || 'Command processed.',
        fallback: Boolean(data.fallback),
      };
    } catch (err) {
      console.warn('[aiService] Assistant call failed, using fallback:', err);
      return {
        reply: 'NEX Neural Engine (Fallback Mode): Focus on your nearest upcoming exam and today’s active study slots. Keep moving forward topic by topic.',
        fallback: true,
      };
    }
  },
};
