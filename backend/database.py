import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eduinsight.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Institutions (Multi-tenant)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS institutions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL, -- 'school', 'junior_college', 'degree_college'
        board_university TEXT NOT NULL, -- 'CBSE', 'ICSE', 'State Board', 'SPPU', 'Mumbai University'
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        grading_scheme TEXT DEFAULT 'PERCENTAGE_LETTER', -- 'PERCENTAGE_LETTER', 'GPA_10'
        attendance_warning_threshold REAL DEFAULT 75.0,
        marks_warning_threshold REAL DEFAULT 40.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Users
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'admin', 'teacher', 'student', 'parent'
        phone TEXT,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
    ''')

    # Academic Years & Semesters
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS academic_years (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        name TEXT NOT NULL, -- e.g. '2024-2025'
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_current INTEGER DEFAULT 1,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
    ''')

    # Classes / Batches / Courses
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        academic_year_id TEXT NOT NULL,
        name TEXT NOT NULL, -- e.g. 'Class 10', 'B.Tech CSE'
        division TEXT NOT NULL, -- e.g. 'A', 'Sem 4 - Div B'
        stream TEXT, -- 'Science', 'Commerce', 'Computer Engineering'
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    )
    ''')

    # Subjects
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        name TEXT NOT NULL, -- 'Mathematics', 'Physics', 'Data Structures & Algorithms'
        code TEXT NOT NULL, -- 'MTH-101', 'CS-401'
        max_marks REAL DEFAULT 100.0,
        pass_marks REAL DEFAULT 35.0,
        is_elective INTEGER DEFAULT 0,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
    ''')

    # Student Profiles
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS student_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        institution_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        admission_number TEXT UNIQUE NOT NULL,
        date_of_birth TEXT,
        blood_group TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
    ''')

    # Teacher Profiles & Subject Assignments
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teacher_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        institution_id TEXT NOT NULL,
        employee_code TEXT NOT NULL,
        designation TEXT NOT NULL,
        qualification TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        is_primary_teacher INTEGER DEFAULT 1,
        FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
    ''')

    # Parent Profiles & Student Links
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS parent_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        institution_id TEXT NOT NULL,
        occupation TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS parent_student_map (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        relationship TEXT NOT NULL, -- 'Father', 'Mother', 'Guardian'
        is_primary_contact INTEGER DEFAULT 1,
        FOREIGN KEY (parent_id) REFERENCES parent_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    )
    ''')

    # Assessments
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        name TEXT NOT NULL, -- 'Unit Test 1', 'Mid-Term Examination', 'Prelim 1', 'Final Semester Exam'
        assessment_type TEXT NOT NULL, -- 'test', 'exam', 'assignment', 'project'
        max_marks REAL NOT NULL,
        date_conducted TEXT NOT NULL,
        weightage_percent REAL DEFAULT 100.0,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
    ''')

    # Marks & Results
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS marks_records (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        marks_obtained REAL, -- NULL if absent or unsubmitted
        status TEXT NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'EXEMPT', 'NOT_SUBMITTED'
        remarks TEXT,
        recorded_by TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
        UNIQUE(assessment_id, student_id)
    )
    ''')

    # Attendance Records
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
    )
    ''')

    # Academic Query Tickets (Mandatory 5 Statuses)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS academic_tickets (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        subject_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Marks Query', 'Doubt Clearing', 'Attendance Discrepancy', 'Assignment Extension'
        priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
        status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'In Progress', 'Awaiting Student', 'Resolved', 'Closed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
    ''')

    # Ticket Messages / Thread
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        sender_user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES academic_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # Direct 1-on-1 Messages
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS private_messages (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        is_read INTEGER DEFAULT 0,
        is_edited INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # AI Early Warnings & Reviews
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS early_warnings (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        subject_id TEXT,
        risk_level TEXT NOT NULL, -- 'HIGH', 'MODERATE', 'LOW'
        title TEXT NOT NULL,
        reason TEXT NOT NULL,
        evidence TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVIEWED', 'DISMISSED', 'RESOLVED'
        teacher_feedback TEXT,
        dismissed_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
    ''')

    # Notifications
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL, -- 'ACADEMIC', 'WARNING', 'MESSAGE', 'TICKET', 'SYSTEM'
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # Audit Logs
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)
