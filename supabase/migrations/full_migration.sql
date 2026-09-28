-- ==============================================================================
-- REVISIONLY // MASTER SUPABASE CONSOLIDATED MIGRATION
-- Run this in Supabase Dashboard -> SQL Editor -> Click "Run" (Ctrl+Enter)
-- Project: https://mzgjgncslmuddeocygjz.supabase.co
-- App URL: https://revi-ai-rho.vercel.app/
-- ==============================================================================

-- 0. ENABLE PGCRYPTO FOR SECURE UUID GENERATION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- PART 1: CORE TABLES
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT '#FF3D00',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 180,
    priority TEXT NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    estimated_minutes INT NOT NULL DEFAULT 45,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TOPIC PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL UNIQUE REFERENCES public.topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TIMESTAMPTZ,
    confidence INT DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
    revision_1_at TIMESTAMPTZ,
    revision_2_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. STUDY SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'learn' CHECK (session_type IN ('learn', 'practice', 'revision', 'mock_test', 'deep_work')),
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'missed', 'rescheduled', 'cancelled')),
    source TEXT NOT NULL DEFAULT 'scheduler' CHECK (source IN ('scheduler', 'user', 'ai')),
    duration_minutes INT NOT NULL DEFAULT 45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    study_hours_per_day NUMERIC(3, 1) NOT NULL DEFAULT 4.0,
    preferred_start_time TEXT DEFAULT '09:00',
    preferred_end_time TEXT DEFAULT '21:00',
    weekends_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_reschedule_enabled BOOLEAN NOT NULL DEFAULT true,
    prefer_short_sessions BOOLEAN NOT NULL DEFAULT false,
    prefer_deep_work BOOLEAN NOT NULL DEFAULT true,
    include_revision BOOLEAN NOT NULL DEFAULT true,
    include_practice BOOLEAN NOT NULL DEFAULT true,
    session_duration INT NOT NULL DEFAULT 45,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. STUDY HISTORY AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.study_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AI CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Study Guidance Session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. AI MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- PART 2: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

    DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can insert own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;

    DROP POLICY IF EXISTS "Users can view own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can insert own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can update own exams" ON public.exams;
    DROP POLICY IF EXISTS "Users can delete own exams" ON public.exams;

    DROP POLICY IF EXISTS "Users can view own topics" ON public.topics;
    DROP POLICY IF EXISTS "Users can insert own topics" ON public.topics;
    DROP POLICY IF EXISTS "Users can update own topics" ON public.topics;
    DROP POLICY IF EXISTS "Users can delete own topics" ON public.topics;

    DROP POLICY IF EXISTS "Users can view own topic progress" ON public.topic_progress;
    DROP POLICY IF EXISTS "Users can insert own topic progress" ON public.topic_progress;
    DROP POLICY IF EXISTS "Users can update own topic progress" ON public.topic_progress;
    DROP POLICY IF EXISTS "Users can delete own topic progress" ON public.topic_progress;

    DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
    DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
    DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;
    DROP POLICY IF EXISTS "Users can delete own study sessions" ON public.study_sessions;

    DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
    DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
    DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

    DROP POLICY IF EXISTS "Users can view own study history" ON public.study_history;
    DROP POLICY IF EXISTS "Users can insert own study history" ON public.study_history;

    DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.ai_conversations;
    DROP POLICY IF EXISTS "Users can insert own AI conversations" ON public.ai_conversations;
    DROP POLICY IF EXISTS "Users can update own AI conversations" ON public.ai_conversations;
    DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.ai_conversations;

    DROP POLICY IF EXISTS "Users can view own AI messages" ON public.ai_messages;
    DROP POLICY IF EXISTS "Users can insert own AI messages" ON public.ai_messages;
END
$$;

-- Create RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subjects" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.subjects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.subjects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own exams" ON public.exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams" ON public.exams FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams" ON public.exams FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own topic progress" ON public.topic_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topic progress" ON public.topic_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topic progress" ON public.topic_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topic progress" ON public.topic_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own study history" ON public.study_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study history" ON public.study_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own AI conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI messages" ON public.ai_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI messages" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- PART 3: AUTOMATIC USER PROFILE & PREFERENCES HOOK ON SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, timezone)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'timezone', 'UTC')
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_preferences (user_id, timezone)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'timezone', 'UTC')
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles and preferences for any existing users in auth.users
INSERT INTO public.profiles (user_id, display_name, timezone)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    COALESCE(raw_user_meta_data->>'timezone', 'UTC')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_preferences (user_id, timezone)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'timezone', 'UTC')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- PART 4: HIGH-PERFORMANCE INDEXES
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_date ON public.study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON public.study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_topic_progress_status ON public.topic_progress(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_status ON public.study_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exams_user_date ON public.exams(user_id, exam_date);
CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON public.topics(user_id, subject_id, order_index);

-- ==============================================================================
-- PART 5: ADMIN VIEW FOR DIRECT USER DETAILS INSPECTION
-- Accessible via Supabase Studio Table Editor or with service_role key
-- ==============================================================================

CREATE OR REPLACE VIEW public.user_directory AS
SELECT 
    au.id AS user_id,
    au.email,
    p.display_name,
    p.timezone,
    au.created_at AS signed_up_at,
    au.last_sign_in_at,
    COALESCE(au.raw_app_meta_data->>'provider', 'email') AS auth_provider,
    au.email_confirmed_at IS NOT NULL AS email_confirmed,
    (SELECT COUNT(*) FROM public.exams e WHERE e.user_id = au.id) AS total_exams,
    (SELECT COUNT(*) FROM public.topics t WHERE t.user_id = au.id) AS total_topics,
    (SELECT COUNT(*) FROM public.study_sessions ss WHERE ss.user_id = au.id AND ss.status = 'completed') AS completed_sessions
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id;

-- Secure the view
REVOKE ALL ON public.user_directory FROM anon;
GRANT SELECT ON public.user_directory TO authenticated, service_role;
