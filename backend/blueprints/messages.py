import uuid
import datetime
from flask import Blueprint, request, jsonify, g
from blueprints.auth import require_auth
from database import get_db_connection

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@messages_bp.route('/conversations', methods=['GET'])
@require_auth()
def list_conversations():
    user_id = g.current_user['user_id']
    institution_id = g.current_user['institution_id']
    role = g.current_user['role']
    conn = get_db_connection()

    # Find conversation counterpart candidates based on role
    # Student talks to their teachers
    # Teacher talks to their students and student parents
    # Parent talks to their child's teachers
    counterparts = []
    if role == 'student':
        counterparts = conn.execute('''
            SELECT u.id, u.full_name, u.role, u.email, tp.designation, tp.employee_code
            FROM users u
            JOIN teacher_profiles tp ON u.id = tp.user_id
            WHERE u.institution_id = ? AND u.is_active = 1
        ''', (institution_id,)).fetchall()
    elif role == 'teacher':
        counterparts = conn.execute('''
            SELECT u.id, u.full_name, u.role, u.email, sp.roll_number, c.name as class_name, c.division
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            JOIN classes c ON sp.class_id = c.id
            WHERE u.institution_id = ? AND u.is_active = 1
            UNION
            SELECT u.id, u.full_name, u.role, u.email, NULL as roll_number, pp.occupation as class_name, NULL as division
            FROM users u
            JOIN parent_profiles pp ON u.id = pp.user_id
            WHERE u.institution_id = ? AND u.is_active = 1
        ''', (institution_id, institution_id)).fetchall()
    elif role == 'parent':
        counterparts = conn.execute('''
            SELECT u.id, u.full_name, u.role, u.email, tp.designation, tp.employee_code
            FROM users u
            JOIN teacher_profiles tp ON u.id = tp.user_id
            WHERE u.institution_id = ? AND u.is_active = 1
        ''', (institution_id,)).fetchall()

    conversations = []
    for c in counterparts:
        # Check last message
        last_msg = conn.execute('''
            SELECT message, created_at, is_read, sender_id
            FROM private_messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at DESC LIMIT 1
        ''', (user_id, c['id'], c['id'], user_id)).fetchone()

        unread_count = conn.execute('''
            SELECT count(*) as count FROM private_messages
            WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
        ''', (c['id'], user_id)).fetchone()['count']

        conversations.append({
            'contact_id': c['id'],
            'full_name': c['full_name'],
            'role': c['role'],
            'email': c['email'],
            'designation_or_class': c['class_name'] if 'class_name' in c.keys() else c.get('designation', ''),
            'last_message': last_msg['message'] if last_msg else None,
            'last_message_time': last_msg['created_at'] if last_msg else None,
            'unread_count': unread_count
        })

    conn.close()
    return jsonify({'conversations': conversations})

@messages_bp.route('/thread/<contact_id>', methods=['GET'])
@require_auth()
def get_thread(contact_id):
    user_id = g.current_user['user_id']
    institution_id = g.current_user['institution_id']
    conn = get_db_connection()

    # Mark incoming unread messages as read
    conn.execute('''
        UPDATE private_messages
        SET is_read = 1
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    ''', (contact_id, user_id))
    conn.commit()

    messages = conn.execute('''
        SELECT pm.*, u_snd.full_name as sender_name, u_snd.role as sender_role
        FROM private_messages pm
        JOIN users u_snd ON pm.sender_id = u_snd.id
        WHERE ((pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?))
          AND pm.institution_id = ?
        ORDER BY pm.created_at ASC
    ''', (user_id, contact_id, contact_id, user_id, institution_id)).fetchall()

    contact = conn.execute('SELECT id, full_name, role, email, phone FROM users WHERE id = ?', (contact_id,)).fetchone()

    conn.close()
    return jsonify({
        'contact': dict(contact) if contact else None,
        'messages': [dict(m) for m in messages]
    })

@messages_bp.route('/send', methods=['POST'])
@require_auth()
def send_message():
    data = request.get_json() or {}
    receiver_id = data.get('receiver_id')
    message = data.get('message', '').strip()
    attachment_name = data.get('attachment_name')
    attachment_url = data.get('attachment_url')

    if not receiver_id or not message:
        return jsonify({'error': 'receiver_id and message are required.'}), 400

    conn = get_db_connection()
    msg_id = f"pm_{uuid.uuid4().hex[:8]}"
    conn.execute('''
        INSERT INTO private_messages (id, institution_id, sender_id, receiver_id, message, attachment_name, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (msg_id, g.current_user['institution_id'], g.current_user['user_id'], receiver_id, message, attachment_name, attachment_url))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message_id': msg_id,
        'message': 'Message sent successfully.'
    }), 201

@messages_bp.route('/<message_id>/edit', methods=['POST'])
@require_auth()
def edit_message(message_id):
    data = request.get_json() or {}
    new_text = data.get('message', '').strip()
    if not new_text:
        return jsonify({'error': 'Message content cannot be blank.'}), 400

    conn = get_db_connection()
    msg = conn.execute('SELECT * FROM private_messages WHERE id = ?', (message_id,)).fetchone()
    if not msg or msg['sender_id'] != g.current_user['user_id']:
        conn.close()
        return jsonify({'error': 'Message not found or unauthorized.'}), 403

    conn.execute('''
        UPDATE private_messages
        SET message = ?, is_edited = 1
        WHERE id = ?
    ''', (new_text, message_id))

    # Audit log entry for message modification
    conn.execute('''
        INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'EDIT_MESSAGE', 'private_message', ?, ?)
    ''', (
        f"al_msg_edit_{uuid.uuid4().hex[:8]}",
        g.current_user['institution_id'],
        g.current_user['user_id'],
        message_id,
        f"Edited message content. Previous length: {len(msg['message'])}, New length: {len(new_text)}"
    ))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Message updated successfully.'})

@messages_bp.route('/<message_id>/delete', methods=['POST'])
@require_auth()
def delete_message(message_id):
    conn = get_db_connection()
    msg = conn.execute('SELECT * FROM private_messages WHERE id = ?', (message_id,)).fetchone()
    if not msg or msg['sender_id'] != g.current_user['user_id']:
        conn.close()
        return jsonify({'error': 'Message not found or unauthorized.'}), 403

    conn.execute('''
        UPDATE private_messages
        SET message = '[This message was deleted by the sender]', is_deleted = 1
        WHERE id = ?
    ''', (message_id,))

    conn.execute('''
        INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'DELETE_MESSAGE', 'private_message', ?, 'Sender deleted private message')
    ''', (
        f"al_msg_del_{uuid.uuid4().hex[:8]}",
        g.current_user['institution_id'],
        g.current_user['user_id'],
        message_id
    ))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Message deleted.'})
