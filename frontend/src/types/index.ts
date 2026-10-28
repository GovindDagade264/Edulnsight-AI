export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type TicketStatus = 'Open' | 'In Progress' | 'Awaiting Student' | 'Resolved' | 'Closed';

export interface User {
  id: string;
  institution_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  profile_completion_status?: boolean;
  phone?: string;
  avatar_url?: string;
  institution_name?: string;
  institution_code?: string;
  institution_type?: string;
  board_university?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  institution_id: string;
  class_id: string;
  roll_number: string;
  admission_number: string;
  date_of_birth?: string;
  blood_group?: string;
  class_name?: string;
  division?: string;
  stream?: string;
  profile_completion_status?: boolean;
}

export interface SubjectScore {
  subject_id: string;
  name: string;
  code: string;
  percentage: number | null;
  status: 'Proficient' | 'Average' | 'Needs Attention' | string;
  assessments: {
    assessment_id: string;
    assessment_name: string;
    assessment_type: string;
    date: string;
    max_marks: number;
    marks_obtained: number | null;
    percentage: number | null;
    status: 'PRESENT' | 'ABSENT' | 'EXEMPT' | 'NOT_SUBMITTED';
    remarks?: string;
  }[];
}

export interface AttendanceStats {
  percentage: number | null;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  threshold: number;
  is_compliant: boolean;
  has_data?: boolean;
  status_message?: string | null;
}

export interface AssessmentTrendPoint {
  assessment_name: string;
  date: string;
  scores: Record<string, number>;
  average: number;
}

export interface SectionAStatistics {
  overall_aggregate_pct: number | null;
  has_marks_data?: boolean;
  marks_not_updated_message?: string | null;
  attendance: AttendanceStats;
  subjects: SubjectScore[];
  assessment_trends: AssessmentTrendPoint[];
  total_assessments_evaluated: number;
  strongest_subject: string;
  weakest_subject: string;
  grade_distribution?: Record<string, number>;
}

export interface AIInsight {
  id: string;
  title: string;
  risk_level: 'HIGH' | 'MODERATE' | 'LOW' | 'EXCELLENCE';
  subject_name: string;
  insight: string;
  why_it_matters: string;
  evidence: string;
  recommended_action: string;
  status: 'ACTIVE' | 'REVIEWED' | 'DISMISSED' | 'RESOLVED' | 'COMMENDATION' | 'VERIFIED';
  teacher_feedback?: string | null;
  dismissed_reason?: string | null;
}

export interface SectionBSummary {
  b1_numerical_text_summary: {
    summary_text: string;
    overall_percentage?: number;
    attendance_percentage?: number;
    evaluations_count?: number;
    verified_date?: string;
    class_average?: number;
    total_students?: number;
    active_alerts?: number;
  };
  b2_ai_insights: AIInsight[];
  early_warnings?: any[];
}

export interface StudentDashboardResponse {
  student: any;
  is_parent_view?: boolean;
  section_a_statistics: SectionAStatistics;
  section_b_summary: SectionBSummary;
}

export interface AcademicTicket {
  id: string;
  institution_id: string;
  student_id: string;
  teacher_id: string;
  subject_id?: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  student_name?: string;
  teacher_name?: string;
  subject_name?: string;
  roll_number?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_name?: string;
  sender_role?: string;
  message: string;
  attachment_name?: string;
  attachment_url?: string;
  created_at: string;
}

export interface PrivateMessage {
  id: string;
  institution_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  attachment_name?: string;
  attachment_url?: string;
  is_read: number;
  is_edited: number;
  is_deleted: number;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}
