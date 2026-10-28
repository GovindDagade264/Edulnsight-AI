import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SectionAStatistics } from './SectionAStatistics';
import { SectionBSummary } from './SectionBSummary';
import { StudentDashboardResponse } from '../../types';
import { GraduationCap, FileText, AlertCircle } from 'lucide-react';

interface StudentDashboardProps {
  onOpenReport: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onOpenReport }) => {
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.analytics.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 animate-pulse">
        <GraduationCap className="w-10 h-10 text-violet-brand mx-auto mb-3 animate-bounce" />
        <p className="text-sm">Loading academic records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl max-w-lg mx-auto my-12 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Academic Data Unavailable</h3>
        <p className="text-xs text-slate-300 mb-4">{error || 'Could not retrieve academic records.'}</p>
        <button onClick={loadDashboard} className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const student = data.student || {};

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Student Profile Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-7 border border-violet-lavender/25 relative overflow-hidden bg-gradient-to-r from-plum-900/90 via-plum-850/80 to-plum-900/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white border border-white/25 shrink-0">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {student.full_name || 'Enrolled Student'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                {student.class_name ? `${student.class_name} - ${student.division || 'A'}` : 'Class Unassigned'} • Roll No: <strong className="text-white font-mono">{student.roll_number || '--'}</strong>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenReport}
              className="liquid-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill"
            >
              <FileText className="w-4 h-4" />
              <span>Academic Transcript</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean User-Facing Sections: Statistics & Summary */}
      <SectionAStatistics stats={data.section_a_statistics} role="student" />
      <SectionBSummary summary={data.section_b_summary} />
    </div>
  );
};
