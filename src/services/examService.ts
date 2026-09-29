import { supabase, isSupabaseConfigured } from './supabase';
import { subjectService } from './subjectService';
import type { Exam } from '../types';

export const examService = {
  async getExams(userId: string): Promise<Exam[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('exams')
      .select('*, subjects(name)')
      .eq('user_id', userId)
      .order('exam_date', { ascending: true });

    if (error) {
      console.error('[examService] Error fetching exams:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.exam_name,
      subjectId: row.subject_id || '',
      subjectName: row.subjects?.name || 'General',
      date: row.exam_date,
      time: row.exam_time,
      durationMinutes: row.duration_minutes,
      priority: row.priority,
      notes: row.notes,
    }));
  },

  async createExam(userId: string, exam: Omit<Exam, 'id'>): Promise<Exam | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    let validSubjectId: string | null = null;
    if (exam.subjectId || exam.subjectName) {
      validSubjectId = await subjectService.ensureSubject(userId, exam.subjectId, exam.subjectName);
    }

    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        subject_id: validSubjectId,
        exam_name: exam.name,
        exam_date: exam.date,
        exam_time: exam.time,
        duration_minutes: exam.durationMinutes,
        priority: exam.priority,
        notes: exam.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('[examService] Error creating exam:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.exam_name,
      subjectId: data.subject_id,
      subjectName: exam.subjectName,
      date: data.exam_date,
      time: data.exam_time,
      durationMinutes: data.duration_minutes,
      priority: data.priority,
      notes: data.notes,
    };
  },

  async updateExam(userId: string, examId: string, updates: Partial<Exam>): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.exam_name = updates.name;
    if (updates.subjectId !== undefined) payload.subject_id = updates.subjectId;
    if (updates.date !== undefined) payload.exam_date = updates.date;
    if (updates.time !== undefined) payload.exam_time = updates.time;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await supabase
      .from('exams')
      .update(payload)
      .eq('id', examId)
      .eq('user_id', userId);

    if (error) {
      console.error('[examService] Error updating exam:', error);
      return false;
    }
    return true;
  },

  async deleteExam(userId: string, examId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)
      .eq('user_id', userId);

    if (error) {
      console.error('[examService] Error deleting exam:', error);
      return false;
    }
    return true;
  },
};
