import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Check,
  Search,
  Save,
  UserX,
  RefreshCw
} from 'lucide-react';

interface AttendanceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AttendanceManagementModal: React.FC<AttendanceManagementModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [roster, setRoster] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      loadRoster();
    }
  }, [selectedClassId, selectedDate]);

  const loadClasses = async () => {
    try {
      const res = await api.academic.getClasses();
      setClasses(res.classes);
      if (res.classes.length > 0 && !selectedClassId) {
        setSelectedClassId(res.classes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classes.');
    }
  };

  const loadRoster = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.academic.getAttendance(selectedClassId, selectedDate);
      setRoster(res.records || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
  };

  const handleMarkAll = (status: string) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedDate || roster.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      const payload = {
        class_id: selectedClassId,
        date: selectedDate,
        records: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          remarks: r.remarks || '',
        })),
      };

      const res = await api.academic.saveAttendance(payload);
      setSuccessMsg(res.message || 'Attendance saved and synchronized successfully.');
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalCount = roster.length;
  const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
  const absentCount = roster.filter((r) => r.status === 'ABSENT').length;
  const lateCount = roster.filter((r) => r.status === 'LATE').length;
  const halfDayCount = roster.filter((r) => r.status === 'HALF_DAY').length;
  const presentPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const filteredRoster = roster.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = s.full_name?.toLowerCase().includes(q);
    const rollMatch = String(s.roll_number || '').includes(q);
    const admMatch = s.admission_number?.toLowerCase().includes(q);
    return nameMatch || rollMatch || admMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-4xl max-h-[90vh] border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
              <Calendar className="w-5 h-5 text-violet-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Daily Attendance Management</h3>
              <p className="text-xs text-slate-400">Record, verify, and synchronize official class attendance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Controls: Class, Date & Quick Bulk Actions */}
        <div className="p-4 border-b border-violet-lavender/10 bg-plum-950/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-plum-900/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand transition-colors"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Division {c.division} ({c.student_count || 0} students)
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-plum-900/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand transition-colors"
            />
          </div>

          <div className="sm:col-span-5 flex items-center justify-end gap-2 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => handleMarkAll('PRESENT')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"
              title="Mark all students Present"
            >
              <Check className="w-3.5 h-3.5" />
              <span>All Present</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('ABSENT')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all flex items-center gap-1.5"
              title="Mark all students Absent"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>All Absent</span>
            </button>
            <button
              type="button"
              onClick={loadRoster}
              disabled={loading}
              className="p-2 rounded-xl text-xs font-semibold bg-plum-900/80 text-slate-300 border border-violet-lavender/20 hover:text-white hover:bg-plum-850 transition-all"
              title="Reload Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Live Counters & Search Bar */}
        <div className="px-5 py-3 bg-plum-950/30 border-b border-violet-lavender/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">
              Total: <strong className="text-white font-mono">{totalCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Present: <strong className="font-mono">{presentCount}</strong> ({presentPct}%)
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Absent: <strong className="font-mono">{absentCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Late: <strong className="font-mono">{lateCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Half Day: <strong className="font-mono">{halfDayCount}</strong>
            </span>
          </div>

          {/* Search student */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll..."
              className="w-full bg-plum-900/80 border border-violet-lavender/20 rounded-xl py-1.5 pl-8 pr-7 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Calendar className="w-8 h-8 text-violet-brand mx-auto mb-2 animate-bounce" />
              <p className="text-xs">Loading class roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <p className="text-xs">No students enrolled in this class.</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Search className="w-7 h-7 text-slate-500 mx-auto mb-2" />
              <p className="text-xs">No students found matching "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-violet-lavender text-xs underline hover:text-white"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-plum-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-violet-lavender/15 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Attendance Status</th>
                  <th className="py-2.5 px-3">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-lavender/10">
                {filteredRoster.map((s) => (
                  <tr key={s.student_id} className="hover:bg-plum-800/25 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-plum-950/80 border border-violet-lavender/15 font-mono font-bold text-white text-[11px]">
                        {s.roll_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">{s.full_name}</div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {s.admission_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.student_id, 'PRESENT')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            s.status === 'PRESENT'
                              ? 'bg-emerald-500 text-white shadow-emerald-500/40 shadow-sm'
                              : 'bg-plum-950/60 text-slate-400 hover:text-white border border-violet-lavender/15'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.student_id, 'ABSENT')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            s.status === 'ABSENT'
                              ? 'bg-rose-500 text-white shadow-rose-500/40 shadow-sm'
                              : 'bg-plum-950/60 text-slate-400 hover:text-white border border-violet-lavender/15'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.student_id, 'LATE')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            s.status === 'LATE'
                              ? 'bg-amber-500 text-white shadow-amber-500/40 shadow-sm'
                              : 'bg-plum-950/60 text-slate-400 hover:text-white border border-violet-lavender/15'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.student_id, 'HALF_DAY')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            s.status === 'HALF_DAY'
                              ? 'bg-purple-600 text-white shadow-purple-500/40 shadow-sm'
                              : 'bg-plum-950/60 text-slate-400 hover:text-white border border-violet-lavender/15'
                          }`}
                        >
                          Half Day
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.remarks || ''}
                        onChange={(e) => handleRemarkChange(s.student_id, e.target.value)}
                        placeholder="e.g. Medical, Bus delay..."
                        className="w-full bg-plum-950/60 border border-violet-lavender/15 rounded-lg py-1 px-2.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-brand transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-violet-lavender/15 bg-plum-950/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Changes synchronize immediately to student and parent dashboards.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || roster.length === 0}
              className="liquid-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save & Publish Attendance'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
