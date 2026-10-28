import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SectionAStatistics } from './SectionAStatistics';
import { SectionBSummary } from './SectionBSummary';
import { Users, FileText, MessageCircle, AlertCircle, Heart } from 'lucide-react';

interface ParentDashboardProps {
  onOpenMessages: () => void;
  onOpenReport: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  onOpenMessages,
  onOpenReport,
}) => {
  const [data, setData] = useState<any | null>(null);
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
      console.error('Failed to load parent dashboard', err);
      setError(err.message || 'Could not retrieve academic records.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 animate-pulse">
        <Users className="w-10 h-10 text-violet-brand mx-auto mb-3 animate-bounce" />
        <p className="text-sm">Loading child academic reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl max-w-lg mx-auto my-12 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Academic Data Unavailable</h3>
        <p className="text-xs text-slate-300 mb-4">{error}</p>
        <button onClick={loadDashboard} className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const student = data?.student;

  if (!data || data.no_linked_student || !student || !student.full_name) {
    return (
      <div className="p-10 text-center glass-panel rounded-3xl max-w-lg mx-auto my-12 border border-violet-lavender/30 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-deep/60 border border-violet-lavender/30 flex items-center justify-center mx-auto text-violet-lavender">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">No linked student is available for this account.</h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          Please contact your institution administration or class teacher to associate your ward's student enrollment with this parent account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Parent Child Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-7 border border-violet-lavender/25 relative overflow-hidden bg-gradient-to-r from-plum-900/90 via-plum-850/80 to-plum-900/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white border border-white/25 shrink-0">
              <Heart className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {student.full_name || 'Linked Student'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                {student.class_name ? `${student.class_name} - ${student.division || 'A'}` : 'Class Unassigned'} • Roll No: <strong className="text-white font-mono">{student.roll_number || '--'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenMessages}
              className="liquid-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message Teacher</span>
            </button>
            <button
              onClick={onOpenReport}
              className="glass-outline-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-violet-lavender" />
              <span>Transcript</span>
            </button>
          </div>
        </div>
      </div>

      {/* User-Facing Headings: Statistics & Summary */}
      <SectionAStatistics stats={data.section_a_statistics} role="parent" />
      <SectionBSummary summary={data.section_b_summary} />
    </div>
  );
};
