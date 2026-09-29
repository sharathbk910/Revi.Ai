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

  async ensureSubject(userId: string, subjectIdOrName?: string | null, fallbackName?: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    // 1. If it's already a valid UUID, check if it exists in Supabase
    if (isUUID(subjectIdOrName)) {
      const { data } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subjectIdOrName)
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.id) return data.id;
    }

    const targetName = (fallbackName || subjectIdOrName || 'General Course').trim();

    // 2. Look up subject by name (case-insensitive) for this user
    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', targetName)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    // 3. Create a new subject row in Supabase so foreign key references work
    const code = targetName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUB';
    const { data: created, error } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        name: targetName,
        code,
        color: '#00ff88',
      })
      .select('id')
      .single();

    if (error || !created) {
      console.warn('[subjectService] ensureSubject error:', error);
      return null;
    }

    return created.id;
  },
};

export const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};
