import { supabase, isSupabaseConfigured } from './supabase';
import { DEMO_SUBJECTS, DEMO_EXAMS, DEMO_TOPICS } from '../data/demoData';

export const demoImportService = {
  async importNxtWaveDemo(userId: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured() || !userId) {
      return { success: false, message: 'Supabase is not configured or user is unauthenticated.' };
    }

    try {
      // 1. Try calling the stored procedure first
      const { data: rpcData, error: rpcError } = await supabase.rpc('import_nxtwave_demo_for_user', {
        target_user_id: userId,
      });

      if (!rpcError && rpcData?.success) {
        return { success: true, message: 'NxtWave Demo successfully imported via database stored procedure!' };
      }

      // 2. Fallback: Manual client-side insertion of subjects, exams, and topics
      console.log('[demoImportService] RPC unavailable, inserting demo records directly...');

      // Subject mapping
      const subjectMap = new Map<string, string>(); // oldId -> newDbId

      for (const sub of DEMO_SUBJECTS) {
        const { data: subData, error: subError } = await supabase
          .from('subjects')
          .insert({
            user_id: userId,
            name: sub.name,
            code: sub.code,
            color: sub.color,
          })
          .select('id')
          .single();

        if (!subError && subData) {
          subjectMap.set(sub.id, subData.id);
        }
      }

      // Exams
      for (const exam of DEMO_EXAMS) {
        const mappedSubId = subjectMap.get(exam.subjectId) || null;
        await supabase.from('exams').insert({
          user_id: userId,
          subject_id: mappedSubId,
          exam_name: exam.name,
          exam_date: exam.date,
          exam_time: exam.time,
          duration_minutes: exam.durationMinutes,
          priority: exam.priority,
          notes: exam.notes,
        });
      }

      // Topics in batches
      const topicRows = DEMO_TOPICS.map((t, idx) => ({
        user_id: userId,
        subject_id: subjectMap.get(t.subjectId),
        title: t.title,
        estimated_minutes: t.estimatedMinutes,
        priority: t.priority,
        order_index: idx + 1,
      })).filter(t => t.subject_id);

      const batchSize = 40;
      for (let i = 0; i < topicRows.length; i += batchSize) {
        const batch = topicRows.slice(i, i + batchSize);
        const { data: insertedTopics } = await supabase.from('topics').insert(batch).select('id');
        if (insertedTopics && insertedTopics.length > 0) {
          const progressRows = insertedTopics.map((it: any) => ({
            user_id: userId,
            topic_id: it.id,
            status: 'pending',
          }));
          await supabase.from('topic_progress').insert(progressRows);
        }
      }

      return {
        success: true,
        message: 'NxtWave Demo Dataset (7 exams & syllabus) imported into your personal account.',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[demoImportService] Error importing demo data:', errMsg);
      return { success: false, message: `Import failed: ${errMsg}` };
    }
  },
};
