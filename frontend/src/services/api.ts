const rawBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
const API_BASE = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`) : '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('eduinsight_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('eduinsight_token', token);
  } else {
    localStorage.removeItem('eduinsight_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      // ignored
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: any; profile: any; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (payload: { email: string; password: string; full_name: string; role: string; institution_id?: string }) =>
      request<{ token: string; user: any; profile: any; profile_completion_status: boolean; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    completeProfile: (payload: any) =>
      request<{ success: boolean; user: any; profile: any; message: string }>('/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<{ user: any; profile: any }>('/auth/me'),
  },

  analytics: {
    getDashboard: () => request<any>('/analytics/dashboard'),
    getEarlyWarnings: () => request<{ warnings: any[] }>('/analytics/early-warnings'),
    takeWarningAction: (payload: { warning_id: string; action: string; feedback?: string; dismissed_reason?: string }) =>
      request<{ success: boolean; message: string; new_status: string }>('/analytics/warning-action', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  academic: {
    getClasses: () => request<{ classes: any[] }>('/academic/classes'),
    getSubjects: (classId?: string) =>
      request<{ subjects: any[] }>(`/academic/subjects${classId ? `?class_id=${classId}` : ''}`),
    getAssessments: (classId?: string, subjectId?: string) => {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      if (subjectId) params.append('subject_id', subjectId);
      return request<{ assessments: any[] }>(`/academic/assessments?${params.toString()}`);
    },
    getClassRecords: (classId: string, assessmentId?: string) =>
      request<{ students: any[] }>(`/academic/class-records/${classId}${assessmentId ? `?assessment_id=${assessmentId}` : ''}`),
    saveMarks: (payload: { assessment_id: string; records: any[] }) =>
      request<{ success: boolean; message: string; updated_count: number }>('/academic/marks/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getAttendance: (classId: string, date: string) =>
      request<{ class_id: string; date: string; records: any[] }>(`/academic/attendance?class_id=${classId}&date=${date}`),
    saveAttendance: (payload: { class_id: string; date: string; records: any[] }) =>
      request<{ success: boolean; message: string; updated_count: number }>('/academic/attendance/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  imports: {
    preview: (payload: { assessment_id: string; rows: any[] }) =>
      request<any>('/imports/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    commit: (payload: { assessment_id: string; rows: any[] }) =>
      request<{ success: boolean; message: string; imported_count: number }>('/imports/commit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  tickets: {
    list: () => request<{ tickets: any[] }>('/tickets'),
    get: (id: string) => request<any>(`/tickets/${id}`),
    create: (payload: { title: string; description: string; category: string; priority: string; teacher_id?: string; subject_id?: string }) =>
      request<{ success: boolean; message: string; ticket_id: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    reply: (id: string, payload: { message: string; attachment_name?: string; attachment_url?: string }) =>
      request<{ success: boolean; message: string }> (`/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: string, payload: { status: string; reason?: string }) =>
      request<{ success: boolean; status: string; message: string }>(`/tickets/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  messages: {
    getConversations: () => request<{ conversations: any[] }>('/messages/conversations'),
    getThread: (contactId: string) => request<{ contact: any; messages: any[] }>(`/messages/thread/${contactId}`),
    send: (payload: { receiver_id: string; message: string; attachment_name?: string; attachment_url?: string }) =>
      request<{ success: boolean; message_id: string; message: string }>('/messages/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    edit: (messageId: string, message: string) =>
      request<{ success: boolean; message: string }>(`/messages/${messageId}/edit`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    delete: (messageId: string) =>
      request<{ success: boolean; message: string }>(`/messages/${messageId}/delete`, {
        method: 'POST',
      }),
  },

  reports: {
    getStudentReport: (studentId: string) => request<any>(`/reports/student/${studentId}`),
  },
};
