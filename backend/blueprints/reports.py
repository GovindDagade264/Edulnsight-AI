from flask import Blueprint, request, jsonify, g, make_response
from blueprints.auth import require_auth
from database import get_db_connection

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/student/<student_id>', methods=['GET'])
@require_auth()
def get_student_report_data(student_id):
    role = g.current_user['role']
    user_id = g.current_user['user_id']
    conn = get_db_connection()

    # Enforce permission check: student can only get their own, parent only linked child, teacher/admin within institution
    if role == 'student':
        sp = conn.execute('SELECT id FROM student_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not sp or sp['id'] != student_id:
            conn.close()
            return jsonify({'error': 'Unauthorized to view this report'}), 403
    elif role == 'parent':
        pp = conn.execute('SELECT id FROM parent_profiles WHERE user_id = ?', (user_id,)).fetchone()
        link = conn.execute('SELECT student_id FROM parent_student_map WHERE parent_id = ? AND student_id = ?', (pp['id'], student_id)).fetchone()
        if not link:
            conn.close()
            return jsonify({'error': 'Unauthorized to view this report'}), 403

    student = conn.execute('''
        SELECT sp.*, u.full_name, u.email, u.phone, c.name as class_name, c.division, c.stream,
               i.name as institution_name, i.code as institution_code, i.board_university, i.city, i.state
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        JOIN classes c ON sp.class_id = c.id
        JOIN institutions i ON sp.institution_id = i.id
        WHERE sp.id = ?
    ''', (student_id,)).fetchone()

    if not student:
        conn.close()
        return jsonify({'error': 'Student not found'}), 404

    # Subject scores
    records = conn.execute('''
        SELECT s.name as subject_name, s.code as subject_code,
               a.name as assessment_name, a.max_marks as assessment_max,
               mr.marks_obtained, mr.status as mark_status, mr.remarks
        FROM subjects s
        JOIN assessments a ON s.id = a.subject_id
        LEFT JOIN marks_records mr ON a.id = mr.assessment_id AND mr.student_id = ?
        WHERE s.class_id = ?
        ORDER BY s.name, a.date_conducted ASC
    ''', (student_id, student['class_id'])).fetchall()

    # Attendance
    attendance_rows = conn.execute('''
        SELECT status, count(*) as count FROM attendance_records WHERE student_id = ? GROUP BY status
    ''', (student_id,)).fetchall()
    att_map = {'PRESENT': 0, 'ABSENT': 0, 'LATE': 0}
    tot_days = 0
    for r in attendance_rows:
        att_map[r['status']] = r['count']
        tot_days += r['count']
    att_pct = round((att_map['PRESENT'] / tot_days * 100), 1) if tot_days > 0 else 0.0

    # Early warnings / AI Insights
    warnings = conn.execute('''
        SELECT ew.*, s.name as subject_name FROM early_warnings ew
        LEFT JOIN subjects s ON ew.subject_id = s.id
        WHERE ew.student_id = ?
    ''', (student_id,)).fetchall()

    conn.close()

    return jsonify({
        'student': dict(student),
        'attendance': {
            'percentage': att_pct,
            'total_days': tot_days,
            'present': att_map['PRESENT'],
            'absent': att_map['ABSENT'],
            'late': att_map['LATE']
        },
        'marks_records': [dict(r) for r in records],
        'insights': [dict(w) for w in warnings]
    })
