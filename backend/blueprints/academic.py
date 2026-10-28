from flask import Blueprint, request, jsonify, g
from blueprints.auth import require_auth
from database import get_db_connection
import uuid

academic_bp = Blueprint('academic', __name__, url_prefix='/api/academic')

@academic_bp.route('/classes', methods=['GET'])
@require_auth()
def list_classes():
    institution_id = g.current_user['institution_id']
    conn = get_db_connection()
    classes = conn.execute('''
        SELECT c.*, ay.name as academic_year_name, count(sp.id) as student_count
        FROM classes c
        JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN student_profiles sp ON c.id = sp.class_id
        WHERE c.institution_id = ?
        GROUP BY c.id
        ORDER BY c.name, c.division
    ''', (institution_id,)).fetchall()
    conn.close()
    return jsonify({'classes': [dict(c) for c in classes]})

@academic_bp.route('/subjects', methods=['GET'])
@require_auth()
def list_subjects():
    institution_id = g.current_user['institution_id']
    class_id = request.args.get('class_id')
    conn = get_db_connection()
    if class_id:
        subjects = conn.execute('''
            SELECT s.*, c.name as class_name, c.division
            FROM subjects s
            JOIN classes c ON s.class_id = c.id
            WHERE s.institution_id = ? AND s.class_id = ?
            ORDER BY s.name ASC
        ''', (institution_id, class_id)).fetchall()
    else:
        subjects = conn.execute('''
            SELECT s.*, c.name as class_name, c.division
            FROM subjects s
            JOIN classes c ON s.class_id = c.id
            WHERE s.institution_id = ?
            ORDER BY c.name, s.name ASC
        ''', (institution_id,)).fetchall()
    conn.close()
    return jsonify({'subjects': [dict(s) for s in subjects]})

@academic_bp.route('/assessments', methods=['GET'])
@require_auth()
def list_assessments():
    institution_id = g.current_user['institution_id']
    class_id = request.args.get('class_id')
    subject_id = request.args.get('subject_id')
    conn = get_db_connection()

    query = '''
        SELECT a.*, s.name as subject_name, s.code as subject_code, c.name as class_name, c.division
        FROM assessments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN classes c ON a.class_id = c.id
        WHERE a.institution_id = ?
    '''
    params = [institution_id]
    if class_id:
        query += ' AND a.class_id = ?'
        params.append(class_id)
    if subject_id:
        query += ' AND a.subject_id = ?'
        params.append(subject_id)
    query += ' ORDER BY a.date_conducted DESC'

    assessments = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({'assessments': [dict(a) for a in assessments]})

@academic_bp.route('/class-records/<class_id>', methods=['GET'])
@require_auth(allowed_roles=['teacher', 'admin'])
def get_class_records(class_id):
    subject_id = request.args.get('subject_id')
    assessment_id = request.args.get('assessment_id')
    conn = get_db_connection()

    students = conn.execute('''
        SELECT sp.id, sp.roll_number, sp.admission_number, u.full_name, u.email
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.class_id = ?
        ORDER BY sp.roll_number ASC
    ''', (class_id,)).fetchall()

    student_list = []
    for s in students:
        s_data = dict(s)
        # Fetch marks if assessment_id is specified
        if assessment_id:
            mr = conn.execute('''
                SELECT marks_obtained, status, remarks, updated_at
                FROM marks_records
                WHERE assessment_id = ? AND student_id = ?
            ''', (assessment_id, s['id'])).fetchone()
            s_data['mark_record'] = dict(mr) if mr else {'marks_obtained': None, 'status': 'NOT_SUBMITTED', 'remarks': ''}
        student_list.append(s_data)

    conn.close()
    return jsonify({'students': student_list})

@academic_bp.route('/marks/save', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def save_marks():
    data = request.get_json() or {}
    assessment_id = data.get('assessment_id')
    student_marks = data.get('records', []) # list of { student_id, marks_obtained, status, remarks }

    if not assessment_id or not student_marks:
        return jsonify({'error': 'assessment_id and records are required.'}), 400

    conn = get_db_connection()
    updated_count = 0

    for item in student_marks:
        sid = item.get('student_id')
        marks = item.get('marks_obtained')
        # Crucial requirement: Never silently convert missing/null to 0!
        status = item.get('status', 'PRESENT' if marks is not None else 'NOT_SUBMITTED')
        remarks = item.get('remarks', '')

        # Upsert
        existing = conn.execute('SELECT id FROM marks_records WHERE assessment_id = ? AND student_id = ?', (assessment_id, sid)).fetchone()
        if existing:
            conn.execute('''
                UPDATE marks_records
                SET marks_obtained = ?, status = ?, remarks = ?, recorded_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (marks, status, remarks, g.current_user['full_name'], existing['id']))
        else:
            rec_id = f"mr_{uuid.uuid4().hex[:8]}"
            conn.execute('''
                INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (rec_id, assessment_id, sid, marks, status, remarks, g.current_user['full_name']))
        updated_count += 1

    # Audit log
    conn.execute('''
        INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'UPDATE_MARKS', 'assessment', ?, ?)
    ''', (
        f"al_{uuid.uuid4().hex[:8]}",
        g.current_user['institution_id'],
        g.current_user['user_id'],
        assessment_id,
        f"Recorded/updated marks for {updated_count} students"
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f"Successfully saved records for {updated_count} students.",
        'updated_count': updated_count
    })

@academic_bp.route('/attendance', methods=['GET'])
@require_auth(allowed_roles=['teacher', 'admin'])
def get_attendance_records():
    class_id = request.args.get('class_id')
    date_str = request.args.get('date')

    if not class_id or not date_str:
        return jsonify({'error': 'class_id and date parameters are required.'}), 400

    conn = get_db_connection()
    students = conn.execute('''
        SELECT sp.id, sp.roll_number, sp.admission_number, u.full_name, u.email
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.class_id = ?
        ORDER BY sp.roll_number ASC
    ''', (class_id,)).fetchall()

    records_list = []
    for s in students:
        rec = conn.execute('''
            SELECT status, remarks
            FROM attendance_records
            WHERE student_id = ? AND date = ?
        ''', (s['id'], date_str)).fetchone()

        records_list.append({
            'student_id': s['id'],
            'roll_number': s['roll_number'],
            'admission_number': s['admission_number'],
            'full_name': s['full_name'],
            'status': rec['status'] if rec else 'PRESENT',
            'is_recorded': bool(rec),
            'remarks': rec['remarks'] if (rec and rec['remarks']) else ''
        })

    conn.close()
    return jsonify({
        'class_id': class_id,
        'date': date_str,
        'records': records_list
    })

@academic_bp.route('/attendance/save', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def save_attendance_records():
    data = request.get_json() or {}
    class_id = data.get('class_id')
    date_str = data.get('date')
    records = data.get('records', [])

    if not class_id or not date_str or not records:
        return jsonify({'error': 'class_id, date, and records are required.'}), 400

    conn = get_db_connection()
    updated_count = 0

    valid_statuses = {'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'}

    try:
        for item in records:
            sid = item.get('student_id')
            status = item.get('status', 'PRESENT').upper()
            if status not in valid_statuses:
                status = 'PRESENT'
            remarks = item.get('remarks', '')

            existing = conn.execute('SELECT id FROM attendance_records WHERE student_id = ? AND date = ?', (sid, date_str)).fetchone()
            if existing:
                conn.execute('''
                    UPDATE attendance_records
                    SET status = ?, remarks = ?, class_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (status, remarks, class_id, existing['id']))
            else:
                rec_id = f"att_{uuid.uuid4().hex[:8]}"
                conn.execute('''
                    INSERT INTO attendance_records (id, student_id, class_id, date, status, remarks, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ''', (rec_id, sid, class_id, date_str, status, remarks))
            updated_count += 1

        # Audit log
        conn.execute('''
            INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, 'RECORD_ATTENDANCE', 'class', ?, ?)
        ''', (
            f"al_{uuid.uuid4().hex[:8]}",
            g.current_user['institution_id'],
            g.current_user['user_id'],
            class_id,
            f"Recorded daily attendance for {updated_count} students on {date_str}"
        ))

        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f"Failed to save attendance: {str(e)}"}), 500
    finally:
        conn.close()

    return jsonify({
        'success': True,
        'message': f"Attendance successfully saved for {updated_count} students on {date_str}.",
        'updated_count': updated_count
    })

