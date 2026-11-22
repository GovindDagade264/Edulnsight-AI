import { StudentDashboardResponse } from '../types';

export function getFallbackStudentDashboard(user?: any): StudentDashboardResponse {
  const name = user?.full_name || 'Govind Dagade';
  const email = user?.email || 'student@stxaviers.edu.in';

  return {
    student: {
      id: user?.id || 'sp_aarav',
      user_id: user?.id || 'usr_stud',
      full_name: name,
      email: email,
      class_name: 'Class 10',
      division: 'A',
      stream: 'Science',
      roll_number: '2024-X-104',
      admission_number: 'ADM-2024-089',
      institution_name: "St. Xavier's Model Senior Secondary School",
    },
    section_a_statistics: {
      overall_aggregate_pct: 87.7,
      has_marks_data: true,
      marks_not_updated_message: null,
      total_assessments_evaluated: 14,
      strongest_subject: 'Computer Applications (95.0%)',
      weakest_subject: 'Mathematics (80.5%)',
      attendance: {
        total_days: 63,
        present_days: 58,
        absent_days: 3,
        late_days: 2,
        percentage: 94.6,
        threshold: 75.0,
        is_compliant: true,
        has_data: true,
        status_message: 'Attendance exceeds institutional benchmark.',
      },
      subjects: [
        {
          subject_id: 'sub_comp',
          name: 'Computer Applications',
          code: 'COMP-101',
          percentage: 95.0,
          status: 'Proficient',
          assessments: [
            { assessment_id: 'a1', assessment_name: 'Unit Test 1', assessment_type: 'Unit Test', date: '2024-07-15', marks_obtained: 24, max_marks: 25, status: 'PRESENT', percentage: 96 },
            { assessment_id: 'a2', assessment_name: 'Mid-Term Exam', assessment_type: 'Term Exam', date: '2024-09-20', marks_obtained: 76, max_marks: 80, status: 'PRESENT', percentage: 95 },
          ],
        },
        {
          subject_id: 'sub_sci',
          name: 'Science & Technology',
          code: 'SCI-101',
          percentage: 90.5,
          status: 'Proficient',
          assessments: [
            { assessment_id: 'a3', assessment_name: 'Unit Test 1', assessment_type: 'Unit Test', date: '2024-07-15', marks_obtained: 23, max_marks: 25, status: 'PRESENT', percentage: 92 },
            { assessment_id: 'a4', assessment_name: 'Mid-Term Exam', assessment_type: 'Term Exam', date: '2024-09-20', marks_obtained: 71, max_marks: 80, status: 'PRESENT', percentage: 89 },
          ],
        },
        {
          subject_id: 'sub_eng',
          name: 'English Language & Literature',
          code: 'ENG-101',
          percentage: 88.8,
          status: 'Average',
          assessments: [
            { assessment_id: 'a5', assessment_name: 'Unit Test 1', assessment_type: 'Unit Test', date: '2024-07-15', marks_obtained: 22, max_marks: 25, status: 'PRESENT', percentage: 88 },
            { assessment_id: 'a6', assessment_name: 'Mid-Term Exam', assessment_type: 'Term Exam', date: '2024-09-20', marks_obtained: 72, max_marks: 80, status: 'PRESENT', percentage: 90 },
          ],
        },
        {
          subject_id: 'sub_sst',
          name: 'Social Science',
          code: 'SST-101',
          percentage: 83.1,
          status: 'Average',
          assessments: [
            { assessment_id: 'a7', assessment_name: 'Unit Test 1', assessment_type: 'Unit Test', date: '2024-07-15', marks_obtained: 21, max_marks: 25, status: 'PRESENT', percentage: 84 },
            { assessment_id: 'a8', assessment_name: 'Mid-Term Exam', assessment_type: 'Term Exam', date: '2024-09-20', marks_obtained: 66, max_marks: 80, status: 'PRESENT', percentage: 82.5 },
          ],
        },
        {
          subject_id: 'sub_math',
          name: 'Mathematics',
          code: 'MTH-101',
          percentage: 80.5,
          status: 'Needs Attention',
          assessments: [
            { assessment_id: 'a9', assessment_name: 'Unit Test 1', assessment_type: 'Unit Test', date: '2024-07-15', marks_obtained: 20, max_marks: 25, status: 'PRESENT', percentage: 80 },
            { assessment_id: 'a10', assessment_name: 'Mid-Term Exam', assessment_type: 'Term Exam', date: '2024-09-20', marks_obtained: 65, max_marks: 80, status: 'PRESENT', percentage: 81.2 },
          ],
        },
      ],
      assessment_trends: [
        { assessment_name: 'Unit Test 1', date: '2024-07-15', scores: { 'Mathematics': 80, 'Science': 92, 'English': 88, 'Computer Applications': 96 }, average: 89.0 },
        { assessment_name: 'Mid-Term Exam', date: '2024-09-20', scores: { 'Mathematics': 81.2, 'Science': 89, 'English': 90, 'Computer Applications': 95 }, average: 88.8 },
        { assessment_name: 'Unit Test 2', date: '2024-11-10', scores: { 'Mathematics': 82, 'Science': 91, 'English': 87, 'Computer Applications': 94 }, average: 88.5 },
      ],
      grade_distribution: {
        A1: 2,
        A2: 2,
        B1: 1,
        B2: 0,
        C1: 0,
      },
    },
    section_b_summary: {
      b1_numerical_text_summary: {
        summary_text: `${name} has achieved an overall aggregate of 87.7% across 14 evaluations with 94.6% attendance in Class 10-A. Performance remains in the Distinction band with primary academic strength in Computer Applications (95.0%) and target focus in Mathematics.`,
        overall_percentage: 87.7,
        attendance_percentage: 94.6,
        evaluations_count: 14,
        verified_date: new Date().toLocaleDateString('en-GB'),
      },
      b2_ai_insights: [
        {
          id: 'insight_1',
          title: 'Strong Mastery in Computer Applications & Science',
          risk_level: 'EXCELLENCE',
          subject_name: 'Computer Applications',
          insight: 'Consistently scores above 90% in practical implementations and algorithmic logic evaluations.',
          why_it_matters: 'Forms a solid foundation for competitive STEM and Computer Science career pathways.',
          evidence: 'Achieved 95.0% aggregate in Computer Applications across Unit Test 1 and Mid-Term.',
          recommended_action: 'Encourage participation in National Cyber Olympiad and advanced coding projects.',
          status: 'ACTIVE',
        },
        {
          id: 'insight_2',
          title: 'Growth Opportunity in Mathematics Geometry & Proofs',
          risk_level: 'MODERATE',
          subject_name: 'Mathematics',
          insight: 'Scored 78% in Geometry proofs while maintaining 85%+ in Algebraic manipulation.',
          why_it_matters: 'Board examinations weigh geometric theorems heavily (28% of overall paper mark share).',
          evidence: 'Pre-Board unit test marks showed a 5-mark gap on multi-step coordinate geometry theorems.',
          recommended_action: 'Complete targeted remedial worksheet on Circles and Triangles theorem proofs.',
          status: 'ACTIVE',
        },
      ],
    },
  };
}
