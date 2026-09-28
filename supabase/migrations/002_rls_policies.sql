-- ==============================================================================
-- REVISIONLY // SUPABASE MIGRATION 002: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL USER-OWNED TABLES
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

-- 2. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. SUBJECTS POLICIES
CREATE POLICY "Users can view own subjects"
    ON public.subjects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects"
    ON public.subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
    ON public.subjects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
    ON public.subjects FOR DELETE
    USING (auth.uid() = user_id);

-- 4. EXAMS POLICIES
CREATE POLICY "Users can view own exams"
    ON public.exams FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exams"
    ON public.exams FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams"
    ON public.exams FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams"
    ON public.exams FOR DELETE
    USING (auth.uid() = user_id);

-- 5. TOPICS POLICIES
CREATE POLICY "Users can view own topics"
    ON public.topics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
    ON public.topics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
    ON public.topics FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
    ON public.topics FOR DELETE
    USING (auth.uid() = user_id);

-- 6. TOPIC PROGRESS POLICIES
CREATE POLICY "Users can view own topic progress"
    ON public.topic_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic progress"
    ON public.topic_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic progress"
    ON public.topic_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic progress"
    ON public.topic_progress FOR DELETE
    USING (auth.uid() = user_id);

-- 7. STUDY SESSIONS POLICIES
CREATE POLICY "Users can view own study sessions"
    ON public.study_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
    ON public.study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
    ON public.study_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
    ON public.study_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 8. USER PREFERENCES POLICIES
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. STUDY HISTORY POLICIES
CREATE POLICY "Users can view own study history"
    ON public.study_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study history"
    ON public.study_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 10. AI CONVERSATIONS POLICIES
CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- 11. AI MESSAGES POLICIES
CREATE POLICY "Users can view own AI messages"
    ON public.ai_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI messages"
    ON public.ai_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 12. AUTOMATIC PROFILE AND PREFERENCES TRIGGER ON SIGNUP
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
    );

    INSERT INTO public.user_preferences (user_id, timezone)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'timezone', 'UTC')
    );

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
