import { supabase, isSupabaseConfigured } from './supabase';
import type { Topic } from '../types';

export const topicService = {
  async getTopics(userId: string): Promise<Topic[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('topics')
      .select('*, subjects(name), topic_progress(status, completed_at, notes)')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[topicService] Error fetching topics:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const progress = Array.isArray(row.topic_progress) ? row.topic_progress[0] : row.topic_progress;
      const isCompleted = progress?.status === 'completed';

      return {
        id: row.id,
        subjectId: row.subject_id,
        subjectName: row.subjects?.name || 'General',
        title: row.title,
        estimatedMinutes: row.estimated_minutes,
        priority: row.priority,
        completed: isCompleted,
        completedAt: progress?.completed_at || undefined,
        notes: progress?.notes || row.description,
      };
    });
  },

  async createTopic(userId: string, topic: Omit<Topic, 'id' | 'completed'>): Promise<Topic | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: userId,
        subject_id: topic.subjectId,
        title: topic.title,
        estimated_minutes: topic.estimatedMinutes,
        priority: topic.priority,
      })
      .select('*, subjects(name)')
      .single();

    if (error) {
      console.error('[topicService] Error creating topic:', error);
      return null;
    }

    // Initialize progress record
    await supabase.from('topic_progress').insert({
      user_id: userId,
      topic_id: data.id,
      status: 'pending',
    });

    return {
      id: data.id,
      subjectId: data.subject_id,
      subjectName: data.subjects?.name || topic.subjectName,
      title: data.title,
      estimatedMinutes: data.estimated_minutes,
      priority: data.priority,
      completed: false,
    };
  },

  async bulkCreateTopics(
    userId: string,
    subjectId: string,
    subjectName: string,
    titles: string[]
  ): Promise<Topic[]> {
    if (!isSupabaseConfigured() || !userId || titles.length === 0) return [];

    const rows = titles.map((title, idx) => ({
      user_id: userId,
      subject_id: subjectId,
      title,
      estimated_minutes: 45,
      priority: 'MEDIUM',
      order_index: idx + 1,
    }));

    const { data, error } = await supabase.from('topics').insert(rows).select();

    if (error) {
      console.error('[topicService] Bulk insert failed:', error);
      return [];
    }

    // Insert progress records
    if (data && data.length > 0) {
      const progressRows = data.map((d: any) => ({
        user_id: userId,
        topic_id: d.id,
        status: 'pending',
      }));
      await supabase.from('topic_progress').insert(progressRows);
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      subjectId: d.subject_id,
      subjectName,
      title: d.title,
      estimatedMinutes: d.estimated_minutes,
      priority: d.priority,
      completed: false,
    }));
  },

  async toggleTopicCompletion(userId: string, topicId: string, completed: boolean): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const payload = {
      user_id: userId,
      topic_id: topicId,
      status: completed ? 'completed' : 'pending',
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('topic_progress')
      .upsert(payload, { onConflict: 'topic_id' });

    if (error) {
      console.error('[topicService] Error toggling topic completion:', error);
      return false;
    }
    return true;
  },

  async deleteTopic(userId: string, topicId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', userId);

    if (error) {
      console.error('[topicService] Error deleting topic:', error);
      return false;
    }
    return true;
  },
};
