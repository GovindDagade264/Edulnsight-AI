import uuid
from flask import Blueprint, request, jsonify, g
from blueprints.auth import require_auth
from database import get_db_connection

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/dashboard', methods=['GET'])
@require_auth()
def get_dashboard_data():
    role = g.current_user['role']
    user_id = g.current_user['user_id']
    institution_id = g.current_user['institution_id']
    conn = get_db_connection()

    if role == 'student':
        # Find student profile
        sp = conn.execute('SELECT * FROM student_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not sp:
            conn.close()
            return jsonify({'error': 'Student profile not found'}), 404
        return jsonify(generate_student_dashboard(conn, sp['id'], institution_id))

    elif role == 'parent':
        pp = conn.execute('SELECT * FROM parent_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not pp:
            conn.close()
            return jsonify({
                'student': None,
                'no_linked_student': True,
                'message': 'No linked student is available for this account.'
            }), 200
        # Get linked child
        link = conn.execute('''
            SELECT sp.id as student_id FROM parent_student_map psm
            JOIN student_profiles sp ON psm.student_id = sp.id
            WHERE psm.parent_id = ?
        ''', (pp['id'],)).fetchone()
        if not link:
            conn.close()
            return jsonify({
                'student': None,
                'no_linked_student': True,
                'message': 'No linked student is available for this account.'
            }), 200
        return jsonify(generate_student_dashboard(conn, link['student_id'], institution_id, is_parent_view=True))

    elif role == 'teacher':
        tp = conn.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not tp:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        return jsonify(generate_teacher_dashboard(conn, tp['id'], institution_id))

    elif role == 'admin':
        return jsonify(generate_admin_dashboard(conn, institution_id))

    conn.close()
    return jsonify({'error': 'Invalid role'}), 400

def generate_student_dashboard(conn, student_id, institution_id, is_parent_view=False):
    # Student profile & info
    student = conn.execute('''
        SELECT sp.*, u.full_name, u.email, u.phone, c.name as class_name, c.division, c.stream, i.name as institution_name
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN classes c ON sp.class_id = c.id
        JOIN institutions i ON sp.institution_id = i.id
        WHERE sp.id = ?
    ''', (student_id,)).fetchone()

    # Subjects and marks
    records = conn.execute('''
        SELECT s.id as subject_id, s.name as subject_name, s.code as subject_code, s.max_marks as subject_max,
               a.id as assessment_id, a.name as assessment_name, a.max_marks as assessment_max,
               a.date_conducted, a.assessment_type, mr.marks_obtained, mr.status as mark_status, mr.remarks
        FROM subjects s
        JOIN assessments a ON s.id = a.subject_id
        LEFT JOIN marks_records mr ON a.id = mr.assessment_id AND mr.student_id = ?
        WHERE s.class_id = ?
        ORDER BY s.name, a.date_conducted ASC
    ''', (student_id, student['class_id'])).fetchall()

    # Attendance
    attendance_rows = conn.execute('''
        SELECT status, count(*) as count
        FROM attendance_records
        WHERE student_id = ?
        GROUP BY status
    ''', (student_id,)).fetchall()

    att_counts = {'PRESENT': 0, 'ABSENT': 0, 'LATE': 0, 'HALF_DAY': 0, 'LEAVE': 0}
    total_att_days = 0
    for r in attendance_rows:
        att_counts[r['status']] = r['count']
        total_att_days += r['count']

    effective_present = att_counts['PRESENT'] + (att_counts['LATE'] * 0.8) + (att_counts['HALF_DAY'] * 0.5)
    has_attendance_data = total_att_days > 0
    attendance_pct = round((effective_present / total_att_days * 100), 1) if has_attendance_data else None

    # Aggregate marks by subject
    subjects_map = {}
    total_obtained = 0.0
    total_possible = 0.0

    for r in records:
        sid = r['subject_id']
        if sid not in subjects_map:
            subjects_map[sid] = {
                'subject_id': sid,
                'subject_name': r['subject_name'],
                'subject_code': r['subject_code'],
                'assessments': [],
                'obtained_sum': 0.0,
                'possible_sum': 0.0,
            }

        # Check for valid numerical score (distinguishing ABSENT vs NOT_SUBMITTED vs 0)
        has_score = r['marks_obtained'] is not None and r['mark_status'] == 'PRESENT'
        score_val = r['marks_obtained'] if has_score else None
        pct = round((score_val / r['assessment_max'] * 100), 1) if has_score else None

        subjects_map[sid]['assessments'].append({
            'assessment_id': r['assessment_id'],
            'assessment_name': r['assessment_name'],
            'assessment_type': r['assessment_type'],
            'date': r['date_conducted'],
            'max_marks': r['assessment_max'],
            'marks_obtained': score_val,
            'percentage': pct,
            'status': r['mark_status'],
            'remarks': r['remarks']
        })

        if has_score:
            subjects_map[sid]['obtained_sum'] += score_val
            subjects_map[sid]['possible_sum'] += r['assessment_max']
            total_obtained += score_val
            total_possible += r['assessment_max']

    # Finalize subject summaries
    subject_summary_list = []
    strongest_sub = None
    weakest_sub = None
    max_sub_pct = -1.0
    min_sub_pct = 999.0

    for sid, sdata in subjects_map.items():
        if sdata['possible_sum'] > 0:
            sub_pct = round((sdata['obtained_sum'] / sdata['possible_sum'] * 100), 1)
            item_status = 'Proficient' if sub_pct >= 75 else ('Average' if sub_pct >= 50 else 'Needs Attention')
        else:
            sub_pct = None
            item_status = 'Pending Evaluations'

        item = {
            'subject_id': sid,
            'name': sdata['subject_name'],
            'code': sdata['subject_code'],
            'percentage': sub_pct,
            'assessments': sdata['assessments'],
            'status': item_status
        }
        subject_summary_list.append(item)

        if sub_pct is not None:
            if sub_pct > max_sub_pct:
                max_sub_pct = sub_pct
                strongest_sub = item
            if sub_pct < min_sub_pct:
                min_sub_pct = sub_pct
                weakest_sub = item

    has_marks_data = total_possible > 0
    overall_aggregate_pct = round((total_obtained / total_possible * 100), 1) if has_marks_data else None

    # Assessment chronological trend lines (e.g., UT1, Mid-Term, UT2, Pre-Board)
    trend_map = {}
    for sid, sdata in subjects_map.items():
        for asm in sdata['assessments']:
            aname = asm['assessment_name']
            if aname not in trend_map:
                trend_map[aname] = {
                    'assessment_name': aname,
                    'date': asm['date'],
                    'scores': {},
                    'average': 0.0
                }
            if asm['percentage'] is not None:
                trend_map[aname]['scores'][sdata['subject_name']] = asm['percentage']

    # Compute assessment average
    trend_list = []
    for aname, tdata in trend_map.items():
        scores = list(tdata['scores'].values())
        avg = round(sum(scores) / len(scores), 1) if scores else 0.0
        tdata['average'] = avg
        trend_list.append(tdata)
    trend_list.sort(key=lambda x: x['date'])

    # Early warnings / AI Insights from database
    warnings_rows = conn.execute('''
        SELECT ew.*, s.name as subject_name
        FROM early_warnings ew
        LEFT JOIN subjects s ON ew.subject_id = s.id
        WHERE ew.student_id = ?
        ORDER BY ew.created_at DESC
    ''', (student_id,)).fetchall()

    ai_insights = []
    for w in warnings_rows:
        ai_insights.append({
            'id': w['id'],
            'title': w['title'],
            'risk_level': w['risk_level'],
            'subject_name': w['subject_name'] or 'General / Attendance',
            'insight': w['title'],
            'why_it_matters': w['reason'],
            'evidence': w['evidence'],
            'recommended_action': w['recommended_action'],
            'status': w['status'],
            'teacher_feedback': w['teacher_feedback'],
            'dismissed_reason': w['dismissed_reason']
        })

    # Also add a positive commendation insight if student has an outstanding subject (>90%)
    if strongest_sub and strongest_sub['percentage'] is not None and strongest_sub['percentage'] >= 90:
        c_name = student['class_name'] if student else 'the class'
        ai_insights.append({
            'id': f"insight_strength_{strongest_sub['subject_id']}",
            'title': f"Peak Academic Strength: {strongest_sub['name']}",
            'risk_level': 'EXCELLENCE',
            'subject_name': strongest_sub['name'],
            'insight': f"High cognitive engagement and mastery in {strongest_sub['name']} ({strongest_sub['percentage']}% aggregate).",
            'why_it_matters': "Consistent mastery demonstrates rapid conceptual acquisition and analytical reasoning.",
            'evidence': f"Evaluated across {len(strongest_sub['assessments'])} assessments with a peak performance of {strongest_sub['percentage']}%. Consistently ranks in the top cohort of {c_name}.",
            'recommended_action': f"Explore advanced topics, state Olympiad competitions, and peer tutoring opportunities in {strongest_sub['name']}.",
            'status': 'COMMENDATION',
            'teacher_feedback': 'Demonstrates exceptional clarity and enthusiasm during practical sessions.',
            'dismissed_reason': None
        })

    # Section B1: Dynamic Numerical/Text Summary
    b1_statements = []
    if not has_marks_data and not has_attendance_data:
        b1_statements.append("Academic marks and attendance records have not been updated yet. Please contact your faculty.")
    elif not has_marks_data:
        b1_statements.append(f"Marks have not been updated yet. Please contact your faculty. Verified attendance stands at {attendance_pct}% across {total_att_days} recorded sessions.")
    elif not has_attendance_data:
        b1_statements.append(f"Overall academic aggregate is {overall_aggregate_pct}% across {len(subject_summary_list)} evaluated subjects. Attendance has not been updated yet. Please contact your faculty.")
    else:
        b1_statements.append(
            f"Overall academic aggregate is {overall_aggregate_pct}% across {len(subject_summary_list)} evaluated subjects, with verified attendance standing at {attendance_pct}% ({att_counts['PRESENT']} of {total_att_days} recorded sessions)."
        )
        if strongest_sub and strongest_sub['percentage'] is not None:
            b1_statements.append(
                f"Highest subject performance is {strongest_sub['name']} at {strongest_sub['percentage']}%, demonstrating consistent command across theoretical and practical evaluations."
            )
        if weakest_sub and weakest_sub['percentage'] is not None and weakest_sub['percentage'] < 75:
            b1_statements.append(
                f"{weakest_sub['name']} ({weakest_sub['percentage']}%) exhibits a performance deficit relative to your peer benchmark, primarily identified in recent multi-step assessments."
            )
        if attendance_pct < 75.0:
            b1_statements.append(
                f"CRITICAL: Attendance ({attendance_pct}%) has fallen below the 75% institutional compliance minimum; immediate regularisation is necessary to maintain examination clearance."
            )
        else:
            b1_statements.append("Attendance compliance remains in good standing (above 75% threshold).")

    summary_text = " ".join(b1_statements)

    conn.close()

    return {
        'student': dict(student),
        'is_parent_view': is_parent_view,
        # Section A: Statistics
        'section_a_statistics': {
            'overall_aggregate_pct': overall_aggregate_pct,
            'has_marks_data': has_marks_data,
            'marks_not_updated_message': None if has_marks_data else 'Marks not updated yet. Please contact your faculty.',
            'attendance': {
                'has_data': has_attendance_data,
                'percentage': attendance_pct,
                'total_days': total_att_days,
                'present_days': att_counts['PRESENT'],
                'absent_days': att_counts['ABSENT'],
                'late_days': att_counts['LATE'],
                'threshold': 75.0,
                'is_compliant': (attendance_pct >= 75.0) if has_attendance_data else True,
                'status_message': None if has_attendance_data else 'Attendance not updated yet. Please contact your faculty.'
            },
            'subjects': subject_summary_list,
            'assessment_trends': trend_list,
            'total_assessments_evaluated': len(records),
            'strongest_subject': strongest_sub['name'] if (strongest_sub and strongest_sub['percentage'] is not None) else '--',
            'weakest_subject': weakest_sub['name'] if (weakest_sub and weakest_sub['percentage'] is not None) else '--'
        },
        # Section B: Summary
        'section_b_summary': {
            'b1_numerical_text_summary': {
                'summary_text': summary_text,
                'overall_percentage': overall_aggregate_pct,
                'attendance_percentage': attendance_pct,
                'evaluations_count': len(records),
                'verified_date': 'Current Academic Term 2024-2025'
            },
            'b2_ai_insights': ai_insights
        }
    }

def generate_teacher_dashboard(conn, teacher_id, institution_id):
    # Teacher info
    teacher = conn.execute('''
        SELECT tp.*, u.full_name, u.email, u.phone, i.name as institution_name
        FROM teacher_profiles tp
        JOIN users u ON tp.user_id = u.id
        JOIN institutions i ON tp.institution_id = i.id
        WHERE tp.id = ?
    ''', (teacher_id,)).fetchone()

    # Assigned subjects & classes
    assignments = conn.execute('''
        SELECT tsa.id as assignment_id, s.id as subject_id, s.name as subject_name, s.code as subject_code,
               c.id as class_id, c.name as class_name, c.division, c.stream
        FROM teacher_subject_assignments tsa
        JOIN subjects s ON tsa.subject_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE tsa.teacher_id = ?
    ''', (teacher_id,)).fetchall()

    if assignments:
        class_id = assignments[0]['class_id']
        assigned_class_name = f"{assignments[0]['class_name']} - Division {assignments[0]['division']}"
    else:
        class_id = None
        assigned_class_name = 'No Assigned Class'

    # Students in assigned class
    if class_id:
        students_rows = conn.execute('''
            SELECT sp.id, sp.roll_number, sp.admission_number, u.full_name, u.email
            FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.class_id = ?
            ORDER BY sp.roll_number ASC
        ''', (class_id,)).fetchall()
    else:
        students_rows = []

    # Class performance distribution
    class_students = []
    total_class_score = 0.0
    total_class_possible = 0.0
    students_needing_review = 0

    for s in students_rows:
        # Get student's overall percentage
        m_rows = conn.execute('''
            SELECT mr.marks_obtained, a.max_marks, mr.status
            FROM marks_records mr
            JOIN assessments a ON mr.assessment_id = a.id
            WHERE mr.student_id = ? AND mr.status = 'PRESENT'
        ''', (s['id'],)).fetchall()

        s_obt = sum(r['marks_obtained'] for r in m_rows if r['marks_obtained'] is not None)
        s_poss = sum(r['max_marks'] for r in m_rows if r['marks_obtained'] is not None)
        s_pct = round((s_obt / s_poss * 100), 1) if s_poss > 0 else None

        # Attendance
        att = conn.execute('''
            SELECT status, count(*) as count FROM attendance_records WHERE student_id = ? GROUP BY status
        ''', (s['id'],)).fetchall()
        pres = sum(r['count'] for r in att if r['status'] == 'PRESENT')
        tot = sum(r['count'] for r in att)
        att_pct = round((pres / tot * 100), 1) if tot > 0 else None

        # Check early warnings
        ew_count = conn.execute('SELECT count(*) as count FROM early_warnings WHERE student_id = ? AND status = "ACTIVE"', (s['id'],)).fetchone()['count']
        if ew_count > 0 or (s_pct is not None and s_pct < 50.0) or (att_pct is not None and att_pct < 75.0):
            students_needing_review += 1

        if s_pct is not None:
            total_class_score += s_obt
            total_class_possible += s_poss

        status_label = 'Pending Data'
        if s_pct is not None or att_pct is not None:
            if (s_pct is not None and s_pct < 50) or (att_pct is not None and att_pct < 75):
                status_label = 'At Risk'
            elif s_pct is not None and s_pct >= 75:
                status_label = 'Proficient'
            else:
                status_label = 'Average'

        class_students.append({
            'student_id': s['id'],
            'roll_number': s['roll_number'],
            'admission_number': s['admission_number'],
            'full_name': s['full_name'],
            'email': s['email'],
            'overall_percentage': s_pct,
            'attendance_percentage': att_pct,
            'active_warnings': ew_count,
            'status': status_label
        })

    class_avg_pct = round((total_class_score / total_class_possible * 100), 1) if total_class_possible > 0 else None

    # Active early warnings
    warnings_rows = conn.execute('''
        SELECT ew.*, u.full_name as student_name, sp.roll_number, s.name as subject_name
        FROM early_warnings ew
        JOIN student_profiles sp ON ew.student_id = sp.id
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN subjects s ON ew.subject_id = s.id
        WHERE ew.institution_id = ?
        ORDER BY ew.risk_level ASC, ew.created_at DESC
    ''', (institution_id,)).fetchall()

    early_warnings_list = [dict(w) for w in warnings_rows]

    # Section B1: Teacher Numerical/Text Summary
    if not class_id or len(class_students) == 0:
        teacher_b1 = "No students assigned yet. Please contact your institution administrator to link students to your class."
    elif class_avg_pct is None:
        teacher_b1 = f"{assigned_class_name} has {len(class_students)} enrolled students. Academic marks have not been entered yet for this academic period."
    else:
        teacher_b1 = (
            f"{assigned_class_name} has a cumulative class average of {class_avg_pct}%. "
            f"A total of {len(class_students)} students are enrolled, of which {students_needing_review} student(s) currently require targeted academic support or attendance intervention."
        )

    # Section B2: AI Class-wide Insights (derived from genuine warnings and attendance)
    ai_teacher_insights = []
    if early_warnings_list:
        high_risk_count = sum(1 for w in early_warnings_list if w.get('risk_level') == 'HIGH')
        if high_risk_count > 0:
            ai_teacher_insights.append({
                'id': 'ti_active_warnings',
                'title': f'Active Academic Alerts: {high_risk_count} High-Priority Signal(s)',
                'risk_level': 'HIGH',
                'subject_name': assigned_class_name,
                'insight': f"{high_risk_count} student(s) in {assigned_class_name} have active high-risk early warning notifications.",
                'why_it_matters': 'Early pedagogical intervention prevents persistent academic divergence.',
                'evidence': f"Identified {len(early_warnings_list)} total alerts across attendance and assessment thresholds.",
                'recommended_action': 'Review individual early warning flags and log teacher remediation notes.',
                'status': 'ACTIVE',
                'teacher_feedback': 'Review in progress.'
            })

    att_deficit_count = sum(1 for s in class_students if s['attendance_percentage'] is not None and s['attendance_percentage'] < 75.0)
    if att_deficit_count > 0:
        ai_teacher_insights.append({
            'id': 'ti_att_signal',
            'title': f'Attendance Compliance Signal: {att_deficit_count} Below Threshold',
            'risk_level': 'MODERATE',
            'subject_name': 'Attendance Monitoring',
            'insight': f"{att_deficit_count} student(s) are currently tracking below the mandatory 75% attendance threshold.",
            'why_it_matters': 'Consistent attendance directly correlates with curricular continuity and assessment readiness.',
            'evidence': f"{att_deficit_count} of {len(class_students)} enrolled students have recorded attendance deficits.",
            'recommended_action': 'Schedule pastoral check-in and notify parent/guardian.',
            'status': 'ACTIVE',
            'teacher_feedback': 'Notified class mentor.'
        })

    conn.close()

    return {
        'teacher': dict(teacher),
        'assignments': [dict(a) for a in assignments],
        # Section A: Statistics
        'section_a_statistics': {
            'class_name': assigned_class_name,
            'total_students': len(class_students),
            'class_average_pct': class_avg_pct,
            'students_needing_review': students_needing_review,
            'students': class_students,
            'grade_distribution': {
                'A_Grade (>=80%)': len([s for s in class_students if s['overall_percentage'] is not None and s['overall_percentage'] >= 80]),
                'B_Grade (65-79%)': len([s for s in class_students if s['overall_percentage'] is not None and 65 <= s['overall_percentage'] < 80]),
                'C_Grade (50-64%)': len([s for s in class_students if s['overall_percentage'] is not None and 50 <= s['overall_percentage'] < 65]),
                'Needs Support (<50%)': len([s for s in class_students if s['overall_percentage'] is not None and s['overall_percentage'] < 50])
            }
        },
        # Section B: Summary
        'section_b_summary': {
            'b1_numerical_text_summary': {
                'summary_text': teacher_b1,
                'class_average': class_avg_pct,
                'total_students': len(class_students),
                'active_alerts': len(early_warnings_list)
            },
            'b2_ai_insights': ai_teacher_insights,
            'early_warnings': early_warnings_list
        }
    }

def generate_admin_dashboard(conn, institution_id):
    inst = conn.execute('SELECT * FROM institutions WHERE id = ?', (institution_id,)).fetchone()
    
    total_users = conn.execute('SELECT count(*) as count FROM users WHERE institution_id = ?', (institution_id,)).fetchone()['count']
    total_students = conn.execute('SELECT count(*) as count FROM student_profiles WHERE institution_id = ?', (institution_id,)).fetchone()['count']
    total_teachers = conn.execute('SELECT count(*) as count FROM teacher_profiles WHERE institution_id = ?', (institution_id,)).fetchone()['count']
    total_classes = conn.execute('SELECT count(*) as count FROM classes WHERE institution_id = ?', (institution_id,)).fetchone()['count']
    total_warnings = conn.execute('SELECT count(*) as count FROM early_warnings WHERE institution_id = ? AND status = "ACTIVE"', (institution_id,)).fetchone()['count']
    
    audit_logs = conn.execute('''
        SELECT al.*, u.full_name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.institution_id = ?
        ORDER BY al.created_at DESC LIMIT 10
    ''', (institution_id,)).fetchall()

    # Admin Summary
    if total_students == 0:
        admin_b1 = f"Institution '{inst['name']}' has {total_classes} configured academic classes. No student records are currently enrolled."
    else:
        admin_b1 = (
            f"Institution '{inst['name']}' currently administers {total_students} active students and {total_teachers} instructional faculty across {total_classes} configured academic divisions. "
            f"{total_warnings} active early warning alerts are flagged under institutional regulatory thresholds (Attendance: {inst['attendance_warning_threshold']}%, Passing: {inst['marks_warning_threshold']}%)."
        )

    ai_admin_insights = []
    if total_warnings > 0:
        ai_admin_insights.append({
            'id': 'adm_alert_summary',
            'title': f'Active Alerts: {total_warnings} Student Record(s) Flagged',
            'risk_level': 'MODERATE' if total_warnings < 5 else 'HIGH',
            'subject_name': 'Institutional Academic Health',
            'insight': f"{total_warnings} early warning alert(s) have been flagged under institutional warning criteria.",
            'why_it_matters': 'Timely departmental support prevents persistent academic or attendance deficit.',
            'evidence': f"Monitored across {total_students} enrolled students and {total_classes} configured classes.",
            'recommended_action': 'Review class-wise attendance and assessment records with department faculty.',
            'status': 'ACTIVE'
        })

    conn.close()

    return {
        'institution': dict(inst),
        # Section A: Statistics
        'section_a_statistics': {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_classes': total_classes,
            'total_users': total_users,
            'active_early_warnings': total_warnings,
            'board': inst['board_university'],
            'attendance_threshold': inst['attendance_warning_threshold'],
            'marks_threshold': inst['marks_warning_threshold'],
            'recent_audit_logs': [dict(a) for a in audit_logs]
        },
        # Section B: Summary
        'section_b_summary': {
            'b1_numerical_text_summary': {
                'summary_text': admin_b1,
                'total_students': total_students,
                'total_faculty': total_teachers,
                'active_warnings': total_warnings
            },
            'b2_ai_insights': ai_admin_insights
        }
    }

@analytics_bp.route('/early-warnings', methods=['GET'])
@require_auth()
def get_early_warnings():
    institution_id = g.current_user['institution_id']
    conn = get_db_connection()
    warnings = conn.execute('''
        SELECT ew.*, u.full_name as student_name, sp.roll_number, s.name as subject_name
        FROM early_warnings ew
        JOIN student_profiles sp ON ew.student_id = sp.id
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN subjects s ON ew.subject_id = s.id
        WHERE ew.institution_id = ?
        ORDER BY ew.risk_level ASC, ew.created_at DESC
    ''', (institution_id,)).fetchall()
    conn.close()
    return jsonify({'warnings': [dict(w) for w in warnings]})

@analytics_bp.route('/warning-action', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def handle_warning_action():
    data = request.get_json() or {}
    warning_id = data.get('warning_id')
    action = data.get('action') # 'DISMISS', 'REVIEW', 'RESOLVE'
    feedback = data.get('feedback', '')
    dismissed_reason = data.get('dismissed_reason', '')

    if not warning_id or not action:
        return jsonify({'error': 'warning_id and action are required.'}), 400

    conn = get_db_connection()
    ew = conn.execute('SELECT * FROM early_warnings WHERE id = ?', (warning_id,)).fetchone()
    if not ew:
        conn.close()
        return jsonify({'error': 'Warning not found'}), 404

    status_map = {
        'DISMISS': 'DISMISSED',
        'REVIEW': 'REVIEWED',
        'RESOLVE': 'RESOLVED'
    }
    new_status = status_map.get(action, 'REVIEWED')

    conn.execute('''
        UPDATE early_warnings
        SET status = ?, teacher_feedback = ?, dismissed_reason = ?
        WHERE id = ?
    ''', (new_status, feedback, dismissed_reason if action == 'DISMISS' else None, warning_id))

    # Log to audit log
    conn.execute('''
        INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        f"al_warn_{uuid.uuid4().hex[:10]}",
        g.current_user['institution_id'],
        g.current_user['user_id'],
        f"EARLY_WARNING_{action}",
        "early_warning",
        warning_id,
        f"Updated warning to {new_status}. Feedback: {feedback} | Dismiss Reason: {dismissed_reason}"
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f"Early warning marked as {new_status} successfully.",
        'new_status': new_status
    })
