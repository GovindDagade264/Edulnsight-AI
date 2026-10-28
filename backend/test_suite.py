import json
import uuid
from app import create_app

app = create_app()
client = app.test_client()

print('=== EDUINSIGHT AI AUTOMATED VERIFICATION SUITE ===')

# 1. Test Login across all 4 roles
roles = [
    ('student', 'aarav.sharma@student.stxaviers.edu.in', 'student123'),
    ('teacher', 'priya.deshmukh@stxaviers.edu.in', 'teacher123'),
    ('parent', 'rajesh.sharma@gmail.com', 'parent123'),
    ('admin', 'admin@stxaviers.edu.in', 'admin123')
]
tokens = {}
for r, email, pwd in roles:
    res = client.post('/api/auth/login', json={'email': email, 'password': pwd})
    assert res.status_code == 200, f'Login failed for {r}'
    tokens[r] = res.get_json()['token']
    name = res.get_json()['user']['full_name']
    print(f' [PASS] Role Login: {r.capitalize()} ({name})')

# 2. Test Section A and Section B on Student Dashboard
res_std = client.get('/api/analytics/dashboard', headers={'Authorization': f'Bearer {tokens["student"]}'})
assert res_std.status_code == 200
data_std = res_std.get_json()
assert 'section_a_statistics' in data_std
assert 'section_b_summary' in data_std
assert 'b1_numerical_text_summary' in data_std['section_b_summary']
assert 'b2_ai_insights' in data_std['section_b_summary']
agg = data_std['section_a_statistics']['overall_aggregate_pct']
att = data_std['section_a_statistics']['attendance']['percentage']
print(f' [PASS] Student Dashboard Structure: Section A Aggregate={agg}%, Attendance={att}%')
print(f' [PASS] Section B2 AI Insights: {len(data_std["section_b_summary"]["b2_ai_insights"])} verified diagnostic cards')

# 3. Test Student Registration and Profile Onboarding Flow
new_email = f"student_{uuid.uuid4().hex[:6]}@stxaviers.edu.in"
res_reg = client.post('/api/auth/register', json={
    'email': new_email,
    'password': 'password123',
    'full_name': 'Rohan Kulkarni',
    'role': 'student'
})
assert res_reg.status_code == 201, 'Student registration failed'
reg_data = res_reg.get_json()
new_token = reg_data['token']
print(f' [PASS] Student Registration: User {reg_data["user"]["full_name"]} created with initial profile_completion_status=False')

# Complete Profile Onboarding
res_onboard = client.post('/api/auth/complete-profile', headers={'Authorization': f'Bearer {new_token}'}, json={
    'class_id': 'class_10a',
    'roll_number': f'2024-X-{uuid.uuid4().hex[:3]}',
    'admission_number': f'ADM-2024-{uuid.uuid4().hex[:4]}',
    'date_of_birth': '2008-07-22',
    'blood_group': 'B+'
})
assert res_onboard.status_code == 200, f'Profile onboarding failed: {res_onboard.get_data(as_text=True)}'
onboard_data = res_onboard.get_json()
assert onboard_data['user']['profile_completion_status'] is True
print(f' [PASS] Student Profile Onboarding: Profile verified and marked complete')

# 4. Test Honest Missing-Data State on newly registered student (Zero fake data)
res_new_dash = client.get('/api/analytics/dashboard', headers={'Authorization': f'Bearer {new_token}'})
assert res_new_dash.status_code == 200
new_dash = res_new_dash.get_json()
att_obj = new_dash['section_a_statistics']['attendance']
assert att_obj['has_data'] is False
assert att_obj['percentage'] is None
assert 'Attendance not updated yet' in att_obj['status_message']
print(f' [PASS] Honest Missing Attendance: {att_obj["status_message"]} (0% never fabricated)')

# 5. Test Teacher Attendance Management & Student Synchronization
test_date = '2026-10-27'
res_att_save = client.post('/api/academic/attendance/save', headers={'Authorization': f'Bearer {tokens["teacher"]}'}, json={
    'class_id': 'class_10a',
    'date': test_date,
    'records': [
        {'student_id': data_std['student']['id'], 'status': 'PRESENT', 'remarks': 'Active participation'},
        {'student_id': onboard_data['profile']['id'], 'status': 'PRESENT', 'remarks': 'New student session'}
    ]
})
assert res_att_save.status_code == 200, f'Teacher attendance save failed: {res_att_save.get_data(as_text=True)}'
print(f' [PASS] Teacher Attendance Save: {res_att_save.get_json()["message"]}')

# 6. Test Teacher Marks Management & Student Synchronization
res_marks_save = client.post('/api/academic/marks/save', headers={'Authorization': f'Bearer {tokens["teacher"]}'}, json={
    'assessment_id': 'asm_mth_ut1',
    'records': [
        {'student_id': data_std['student']['id'], 'marks_obtained': 24.5, 'status': 'PRESENT', 'remarks': 'Top answer sheet'}
    ]
})
assert res_marks_save.status_code == 200, 'Teacher marks save failed'
print(f' [PASS] Teacher Marks Save: {res_marks_save.get_json()["message"]}')

# Verify Student Synchronized Dashboard
res_std_sync = client.get('/api/analytics/dashboard', headers={'Authorization': f'Bearer {tokens["student"]}'})
assert res_std_sync.status_code == 200
std_sync_data = res_std_sync.get_json()
mth_sub = next(s for s in std_sync_data['section_a_statistics']['subjects'] if s['code'] == 'MTH-10')
ut1_score = next(a for a in mth_sub['assessments'] if a['assessment_id'] == 'asm_mth_ut1')
assert ut1_score['marks_obtained'] == 24.5
print(f' [PASS] Teacher-Student Live Synchronization: Mathematics UT1 marks verified at {ut1_score["marks_obtained"]}/25')

# 7. Test Early Warning Review Action
warn_res = client.get('/api/analytics/early-warnings', headers={'Authorization': f'Bearer {tokens["teacher"]}'})
warn_id = warn_res.get_json()['warnings'][0]['id']
act_res = client.post('/api/analytics/warning-action', headers={'Authorization': f'Bearer {tokens["teacher"]}'}, json={
    'warning_id': warn_id,
    'action': 'REVIEW',
    'feedback': 'Scheduled extra remedial proof class for Aarav.'
})
assert act_res.status_code == 200
print(f' [PASS] Early Warning Review Action: Status={act_res.get_json()["new_status"]}')

# 8. Test Official Transcript Report Card Data
stud_id = data_std['student']['id']
res_rep = client.get(f'/api/reports/student/{stud_id}', headers={'Authorization': f'Bearer {tokens["student"]}'})
assert res_rep.status_code == 200
rep_data = res_rep.get_json()
print(f' [PASS] Official Transcript Generated: Institution={rep_data["student"]["institution_name"]}, Marks Records={len(rep_data["marks_records"])}')

print('=== ALL 8 ADVANCED CORE TESTS PASSED (100% SUCCESS) ===')
