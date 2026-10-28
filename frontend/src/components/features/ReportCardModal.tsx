import React, { useRef } from 'react';
import { X, Printer, Download, Award, FileText, CheckCircle2 } from 'lucide-react';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: any;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  dashboardData,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !dashboardData) return null;

  const student = dashboardData.student || {};
  const stats = dashboardData.section_a_statistics || {};
  const summary = dashboardData.section_b_summary || {};
  const subjects = stats.subjects || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-plum-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-4xl border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden my-auto">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/80 print:hidden">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileText className="w-4 h-4 text-violet-brand" />
            <span>Official Academic Performance Transcript (CBSE Format)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="liquid-btn px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet-pill"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          ref={reportRef}
          className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto max-h-[75vh] print:max-h-none print:p-0 print:overflow-visible font-sans"
        >
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 font-serif">
              {student.institution_name || 'Academic Institution'}
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Affiliated Institution • Code: {student.institution_code || '--'}
            </p>
            <p className="text-[11px] text-slate-500">
              Comprehensive Evaluation & Continuous Assessment Record
            </p>
            <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded tracking-wider uppercase">
              Official Academic Transcript & AI Diagnostic Report Card
            </div>
          </div>

          {/* Student Bio Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-slate-300 text-xs mb-6 bg-slate-50">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Student Name</span>
              <strong className="text-slate-900 text-sm">{student.full_name || 'Enrolled Student'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Roll Number</span>
              <strong className="text-slate-900 font-mono text-sm">{student.roll_number || '--'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Class & Division</span>
              <strong className="text-slate-900 text-sm">
                {student.class_name ? `${student.class_name} - ${student.division || 'A'}` : 'Class Unassigned'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Academic Term</span>
              <strong className="text-slate-900 text-sm">2024 - 2025</strong>
            </div>
          </div>

          {/* Subject Assessment Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-300 pb-1">
              Part I: Scholastic Subject Evaluations
            </h3>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Subject</th>
                  <th className="p-2 border-r border-slate-300">Code</th>
                  <th className="p-2 border-r border-slate-300 text-center">Evaluations</th>
                  <th className="p-2 border-r border-slate-300 text-right">Aggregate Score</th>
                  <th className="p-2 text-center">Rating</th>
                </tr>
              </thead>
              <tbody>
                {!subjects || subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                      No subject evaluations recorded yet.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub: any) => (
                    <tr key={sub.subject_id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">{sub.name}</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-slate-600">{sub.code}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{sub.assessments?.length ?? 0}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                        {sub.percentage !== null && sub.percentage !== undefined ? `${sub.percentage}%` : '--'}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.percentage !== null && sub.percentage !== undefined ? (
                            sub.percentage >= 75 ? 'bg-emerald-100 text-emerald-800' :
                            sub.percentage >= 50 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          ) : 'bg-slate-100 text-slate-600'
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

          {/* Aggregate & Attendance Summary Box */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Overall Performance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {stats.overall_aggregate_pct !== null && stats.overall_aggregate_pct !== undefined ? `${stats.overall_aggregate_pct}%` : '--'}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {stats.overall_aggregate_pct !== null && stats.overall_aggregate_pct !== undefined
                    ? (stats.overall_aggregate_pct >= 75 ? 'First Division with Distinction' : 'Passed')
                    : 'Pending Evaluation'}
                </span>
              </div>
            </div>

            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Attendance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {stats.attendance?.percentage !== null && stats.attendance?.percentage !== undefined ? `${stats.attendance.percentage}%` : '--'}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {stats.attendance?.percentage !== null && stats.attendance?.percentage !== undefined
                    ? `(${stats.attendance?.present_days} / ${stats.attendance?.total_days} Working Days)`
                    : 'Pending Attendance'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Summary */}
          <div className="p-3.5 border border-slate-300 rounded-lg bg-slate-50 text-xs mb-8 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Faculty Evaluation & Recommendations
            </h4>
            <p className="text-slate-700 leading-relaxed italic">
              "{summary.b1_numerical_text_summary?.summary_text || 'No academic evaluations recorded yet.'}"
            </p>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div>
              <div className="h-10"></div>
              <span className="border-t border-slate-400 pt-1 block font-semibold text-slate-800">
                Class Faculty
              </span>
              <span className="text-[10px] text-slate-500">Authorized Faculty Signature</span>
            </div>

            <div>
              <div className="h-10"></div>
              <span className="border-t border-slate-400 pt-1 block font-semibold text-slate-800">
                Controller of Examinations
              </span>
              <span className="text-[10px] text-slate-500">Academic Evaluation Wing</span>
            </div>

            <div>
              <div className="h-10"></div>
              <span className="border-t border-slate-400 pt-1 block font-semibold text-slate-800">
                Principal & Head of School
              </span>
              <span className="text-[10px] text-slate-500">Institutional Seal & Sign</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
