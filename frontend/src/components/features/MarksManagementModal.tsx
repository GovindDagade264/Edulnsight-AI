import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';

interface MarksManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const MarksManagementModal: React.FC<MarksManagementModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
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
    if (selectedClassId) {
      loadSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      loadAssessments(selectedClassId, selectedSubjectId);
    }
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    if (selectedClassId && selectedAssessmentId) {
      loadRoster(selectedClassId, selectedAssessmentId);
    }
  }, [selectedClassId, selectedAssessmentId]);

  const loadClasses = async () => {
    try {
      const res = await api.academic.getClasses();
      setClasses(res.classes);
      if (res.classes.length > 0) {
        setSelectedClassId(res.classes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classes.');
    }
  };

  const loadSubjects = async (classId: string) => {
    try {
      const res = await api.academic.getSubjects(classId);
      setSubjects(res.subjects);
      if (res.subjects.length > 0) {
        setSelectedSubjectId(res.subjects[0].id);
      } else {
        setSelectedSubjectId('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects.');
    }
  };

  const loadAssessments = async (classId: string, subjectId: string) => {
    try {
      const res = await api.academic.getAssessments(classId, subjectId);
      setAssessments(res.assessments);
      if (res.assessments.length > 0) {
        setSelectedAssessmentId(res.assessments[0].id);
      } else {
        setSelectedAssessmentId('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments.');
    }
  };

  const loadRoster = async (classId: string, assessmentId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.academic.getClassRecords(classId, assessmentId);
      setStudents(
        res.students.map((s: any) => ({
          student_id: s.id,
          roll_number: s.roll_number,
          admission_number: s.admission_number,
          full_name: s.full_name,
          marks_obtained: s.mark_record?.marks_obtained ?? '',
          status: s.mark_record?.status || 'PRESENT',
          remarks: s.mark_record?.remarks || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load student assessment roster.');
    } finally {
      setLoading(false);
    }
  };

  const currentAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const maxMarks = currentAssessment?.max_marks || 100;

  const handleMarkChange = (studentId: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id !== studentId) return s;
        if (value === '') {
          return { ...s, marks_obtained: '', status: 'NOT_SUBMITTED' };
        }
        const num = parseFloat(value);
        if (isNaN(num)) return s;
        return {
          ...s,
          marks_obtained: num,
          status: 'PRESENT',
        };
      })
    );
  };

  const handleStatusToggle = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id !== studentId) return s;
        return {
          ...s,
          status,
          marks_obtained: status === 'PRESENT' ? s.marks_obtained : null,
        };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedAssessmentId || students.length === 0) return;

    // Validate marks
    for (const s of students) {
      if (s.status === 'PRESENT' && s.marks_obtained !== '' && s.marks_obtained !== null) {
        const val = Number(s.marks_obtained);
        if (val < 0) {
          setError(`Marks cannot be negative for ${s.full_name}.`);
          return;
        }
        if (val > maxMarks) {
          setError(
            `Marks for ${s.full_name} (${val}) exceed maximum allowed score of ${maxMarks}.`
          );
          return;
        }
      }
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        assessment_id: selectedAssessmentId,
        records: students.map((s) => ({
          student_id: s.student_id,
          marks_obtained: s.marks_obtained === '' || s.marks_obtained === null ? null : Number(s.marks_obtained),
          status: s.status,
          remarks: s.remarks,
        })),
      };

      const res = await api.academic.saveMarks(payload);
      setSuccessMsg(res.message);
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-4xl max-h-[88vh] border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Academic Marks Management</h3>
              <p className="text-xs text-slate-400">
                Enter, validate, and publish official assessment scores
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-violet-lavender/10 bg-plum-950/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-plum-900/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Div {c.division}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-plum-900/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Assessment (Max: {maxMarks} marks)
            </label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full bg-plum-900/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Max {a.max_marks} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="m-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Table Roster */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Award className="w-8 h-8 text-violet-brand mx-auto mb-2 animate-bounce" />
              <p className="text-xs">Loading assessment records...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-xs">No students available for this selection.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-plum-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-violet-lavender/15 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Marks (Max: {maxMarks})</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-lavender/10">
                {students.map((s) => (
                  <tr key={s.student_id} className="hover:bg-plum-800/25 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {s.roll_number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {s.full_name}
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {s.admission_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusToggle(s.student_id, e.target.value)}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 bg-plum-950 border ${
                          s.status === 'PRESENT'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : s.status === 'ABSENT'
                            ? 'text-rose-400 border-rose-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="EXEMPT">EXEMPT</option>
                        <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        step="0.5"
                        disabled={s.status !== 'PRESENT'}
                        value={s.marks_obtained !== null ? s.marks_obtained : ''}
                        onChange={(e) => handleMarkChange(s.student_id, e.target.value)}
                        placeholder="--"
                        className="w-20 text-center bg-plum-950/80 border border-violet-lavender/25 rounded-lg py-1 px-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-violet-brand disabled:opacity-30"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={s.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStudents((prev) =>
                            prev.map((item) =>
                              item.student_id === s.student_id ? { ...item, remarks: val } : item
                            )
                          );
                        }}
                        placeholder="Feedback / notes"
                        className="w-full bg-plum-950/60 border border-violet-lavender/15 rounded-lg py-1 px-2 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-violet-lavender/15 bg-plum-950/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Validated against max marks ({maxMarks}). Published records update student portals live.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="liquid-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Publishing...' : 'Save & Publish Marks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
