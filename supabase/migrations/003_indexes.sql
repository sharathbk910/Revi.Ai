-- ==============================================================================
-- REVISIONLY // SUPABASE MIGRATION 003: DATABASE INDEXES
-- ==============================================================================

-- 1. FOREIGN KEY & TENANT INDEXES
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_id ON public.topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_id ON public.topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_topic_id ON public.study_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_exam_id ON public.study_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_study_history_user_id ON public.study_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

-- 2. QUERY OPTIMIZATION INDEXES FOR DASHBOARD & SCHEDULER
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_date ON public.study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON public.study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_topic_progress_status ON public.topic_progress(status);

-- 3. COMPOSITE INDEXES FOR FAST FILTERED RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_status ON public.study_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exams_user_date ON public.exams(user_id, exam_date);
CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON public.topics(user_id, subject_id, order_index);
