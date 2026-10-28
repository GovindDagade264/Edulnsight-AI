import uuid
from flask import Blueprint, request, jsonify, g
from blueprints.auth import require_auth
from database import get_db_connection

imports_bp = Blueprint('imports', __name__, url_prefix='/api/imports')

@imports_bp.route('/preview', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def preview_import():
    data = request.get_json() or {}
    assessment_id = data.get('assessment_id')
    raw_rows = data.get('rows', []) # list of dicts with roll_number, marks_obtained, status, remarks

    if not assessment_id:
        return jsonify({'error': 'assessment_id is required.'}), 400
    if not raw_rows:
        return jsonify({'error': 'No data rows provided for import.'}), 400

    conn = get_db_connection()
    asm = conn.execute('''
        SELECT a.*, s.name as subject_name, c.id as class_id, c.name as class_name
        FROM assessments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN classes c ON a.class_id = c.id
        WHERE a.id = ? AND a.institution_id = ?
    ''', (assessment_id, g.current_user['institution_id'])).fetchone()

    if not asm:
        conn.close()
        return jsonify({'error': 'Assessment not found or does not belong to your institution.'}), 404

    # Fetch valid enrolled students in this class
    enrolled_students = conn.execute('''
        SELECT sp.id, sp.roll_number, u.full_name
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.class_id = ?
    ''', (asm['class_id'],)).fetchall()

    student_by_roll = {s['roll_number'].strip().upper(): s for s in enrolled_students}

    preview_items = []
    valid_count = 0
    invalid_count = 0
    seen_rolls = set()

    for idx, row in enumerate(raw_rows):
        roll = str(row.get('roll_number', '')).strip().upper()
        raw_marks = row.get('marks_obtained')
        status = str(row.get('status', '')).strip().upper()
        remarks = row.get('remarks', '')

        errors = []
        parsed_marks = None

        if not roll:
            errors.append("Roll number is missing.")
        elif roll not in student_by_roll:
            errors.append(f"Student with roll number '{roll}' is not enrolled in {asm['class_name']}.")
        elif roll in seen_rolls:
            errors.append(f"Duplicate entry for roll number '{roll}' detected in file.")
        else:
            seen_rolls.add(roll)

        # Status validation
        if status not in ['PRESENT', 'ABSENT', 'EXEMPT', 'NOT_SUBMITTED']:
            if raw_marks is None or raw_marks == '' or str(raw_marks).upper() in ['NA', 'N/A', 'NONE']:
                status = 'NOT_SUBMITTED'
            elif str(raw_marks).upper() in ['AB', 'ABSENT']:
                status = 'ABSENT'
                parsed_marks = None
            else:
                status = 'PRESENT'

        # Marks validation
        if status == 'PRESENT':
            if raw_marks is None or raw_marks == '':
                errors.append("Marks value is missing for student marked PRESENT.")
            else:
                try:
                    parsed_marks = float(raw_marks)
                    if parsed_marks < 0:
                        errors.append("Marks cannot be negative.")
                    elif parsed_marks > asm['max_marks']:
                        errors.append(f"Marks ({parsed_marks}) exceed assessment maximum of {asm['max_marks']}.")
                except (ValueError, TypeError):
                    errors.append(f"Invalid numerical score: '{raw_marks}'.")

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        preview_items.append({
            'row_index': idx + 1,
            'roll_number': roll,
            'student_name': student_by_roll[roll]['full_name'] if roll in student_by_roll else 'Unknown',
            'student_id': student_by_roll[roll]['id'] if roll in student_by_roll else None,
            'marks_obtained': parsed_marks,
            'status': status,
            'remarks': remarks,
            'is_valid': is_valid,
            'errors': errors
        })

    conn.close()

    return jsonify({
        'assessment': {
            'id': asm['id'],
            'name': asm['name'],
            'subject': asm['subject_name'],
            'class': asm['class_name'],
            'max_marks': asm['max_marks']
        },
        'total_rows': len(raw_rows),
        'valid_count': valid_count,
        'invalid_count': invalid_count,
        'can_commit': valid_count > 0,
        'preview_rows': preview_items
    })

@imports_bp.route('/commit', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def commit_import():
    data = request.get_json() or {}
    assessment_id = data.get('assessment_id')
    valid_rows = data.get('rows', []) # list of validated preview rows

    if not assessment_id or not valid_rows:
        return jsonify({'error': 'assessment_id and valid rows are required.'}), 400

    conn = get_db_connection()
    committed_count = 0

    try:
        for r in valid_rows:
            if not r.get('is_valid') or not r.get('student_id'):
                continue
            
            sid = r['student_id']
            marks = r.get('marks_obtained')
            status = r.get('status', 'PRESENT')
            remarks = r.get('remarks', 'Imported via Bulk Assessment CSV')

            existing = conn.execute('SELECT id FROM marks_records WHERE assessment_id = ? AND student_id = ?', (assessment_id, sid)).fetchone()
            if existing:
                conn.execute('''
                    UPDATE marks_records
                    SET marks_obtained = ?, status = ?, remarks = ?, recorded_by = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (marks, status, remarks, g.current_user['full_name'], existing['id']))
            else:
                conn.execute('''
                    INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, status, remarks, recorded_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (f"mr_imp_{uuid.uuid4().hex[:8]}", assessment_id, sid, marks, status, remarks, g.current_user['full_name']))
            committed_count += 1

        # Audit log entry
        conn.execute('''
            INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, 'CSV_IMPORT_COMMITTED', 'assessment', ?, ?)
        ''', (
            f"al_imp_{uuid.uuid4().hex[:8]}",
            g.current_user['institution_id'],
            g.current_user['user_id'],
            assessment_id,
            f"Successfully imported verified marks for {committed_count} students via batch upload."
        ))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': f"Database transaction failed: {str(e)}"}), 500

    conn.close()
    return jsonify({
        'success': True,
        'message': f"Import committed successfully. {committed_count} records saved.",
        'imported_count': committed_count
    })
