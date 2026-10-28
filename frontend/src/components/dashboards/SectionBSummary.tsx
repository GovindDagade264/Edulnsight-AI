import React, { useState } from 'react';
import { SectionBSummary as SummaryType, AIInsight } from '../../types';
import { Sparkles, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface SectionBSummaryProps {
  summary: SummaryType;
  onTakeWarningAction?: (warningId: string, action: string) => void;
  canReview?: boolean;
}

export const SectionBSummary: React.FC<SectionBSummaryProps> = ({
  summary,
  onTakeWarningAction,
  canReview = false,
}) => {
  const { b1_numerical_text_summary, b2_ai_insights } = summary;
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedInsights(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section className="space-y-6 pt-2">
      {/* Clean User-Facing Heading: Summary */}
      <div className="border-b border-violet-lavender/15 pb-3">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Summary</h2>
      </div>

      {/* Subsection: Numerical & Text Written Summary */}
      <div className="glass-panel-elevated rounded-2xl p-6 border border-violet-lavender/25 relative overflow-hidden bg-gradient-to-r from-plum-850/80 via-plum-700/50 to-plum-850/80">
        <div className="flex items-center gap-2 mb-3 text-violet-lavender">
          <FileText className="w-4 h-4 text-violet-brand" />
          <h3 className="text-sm font-bold tracking-tight text-white uppercase">
            Performance Overview
          </h3>
        </div>

        <p className="font-medium text-slate-200 text-sm sm:text-base leading-relaxed">
          "{b1_numerical_text_summary.summary_text}"
        </p>

        {/* Compact Highlight Metrics */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
          {b1_numerical_text_summary.overall_percentage !== undefined && b1_numerical_text_summary.overall_percentage !== null && (
            <div className="px-3 py-1.5 rounded-xl bg-plum-900/80 border border-violet-lavender/15 text-slate-300">
              Aggregate: <strong className="text-white font-mono ml-1 font-bold">{b1_numerical_text_summary.overall_percentage}%</strong>
            </div>
          )}
          {b1_numerical_text_summary.attendance_percentage !== undefined && b1_numerical_text_summary.attendance_percentage !== null && (
            <div className="px-3 py-1.5 rounded-xl bg-plum-900/80 border border-violet-lavender/15 text-slate-300">
              Attendance: <strong className="text-white font-mono ml-1 font-bold">{b1_numerical_text_summary.attendance_percentage}%</strong>
            </div>
          )}
          {b1_numerical_text_summary.class_average !== undefined && (
            <div className="px-3 py-1.5 rounded-xl bg-plum-900/80 border border-violet-lavender/15 text-slate-300">
              Class Average: <strong className="text-white font-mono ml-1 font-bold">{b1_numerical_text_summary.class_average}%</strong>
            </div>
          )}
        </div>
      </div>

      {/* Subsection: AI Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-glow">
            <Sparkles className="w-4 h-4 text-violet-lavender" />
            <h3 className="text-sm font-bold tracking-tight text-white uppercase">
              AI Insights
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-plum-900/60 px-2.5 py-0.5 rounded-full border border-violet-lavender/15">
            {b2_ai_insights.length} Diagnostic{b2_ai_insights.length === 1 ? '' : 's'}
          </span>
        </div>

        {b2_ai_insights.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
            <p className="text-xs">No anomalous performance indicators detected. Progression is on track.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {b2_ai_insights.map((insight) => {
              const isExpanded = !!expandedInsights[insight.id];
              const isHigh = insight.risk_level === 'HIGH';
              const isModerate = insight.risk_level === 'MODERATE';
              const isExcellence = insight.risk_level === 'EXCELLENCE';

              return (
                <div
                  key={insight.id}
                  className={`glass-panel rounded-2xl p-5 border transition-all duration-200 ${
                    isHigh
                      ? 'border-rose-500/40 bg-plum-850/80'
                      : isModerate
                      ? 'border-amber-500/35 bg-plum-850/80'
                      : isExcellence
                      ? 'border-emerald-500/35 bg-plum-850/80'
                      : 'border-violet-lavender/25 bg-plum-850/70'
                  }`}
                >
                  {/* Top Bar: Subject, Risk badge, Review Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-plum-900 border border-violet-lavender/20 text-slate-300">
                        {insight.subject_name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isModerate
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isExcellence
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-violet-brand/20 text-violet-lavender border border-violet-brand/40'
                      }`}>
                        {isHigh || isModerate ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        {insight.risk_level}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-plum-900 border border-violet-lavender/25 text-violet-lavender">
                      {insight.status}
                    </span>
                  </div>

                  {/* Insight Statement */}
                  <h4 className="text-base font-bold text-white mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                    {insight.insight}
                  </p>

                  {/* Progressive Disclosure Toggle */}
                  <button
                    onClick={() => toggleExpand(insight.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-lavender hover:text-white transition-colors py-1 group"
                  >
                    <span>{isExpanded ? 'Hide Evidence & Action Plan' : 'View Evidence & Action Plan'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-violet-lavender" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-violet-lavender group-hover:translate-y-0.5 transition-transform" />
                    )}
                  </button>

                  {/* Expanded Diagnostic Evidence Drawer */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-violet-lavender/15 space-y-3 text-xs animate-fadeIn">
                      <div className="p-3 rounded-xl bg-plum-900/70 border border-violet-lavender/15">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Context</span>
                        <p className="text-slate-200">{insight.why_it_matters}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-plum-900/70 border border-violet-lavender/15">
                        <span className="text-[10px] uppercase font-bold text-sky-400 block mb-1">Supporting Data</span>
                        <p className="text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-line">{insight.evidence}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-plum-900/70 border border-emerald-500/20 bg-emerald-950/10">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Recommended Action</span>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-line">{insight.recommended_action}</p>
                      </div>

                      {insight.teacher_feedback && (
                        <div className="p-3 rounded-xl bg-plum-900/80 border border-violet-brand/25">
                          <span className="text-[10px] font-bold uppercase text-violet-lavender block mb-1">
                            Teacher Note
                          </span>
                          <p className="text-slate-300 italic">"{insight.teacher_feedback}"</p>
                        </div>
                      )}

                      {/* Review / Dismiss actions for Teacher / Admin */}
                      {canReview && onTakeWarningAction && insight.status === 'ACTIVE' && (
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => onTakeWarningAction(insight.id, 'DISMISS')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-plum-900 text-slate-300 border border-violet-lavender/25 hover:bg-plum-800 transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => onTakeWarningAction(insight.id, 'REVIEW')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-brand text-white shadow-violet-pill hover:bg-violet-deep transition-all"
                          >
                            Mark Reviewed
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
