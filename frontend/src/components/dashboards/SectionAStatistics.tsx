import React from 'react';
import { SectionAStatistics as StatsType } from '../../types';
import { SubjectBarChart } from '../charts/SubjectBarChart';
import { AssessmentTrendChart } from '../charts/AssessmentTrendChart';
import { AttendanceDonutChart } from '../charts/AttendanceDonutChart';
import { Award, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface SectionAStatisticsProps {
  stats: StatsType;
  role?: string;
}

export const SectionAStatistics: React.FC<SectionAStatisticsProps> = ({ stats, role = 'student' }) => {
  const {
    overall_aggregate_pct,
    attendance,
    subjects,
    assessment_trends,
    strongest_subject,
    weakest_subject,
    grade_distribution
  } = stats;

  return (
    <section className="space-y-6">
      {/* Clean User-Facing Heading: Statistics */}
      <div className="border-b border-violet-lavender/15 pb-3 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Statistics</h2>
        <span className="text-xs text-slate-400 font-mono bg-plum-900/60 px-3 py-1 rounded-full border border-violet-lavender/10">
          Term 2024–2025
        </span>
      </div>

      {/* Top Metric Cards — Key Numbers First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Aggregate */}
        <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60 relative overflow-hidden group hover:border-violet-brand/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Aggregate</span>
            <Award className="w-4 h-4 text-violet-lavender" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {overall_aggregate_pct !== null && overall_aggregate_pct !== undefined
                ? `${overall_aggregate_pct}%`
                : '--'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              overall_aggregate_pct !== null && overall_aggregate_pct !== undefined
                ? overall_aggregate_pct >= 75
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-plum-900 text-slate-400 border border-violet-lavender/15'
            }`}>
              {overall_aggregate_pct !== null && overall_aggregate_pct !== undefined
                ? overall_aggregate_pct >= 75
                  ? 'Distinction'
                  : 'Pass'
                : 'Pending'}
            </span>
          </div>
        </div>

        {/* Card 2: Attendance */}
        <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60 relative overflow-hidden group hover:border-violet-brand/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Attendance</span>
            <Calendar className="w-4 h-4 text-violet-lavender" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {attendance?.percentage !== null && attendance?.percentage !== undefined
                ? `${attendance.percentage}%`
                : '--'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              attendance?.percentage !== null && attendance?.percentage !== undefined
                ? attendance.is_compliant
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-plum-900 text-slate-400 border border-violet-lavender/15'
            }`}>
              {attendance?.percentage !== null && attendance?.percentage !== undefined
                ? attendance.is_compliant
                  ? 'Eligible'
                  : 'Shortfall'
                : 'Pending'}
            </span>
          </div>
        </div>

        {/* Card 3: Top Subject */}
        <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60 relative overflow-hidden group hover:border-violet-brand/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Top Subject</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white truncate" title={strongest_subject || '--'}>
            {strongest_subject || '--'}
          </div>
        </div>

        {/* Card 4: Needs Attention */}
        <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60 relative overflow-hidden group hover:border-violet-brand/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Needs Attention</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white truncate" title={weakest_subject || '--'}>
            {weakest_subject || '--'}
          </div>
        </div>
      </div>

      {/* Cohort Grade distribution for teacher role */}
      {grade_distribution && (
        <div className="glass-panel rounded-2xl p-4 border border-violet-lavender/15 bg-plum-850/60">
          <h4 className="text-xs font-bold text-slate-300 mb-2">Grade Distribution</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {Object.entries(grade_distribution).map(([bracket, count]) => (
              <div key={bracket} className="p-2.5 rounded-xl bg-plum-900/60 border border-violet-lavender/10">
                <span className="text-2xl font-extrabold font-mono text-violet-lavender">{count}</span>
                <p className="text-[11px] text-slate-300 mt-0.5 font-medium">{bracket}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectBarChart subjects={subjects} />
        <AssessmentTrendChart trends={assessment_trends} />
      </div>

      {/* Attendance & Subject Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AttendanceDonutChart attendance={attendance} />
        </div>
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">Subjects</h3>
            <span className="text-xs text-slate-400 font-mono">
              {(subjects && subjects.length > 0) ? `${subjects.length} Recorded` : '0 Recorded'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-plum-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-violet-lavender/10">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-center">Tests</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-lavender/10">
                {!subjects || subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Marks not updated yet. Please contact your faculty.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub.subject_id} className="hover:bg-plum-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{sub.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{sub.code}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {sub.percentage !== null && sub.percentage !== undefined ? `${sub.percentage}%` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{sub.assessments?.length ?? 0}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.percentage !== null && sub.percentage !== undefined ? (
                            sub.percentage >= 75
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : sub.percentage >= 50
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          ) : 'bg-plum-900 text-slate-400 border border-violet-lavender/15'
                        }`}>
                          {sub.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
