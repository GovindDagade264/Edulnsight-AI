import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ProfileOnboardingModalProps {
  isOpen: boolean;
}

export const ProfileOnboardingModal: React.FC<ProfileOnboardingModalProps> = ({ isOpen }) => {
  const { user, completeProfile, isLoading } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Student Fields
  const [classId, setClassId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [dob, setDob] = useState('2008-05-14');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // Teacher Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('Senior Faculty');
  const [qualification, setQualification] = useState('M.Sc., B.Ed.');

  useEffect(() => {
    if (isOpen && user?.role === 'student') {
      loadClasses();
    }
  }, [isOpen, user]);

  const loadClasses = async () => {
    try {
      const res = await api.academic.getClasses();
      setClasses(res.classes);
      if (res.classes.length > 0) {
        setClassId(res.classes[0].id);
      }
    } catch (e) {
      console.warn('Could not load classes list', e);
    }
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (user.role === 'student') {
        if (!classId || !rollNumber.trim() || !admissionNumber.trim()) {
          setError('Class, Roll Number, and Admission Number are required.');
          return;
        }
        await completeProfile({
          class_id: classId,
          roll_number: rollNumber.trim(),
          admission_number: admissionNumber.trim(),
          date_of_birth: dob,
          blood_group: bloodGroup,
        });
      } else if (user.role === 'teacher') {
        if (!employeeCode.trim()) {
          setError('Employee Code is required.');
          return;
        }
        await completeProfile({
          employee_code: employeeCode.trim(),
          designation: designation.trim(),
          qualification: qualification.trim(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile onboarding.');
    }
  };

  const isStudent = user.role === 'student';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/90 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-violet-lavender/30 shadow-2xl relative bg-plum-900/95 max-h-[90vh] overflow-y-auto text-left">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center mx-auto mb-3 border border-white/25">
            {isStudent ? (
              <GraduationCap className="w-7 h-7 text-white" />
            ) : (
              <BookOpen className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-violet-lavender px-3 py-1 rounded-full bg-violet-brand/20 border border-violet-brand/30 inline-block mb-1">
            Step 2: Profile Verification
          </span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Complete Your {isStudent ? 'Student' : 'Faculty'} Profile
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Associate your account with official institutional records at {user.institution_name || 'your academic institution'}.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Account Holder</label>
            <div className="p-2.5 rounded-xl bg-plum-950/80 border border-violet-lavender/15 text-xs text-slate-300 flex items-center justify-between">
              <strong className="text-white">{user.full_name}</strong>
              <span className="text-slate-400 font-mono text-[11px]">{user.email}</span>
            </div>
          </div>

          {isStudent ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Class & Division</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Division {c.division} ({c.stream || 'General'})
                    </option>
                  ))}
                  {classes.length === 0 && <option value="cls_10a">Class 10 - Division A (Science)</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 2024-X-104"
                    className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Admission Number</label>
                  <input
                    type="text"
                    required
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. ADM-2024-089"
                    className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Employee / Staff Code</label>
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. EMP-MUM-204"
                  className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior PGT Mathematics"
                  className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Highest Qualification</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. M.Sc. Mathematics, B.Ed."
                  className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full liquid-btn py-2.5 rounded-xl text-xs font-bold shadow-violet-pill flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Verifying & Saving...' : 'Save & Enter Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
