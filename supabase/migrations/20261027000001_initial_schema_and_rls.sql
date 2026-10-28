-- ============================================================================
-- EduInsight AI — Supabase Database Architecture & Row-Level Security (RLS)
-- Multi-Tenant Educational Analytics Platform for Indian Institutions
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. INSTITUTIONS TABLE (Multi-tenant isolation)
CREATE TABLE IF NOT EXISTS public.institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'school', -- 'school', 'junior_college', 'degree_college'
    board_university TEXT NOT NULL DEFAULT 'CBSE', -- 'CBSE', 'ICSE', 'State Board', 'SPPU', etc.
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    grading_scheme TEXT DEFAULT 'PERCENTAGE_LETTER',
    attendance_warning_threshold NUMERIC DEFAULT 75.0,
    marks_warning_threshold NUMERIC DEFAULT 40.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (Associated with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    profile_completion_status BOOLEAN DEFAULT FALSE,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSTITUTION MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.institution_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, institution_id)
);

-- 5. ACADEMIC YEARS & SEMESTERS
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. '2024-2025'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLASSES / BATCHES / DIVISIONS
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Class 10', 'B.Tech CSE'
    division TEXT NOT NULL, -- e.g. 'A', 'Sem 4 - Div B'
    stream TEXT, -- 'Science', 'Commerce', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUBJECTS
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

-- 8. STUDENT ACADEMIC PROFILES
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

-- 9. TEACHER PROFILES & ASSIGNMENTS
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

-- 10. PARENT PROFILES & MAPPINGS
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
    relationship TEXT NOT NULL DEFAULT 'Parent', -- 'Father', 'Mother', 'Guardian'
    is_primary_contact BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- 11. ASSESSMENTS
CREATE TABLE IF NOT EXISTS public.assessments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'test', -- 'test', 'exam', 'assignment', 'project'
    max_marks NUMERIC NOT NULL DEFAULT 100.0,
    date_conducted DATE NOT NULL,
    weightage_percent NUMERIC DEFAULT 100.0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MARKS RECORDS (Authoritative Academic Performance)
CREATE TABLE IF NOT EXISTS public.marks_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    assessment_id TEXT NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    marks_obtained NUMERIC, -- NULL if absent or not yet submitted/evaluated
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'EXEMPT', 'NOT_SUBMITTED')),
    is_published BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    recorded_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);

-- 13. ATTENDANCE RECORDS (Authoritative Class Attendance)
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

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTHENTICATION TRIGGER: Automatic Profile Provisioning
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, profile_completion_status, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Institutions & Academic Structure (Readable by authenticated members)
DROP POLICY IF EXISTS "Authenticated users view institutions" ON public.institutions;
CREATE POLICY "Authenticated users view institutions"
    ON public.institutions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view classes" ON public.classes;
CREATE POLICY "Authenticated users view classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view subjects" ON public.subjects;
CREATE POLICY "Authenticated users view subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view assessments" ON public.assessments;
CREATE POLICY "Authenticated users view assessments"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (true);

-- 3. Student Profiles RLS
DROP POLICY IF EXISTS "Students can view own student profile" ON public.student_profiles;
CREATE POLICY "Students can view own student profile"
    ON public.student_profiles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view students in their institution" ON public.student_profiles;
CREATE POLICY "Teachers can view students in their institution"
    ON public.student_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
            AND tp.institution_id = student_profiles.institution_id
        )
    );

-- 4. Marks Records RLS (Synchronized between Teacher & Student)
DROP POLICY IF EXISTS "Students view only their own published marks" ON public.marks_records;
CREATE POLICY "Students view only their own published marks"
    ON public.marks_records FOR SELECT
    USING (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = marks_records.student_id
            AND sp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Teachers can view marks for assigned subjects" ON public.marks_records;
CREATE POLICY "Teachers can view marks for assigned subjects"
    ON public.marks_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            JOIN public.teacher_subject_assignments tsa ON tp.id = tsa.teacher_id
            JOIN public.assessments a ON a.id = marks_records.assessment_id
            WHERE tp.user_id = auth.uid()
            AND tsa.subject_id = a.subject_id
        )
    );

DROP POLICY IF EXISTS "Teachers can insert/update marks for assigned subjects" ON public.marks_records;
CREATE POLICY "Teachers can insert/update marks for assigned subjects"
    ON public.marks_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            JOIN public.teacher_subject_assignments tsa ON tp.id = tsa.teacher_id
            JOIN public.assessments a ON a.id = marks_records.assessment_id
            WHERE tp.user_id = auth.uid()
            AND tsa.subject_id = a.subject_id
        )
    );

-- 5. Attendance Records RLS (Synchronized between Teacher & Student)
DROP POLICY IF EXISTS "Students view only their own attendance records" ON public.attendance_records;
CREATE POLICY "Students view only their own attendance records"
    ON public.attendance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = attendance_records.student_id
            AND sp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Teachers view and update attendance for their classes" ON public.attendance_records;
CREATE POLICY "Teachers view and update attendance for their classes"
    ON public.attendance_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
        )
    );

-- 6. Audit Logs RLS
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
