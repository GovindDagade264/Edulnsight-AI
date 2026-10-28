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
                return jsonify({'error': 'Invalid authentication token.'}), 401

            if allowed_roles and payload.get('role') not in allowed_roles:
                return jsonify({'error': 'Access denied: insufficient permissions for this operation.'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

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
            profile_data = dict(sp)
    elif user['role'] == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if tp:
            profile_data = dict(tp)
    elif user['role'] == 'parent':
        pp = conn.execute('SELECT * FROM parent_profiles WHERE user_id = ?', (user['id'],)).fetchone()
        if pp:
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
    conn.commit()

    user_dict = {
        'id': user_id,
        'institution_id': institution_id,
        'email': email,
        'full_name': full_name,
        'role': role,
        'institution_name': inst['name'],
        'institution_code': inst['code'],
        'profile_completion_status': False
    }
    token = generate_token(user_dict)
    conn.close()

    return jsonify({
        'token': token,
        'user': user_dict,
        'profile': None,
        'profile_completion_status': False,
        'message': f"Account created successfully for {full_name}."
    }), 201

@auth_bp.route('/complete-profile', methods=['POST'])
@require_auth()
def complete_profile():
    user_id = g.current_user['user_id']
    role = g.current_user['role']
    institution_id = g.current_user['institution_id']
    data = request.get_json() or {}

    conn = get_db_connection()

    if role == 'student':
        class_id = data.get('class_id')
        roll_number = data.get('roll_number', '').strip()
        admission_number = data.get('admission_number', '').strip()
        dob = data.get('date_of_birth')
        blood_group = data.get('blood_group', 'O+')

        if not class_id or not roll_number or not admission_number:
            conn.close()
            return jsonify({'error': 'Class, Roll Number, and Admission Number are required for student onboarding.'}), 400

        # Verify class exists
        cls_row = conn.execute('SELECT id FROM classes WHERE id = ?', (class_id,)).fetchone()
        if not cls_row:
            cls_row = conn.execute('SELECT id FROM classes WHERE institution_id = ? LIMIT 1', (institution_id,)).fetchone()
            if cls_row:
                class_id = cls_row['id']
            else:
                conn.close()
                return jsonify({'error': 'No academic class found for this institution.'}), 400

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

    elif role == 'teacher':
        employee_code = data.get('employee_code', '').strip()
        designation = data.get('designation', 'PGT Faculty').strip()
        qualification = data.get('qualification', 'M.Sc., B.Ed.').strip()

        if not employee_code:
            conn.close()
            return jsonify({'error': 'Employee Code is required for teacher onboarding.'}), 400

        existing = conn.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if existing:
            conn.execute('''
                UPDATE teacher_profiles
                SET employee_code = ?, designation = ?, qualification = ?
                WHERE id = ?
            ''', (employee_code, designation, qualification, existing['id']))
        else:
            tp_id = f"tp_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO teacher_profiles (id, user_id, institution_id, employee_code, designation, qualification)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tp_id, user_id, institution_id, employee_code, designation, qualification))

    conn.commit()

    # Re-fetch user profile
    user = conn.execute('''
        SELECT u.id, u.institution_id, u.email, u.full_name, u.role, u.phone, u.avatar_url,
               i.name as institution_name, i.code as institution_code, i.type as institution_type, i.board_university
        FROM users u
        JOIN institutions i ON u.institution_id = i.id
        WHERE u.id = ?
    ''', (user_id,)).fetchone()

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

    user_dict = dict(user)
    user_dict['profile_completion_status'] = True

    return jsonify({
        'success': True,
        'user': user_dict,
        'profile': profile_data,
        'message': 'Profile onboarding completed successfully.'
    })

