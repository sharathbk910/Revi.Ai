-- ==============================================================================
-- REVISIONLY // SUPABASE MIGRATION 004: SEED DEMO IMPORT STORED PROCEDURE
-- ==============================================================================

-- Stored procedure to safely import the NxtWave Semester demo dataset into an authenticated user's account on demand
CREATE OR REPLACE FUNCTION public.import_nxtwave_demo_for_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    sub_web_id UUID;
    sub_eng_id UUID;
    sub_py_id UUID;
    sub_qa_id UUID;
    sub_math_id UUID;
    sub_elec_id UUID;
    sub_ai_id UUID;
    imported_exams_count INT := 7;
    imported_topics_count INT := 0;
BEGIN
    -- 1. Insert Demo Subjects
    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Web Application Development', 'CS-WEB', '#00ff88', 'HTML5, CSS3, Box Model & Responsive Layouts')
    RETURNING id INTO sub_web_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Communicative English Foundation', 'HS-ENG', '#00d4ff', 'Grammar, Parts of Speech & Writing Activities')
    RETURNING id INTO sub_eng_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Introduction to Python', 'CS-PY', '#ff00ff', 'Core Python syntax, data structures, loops & control flow')
    RETURNING id INTO sub_py_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Quantitative Aptitude', 'MA-QA', '#ffaa00', 'Numbers, Cycles, Multiples & Percentages')
    RETURNING id INTO sub_qa_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Mathematics for Computer Science', 'MA-CS', '#b388ff', 'Discrete Math, Number Systems, Bitwise & Modulo')
    RETURNING id INTO sub_math_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Basic Electronics for CSE', 'EC-CSE', '#ff3366', 'Basic Electronics — Awaiting syllabus upload')
    RETURNING id INTO sub_elec_id;

    INSERT INTO public.subjects (user_id, name, code, color, description)
    VALUES (target_user_id, 'Prompt Engineering and Applications of AI', 'AI-PR', '#00e5ff', 'GenAI Foundations, Prompt Patterns & AI Tools')
    RETURNING id INTO sub_ai_id;

    -- 2. Insert Demo Exams
    INSERT INTO public.exams (user_id, subject_id, exam_name, exam_date, exam_time, duration_minutes, priority, notes)
    VALUES
        (target_user_id, sub_web_id, 'Web Application Development', '2026-10-01', '09:00 AM', 180, 'HIGH', 'Semester Final Exam - Covers HTML5, CSS3, Box Model & Responsive Layouts'),
        (target_user_id, sub_eng_id, 'Communicative English Foundation', '2026-10-01', '02:00 PM', 120, 'MEDIUM', 'Grammar, Parts of Speech, Pronouns, and Classroom Writing Activities'),
        (target_user_id, sub_py_id, 'Introduction to Python', '2026-10-03', '09:00 AM', 180, 'HIGH', 'Practical coding & theory: loops, conditionals, types, and strings'),
        (target_user_id, sub_qa_id, 'Quantitative Aptitude', '2026-10-03', '02:00 PM', 120, 'MEDIUM', 'Numbers, Power Cycles, Remainders, Multiples & Percentages'),
        (target_user_id, sub_math_id, 'Mathematics for Computer Science', '2026-10-05', '09:00 AM', 180, 'HIGH', 'Binary, Octal, Hex, Bitwise Operations, Signed Integers, GCD/LCM, Modulo'),
        (target_user_id, sub_elec_id, 'Basic Electronics for CSE', '2026-10-05', '02:00 PM', 120, 'MEDIUM', 'Awaiting student syllabus upload — click Add Topics to fill'),
        (target_user_id, sub_ai_id, 'Prompt Engineering and Applications of AI', '2026-10-06', '09:00 AM', 150, 'HIGH', 'GenAI Foundations, Prompt Patterns, n8n automations, AI Summarizer workflow');

    -- 3. Insert Web Dev Topics
    INSERT INTO public.topics (user_id, subject_id, title, estimated_minutes, priority, order_index) VALUES
        (target_user_id, sub_web_id, 'Introduction to GenAI in Web Development', 45, 'HIGH', 1),
        (target_user_id, sub_web_id, 'Getting Started with Web Development', 45, 'HIGH', 2),
        (target_user_id, sub_web_id, 'Introduction to HTML', 45, 'HIGH', 3),
        (target_user_id, sub_web_id, 'Leveraging GenAI for Accelerated Learning', 45, 'HIGH', 4),
        (target_user_id, sub_web_id, 'Introduction to CSS | Part 1', 45, 'HIGH', 5),
        (target_user_id, sub_web_id, 'Introduction to CSS | Part 2', 45, 'HIGH', 6),
        (target_user_id, sub_web_id, 'Introduction to CSS | Part 3', 45, 'HIGH', 7),
        (target_user_id, sub_web_id, 'Introduction to CSS Box Model | Part 1', 45, 'HIGH', 8),
        (target_user_id, sub_web_id, 'Introduction to CSS Box Model | Part 2', 45, 'HIGH', 9),
        (target_user_id, sub_web_id, 'Coding Platform Walkthrough', 45, 'HIGH', 10),
        (target_user_id, sub_web_id, 'HTML Void Elements & Lists', 45, 'MEDIUM', 11),
        (target_user_id, sub_web_id, 'Website: Behind the Scenes', 45, 'MEDIUM', 12),
        (target_user_id, sub_web_id, 'HTML Hyperlinks', 45, 'MEDIUM', 13),
        (target_user_id, sub_web_id, 'Introduction to HTML5', 45, 'MEDIUM', 14),
        (target_user_id, sub_web_id, 'HTML Semantic Elements', 45, 'MEDIUM', 15),
        (target_user_id, sub_web_id, 'Leveraging GenAI for Debugging & Building', 45, 'MEDIUM', 16),
        (target_user_id, sub_web_id, 'More CSS Concepts', 45, 'MEDIUM', 17),
        (target_user_id, sub_web_id, 'CSS Selectors & Inheritance', 45, 'MEDIUM', 18),
        (target_user_id, sub_web_id, 'More CSS Selectors', 45, 'MEDIUM', 19),
        (target_user_id, sub_web_id, 'CSS Specificity & Cascade', 45, 'MEDIUM', 20),
        (target_user_id, sub_web_id, 'Sizing Elements and Handling Overflow', 45, 'MEDIUM', 21),
        (target_user_id, sub_web_id, 'Box Sizing', 45, 'MEDIUM', 22);

    -- 4. Insert Python Topics
    INSERT INTO public.topics (user_id, subject_id, title, estimated_minutes, priority, order_index) VALUES
        (target_user_id, sub_py_id, 'Programming with Python', 45, 'HIGH', 1),
        (target_user_id, sub_py_id, 'Coding Practice Walkthrough | Part 1', 45, 'HIGH', 2),
        (target_user_id, sub_py_id, 'Variables and Data Types', 45, 'HIGH', 3),
        (target_user_id, sub_py_id, 'Sequence of Instructions', 45, 'HIGH', 4),
        (target_user_id, sub_py_id, 'Input and Output Basics', 45, 'HIGH', 5),
        (target_user_id, sub_py_id, 'How to debug your code?', 45, 'HIGH', 6),
        (target_user_id, sub_py_id, 'Type Conversions', 45, 'HIGH', 7),
        (target_user_id, sub_py_id, 'Relational Operators', 45, 'HIGH', 8),
        (target_user_id, sub_py_id, 'Logical Operators', 45, 'MEDIUM', 9),
        (target_user_id, sub_py_id, 'Conditional Statements', 45, 'MEDIUM', 10),
        (target_user_id, sub_py_id, 'Nested Conditional Statements', 45, 'MEDIUM', 11),
        (target_user_id, sub_py_id, 'For Loop', 45, 'MEDIUM', 12),
        (target_user_id, sub_py_id, 'String Methods', 45, 'MEDIUM', 13),
        (target_user_id, sub_py_id, 'Nested Loops', 45, 'MEDIUM', 14),
        (target_user_id, sub_py_id, 'Loop Control Statements', 45, 'MEDIUM', 15),
        (target_user_id, sub_py_id, 'Understanding Coding Question Formats', 45, 'MEDIUM', 16);

    SELECT count(*) INTO imported_topics_count FROM public.topics WHERE user_id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'NxtWave Demo Dataset successfully imported into user account',
        'exams_imported', imported_exams_count,
        'topics_imported', imported_topics_count
    );
END;
$$;
