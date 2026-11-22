-- ============================================================================
-- EduInsight AI — Migration 20261031000003: Comprehensive RLS & Role Policies
-- Fixes missing INSERT/UPDATE policies for student, teacher, and parent profiles
-- Ensures robust multi-tenant authorization and security for all roles
-- ============================================================================

-- 1. Ensure RLS is enabled on all core tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. INSTITUTIONS & ACADEMIC CATALOG
DROP POLICY IF EXISTS "Authenticated users view institutions" ON public.institutions;
CREATE POLICY "Authenticated users view institutions"
    ON public.institutions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view academic years" ON public.academic_years;
CREATE POLICY "Authenticated users view academic years"
    ON public.academic_years FOR SELECT
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

-- 4. STUDENT PROFILES POLICIES
DROP POLICY IF EXISTS "Students can view own student profile" ON public.student_profiles;
CREATE POLICY "Students can view own student profile"
    ON public.student_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
            AND tp.institution_id = student_profiles.institution_id
        )
        OR EXISTS (
            SELECT 1 FROM public.parent_student_map psm
            JOIN public.parent_profiles pp ON psm.parent_id = pp.id
            WHERE pp.user_id = auth.uid() AND psm.student_id = student_profiles.id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Students can insert own student profile" ON public.student_profiles;
CREATE POLICY "Students can insert own student profile"
    ON public.student_profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Students can update own student profile" ON public.student_profiles;
CREATE POLICY "Students can update own student profile"
    ON public.student_profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 5. TEACHER PROFILES POLICIES
DROP POLICY IF EXISTS "Teachers can view teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Teachers can view teacher profiles"
    ON public.teacher_profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Teachers can insert own teacher profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can insert own teacher profile"
    ON public.teacher_profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers can update own teacher profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can update own teacher profile"
    ON public.teacher_profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 6. PARENT PROFILES POLICIES
DROP POLICY IF EXISTS "Parents can view parent profiles" ON public.parent_profiles;
CREATE POLICY "Parents can view parent profiles"
    ON public.parent_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Parents can insert own parent profile" ON public.parent_profiles;
CREATE POLICY "Parents can insert own parent profile"
    ON public.parent_profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Parents can update own parent profile" ON public.parent_profiles;
CREATE POLICY "Parents can update own parent profile"
    ON public.parent_profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 7. PARENT-STUDENT MAP POLICIES
DROP POLICY IF EXISTS "Users can view parent student mappings" ON public.parent_student_map;
CREATE POLICY "Users can view parent student mappings"
    ON public.parent_student_map FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_profiles pp
            WHERE pp.id = parent_student_map.parent_id AND pp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = parent_student_map.student_id AND sp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

-- 8. MARKS RECORDS POLICIES
DROP POLICY IF EXISTS "Students and Parents view published marks" ON public.marks_records;
CREATE POLICY "Students and Parents view published marks"
    ON public.marks_records FOR SELECT
    TO authenticated
    USING (
        (
            is_published = true AND
            EXISTS (
                SELECT 1 FROM public.student_profiles sp
                WHERE sp.id = marks_records.student_id AND sp.user_id = auth.uid()
            )
        )
        OR
        (
            is_published = true AND
            EXISTS (
                SELECT 1 FROM public.parent_student_map psm
                JOIN public.parent_profiles pp ON psm.parent_id = pp.id
                WHERE pp.user_id = auth.uid() AND psm.student_id = marks_records.student_id
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers and Admins modify marks" ON public.marks_records;
CREATE POLICY "Teachers and Admins modify marks"
    ON public.marks_records FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 9. ATTENDANCE RECORDS POLICIES
DROP POLICY IF EXISTS "Students and Parents view attendance" ON public.attendance_records;
CREATE POLICY "Students and Parents view attendance"
    ON public.attendance_records FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = attendance_records.student_id AND sp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.parent_student_map psm
            JOIN public.parent_profiles pp ON psm.parent_id = pp.id
            WHERE pp.user_id = auth.uid() AND psm.student_id = attendance_records.student_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Teachers and Admins modify attendance" ON public.attendance_records;
CREATE POLICY "Teachers and Admins modify attendance"
    ON public.attendance_records FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

