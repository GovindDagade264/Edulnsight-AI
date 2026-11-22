-- ============================================================================
-- EduInsight AI — Complete Supabase Database Schema, Profiles Trigger & RLS
-- Run this in your Supabase Dashboard -> SQL Editor -> Click RUN
-- ============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Institutions Table (Multi-tenant)
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

-- Seed default institutions
INSERT INTO public.institutions (id, name, code, type, board_university, city, state)
VALUES 
    ('inst_sxma_01', 'St. Xavier''s Model Senior Secondary School', 'SXMA-MUM', 'school', 'CBSE', 'Mumbai', 'Maharashtra'),
    ('inst_piet_02', 'Pune Institute of Engineering & Technology (PIET)', 'PIET-PUN', 'degree_college', 'Savitribai Phule Pune University (SPPU)', 'Pune', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- 3. Profiles Table (Associated with auth.users)
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
    COALESCE(new.raw_user_meta_data->>'institution_id', 'inst_sxma_01')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    profile_completion_status = true,
    institution_id = COALESCE(public.profiles.institution_id, EXCLUDED.institution_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Academic Structure Tables
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
    grade_level INTEGER NOT NULL DEFAULT 10,
    stream TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.classes (id, institution_id, academic_year_id, name, division, grade_level, stream)
VALUES 
    ('class_10a', 'inst_sxma_01', 'ay_2024_2025', 'Class 10', 'A', 10, 'General Secondary'),
    ('class_10b', 'inst_sxma_01', 'ay_2024_2025', 'Class 10', 'B', 10, 'General Secondary')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    max_marks NUMERIC DEFAULT 100.0,
    pass_marks NUMERIC DEFAULT 35.0,
    is_elective BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subjects (id, institution_id, class_id, name, code, max_marks, pass_marks)
VALUES
    ('sub_math_10a', 'inst_sxma_01', 'class_10a', 'Mathematics', 'MATH-10', 100, 35),
    ('sub_sci_10a', 'inst_sxma_01', 'class_10a', 'Science', 'SCI-10', 100, 35),
    ('sub_eng_10a', 'inst_sxma_01', 'class_10a', 'English Language & Lit', 'ENG-10', 100, 35),
    ('sub_sst_10a', 'inst_sxma_01', 'class_10a', 'Social Science', 'SST-10', 100, 35),
    ('sub_comp_10a', 'inst_sxma_01', 'class_10a', 'Computer Applications', 'COMP-10', 100, 35)
ON CONFLICT (id) DO NOTHING;

-- 6. Role Specific Profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    admission_number TEXT UNIQUE NOT NULL,
    date_of_birth DATE,
    blood_group TEXT,
    enrollment_status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    designation TEXT NOT NULL,
    qualification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    teacher_id TEXT NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    is_primary_teacher BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    occupation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_student_map (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    parent_id TEXT NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Parent',
    is_primary_contact BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- 7. Assessments & Academic Records
CREATE TABLE IF NOT EXISTS public.assessments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'test',
    max_marks NUMERIC NOT NULL DEFAULT 100.0,
    date_conducted DATE NOT NULL,
    weightage_percent NUMERIC DEFAULT 100.0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marks_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    assessment_id TEXT NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    marks_obtained NUMERIC,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'EXEMPT', 'NOT_SUBMITTED')),
    is_published BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    recorded_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    student_id TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE')),
    remarks TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 8.1 Profiles
DROP POLICY IF EXISTS "Public select institutions" ON public.institutions;
CREATE POLICY "Public select institutions" ON public.institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8.2 Academic Structure (Readable by all authenticated members)
DROP POLICY IF EXISTS "Authenticated users view academic_years" ON public.academic_years;
CREATE POLICY "Authenticated users view academic_years" ON public.academic_years FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users view classes" ON public.classes;
CREATE POLICY "Authenticated users view classes" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users view subjects" ON public.subjects;
CREATE POLICY "Authenticated users view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users view assessments" ON public.assessments;
CREATE POLICY "Authenticated users view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);

-- 8.3 Student Profiles
DROP POLICY IF EXISTS "Students and faculty view student profiles" ON public.student_profiles;
CREATE POLICY "Students and faculty view student profiles" ON public.student_profiles FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
        SELECT 1 FROM public.parent_student_map psm
        JOIN public.parent_profiles pp ON psm.parent_id = pp.id
        WHERE pp.user_id = auth.uid() AND psm.student_id = student_profiles.id
    )
);

DROP POLICY IF EXISTS "Users insert own student profile" ON public.student_profiles;
CREATE POLICY "Users insert own student profile" ON public.student_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Users update own student profile" ON public.student_profiles;
CREATE POLICY "Users update own student profile" ON public.student_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 8.4 Teacher Profiles
DROP POLICY IF EXISTS "Authenticated users view teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Authenticated users view teacher profiles" ON public.teacher_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own teacher profile" ON public.teacher_profiles;
CREATE POLICY "Users insert own teacher profile" ON public.teacher_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Users update own teacher profile" ON public.teacher_profiles;
CREATE POLICY "Users update own teacher profile" ON public.teacher_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 8.5 Parent Profiles
DROP POLICY IF EXISTS "Users view parent profiles" ON public.parent_profiles;
CREATE POLICY "Users view parent profiles" ON public.parent_profiles FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin'))
);

DROP POLICY IF EXISTS "Users insert own parent profile" ON public.parent_profiles;
CREATE POLICY "Users insert own parent profile" ON public.parent_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Users update own parent profile" ON public.parent_profiles;
CREATE POLICY "Users update own parent profile" ON public.parent_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 8.6 Marks Records
DROP POLICY IF EXISTS "View marks records" ON public.marks_records;
CREATE POLICY "View marks records" ON public.marks_records FOR SELECT TO authenticated
USING (
    (
        is_published = true AND
        EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = marks_records.student_id AND sp.user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM public.parent_student_map psm
            JOIN public.parent_profiles pp ON psm.parent_id = pp.id
            WHERE pp.user_id = auth.uid() AND psm.student_id = marks_records.student_id
        )
    )
);

DROP POLICY IF EXISTS "Manage marks records" ON public.marks_records;
CREATE POLICY "Manage marks records" ON public.marks_records FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 8.7 Attendance Records
DROP POLICY IF EXISTS "View attendance records" ON public.attendance_records;
CREATE POLICY "View attendance records" ON public.attendance_records FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = attendance_records.student_id AND sp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
        SELECT 1 FROM public.parent_student_map psm
        JOIN public.parent_profiles pp ON psm.parent_id = pp.id
        WHERE pp.user_id = auth.uid() AND psm.student_id = attendance_records.student_id
    )
);

DROP POLICY IF EXISTS "Manage attendance records" ON public.attendance_records;
CREATE POLICY "Manage attendance records" ON public.attendance_records FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
