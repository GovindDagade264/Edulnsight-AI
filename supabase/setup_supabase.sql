-- ============================================================================
-- EduInsight AI — Supabase Complete Setup & Auto-Profile Sync
-- Run this in your Supabase Dashboard -> SQL Editor -> Click RUN
-- ============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Institutions Table
CREATE TABLE IF NOT EXISTS public.institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'school',
    board_university TEXT NOT NULL DEFAULT 'CBSE',
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    grading_scheme TEXT DEFAULT 'PERCENTAGE_LETTER',
    attendance_warning_threshold NUMERIC DEFAULT 75.0,
    marks_warning_threshold NUMERIC DEFAULT 40.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default institution
INSERT INTO public.institutions (id, name, code, type, board_university, city, state)
VALUES ('inst_sxma_01', 'St. Xavier''s Model Senior Secondary School', 'SXMA-MUM', 'school', 'CBSE', 'Mumbai', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    profile_completion_status BOOLEAN DEFAULT TRUE,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies: SELECT, UPDATE, and INSERT
DROP POLICY IF EXISTS "Public select institutions" ON public.institutions;
CREATE POLICY "Public select institutions" ON public.institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow authenticated insert profile" ON public.profiles;
CREATE POLICY "Allow authenticated insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Automatic Profile Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, profile_completion_status, institution_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Registered User'),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    true,
    'inst_sxma_01'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    profile_completion_status = true;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Academic Years & Classes
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.academic_years (id, institution_id, name, start_date, end_date, is_current)
VALUES ('ay_2024_2025', 'inst_sxma_01', '2024-2025', '2024-06-15', '2025-04-30', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    division TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    stream TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, academic_year_id, name, division)
);

INSERT INTO public.classes (id, institution_id, academic_year_id, name, division, grade_level, stream)
VALUES 
    ('class_10a', 'inst_sxma_01', 'ay_2024_2025', 'Class 10', 'A', 10, 'General Secondary'),
    ('class_10b', 'inst_sxma_01', 'ay_2024_2025', 'Class 10', 'B', 10, 'General Secondary')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select academic_years" ON public.academic_years;
CREATE POLICY "Public select academic_years" ON public.academic_years FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select classes" ON public.classes;
CREATE POLICY "Public select classes" ON public.classes FOR SELECT USING (true);
