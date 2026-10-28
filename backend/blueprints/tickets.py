import uuid
from flask import Blueprint, request, jsonify, g
from blueprints.auth import require_auth
from database import get_db_connection

tickets_bp = Blueprint('tickets', __name__, url_prefix='/api/tickets')

VALID_STATUSES = ['Open', 'In Progress', 'Awaiting Student', 'Resolved', 'Closed']

@tickets_bp.route('', methods=['GET'])
@require_auth()
def list_tickets():
    role = g.current_user['role']
    user_id = g.current_user['user_id']
    institution_id = g.current_user['institution_id']
    conn = get_db_connection()

    if role == 'student':
        sp = conn.execute('SELECT id FROM student_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not sp:
            conn.close()
            return jsonify({'tickets': []})
        tickets = conn.execute('''
            SELECT t.*, u_tch.full_name as teacher_name, s.name as subject_name
            FROM academic_tickets t
            JOIN teacher_profiles tp ON t.teacher_id = tp.id
            JOIN users u_tch ON tp.user_id = u_tch.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.student_id = ?
            ORDER BY t.updated_at DESC
        ''', (sp['id'],)).fetchall()

    elif role == 'teacher':
        tp = conn.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not tp:
            conn.close()
            return jsonify({'tickets': []})
        tickets = conn.execute('''
            SELECT t.*, u_std.full_name as student_name, sp.roll_number, s.name as subject_name
            FROM academic_tickets t
            JOIN student_profiles sp ON t.student_id = sp.id
            JOIN users u_std ON sp.user_id = u_std.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.teacher_id = ?
            ORDER BY t.updated_at DESC
        ''', (tp['id'],)).fetchall()

    elif role == 'parent':
        pp = conn.execute('SELECT id FROM parent_profiles WHERE user_id = ?', (user_id,)).fetchone()
        if not pp:
            conn.close()
            return jsonify({'tickets': []})
        link = conn.execute('SELECT student_id FROM parent_student_map WHERE parent_id = ?', (pp['id'],)).fetchone()
        if not link:
            conn.close()
            return jsonify({'tickets': []})
        tickets = conn.execute('''
            SELECT t.*, u_tch.full_name as teacher_name, s.name as subject_name
            FROM academic_tickets t
            JOIN teacher_profiles tp ON t.teacher_id = tp.id
            JOIN users u_tch ON tp.user_id = u_tch.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.student_id = ?
            ORDER BY t.updated_at DESC
        ''', (link['student_id'],)).fetchall()

    elif role == 'admin':
        # Admins see aggregate metadata, NOT private contents without audit
        tickets = conn.execute('''
            SELECT t.id, t.institution_id, t.title, t.category, t.priority, t.status, t.created_at, t.updated_at,
                   u_std.full_name as student_name, u_tch.full_name as teacher_name, s.name as subject_name
            FROM academic_tickets t
            JOIN student_profiles sp ON t.student_id = sp.id
            JOIN users u_std ON sp.user_id = u_std.id
            JOIN teacher_profiles tp ON t.teacher_id = tp.id
            JOIN users u_tch ON tp.user_id = u_tch.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.institution_id = ?
            ORDER BY t.updated_at DESC
        ''', (institution_id,)).fetchall()

    conn.close()
    return jsonify({'tickets': [dict(t) for t in tickets]})

@tickets_bp.route('/<ticket_id>', methods=['GET'])
@require_auth()
def get_ticket_details(ticket_id):
    institution_id = g.current_user['institution_id']
    user_id = g.current_user['user_id']
    role = g.current_user['role']

    conn = get_db_connection()
    ticket = conn.execute('''
        SELECT t.*, u_std.full_name as student_name, sp.roll_number,
               u_tch.full_name as teacher_name, s.name as subject_name
        FROM academic_tickets t
        JOIN student_profiles sp ON t.student_id = sp.id
        JOIN users u_std ON sp.user_id = u_std.id
        JOIN teacher_profiles tp ON t.teacher_id = tp.id
        JOIN users u_tch ON tp.user_id = u_tch.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE t.id = ? AND t.institution_id = ?
    ''', (ticket_id, institution_id)).fetchone()

    if not ticket:
        conn.close()
        return jsonify({'error': 'Ticket not found or access denied.'}), 404

    messages = conn.execute('''
        SELECT tm.*, u.full_name as sender_name, u.role as sender_role
        FROM ticket_messages tm
        JOIN users u ON tm.sender_user_id = u.id
        WHERE tm.ticket_id = ?
        ORDER BY tm.created_at ASC
    ''', (ticket_id,)).fetchall()

    conn.close()
    return jsonify({
        'ticket': dict(ticket),
        'messages': [dict(m) for m in messages],
        'allowed_statuses': VALID_STATUSES
    })

@tickets_bp.route('', methods=['POST'])
@require_auth(allowed_roles=['student'])
def create_ticket():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', 'Doubt Clearing')
    priority = data.get('priority', 'MEDIUM')
    teacher_id = data.get('teacher_id')
    subject_id = data.get('subject_id')

    if not title or not description:
        return jsonify({'error': 'Title and description are required.'}), 400

    conn = get_db_connection()
    sp = conn.execute('SELECT id FROM student_profiles WHERE user_id = ?', (g.current_user['user_id'],)).fetchone()
    if not sp:
        conn.close()
        return jsonify({'error': 'Student profile not found.'}), 404

    if not teacher_id:
        # Default to primary teacher
        default_tp = conn.execute('SELECT id FROM teacher_profiles WHERE institution_id = ? LIMIT 1', (g.current_user['institution_id'],)).fetchone()
        teacher_id = default_tp['id'] if default_tp else 'tp_priya'

    ticket_id = f"tick_{uuid.uuid4().hex[:8]}"
    conn.execute('''
        INSERT INTO academic_tickets (id, institution_id, student_id, teacher_id, subject_id, title, description, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
    ''', (ticket_id, g.current_user['institution_id'], sp['id'], teacher_id, subject_id, title, description, category, priority))

    # Add initial message
    conn.execute('''
        INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
        VALUES (?, ?, ?, ?)
    ''', (f"tm_{uuid.uuid4().hex[:8]}", ticket_id, g.current_user['user_id'], description))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Academic query ticket submitted successfully.',
        'ticket_id': ticket_id,
        'status': 'Open'
    }), 201

@tickets_bp.route('/<ticket_id>/reply', methods=['POST'])
@require_auth()
def reply_to_ticket(ticket_id):
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    attachment_name = data.get('attachment_name')
    attachment_url = data.get('attachment_url')

    if not message:
        return jsonify({'error': 'Message content cannot be blank.'}), 400

    conn = get_db_connection()
    t = conn.execute('SELECT * FROM academic_tickets WHERE id = ?', (ticket_id,)).fetchone()
    if not t:
        conn.close()
        return jsonify({'error': 'Ticket not found'}), 404

    msg_id = f"tm_{uuid.uuid4().hex[:8]}"
    conn.execute('''
        INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message, attachment_name, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (msg_id, ticket_id, g.current_user['user_id'], message, attachment_name, attachment_url))

    # Auto transition: If teacher replies, transition from Open -> In Progress or Awaiting Student
    if g.current_user['role'] == 'teacher' and t['status'] == 'Open':
        conn.execute('UPDATE academic_tickets SET status = "In Progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?', (ticket_id,))
    elif g.current_user['role'] == 'student' and t['status'] == 'Awaiting Student':
        conn.execute('UPDATE academic_tickets SET status = "In Progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?', (ticket_id,))
    else:
        conn.execute('UPDATE academic_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', (ticket_id,))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Reply sent successfully.',
        'message_id': msg_id
    })

@tickets_bp.route('/<ticket_id>/status', methods=['POST'])
@require_auth(allowed_roles=['teacher', 'admin'])
def update_ticket_status(ticket_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    reason = data.get('reason', '')

    if new_status not in VALID_STATUSES:
        return jsonify({'error': f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"}), 400

    conn = get_db_connection()
    conn.execute('''
        UPDATE academic_tickets
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND institution_id = ?
    ''', (new_status, ticket_id, g.current_user['institution_id']))

    # System message in thread
    conn.execute('''
        INSERT INTO ticket_messages (id, ticket_id, sender_user_id, message)
        VALUES (?, ?, ?, ?)
    ''', (
        f"tm_sys_{uuid.uuid4().hex[:8]}",
        ticket_id,
        g.current_user['user_id'],
        f"[SYSTEM UPDATE]: Ticket status changed to '{new_status}' by {g.current_user['full_name']}. {f'Note: {reason}' if reason else ''}"
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'status': new_status,
        'message': f"Ticket updated to '{new_status}' successfully."
    })
