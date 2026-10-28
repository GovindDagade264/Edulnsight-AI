-- ============================================================================
-- EduInsight AI — Starter Seed Data for Supabase
-- Run this in Supabase SQL Editor to populate sample institutions, classes, and subjects.
-- ============================================================================

-- 1. INSTITUTIONS
INSERT INTO public.institutions (id, name, code, type, board_university, city, state, grading_scheme, attendance_warning_threshold, marks_warning_threshold)
VALUES 
    ('inst_sxma_01', 'St. Xavier''s Model Senior Secondary School', 'SXMA-MUM', 'school', 'CBSE', 'Mumbai', 'Maharashtra', 'PERCENTAGE_LETTER', 75.0, 40.0),
    ('inst_piet_02', 'Pune Institute of Engineering & Technology (PIET)', 'PIET-PUN', 'degree_college', 'Savitribai Phule Pune University (SPPU)', 'Pune', 'Maharashtra', 'GPA_10', 75.0, 45.0)
ON CONFLICT (id) DO NOTHING;

-- 2. ACADEMIC YEARS
INSERT INTO public.academic_years (id, institution_id, name, start_date, end_date, is_current)
VALUES 
    ('ay_2024_2025', 'inst_sxma_01', 'Academic Year 2024-2025', '2024-06-01', '2025-04-30', TRUE),
    ('ay_coll_2024_2025', 'inst_piet_02', 'Academic Year 2024-2025', '2024-07-01', '2025-05-31', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. CLASSES
INSERT INTO public.classes (id, institution_id, academic_year_id, name, division, stream)
VALUES 
    ('class_10a', 'inst_sxma_01', 'ay_2024_2025', 'Class 10', 'A', 'General Secondary'),
    ('class_12sci', 'inst_sxma_01', 'ay_2024_2025', 'Class 12', 'Science - A', 'Physics, Chemistry, Maths (PCM)'),
    ('class_btech_cs4', 'inst_piet_02', 'ay_coll_2024_2025', 'B.Tech Computer Engineering', 'Sem 4 - Div B', 'Artificial Intelligence & Data Science')
ON CONFLICT (id) DO NOTHING;

-- 4. SUBJECTS
INSERT INTO public.subjects (id, institution_id, class_id, name, code, max_marks, pass_marks)
VALUES 
    ('sub_math', 'inst_sxma_01', 'class_10a', 'Mathematics', 'MTH-10', 100.0, 35.0),
    ('sub_sci', 'inst_sxma_01', 'class_10a', 'Science & Technology', 'SCI-10', 100.0, 35.0),
    ('sub_eng', 'inst_sxma_01', 'class_10a', 'English Language & Lit', 'ENG-10', 100.0, 35.0),
    ('sub_soc', 'inst_sxma_01', 'class_10a', 'Social Science', 'SST-10', 100.0, 35.0),
    ('sub_comp', 'inst_sxma_01', 'class_10a', 'Computer Applications', 'CA-10', 100.0, 35.0)
ON CONFLICT (id) DO NOTHING;

-- 5. ASSESSMENTS
INSERT INTO public.assessments (id, institution_id, class_id, subject_id, name, assessment_type, max_marks, weightage_percent, date_conducted, is_published)
VALUES 
    ('asm_mth_ut1', 'inst_sxma_01', 'class_10a', 'sub_math', 'Unit Test 1', 'UNIT_TEST', 25.0, 10.0, '2024-07-15', TRUE),
    ('asm_mth_mid', 'inst_sxma_01', 'class_10a', 'sub_math', 'Mid-Term Examination', 'MID_TERM', 80.0, 30.0, '2024-09-20', TRUE),
    ('asm_sci_ut1', 'inst_sxma_01', 'class_10a', 'sub_sci', 'Unit Test 1', 'UNIT_TEST', 25.0, 10.0, '2024-07-18', TRUE)
ON CONFLICT (id) DO NOTHING;
