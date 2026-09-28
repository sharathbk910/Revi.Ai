import { supabase, isSupabaseConfigured } from './supabase';
import type { StudyTask } from '../types';

export const studySessionService = {
  async getSessions(userId: string): Promise<StudyTask[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*, topics(title, priority, subjects(id, name))')
      .eq('user_id', userId)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[studySessionService] Error fetching sessions:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      topicId: row.topic_id,
      topicTitle: row.topics?.title || 'Study Session',
      subjectId: row.topics?.subjects?.id || '',
      subjectName: row.topics?.subjects?.name || 'General',
      date: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      type: row.session_type.toUpperCase(),
      status: row.status.toUpperCase(),
      priority: row.topics?.priority || 'MEDIUM',
      durationMinutes: row.duration_minutes || 45,
    }));
  },

  async syncGeneratedSessions(userId: string, tasks: StudyTask[]): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId || tasks.length === 0) return false;

    // Filter valid topic tasks (avoid rev- placeholders with invalid UUIDs)
    const validRows = tasks
      .filter(t => !t.topicId.startsWith('rev-') && t.topicId.length > 10)
      .map(t => ({
        user_id: userId,
        topic_id: t.topicId,
        session_date: t.date,
        start_time: t.startTime,
        end_time: t.endTime,
        session_type: t.type.toLowerCase(),
        status: t.status.toLowerCase(),
        source: 'scheduler',
        duration_minutes: t.durationMinutes,
      }));

    if (validRows.length === 0) return true;

    // Clear old planned sessions and re-insert
    await supabase.from('study_sessions').delete().eq('user_id', userId).eq('status', 'planned');

    const { error } = await supabase.from('study_sessions').insert(validRows);
    if (error) {
      console.warn('[studySessionService] Error syncing generated sessions:', error);
      return false;
    }
    return true;
  },

  async updateSessionStatus(userId: string, sessionId: string, status: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const { error } = await supabase
      .from('study_sessions')
      .update({ status: status.toLowerCase(), updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('[studySessionService] Error updating session status:', error);
      return false;
    }
    return true;
  },
};
