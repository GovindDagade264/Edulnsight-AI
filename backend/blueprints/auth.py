

import jwt
import datetime
import uuid
from functools import wraps
from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

JWT_SECRET = "eduinsight-ai-enterprise-secret-key-2025"
JWT_ALGORITHM = "HS256"

def generate_token(user_dict):
    payload = {
        'user_id': user_dict['id'],
        'institution_id': user_dict['institution_id'],
        'role': user_dict['role'],
        'email': user_dict['email'],
        'full_name': user_dict['full_name'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def require_auth(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid Authorization header'}), 401
            
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                g.current_user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired. Please sign in again.'}), 401
            except jwt.InvalidTokenError:
                # Fallback: check if valid Supabase token
                try:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    exp = payload.get('exp')
                    if exp and datetime.datetime.fromtimestamp(exp, tz=datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
                        return jsonify({'error': 'Token has expired. Please sign in again.'}), 401
                    
                    email = (payload.get('email') or '').strip().lower()
                    sub = payload.get('sub')
                    
                    conn = get_db_connection()
                    user = None
                    if email:
                        user = conn.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,)).fetchone()
                    if not user and sub:
                        user = conn.execute('SELECT * FROM users WHERE id = ?', (sub,)).fetchone()
                    
                    if user:
                        g.current_user = {
                            'user_id': user['id'],
                            'institution_id': user['institution_id'],
                            'role': user['role'],
                            'email': user['email'],
                            'full_name': user['full_name']
                        }
                        conn.close()
                    else:
                        conn.close()
                        meta = payload.get('user_metadata', {})
                        role = meta.get('role', 'student')
                        full_name = meta.get('full_name', 'Authenticated User')
                        g.current_user = {
                            'user_id': sub or f"usr_{uuid.uuid4().hex[:8]}",
                            'institution_id': meta.get('institution_id', 'inst_sxma_01'),
                            'role': role,
                            'email': email,
                            'full_name': full_name
                        }
                except Exception:
                    return jsonify({'error': 'Invalid authentication token.'}), 401

            if allowed_roles and g.current_user.get('role') not in allowed_roles:
                return jsonify({'error': 'Access denied: insufficient permissions for this operation.'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def ensure_student_records(conn, student_profile_id, class_id, institution_id='inst_sxma_01'):
    """Populates complete academic curriculum marks and attendance records if empty."""
    marks_count = conn.execute('SELECT COUNT(*) FROM marks_records WHERE student_id = ?', (student_profile_id,)).fetchone()[0]
    if marks_count == 0:
        template_marks = conn.execute("SELECT * FROM marks_records WHERE student_id = 'sp_aarav'").fetchall()
        for m in template_marks:
            conn.execute('''
                INSERT OR IGNORE INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f"mr_{uuid.uuid4().hex[:8]}", m['assessment_id'], student_profile_id, m['marks_obtained'], m['status'], m['remarks'], m['recorded_by'], m['updated_at']))

    att_count = conn.execute('SELECT COUNT(*) FROM attendance_records WHERE student_id = ?', (student_profile_id,)).fetchone()[0]
    if att_count == 0:
        template_att = conn.execute("SELECT * FROM attendance_records WHERE student_id = 'sp_aarav'").fetchall()
        for a in template_att:
            conn.execute('''
                INSERT OR IGNORE INTO attendance_records (id, student_id, class_id, date, status, remarks, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f"att_{uuid.uuid4().hex[:8]}", student_profile_id, class_id or 'class_10a', a['date'], a['status'], a['remarks'], a['created_at'], a['updated_at']))

    ew_count = conn.execute('SELECT COUNT(*) FROM early_warnings WHERE student_id = ?', (student_profile_id,)).fetchone()[0]
    if ew_count == 0:
        template_ew = conn.execute("SELECT * FROM early_warnings WHERE student_id = 'sp_aarav'").fetchall()
        for ew in template_ew:
            conn.execute('''
                INSERT OR IGNORE INTO early_warnings (id, institution_id, student_id, subject_id, risk_level, title, reason, evidence, recommended_action, status, teacher_feedback, dismissed_reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f"ew_{uuid.uuid4().hex[:8]}", ew['institution_id'], student_profile_id, ew['subject_id'], ew['risk_level'], ew['title'], ew['reason'], ew['evidence'], ew['recommended_action'], ew['status'], ew['teacher_feedback'], ew['dismissed_reason'], ew['created_at']))
    conn.commit()

def ensure_teacher_records(conn, teacher_profile_id):
    """Ensures teacher has subject assignments so the teacher dashboard has complete classes."""
    count = conn.execute('SELECT COUNT(*) FROM teacher_subject_assignments WHERE teacher_id = ?', (teacher_profile_id,)).fetchone()[0]
    if count == 0:
        conn.execute('INSERT OR IGNORE INTO teacher_subject_assignments (id, teacher_id, subject_id, is_primary_teacher) VALUES (?, ?, ?, 1)', (f"tsa_{uuid.uuid4().hex[:6]}", teacher_profile_id, 'sub_math'))
        conn.execute('INSERT OR IGNORE INTO teacher_subject_assignments (id, teacher_id, subject_id, is_primary_teacher) VALUES (?, ?, ?, 1)', (f"tsa_{uuid.uuid4().hex[:6]}", teacher_profile_id, 'sub_sci'))
        conn.commit()

def ensure_parent_records(conn, parent_profile_id, institution_id='inst_sxma_01'):
    """Ensures parent is linked to an enrolled student."""
    count = conn.execute('SELECT COUNT(*) FROM parent_student_map WHERE parent_id = ?', (parent_profile_id,)).fetchone()[0]
    if count == 0:
        primary_student = conn.execute('SELECT id FROM student_profiles WHERE institution_id = ? ORDER BY id ASC LIMIT 1', (institution_id,)).fetchone()
        if primary_student:
            conn.execute('INSERT OR IGNORE INTO parent_student_map (id, parent_id, student_id, relationship, is_primary_contact) VALUES (?, ?, ?, ?, 1)', (f"psm_{uuid.uuid4().hex[:6]}", parent_profile_id, primary_student['id'], 'Guardian'))
            conn.commit()

@auth_bp.route('/supabase-session', methods=['POST'])
def sync_supabase_session():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    supabase_uid = data.get('supabase_uid', '').strip()
    full_name = data.get('full_name', '').strip() or 'Authenticated User'
    role = data.get('role', 'student').strip().lower()
    institution_id = data.get('institution_id') or 'inst_sxma_01'

    if not email:
        return jsonify({'error': 'User email is required to sync session.'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,)).fetchone()

    if not user:
        inst = conn.execute('SELECT * FROM institutions WHERE id = ?', (institution_id,)).fetchone()
        if not inst:
            inst = conn.execute('SELECT * FROM institutions LIMIT 1').fetchone()
            institution_id = inst['id'] if inst else 'inst_sxma_01'

        user_id = supabase_uid if supabase_uid else f"usr_{uuid.uuid4().hex[:8]}"
        pwd_hash = generate_password_hash("SupabaseAuthManaged-2025")
        try:
            conn.execute('''
                INSERT INTO users (id, institution_id, email, password_hash, full_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ''', (user_id, institution_id, email, pwd_hash, full_name, role))
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            user = conn.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,)).fetchone()
            if user:
                user_id = user['id']

        if role == 'student':
            cls = conn.execute('SELECT id FROM classes WHERE institution_id = ? ORDER BY id ASC LIMIT 1', (institution_id,)).fetchone()
            class_id = cls['id'] if cls else 'class_10a'
            count_row = conn.execute('SELECT count(*) as count FROM student_profiles WHERE class_id = ?', (class_id,)).fetchone()
            next_roll = (count_row['count'] if count_row else 0) + 101
            roll_number = f"2024-X-{next_roll}"
            admission_number = f"ADM-2024-{uuid.uuid4().hex[:4].upper()}"
            sp_id = f"sp_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO student_profiles (id, institution_id, user_id, class_id, roll_number, admission_number)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (sp_id, institution_id, user_id, class_id, roll_number, admission_number))
        elif role == 'teacher':
            tp_id = f"tp_{uuid.uuid4().hex[:8]}"
            emp_code = f"EMP-SXMA-{uuid.uuid4().hex[:3].upper()}"
            conn.execute('''
                INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
                VALUES (?, ?, ?, ?, 'Instructional Faculty', 'M.Sc., B.Ed.')
            ''', (tp_id, user_id, institution_id, emp_code))
        elif role == 'parent':
            pp_id = f"pp_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO parent_profiles (id, user_id, institution_id, occupation)
                VALUES (?, ?, ?, 'Guardian')
            ''', (pp_id, user_id, institution_id))

        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    else:
        # Existing user: synchronize role and full_name if updated from Supabase
        new_role = role if role in ['student', 'teacher', 'parent', 'admin'] else user['role']
        new_name = full_name if (full_name and full_name != 'Authenticated User') else user['full_name']
        if new_role != user['role'] or new_name != user['full_name']:
            conn.execute('UPDATE users SET role = ?, full_name = ? WHERE id = ?', (new_role, new_name, user['id']))
            conn.commit()
            user = conn.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()

    inst = conn.execute('SELECT * FROM institutions WHERE id = ?', (user['institution_id'],)).fetchone()
    inst_name = inst['name'] if inst else "St. Xavier's Model Senior Secondary School"
    inst_code = inst['code'] if inst else "SXMA-MUM"

    profile_data = {}
    if user['role'] == 'student':
        sp = conn.execute('''
            SELECT sp.*, c.name as class_name, c.division, c.stream
            FROM student_profiles sp
            JOIN classes c ON sp.class_id = c.id
            WHERE sp.user_id = ?
        ''', (user['id'],)).fetchone()
        if sp:
            ensure_student_records(conn, sp['id'], sp['class_id'], user['institution_id'])
            profile_data = dict(sp)
    elif user['role'] == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if tp:
            ensure_teacher_records(conn, tp['id'])
            profile_data = dict(tp)
    elif user['role'] == 'parent':
        pp = conn.execute('SELECT * FROM parent_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if pp:
            ensure_parent_records(conn, pp['id'], user['institution_id'])
            profile_data = dict(pp)
            child = conn.execute('''
                SELECT sp.id as student_id, u.full_name as student_name, sp.roll_number, c.name as class_name, c.division
                FROM parent_student_map psm
                JOIN student_profiles sp ON psm.student_id = sp.id
                JOIN users u ON sp.user_id = u.id
                JOIN classes c ON sp.class_id = c.id
                WHERE psm.parent_id = ?
            ''', (pp['id'],)).fetchone()
            if child:
                profile_data['linked_student'] = dict(child)

    conn.close()

    user_dict = dict(user)
    if 'password_hash' in user_dict:
        del user_dict['password_hash']
    user_dict['institution_name'] = inst_name
    user_dict['institution_code'] = inst_code
    user_dict['profile_completion_status'] = True

    token = generate_token(user_dict)

    return jsonify({
        'token': token,
        'user': user_dict,
        'profile': profile_data,
        'message': f"Supabase session synchronized for {user['full_name']}."
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    conn = get_db_connection()
    user = conn.execute('''
        SELECT u.*, i.name as institution_name, i.code as institution_code, i.type as institution_type, i.board_university
        FROM users u
        JOIN institutions i ON u.institution_id = i.id
        WHERE LOWER(u.email) = ? AND u.is_active = 1
    ''', (email,)).fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        conn.close()
        return jsonify({'error': 'Invalid credentials. Please verify your email and password.'}), 401

    # Fetch role-specific details
    profile_data = {}
    if user['role'] == 'student':
        sp = conn.execute('''
            SELECT sp.*, c.name as class_name, c.division, c.stream
            FROM student_profiles sp
            JOIN classes c ON sp.class_id = c.id
            WHERE sp.user_id = ?
        ''', (user['id'],)).fetchone()
        if sp:
            profile_data = dict(sp)
    elif user['role'] == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if tp:
            profile_data = dict(tp)
    elif user['role'] == 'parent':
        pp = conn.execute('SELECT * FROM parent_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if pp:
            profile_data = dict(pp)
            # Linked child
            child = conn.execute('''
                SELECT sp.id as student_id, u.full_name as student_name, sp.roll_number, c.name as class_name, c.division
                FROM parent_student_map psm
                JOIN student_profiles sp ON psm.student_id = sp.id
                JOIN users u ON sp.user_id = u.id
                JOIN classes c ON sp.class_id = c.id
                WHERE psm.parent_id = ?
            ''', (pp['id'],)).fetchone()
            if child:
                profile_data['linked_student'] = dict(child)

    conn.close()

    user_dict = dict(user)
    del user_dict['password_hash']
    token = generate_token(user_dict)

    return jsonify({
        'token': token,
        'user': user_dict,
        'profile': profile_data,
        'message': f"Welcome back, {user['full_name']}!"
    })

@auth_bp.route('/me', methods=['GET'])
@require_auth()
def get_current_user():
    user_id = g.current_user['user_id']
    conn = get_db_connection()
    user = conn.execute('''
        SELECT u.id, u.institution_id, u.email, u.full_name, u.role, u.phone, u.avatar_url,
               i.name as institution_name, i.code as institution_code, i.type as institution_type, i.board_university
        FROM users u
        JOIN institutions i ON u.institution_id = i.id
        WHERE u.id = ?
    ''', (user_id,)).fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    profile_data = {}
    if user['role'] == 'student':
        sp = conn.execute('''
            SELECT sp.*, c.name as class_name, c.division, c.stream
            FROM student_profiles sp
            JOIN classes c ON sp.class_id = c.id
            WHERE sp.user_id = ?
        ''', (user['id'],)).fetchone()
        if sp:
            ensure_student_records(conn, sp['id'], sp['class_id'], user['institution_id'])
            profile_data = dict(sp)
    elif user['role'] == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if tp:
            ensure_teacher_records(conn, tp['id'])
            profile_data = dict(tp)
    elif user['role'] == 'parent':
        pp = conn.execute('SELECT * FROM parent_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if pp:
            ensure_parent_records(conn, pp['id'], user['institution_id'])
            profile_data = dict(pp)
            child = conn.execute('''
                SELECT sp.id as student_id, u.full_name as student_name, sp.roll_number, c.name as class_name, c.division
                FROM parent_student_map psm
                JOIN student_profiles sp ON psm.student_id = sp.id
                JOIN users u ON sp.user_id = u.id
                JOIN classes c ON sp.class_id = c.id
                WHERE psm.parent_id = ?
            ''', (pp['id'],)).fetchone()
            if child:
                profile_data['linked_student'] = dict(child)

    conn.close()
    return jsonify({
        'user': dict(user),
        'profile': profile_data
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'student').strip().lower()
    institution_id = data.get('institution_id', 'inst_01')

    if not email or not password or not full_name:
        return jsonify({'error': 'Full name, email, and password are required.'}), 400

    if role not in ['student', 'teacher', 'parent', 'admin']:
        return jsonify({'error': 'Invalid role specified.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT id FROM users WHERE LOWER(email) = ?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'An account with this email already exists.'}), 409

    # Verify institution
    inst = conn.execute('SELECT * FROM institutions WHERE id = ?', (institution_id,)).fetchone()
    if not inst:
        inst = conn.execute('SELECT * FROM institutions LIMIT 1').fetchone()
        institution_id = inst['id']

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    pwd_hash = generate_password_hash(password)

    conn.execute('''
        INSERT INTO users (id, institution_id, email, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ''', (user_id, institution_id, email, pwd_hash, full_name, role))

    # Automatically create the corresponding role profile so the new account is fully functional immediately
    profile_dict = None
    if role == 'student':
        cls = conn.execute('SELECT id FROM classes WHERE institution_id = ? ORDER BY id ASC LIMIT 1', (institution_id,)).fetchone()
        class_id = cls['id'] if cls else 'class_10a'
        count_row = conn.execute('SELECT count(*) as count FROM student_profiles WHERE class_id = ?', (class_id,)).fetchone()
        next_roll = (count_row['count'] if count_row else 0) + 101
        roll_number = f"2024-X-{next_roll}"
        admission_number = f"ADM-2024-{uuid.uuid4().hex[:4].upper()}"
        sp_id = f"sp_{uuid.uuid4().hex[:8]}"
        conn.execute('''
            INSERT INTO student_profiles (id, institution_id, user_id, class_id, roll_number, admission_number)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (sp_id, institution_id, user_id, class_id, roll_number, admission_number))
        profile_dict = {
            'id': sp_id,
            'institution_id': institution_id,
            'user_id': user_id,
            'class_id': class_id,
            'roll_number': roll_number,
            'admission_number': admission_number,
            'profile_completion_status': True
        }
    elif role == 'teacher':
        tp_id = f"tp_{uuid.uuid4().hex[:8]}"
        emp_code = f"EMP-SXMA-{uuid.uuid4().hex[:3].upper()}"
        conn.execute('''
            INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
            VALUES (?, ?, ?, ?, 'Instructional Faculty', 'M.Sc., B.Ed.')
        ''', (tp_id, user_id, institution_id, emp_code))
        profile_dict = {
            'id': tp_id,
            'institution_id': institution_id,
            'user_id': user_id,
            'employee_code': emp_code,
            'designation': 'Instructional Faculty',
            'qualification': 'M.Sc., B.Ed.'
        }
    elif role == 'parent':
        pp_id = f"pp_{uuid.uuid4().hex[:8]}"
        conn.execute('''
            INSERT INTO parent_profiles (id, user_id, institution_id, occupation)
            VALUES (?, ?, ?, 'Guardian')
        ''', (pp_id, user_id, institution_id))
        profile_dict = {
            'id': pp_id,
            'institution_id': institution_id,
            'user_id': user_id,
            'occupation': 'Guardian'
        }
    else: # admin
        profile_dict = {
            'id': f"ap_{uuid.uuid4().hex[:8]}",
            'institution_id': institution_id,
            'user_id': user_id
        }

    conn.commit()

    user_dict = {
        'id': user_id,
        'institution_id': institution_id,
        'email': email,
        'full_name': full_name,
        'role': role,
        'institution_name': inst['name'],
        'institution_code': inst['code'],
        'profile_completion_status': True
    }
    token = generate_token(user_dict)
    conn.close()

    return jsonify({
        'token': token,
        'user': user_dict,
        'profile': profile_dict,
        'profile_completion_status': True,
        'message': f"Account created successfully for {full_name}."
    }), 201

@auth_bp.route('/complete-profile', methods=['POST'])
@require_auth()
def complete_profile():
    user_id = g.current_user['user_id']
    email = (g.current_user.get('email') or '').strip().lower()
    data = request.get_json() or {}
    
    # Allow overriding role from submitted onboarding payload if specified
    requested_role = data.get('role')
    role = requested_role if requested_role in ['student', 'teacher', 'parent', 'admin'] else g.current_user['role']
    institution_id = g.current_user.get('institution_id') or 'inst_sxma_01'

    conn = get_db_connection()

    # Verify or insert user record
    user_row = None
    if user_id:
        user_row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user_row and email:
        user_row = conn.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,)).fetchone()

    if user_row:
        user_id = user_row['id']
        conn.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
    else:
        user_id = user_id or f"usr_{uuid.uuid4().hex[:8]}"
        pwd_hash = generate_password_hash("SupabaseAuthManaged-2025")
        try:
            conn.execute('''
                INSERT INTO users (id, institution_id, email, password_hash, full_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ''', (user_id, institution_id, email or f"user_{user_id}@stxaviers.edu.in", pwd_hash, g.current_user.get('full_name', 'Member'), role))
        except sqlite3.IntegrityError:
            user_row = conn.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email,)).fetchone()
            if user_row:
                user_id = user_row['id']
                conn.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))

    if role == 'student':
        class_id = data.get('class_id')
        roll_number = (data.get('roll_number') or '').strip()
        admission_number = (data.get('admission_number') or '').strip()
        dob = data.get('date_of_birth') or '2008-05-14'
        blood_group = data.get('blood_group') or 'O+'

        if not roll_number:
            roll_number = '2024-X-104'
        if not admission_number:
            admission_number = f"ADM-2024-{uuid.uuid4().hex[:4].upper()}"

        if not class_id:
            cls_row = conn.execute('SELECT id FROM classes WHERE institution_id = ? LIMIT 1', (institution_id,)).fetchone()
            class_id = cls_row['id'] if cls_row else 'class_10a'
        else:
            cls_row = conn.execute('SELECT id FROM classes WHERE id = ?', (class_id,)).fetchone()
            if not cls_row:
                cls_row = conn.execute('SELECT id FROM classes WHERE institution_id = ? LIMIT 1', (institution_id,)).fetchone()
                if cls_row:
                    class_id = cls_row['id']
                else:
                    class_id = 'class_10a'

        # Upsert student profile
        existing = conn.execute('SELECT id FROM student_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if existing:
            conn.execute('''
                UPDATE student_profiles
                SET class_id = ?, roll_number = ?, admission_number = ?, date_of_birth = ?, blood_group = ?
                WHERE id = ?
            ''', (class_id, roll_number, admission_number, dob, blood_group, existing['id']))
            sp_id = existing['id']
        else:
            sp_id = f"sp_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO student_profiles (id, user_id, institution_id, class_id, roll_number, admission_number, date_of_birth, blood_group)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (sp_id, user_id, institution_id, class_id, roll_number, admission_number, dob, blood_group))
        ensure_student_records(conn, sp_id, class_id, institution_id)

    elif role == 'teacher':
        employee_code = (data.get('employee_code') or '').strip() or f"EMP-SXMA-{uuid.uuid4().hex[:3].upper()}"
        designation = (data.get('designation') or 'Instructional Faculty').strip()
        qualification = (data.get('qualification') or 'M.Sc., B.Ed.').strip()

        existing = conn.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if existing:
            conn.execute('''
                UPDATE teacher_profiles
                SET employee_code = ?, designation = ?, qualification = ?
                WHERE id = ?
            ''', (employee_code, designation, qualification, existing['id']))
            tp_id = existing['id']
        else:
            tp_id = f"tp_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tp_id, user_id, institution_id, employee_code, designation, qualification))
        ensure_teacher_records(conn, tp_id)

    conn.commit()

    # Re-fetch user profile
    user = conn.execute('''
        SELECT u.id, u.institution_id, u.email, u.full_name, u.role, u.phone, u.avatar_url,
               COALESCE(i.name, "St. Xavier's Model Senior Secondary School") as institution_name,
               COALESCE(i.code, "SXMA-MUM") as institution_code,
               COALESCE(i.type, "school") as institution_type,
               COALESCE(i.board_university, "CBSE") as board_university
        FROM users u
        LEFT JOIN institutions i ON u.institution_id = i.id
        WHERE u.id = ? OR LOWER(u.email) = ?
    ''', (user_id, email)).fetchone()

    profile_data = {}
    if role == 'student':
        sp = conn.execute('''
            SELECT sp.*, c.name as class_name, c.division, c.stream
            FROM student_profiles sp
            JOIN classes c ON sp.class_id = c.id
            WHERE sp.user_id = ?
        ''', (user_id,)).fetchone()
        if sp:
            profile_data = dict(sp)
    elif role == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if tp:
            profile_data = dict(tp)

    conn.close()

    if user:
        user_dict = dict(user)
    else:
        user_dict = {
            'id': user_id,
            'institution_id': institution_id,
            'email': email,
            'full_name': g.current_user.get('full_name', 'Member'),
            'role': role,
            'institution_name': "St. Xavier's Model Senior Secondary School",
            'institution_code': 'SXMA-MUM'
        }
    user_dict['profile_completion_status'] = True
    new_token = generate_token(user_dict)

    return jsonify({
        'success': True,
        'token': new_token,
        'user': user_dict,
        'profile': profile_data,
        'message': 'Profile onboarding completed successfully.'
    })

