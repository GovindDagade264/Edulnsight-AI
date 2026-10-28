import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SectionBSummary } from './SectionBSummary';
import { AttendanceManagementModal } from '../features/AttendanceManagementModal';
import { MarksManagementModal } from '../features/MarksManagementModal';
import {
  BookOpen,
  FileSpreadsheet,
  Calendar,
  Award,
  AlertTriangle,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface TeacherDashboardProps {
  onOpenImport: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onOpenImport }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isMarksOpen, setIsMarksOpen] = useState(false);
  const [dismissReasonModal, setDismissReasonModal] = useState<{ id: string } | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load teacher dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWarningAction = async (warningId: string, action: string) => {
    if (action === 'DISMISS') {
      setDismissReasonModal({ id: warningId });
      return;
    }

    try {
      await api.analytics.takeWarningAction({
        warning_id: warningId,
        action: action,
        feedback: 'Teacher reviewed and scheduled remedial tutorial.',
      });
      loadDashboard();
    } catch (err) {
      console.error('Failed to take warning action', err);
    }
  };

  const submitDismissal = async () => {
    if (!dismissReasonModal || !dismissReason.trim()) return;
    try {
      await api.analytics.takeWarningAction({
        warning_id: dismissReasonModal.id,
        action: 'DISMISS',
        dismissed_reason: dismissReason,
      });
      setDismissReasonModal(null);
      setDismissReason('');
      loadDashboard();
    } catch (err) {
      console.error('Failed to dismiss warning', err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 animate-pulse">
        <BookOpen className="w-10 h-10 text-violet-brand mx-auto mb-3 animate-bounce" />
        <p className="text-sm">Loading class records...</p>
      </div>
    );
  }

  if (!data) return null;

  const teacher = data.teacher || {};
  const stats = data.section_a_statistics || {};
  const summary = data.section_b_summary || {};
  const students = stats.students || [];

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Teacher Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-7 border border-violet-lavender/25 relative overflow-hidden bg-gradient-to-r from-plum-900/90 via-plum-850/80 to-plum-900/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white border border-white/25 shrink-0">
              {teacher.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {teacher.full_name || 'Faculty Member'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                {teacher.designation || 'Instructional Faculty'} • Assigned: <strong className="text-white">{stats.class_name || 'No Assigned Class'}</strong>
              </p>
            </div>
          </div>

          {/* Teacher Operational Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsMarksOpen(true)}
              className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill"
            >
              <Award className="w-4 h-4" />
              <span>Enter Marks</span>
            </button>

            <button
              onClick={() => setIsAttendanceOpen(true)}
              className="glass-outline-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-violet-lavender" />
              <span>Mark Attendance</span>
            </button>

            <button
              onClick={onOpenImport}
              className="glass-outline-btn px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-300" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* User-Facing Heading: Statistics */}
      <section className="space-y-6">
        <div className="border-b border-violet-lavender/15 pb-3 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Statistics</h2>
          <span className="text-xs font-mono text-slate-400 bg-plum-900/60 px-3 py-1 rounded-full border border-violet-lavender/10">
            Enrolled: {stats.total_students || 0} Students
          </span>
        </div>

        {/* Top KPI Cards — Numbers First */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Class Average</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {stats.class_average_pct !== null && stats.class_average_pct !== undefined ? `${stats.class_average_pct}%` : '--'}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                {stats.class_average_pct !== null && stats.class_average_pct !== undefined ? 'Active Cohort' : 'Pending Records'}
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Need Support</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-amber-300">{stats.students_needing_review || 0}</span>
              <span className="text-xs text-slate-400">flagged records</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Enrolled Cohort</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-violet-lavender">{students.length}</span>
              <span className="text-xs text-slate-400">active students</span>
            </div>
          </div>
        </div>

        {/* Authorized Class Roster Table */}
        <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-brand" />
                {stats.class_name ? `${stats.class_name} Student Roster` : 'Assigned Class Roster'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAttendanceOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-violet-brand/20 border border-violet-brand/40 text-violet-lavender text-xs font-semibold hover:bg-violet-brand/30 transition-all flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Take Attendance</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-plum-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-violet-lavender/10">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Aggregate</th>
                  <th className="py-2.5 px-3 text-center">Attendance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-lavender/10 font-mono text-xs">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      <Users className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                      <p className="font-semibold text-white">No students assigned yet.</p>
                      <p className="text-xs text-slate-400 mt-1">No academic records available for this period.</p>
                    </td>
                  </tr>
                ) : (
                  students.map((s: any) => (
                    <tr key={s.student_id || s.id} className="hover:bg-plum-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">{s.roll_number}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">
                        {s.full_name}
                        <span className="text-[10px] text-slate-400 block font-mono">{s.admission_number || '--'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {s.overall_percentage !== null && s.overall_percentage !== undefined ? `${s.overall_percentage}%` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.attendance_percentage !== null && s.attendance_percentage !== undefined ? (
                          <span className={s.attendance_percentage >= 75 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {s.attendance_percentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'Proficient' || s.status === 'GOOD_STANDING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : s.status === 'At Risk' || s.status === 'ATTENDANCE_DEFICIT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-plum-900 text-slate-400 border border-violet-lavender/20'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setIsMarksOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-plum-800 hover:bg-violet-brand text-white text-[11px] font-semibold transition-all"
                        >
                          Edit Marks
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* User-Facing Heading: Summary */}
      <SectionBSummary summary={summary} onTakeWarningAction={handleWarningAction} canReview={true} />

      {/* Modals */}
      <AttendanceManagementModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        onSaved={loadDashboard}
      />

      <MarksManagementModal
        isOpen={isMarksOpen}
        onClose={() => setIsMarksOpen(false)}
        onSaved={loadDashboard}
      />

      {/* Warning Dismissal Modal */}
      {dismissReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/80 backdrop-blur-md">
          <div className="glass-panel-elevated rounded-2xl p-5 max-w-md w-full border border-violet-lavender/30 shadow-2xl bg-plum-900">
            <h4 className="text-sm font-bold text-white mb-2">Dismiss AI Warning with Justification</h4>
            <p className="text-xs text-slate-300 mb-3">
              Institutional policy requires an explanatory remark before dismissing an academic warning.
            </p>
            <textarea
              rows={3}
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="State justification (e.g. Approved medical leave verified, remedial test completed)..."
              className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-brand resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setDismissReasonModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDismissal}
                disabled={!dismissReason.trim()}
                className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold shadow-violet-pill disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
