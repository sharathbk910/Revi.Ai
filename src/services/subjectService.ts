import { supabase, isSupabaseConfigured } from './supabase';
import type { Subject } from '../types';

export const subjectService = {
  async getSubjects(userId: string): Promise<Subject[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[subjectService] Error fetching subjects:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code || 'SUB',
      color: row.color || '#00ff88',
    }));
  },

  async createSubject(userId: string, subject: Omit<Subject, 'id'>): Promise<Subject | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        name: subject.name,
        code: subject.code,
        color: subject.color,
      })
      .select()
      .single();

    if (error) {
      console.error('[subjectService] Error creating subject:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      color: data.color,
    };
  },

  async deleteSubject(userId: string, subjectId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', userId);

    if (error) {
      console.error('[subjectService] Error deleting subject:', error);
      return false;
    }
    return true;
  },
};
