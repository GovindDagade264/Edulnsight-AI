import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SectionBSummary } from './SectionBSummary';
import { ShieldCheck, Building, Users, BookOpen, AlertTriangle, FileText, Sliders, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
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
      console.error('Failed to load admin dashboard', err);
      setError(err.message || 'Could not retrieve institution records.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 animate-pulse">
        <ShieldCheck className="w-10 h-10 text-violet-brand mx-auto mb-3 animate-bounce" />
        <p className="text-sm">Loading institutional records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl max-w-lg mx-auto my-12 border border-rose-500/30">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Institutional Data Unavailable</h3>
        <p className="text-xs text-slate-300 mb-4">{error || 'Could not retrieve institution records.'}</p>
        <button onClick={loadDashboard} className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const inst = data.institution || {};
  const stats = data.section_a_statistics || {};
  const summary = data.section_b_summary || {};
  const auditLogs = stats.recent_audit_logs || [];

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Admin Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-7 border border-violet-lavender/25 relative overflow-hidden bg-gradient-to-r from-plum-900/90 via-plum-850/80 to-plum-900/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white border border-white/25 shrink-0">
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {inst.name || 'Academic Institution'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                {inst.board_university || 'CBSE'} • {(inst.city && inst.state) ? `${inst.city}, ${inst.state}` : (inst.city || inst.state || 'Institutional Campus')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-plum-950/80 border border-violet-lavender/15 text-xs text-slate-300">
            <Sliders className="w-4 h-4 text-violet-lavender shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Thresholds</span>
              <span>Attendance: <strong className="text-white font-mono">{stats.attendance_threshold}%</strong> • Pass: <strong className="text-white font-mono">{stats.marks_threshold}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* User-Facing Heading: Statistics */}
      <section className="space-y-6">
        <div className="border-b border-violet-lavender/15 pb-3">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Statistics</h2>
        </div>

        {/* Top Metric Cards — Numbers First */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Students</span>
            <div className="text-3xl font-extrabold font-mono text-white">{stats.total_students}</div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Faculty</span>
            <div className="text-3xl font-extrabold font-mono text-white">{stats.total_teachers}</div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Classes</span>
            <div className="text-3xl font-extrabold font-mono text-white">{stats.total_classes}</div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
            <span className="text-xs text-slate-400 block mb-1">Early Warnings</span>
            <div className="text-3xl font-extrabold font-mono text-amber-300">{stats.active_early_warnings}</div>
          </div>
        </div>

        {/* Audit Registry Table */}
        <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Activity className="w-4 h-4 text-violet-brand" />
              <h3>Audit Log</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Recent Events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-plum-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-violet-lavender/10">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-lavender/10 font-mono text-xs">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans italic">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-plum-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">{log.user_name || 'System Admin'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 text-xs">{log.details}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* User-Facing Heading: Summary */}
      <SectionBSummary summary={summary} />
    </div>
  );
};
