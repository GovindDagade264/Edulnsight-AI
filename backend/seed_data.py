import sqlite3
import uuid
import datetime
from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db

def seed():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data to avoid duplicates on re-seed
    tables = [
        'audit_logs', 'notifications', 'early_warnings', 'private_messages',
        'ticket_messages', 'academic_tickets', 'attendance_records', 'marks_records',
        'assessments', 'parent_student_map', 'parent_profiles', 'teacher_subject_assignments',
        'teacher_profiles', 'student_profiles', 'subjects', 'classes', 'academic_years',
        'users', 'institutions'
    ]
    for table in tables:
        cursor.execute(f"DELETE FROM {table}")

    # 1. Institutions
    inst_school_id = "inst_sxma_01"
    cursor.execute('''
    INSERT INTO institutions (id, name, code, type, board_university, city, state, grading_scheme, attendance_warning_threshold, marks_warning_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        inst_school_id,
        "St. Xavier's Model Senior Secondary School",
        "SXMA-MUM",
        "school",
        "CBSE",
        "Mumbai",
        "Maharashtra",
        "PERCENTAGE_LETTER",
        75.0,
        40.0
    ))

    inst_college_id = "inst_piet_02"
    cursor.execute('''
    INSERT INTO institutions (id, name, code, type, board_university, city, state, grading_scheme, attendance_warning_threshold, marks_warning_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        inst_college_id,
        "Pune Institute of Engineering & Technology (PIET)",
        "PIET-PUN",
        "degree_college",
        "Savitribai Phule Pune University (SPPU)",
        "Pune",
        "Maharashtra",
        "GPA_10",
        75.0,
        45.0
    ))

    # 2. Academic Years
    ay_school_id = "ay_2024_2025"
    cursor.execute('''
    INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (ay_school_id, inst_school_id, "Academic Year 2024-2025", "2024-06-01", "2025-04-30", 1))

    ay_college_id = "ay_coll_2024_2025"
    cursor.execute('''
    INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (ay_college_id, inst_college_id, "Academic Year 2024-2025", "2024-07-01", "2025-05-31", 1))

    # 3. Classes
    class_10a_id = "class_10a"
    cursor.execute('''
    INSERT INTO classes (id, institution_id, academic_year_id, name, division, stream)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (class_10a_id, inst_school_id, ay_school_id, "Class 10", "A", "General Secondary"))

    class_12sci_id = "class_12sci"
    cursor.execute('''
    INSERT INTO classes (id, institution_id, academic_year_id, name, division, stream)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (class_12sci_id, inst_school_id, ay_school_id, "Class 12", "Science - A", "Physics, Chemistry, Maths (PCM)"))

    class_btech_id = "class_btech_cs4"
    cursor.execute('''
    INSERT INTO classes (id, institution_id, academic_year_id, name, division, stream)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (class_btech_id, inst_college_id, ay_college_id, "B.Tech Computer Engineering", "Sem 4 - Div B", "Artificial Intelligence & Data Science"))

    # 4. Subjects for Class 10-A
    subjects_data = [
        ("sub_math", "Mathematics", "MTH-10", 100.0, 35.0),
        ("sub_sci", "Science & Technology", "SCI-10", 100.0, 35.0),
        ("sub_eng", "English Language & Lit", "ENG-10", 100.0, 35.0),
        ("sub_soc", "Social Science", "SST-10", 100.0, 35.0),
        ("sub_comp", "Computer Applications", "CA-10", 100.0, 35.0)
    ]
    for sid, sname, scode, maxm, passm in subjects_data:
        cursor.execute('''
        INSERT INTO subjects (id, institution_id, class_id, name, code, max_marks, pass_marks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (sid, inst_school_id, class_10a_id, sname, scode, maxm, passm))

    # Subjects for B.Tech CSE Sem 4
    college_subjects = [
        ("sub_dsa", "Data Structures & Algorithms", "CS-401", 100.0, 40.0),
        ("sub_dbms", "Database Management Systems", "CS-402", 100.0, 40.0),
        ("sub_os", "Operating Systems", "CS-403", 100.0, 40.0),
        ("sub_cn", "Computer Networks", "CS-404", 100.0, 40.0),
    ]
    for sid, sname, scode, maxm, passm in college_subjects:
        cursor.execute('''
        INSERT INTO subjects (id, institution_id, class_id, name, code, max_marks, pass_marks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (sid, inst_college_id, class_btech_id, sname, scode, maxm, passm))

    # 5. Users and Profiles
    # Common password hashes
    pw_admin = generate_password_hash("admin123")
    pw_teacher = generate_password_hash("teacher123")
    pw_student = generate_password_hash("student123")
    pw_parent = generate_password_hash("parent123")

    # A) School Admin
    u_admin_id = "u_admin_01"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_admin_id, inst_school_id, "admin@stxaviers.edu.in", pw_admin, "Dr. Anthony Fernandez", "admin", "+91 98201 12345"))

    # B) School Teacher: Priya Deshmukh (Math & Science Teacher)
    u_teacher_id = "u_teach_priya"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_teacher_id, inst_school_id, "priya.deshmukh@stxaviers.edu.in", pw_teacher, "Mrs. Priya Deshmukh", "teacher", "+91 98202 23456"))

    t_profile_id = "tp_priya"
    cursor.execute('''
    INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (t_profile_id, u_teacher_id, inst_school_id, "EMP-SXMA-104", "Senior PGT Mathematics & Head of Science", "M.Sc. Mathematics, B.Ed"))

    # Assign Teacher to Math and Science
    cursor.execute('''
    INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, is_primary_teacher)
    VALUES (?, ?, ?, ?)
    ''', ("tsa_1", t_profile_id, "sub_math", 1))
    cursor.execute('''
    INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, is_primary_teacher)
    VALUES (?, ?, ?, ?)
    ''', ("tsa_2", t_profile_id, "sub_sci", 1))

    # C) School Student: Aarav Sharma (Class 10-A)
    u_aarav_id = "u_stud_aarav"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_aarav_id, inst_school_id, "aarav.sharma@student.stxaviers.edu.in", pw_student, "Aarav Sharma", "student", "+91 98203 34567"))

    sp_aarav_id = "sp_aarav"
    cursor.execute('''
    INSERT INTO student_profiles (id, user_id, institution_id, class_id, roll_number, admission_number, date_of_birth, blood_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (sp_aarav_id, u_aarav_id, inst_school_id, class_10a_id, "2024-X-104", "ADM-2018-842", "2009-04-14", "B+"))

    # D) School Parent: Rajesh Sharma (Father of Aarav Sharma)
    u_rajesh_id = "u_parent_rajesh"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_rajesh_id, inst_school_id, "rajesh.sharma@gmail.com", pw_parent, "Rajesh Sharma", "parent", "+91 98204 45678"))

    pp_rajesh_id = "pp_rajesh"
    cursor.execute('''
    INSERT INTO parent_profiles (id, user_id, institution_id, occupation)
    VALUES (?, ?, ?, ?)
    ''', (pp_rajesh_id, u_rajesh_id, inst_school_id, "Senior Software Architect, Tata Consultancy Services"))

    cursor.execute('''
    INSERT INTO parent_student_map (id, parent_id, student_id, relationship, is_primary_contact)
    VALUES (?, ?, ?, ?, ?)
    ''', ("psm_aarav_rajesh", pp_rajesh_id, sp_aarav_id, "Father", 1))

    # Other Class 10-A Students for realistic comparisons & class distribution
    classmates = [
        ("u_stud_priya_p", "priya.patil@student.stxaviers.edu.in", "Priya Patil", "2024-X-105", "ADM-2018-843", "sp_priya_p", "A+"),
        ("u_stud_rahul_d", "rahul.deshmukh@student.stxaviers.edu.in", "Rahul Deshmukh", "2024-X-106", "ADM-2018-844", "sp_rahul_d", "O+"),
        ("u_stud_sneha_j", "sneha.joshi@student.stxaviers.edu.in", "Sneha Joshi", "2024-X-107", "ADM-2018-845", "sp_sneha_j", "B-"),
        ("u_stud_rohan_v", "rohan.verma@student.stxaviers.edu.in", "Rohan Verma", "2024-X-108", "ADM-2018-846", "sp_rohan_v", "AB+"),
    ]
    for uid, uemail, ufname, uroll, uadm, spid, bgroup in classmates:
        cursor.execute('''
        INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (uid, inst_school_id, uemail, pw_student, ufname, "student", "+91 98205 " + uroll[-5:]))
        cursor.execute('''
        INSERT INTO student_profiles (id, user_id, institution_id, class_id, roll_number, admission_number, date_of_birth, blood_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (spid, uid, inst_school_id, class_10a_id, uroll, uadm, "2009-08-22", bgroup))

    # E) College Users for PIET (Degree College)
    u_dean_id = "u_dean_coll"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_dean_id, inst_college_id, "dean@piet.edu.in", pw_admin, "Prof. M. K. Kulkarni", "admin", "+91 94220 11223"))

    u_prof_id = "u_prof_anand"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_prof_id, inst_college_id, "prof.kulkarni@piet.edu.in", pw_teacher, "Prof. Anand Kulkarni", "teacher", "+91 94220 33445"))

    tp_anand_id = "tp_anand"
    cursor.execute('''
    INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (tp_anand_id, u_prof_id, inst_college_id, "FAC-PIET-208", "Associate Professor & Head of DSA Lab", "Ph.D. Computer Engineering, IIT Bombay"))

    cursor.execute('''
    INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, is_primary_teacher)
    VALUES (?, ?, ?, ?)
    ''', ("tsa_coll_1", tp_anand_id, "sub_dsa", 1))

    u_ananya_id = "u_stud_ananya"
    cursor.execute('''
    INSERT INTO users (id, institution_id, email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (u_ananya_id, inst_college_id, "ananya.kulkarni@student.piet.edu.in", pw_student, "Ananya Kulkarni", "student", "+91 94220 55667"))

    sp_ananya_id = "sp_ananya"
    cursor.execute('''
    INSERT INTO student_profiles (id, user_id, institution_id, class_id, roll_number, admission_number, date_of_birth, blood_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (sp_ananya_id, u_ananya_id, inst_college_id, class_btech_id, "2024-CSE-018", "ADM-ENG-2022-108", "2004-03-12", "O+"))

    # 6. Assessments for Class 10-A
    # We create 4 terms/assessments: Unit Test 1 (July), Mid-Term Exam (Oct), Unit Test 2 (Dec), Pre-Board Exam (Jan)
    assessments_data = [
        # Math
        ("asm_mth_ut1", "sub_math", "Unit Test 1 (Algebra)", "test", 25.0, "2024-07-20", 15.0),
        ("asm_mth_mid", "sub_math", "Mid-Term Examination", "exam", 80.0, "2024-10-15", 35.0),
        ("asm_mth_ut2", "sub_math", "Unit Test 2 (Geometry & Stats)", "test", 25.0, "2024-12-10", 15.0),
        ("asm_mth_pb", "sub_math", "Pre-Board Examination", "exam", 80.0, "2025-01-22", 35.0),
        # Science
        ("asm_sci_ut1", "sub_sci", "Unit Test 1 (Physics)", "test", 25.0, "2024-07-22", 15.0),
        ("asm_sci_mid", "sub_sci", "Mid-Term Examination", "exam", 80.0, "2024-10-18", 35.0),
        ("asm_sci_ut2", "sub_sci", "Unit Test 2 (Chemistry/Bio)", "test", 25.0, "2024-12-12", 15.0),
        ("asm_sci_pb", "sub_sci", "Pre-Board Examination", "exam", 80.0, "2025-01-25", 35.0),
        # English
        ("asm_eng_mid", "sub_eng", "Mid-Term Examination", "exam", 80.0, "2024-10-12", 40.0),
        ("asm_eng_pb", "sub_eng", "Pre-Board Examination", "exam", 80.0, "2025-01-18", 60.0),
        # Social Science
        ("asm_soc_mid", "sub_soc", "Mid-Term Examination", "exam", 80.0, "2024-10-14", 40.0),
        ("asm_soc_pb", "sub_soc", "Pre-Board Examination", "exam", 80.0, "2025-01-20", 60.0),
        # Computer Applications
        ("asm_ca_mid", "sub_comp", "Mid-Term Practical & Theory", "exam", 100.0, "2024-10-10", 40.0),
        ("asm_ca_pb", "sub_comp", "Pre-Board Examination", "exam", 100.0, "2025-01-16", 60.0),
    ]
    for asmid, subid, aname, atype, maxm, ddate, wgt in assessments_data:
        cursor.execute('''
        INSERT INTO assessments (id, institution_id, class_id, subject_id, name, assessment_type, max_marks, date_conducted, weightage_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (asmid, inst_school_id, class_10a_id, subid, aname, atype, maxm, ddate, wgt))

    # 7. Marks Records
    # Realistic data demonstrating explainable trends:
    # Aarav Sharma:
    # - Math: UT1 (22/25 = 88%), Mid (68/80 = 85%), UT2 (18/25 = 72%), PB (54/80 = 67.5%) -> Noticeable dip!
    # - Science: UT1 (23/25 = 92%), Mid (72/80 = 90%), UT2 (22/25 = 88%), PB (73/80 = 91.2%) -> Strong & steady!
    # - English: Mid (70/80 = 87.5%), PB (72/80 = 90%)
    # - Social Science: Mid (65/80 = 81.2%), PB (68/80 = 85%)
    # - Computer App: Mid (94/100 = 94%), PB (96/100 = 96%) -> Peak strength!
    aarav_marks = [
        ("asm_mth_ut1", 22.0, "PRESENT", "Strong grasp of quadratic equations"),
        ("asm_mth_mid", 68.0, "PRESENT", "Good conceptual clarity in Trigonometry"),
        ("asm_mth_ut2", 18.0, "PRESENT", "Struggled with circle theorems & time management"),
        ("asm_mth_pb", 54.0, "PRESENT", "Calculation errors in Section C (Calculus & Coordinate Geometry)"),

        ("asm_sci_ut1", 23.0, "PRESENT", "Excellent optics ray diagrams"),
        ("asm_sci_mid", 72.0, "PRESENT", "Very thorough chemical equations"),
        ("asm_sci_ut2", 22.0, "PRESENT", "Good comprehension"),
        ("asm_sci_pb", 73.0, "PRESENT", "Top tier paper presentation"),

        ("asm_eng_mid", 70.0, "PRESENT", "Expressive creative writing"),
        ("asm_eng_pb", 72.0, "PRESENT", "Good grammar and comprehension"),

        ("asm_soc_mid", 65.0, "PRESENT", "Good map work"),
        ("asm_soc_pb", 68.0, "PRESENT", "Clear historical timeline explanations"),

        ("asm_ca_mid", 94.0, "PRESENT", "Flawless Java loop logic and algorithms"),
        ("asm_ca_pb", 96.0, "PRESENT", "Highest in class for OOP design and syntax"),
    ]
    for asmid, marks, status, rem in aarav_marks:
        cursor.execute('''
        INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"mr_aarav_{asmid}", asmid, sp_aarav_id, marks, status, rem, "Mrs. Priya Deshmukh"))

    # Marks for Classmates to provide realistic averages & distribution
    # Priya Patil (Star student)
    priya_marks = [
        ("asm_mth_ut1", 24.5), ("asm_mth_mid", 78.0), ("asm_mth_ut2", 24.0), ("asm_mth_pb", 77.0),
        ("asm_sci_ut1", 24.0), ("asm_sci_mid", 76.0), ("asm_sci_ut2", 24.5), ("asm_sci_pb", 78.0),
        ("asm_eng_mid", 75.0), ("asm_eng_pb", 76.0),
        ("asm_soc_mid", 76.0), ("asm_soc_pb", 78.0),
        ("asm_ca_mid", 98.0), ("asm_ca_pb", 99.0)
    ]
    for asmid, marks in priya_marks:
        cursor.execute('''
        INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"mr_priyap_{asmid}", asmid, "sp_priya_p", marks, "PRESENT", "Outstanding performance", "Mrs. Priya Deshmukh"))

    # Rahul Deshmukh (Needs support in Math & Science, good in Computers)
    rahul_marks = [
        ("asm_mth_ut1", 12.0), ("asm_mth_mid", 34.0), ("asm_mth_ut2", 11.0), ("asm_mth_pb", 31.0),
        ("asm_sci_ut1", 14.0), ("asm_sci_mid", 38.0), ("asm_sci_ut2", 13.0), ("asm_sci_pb", 36.0),
        ("asm_eng_mid", 55.0), ("asm_eng_pb", 58.0),
        ("asm_soc_mid", 50.0), ("asm_soc_pb", 52.0),
        ("asm_ca_mid", 82.0), ("asm_ca_pb", 85.0)
    ]
    for asmid, marks in rahul_marks:
        cursor.execute('''
        INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"mr_rahul_{asmid}", asmid, "sp_rahul_d", marks, "PRESENT", "Remedial help recommended", "Mrs. Priya Deshmukh"))

    # Sneha Joshi (Consistent ~78%)
    sneha_marks = [
        ("asm_mth_ut1", 19.0), ("asm_mth_mid", 62.0), ("asm_mth_ut2", 20.0), ("asm_mth_pb", 64.0),
        ("asm_sci_ut1", 20.0), ("asm_sci_mid", 65.0), ("asm_sci_ut2", 21.0), ("asm_sci_pb", 66.0),
        ("asm_eng_mid", 68.0), ("asm_eng_pb", 70.0),
        ("asm_soc_mid", 67.0), ("asm_soc_pb", 69.0),
        ("asm_ca_mid", 88.0), ("asm_ca_pb", 90.0)
    ]
    for asmid, marks in sneha_marks:
        cursor.execute('''
        INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"mr_sneha_{asmid}", asmid, "sp_sneha_j", marks, "PRESENT", "Consistent steady effort", "Mrs. Priya Deshmukh"))

    # Rohan Verma (Has missing/absent record)
    rohan_marks = [
        ("asm_mth_ut1", 17.0, "PRESENT"),
        ("asm_mth_mid", None, "ABSENT"), # Explicitly ABSENT (not silently 0)
        ("asm_mth_ut2", 14.0, "PRESENT"),
        ("asm_mth_pb", 42.0, "PRESENT"),
        ("asm_sci_ut1", 16.0, "PRESENT"),
        ("asm_sci_mid", 45.0, "PRESENT"),
        ("asm_sci_ut2", None, "NOT_SUBMITTED"), # Explicitly NOT_SUBMITTED
        ("asm_sci_pb", 48.0, "PRESENT"),
        ("asm_eng_mid", 52.0, "PRESENT"),
        ("asm_eng_pb", 55.0, "PRESENT"),
        ("asm_soc_mid", 54.0, "PRESENT"),
        ("asm_soc_pb", 58.0, "PRESENT"),
        ("asm_ca_mid", 74.0, "PRESENT"),
        ("asm_ca_pb", 76.0, "PRESENT")
    ]
    for item in rohan_marks:
        asmid, marks, status = item[0], item[1], item[2]
        cursor.execute('''
        INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (f"mr_rohan_{asmid}", asmid, "sp_rohan_v", marks, status, "Medical leave on mid-term", "Mrs. Priya Deshmukh"))

    # 8. Attendance Records for Aarav Sharma & classmates
    # Generate 60 days of attendance (Nov 2024 - Jan 2025)
    base_date = datetime.date(2024, 11, 1)
    day_count = 0
    cur_date = base_date
    while day_count < 60:
        if cur_date.weekday() < 5: # Monday to Friday
            date_str = cur_date.isoformat()
            
            # Aarav has 55 present, 3 absent, 2 late -> ~91.7% attendance
            aarav_status = "PRESENT"
            if day_count in [12, 34, 48]:
                aarav_status = "ABSENT"
            elif day_count in [7, 25]:
                aarav_status = "LATE"

            cursor.execute('''
            INSERT INTO attendance_records (id, student_id, class_id, date, status, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (f"att_aarav_{date_str}", sp_aarav_id, class_10a_id, date_str, aarav_status, "Parent notified" if aarav_status == "ABSENT" else None))

            # Rohan Verma has lower attendance (~68%) triggering attendance alert
            rohan_status = "PRESENT"
            if day_count % 3 == 0:
                rohan_status = "ABSENT"
            cursor.execute('''
            INSERT INTO attendance_records (id, student_id, class_id, date, status, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (f"att_rohan_{date_str}", "sp_rohan_v", class_10a_id, date_str, rohan_status, None))

            # Priya Patil has 100% attendance
            cursor.execute('''
            INSERT INTO attendance_records (id, student_id, class_id, date, status, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (f"att_priyap_{date_str}", "sp_priya_p", class_10a_id, date_str, "PRESENT", None))

            day_count += 1
        cur_date += datetime.timedelta(days=1)

    # 9. Explainable AI Early Warnings
    cursor.execute('''
    INSERT INTO early_warnings (id, institution_id, student_id, subject_id, risk_level, title, reason, evidence, recommended_action, status, teacher_feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "ew_aarav_mth_01",
        inst_school_id,
        sp_aarav_id,
        "sub_math",
        "MODERATE",
        "Mathematics Score Deceleration in Higher Calculus & Coordinate Geometry",
        "Mathematics assessment scores have dropped by 20.5 percentage points between Unit Test 1 (88%) and Pre-Board (67.5%).",
        "Assessment progression: UT1: 22/25 (88%) -> Mid-Term: 68/80 (85%) -> UT2: 18/25 (72%) -> Pre-Board: 54/80 (67.5%). Primary score loss occurred in 4-mark geometry proofs.",
        "1. Schedule targeted 1-on-1 revision of Triangles and Circles theorem proofs with Mrs. Priya Deshmukh.\n2. Complete 5 practice questions from CBSE Exemplar weekly.\n3. Verify formula derivation sheet before Board examinations.",
        "ACTIVE",
        "I have noticed Aarav is rushing through multi-step geometry proofs. Will conduct remedial discussion this Thursday."
    ))

    cursor.execute('''
    INSERT INTO early_warnings (id, institution_id, student_id, subject_id, risk_level, title, reason, evidence, recommended_action, status, teacher_feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "ew_rohan_att_02",
        inst_school_id,
        "sp_rohan_v",
        None,
        "HIGH",
        "Severe Attendance Shortfall Below CBSE Minimum Regulatory Mandate",
        "Current cumulative attendance is 68.3%, which is below the mandatory 75% CBSE Board examination eligibility criterion.",
        "Total working days: 60. Days present: 41. Days absent: 19. Absenteeism is concentrated around post-weekend Mondays.",
        "1. Issue formal parental notification.\n2. Request submission of verified medical documentation for missed dates.\n3. Arrange student-counselor meeting to discuss attendance recovery.",
        "ACTIVE",
        "Contacted father on Jan 15. Medical certificate pending."
    ))

    # 10. Academic Query Tickets (All 5 mandatory statuses represented!)
    tickets = [
        (
            "tick_01",
            sp_aarav_id,
            t_profile_id,
            "sub_math",
            "Clarification on Mid-Term Mathematics Question 4 (Calculus Proof)",
            "Respected Ma'am, in Question 4 of the Mid-Term Mathematics paper, I followed the step-by-step LHS to RHS expansion method for the trigonometric identity. Could you please clarify where 2 marks were deducted in step 3?",
            "Marks Query",
            "MEDIUM",
            "Open"
        ),
        (
            "tick_02",
            sp_aarav_id,
            t_profile_id,
            "sub_sci",
            "Clarification on Lab Experiment 3 Ray Diagram Grading",
            "Good afternoon Ma'am. For the concave mirror focal length experiment report, I wanted to confirm if the revised observation table needs to be resubmitted before the practical mock exam.",
            "Doubt Clearing",
            "LOW",
            "In Progress"
        ),
        (
            "tick_03",
            sp_aarav_id,
            t_profile_id,
            "sub_math",
            "Request for Geometry Proof Remedial Practice Sheet",
            "Hello Ma'am, as suggested in my recent performance insight, I would like to request the targeted practice question bank for circles and coordinate geometry.",
            "Doubt Clearing",
            "HIGH",
            "Awaiting Student"
        ),
        (
            "tick_04",
            sp_aarav_id,
            t_profile_id,
            None,
            "Attendance Correction for 14th November (Sports Representation)",
            "I was marked Absent on 14th November, but I was representing the school in the Inter-School Chess Championship with official OD permission from Sports Dept.",
            "Attendance Discrepancy",
            "MEDIUM",
            "Resolved"
        ),
        (
            "tick_05",
            sp_aarav_id,
            t_profile_id,
            "sub_comp",
            "Project Submission Confirmation: Java Banking System",
            "Confirming that the repository link and project documentation for Java Banking System has been received and verified for the practical evaluation.",
            "Assignment Extension",
            "LOW",
            "Closed"
        )
    ]
    for tid, stid, tchid, subid, title, desc, cat, prio, stat in tickets:
        cursor.execute('''
        INSERT INTO academic_tickets (id, institution_id, student_id, teacher_id, subject_id, title, description, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (tid, inst_school_id, stid, tchid, subid, title, desc, cat, prio, stat))

    # Add messages to Ticket 3 (Awaiting Student status demonstration)
    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
    VALUES (?, ?, ?, ?)
    ''', ("tm_3_1", "tick_03", u_aarav_id, "Hello Ma'am, could you provide the geometry remedial practice worksheet?"))

    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
    VALUES (?, ?, ?, ?)
    ''', ("tm_3_2", "tick_03", u_teacher_id, "Certainly Aarav. I have attached the 20-problem sheet. Please solve Questions 1 through 10 first and reply here with your answers by Wednesday so we can review them together."))

    # Add messages to Ticket 4 (Resolved)
    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
    VALUES (?, ?, ?, ?)
    ''', ("tm_4_1", "tick_04", u_aarav_id, "Attached the official Sports OD certificate signed by Coach Ranade for Nov 14th."))
    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
    VALUES (?, ?, ?, ?)
    ''', ("tm_4_2", "tick_04", u_teacher_id, "Verified with Sports Department. Attendance record updated to OD (On Duty / Present). Ticket marked Resolved."))

    # 11. Direct Private 1-on-1 Messages (Student-Teacher & Parent-Teacher)
    # Aarav <-> Teacher Priya Deshmukh
    cursor.execute('''
    INSERT INTO private_messages (id, institution_id, sender_id, receiver_id, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("pm_1", inst_school_id, u_aarav_id, u_teacher_id, "Good evening Ma'am, thank you for clarifying the trigonometry doubt during today's tutorial.", 1))
    cursor.execute('''
    INSERT INTO private_messages (id, institution_id, sender_id, receiver_id, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("pm_2", inst_school_id, u_teacher_id, u_aarav_id, "You are most welcome, Aarav. Keep practicing the 4-mark questions, you have great potential to score above 90%!", 1))

    # Rajesh Sharma (Parent) <-> Teacher Priya Deshmukh
    cursor.execute('''
    INSERT INTO private_messages (id, institution_id, sender_id, receiver_id, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("pm_3", inst_school_id, u_rajesh_id, u_teacher_id, "Namaste Mrs. Deshmukh. I reviewed Aarav's EduInsight dashboard and noticed the Pre-Board math score. We are actively helping him schedule revision at home. Is there any specific area we should focus on?", 1))
    cursor.execute('''
    INSERT INTO private_messages (id, institution_id, sender_id, receiver_id, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("pm_4", inst_school_id, u_teacher_id, u_rajesh_id, "Namaste Mr. Sharma. Thank you for reaching out. Please ensure he practices writing out full geometric theorem proofs with neat figures. His conceptual grasp is solid, it is primarily a matter of exam pacing and proof structure.", 0))

    # 12. Notifications
    cursor.execute('''
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("notif_1", u_aarav_id, "Pre-Board Examination Results Published", "Your official marks for Pre-Board Assessments have been verified and uploaded.", "ACADEMIC", "/student/marks"))
    cursor.execute('''
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("notif_2", u_aarav_id, "New AI Performance Insight Available", "An explainable performance trend was detected in Mathematics with recommendations.", "WARNING", "/student/insights"))
    cursor.execute('''
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("notif_3", u_teacher_id, "New Student Query Received", "Aarav Sharma submitted a query on Mid-Term Mathematics Question 4.", "TICKET", "/teacher/tickets"))
    cursor.execute('''
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ("notif_4", u_rajesh_id, "Academic Progress Update for Aarav", "Aarav's Pre-Board overall aggregate is 81.4% with 91.7% attendance.", "ACADEMIC", "/parent/overview"))

    # 13. Audit Logs
    cursor.execute('''
    INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', ("al_1", inst_school_id, u_teacher_id, "UPLOAD_MARKS", "assessment", "asm_mth_pb", "Uploaded and verified Pre-Board Mathematics marks for Class 10-A (38 students)", "192.168.1.14"))
    cursor.execute('''
    INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', ("al_2", inst_school_id, u_admin_id, "CONFIGURE_THRESHOLDS", "institution", inst_school_id, "Configured warning thresholds: Attendance 75%, Passing Marks 40%", "192.168.1.2"))

    conn.commit()
    conn.close()
    print("Database seeded with authentic Indian academic records, 4 portals, AI early warnings, and 5-status tickets successfully!")

if __name__ == '__main__':
    seed()
