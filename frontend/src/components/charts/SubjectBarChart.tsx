import React, { useState, useEffect } from 'react';
import { SubjectScore } from '../../types';

interface SubjectBarChartProps {
  subjects: SubjectScore[];
  title?: string;
  passThreshold?: number;
}

export const SubjectBarChart: React.FC<SubjectBarChartProps> = ({
  subjects,
  title = 'Subject Scores',
  passThreshold = 40,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animProgress, setAnimProgress] = useState<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimProgress(1);
      return;
    }

    let start: number | null = null;
    const duration = 1000;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      setAnimProgress(progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [subjects]);

  if (!subjects || subjects.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md text-center">
        <h4 className="text-sm font-bold text-white mb-1">Marks not updated yet. Please contact your faculty.</h4>
        <p className="text-xs text-slate-400">No subject performance data available for this academic period.</p>
      </div>
    );
  }

  const chartHeight = 220;
  const barWidth = 36;
  const gap = 24;
  const paddingLeft = 45;
  const paddingBottom = 35;
  const totalWidth = paddingLeft + subjects.length * (barWidth + gap) + 20;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-brand shadow-violet-pill"></span>
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-violet-deep to-violet-brand inline-block"></span>
            <span>Marks (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block"></span>
            <span>Pass ({passThreshold}%)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${Math.max(totalWidth, 480)} ${chartHeight + paddingBottom}`}
          className="w-full h-56 select-none"
        >
          <defs>
            <linearGradient id="violetBarGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="hoverBarGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#8B32F5" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#C6A5FF" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Grid lines at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = chartHeight - (val / 100) * chartHeight + 10;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={totalWidth}
                  y2={y}
                  stroke="rgba(198, 165, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  className="font-mono font-medium"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Pass threshold line */}
          {(() => {
            const passY = chartHeight - (passThreshold / 100) * chartHeight + 10;
            return (
              <line
                x1={paddingLeft}
                y1={passY}
                x2={totalWidth}
                y2={passY}
                stroke="#F43F5E"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.7"
              />
            );
          })()}

          {/* Bars with Staggered Entrance Animation */}
          {subjects.map((sub, i) => {
            const x = paddingLeft + i * (barWidth + gap) + 12;

            // Staggered ease-out growth
            const staggerDelay = (i * 0.05);
            const rawProgress = Math.max(0, Math.min(1, (animProgress - staggerDelay) / Math.max(0.01, 1 - staggerDelay)));
            const eased = 1 - Math.pow(1 - rawProgress, 3);

            const val = sub.percentage ?? 0;
            const targetH = Math.max(4, (val / 100) * chartHeight);
            const currentH = targetH * eased;
            const y = chartHeight - currentH + 10;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={sub.subject_id}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all"
              >
                {/* Column hover highlight */}
                {isHovered && (
                  <rect
                    x={x - 6}
                    y={10}
                    width={barWidth + 12}
                    height={chartHeight}
                    fill="rgba(139, 50, 245, 0.1)"
                    rx="6"
                  />
                )}

                {/* Animated Score Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={currentH}
                  rx="6"
                  fill={isHovered ? 'url(#hoverBarGrad)' : 'url(#violetBarGrad)'}
                  filter={isHovered ? 'drop-shadow(0 0 10px rgba(139, 50, 245, 0.6))' : undefined}
                />

                {/* Score text on top of bar */}
                {eased > 0.3 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={isHovered ? '#FFFFFF' : '#E2E8F0'}
                    opacity={Math.min(1, (eased - 0.3) / 0.5)}
                    className="font-mono"
                  >
                    {sub.percentage !== null && sub.percentage !== undefined ? `${sub.percentage}%` : '--'}
                  </text>
                )}

                {/* Subject label at bottom */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 24}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isHovered ? '#C6A5FF' : '#94A3B8'}
                  className="font-medium"
                >
                  {sub.name.length > 10 ? `${sub.name.slice(0, 9)}...` : sub.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating hover card */}
      {hoveredIdx !== null && subjects[hoveredIdx] && (
        <div className="mt-2 p-2.5 rounded-xl bg-plum-900/95 border border-violet-lavender/30 text-xs flex items-center justify-between animate-fadeIn">
          <div>
            <span className="font-bold text-white">{subjects[hoveredIdx].name}</span>
            <span className="text-slate-400 ml-2 font-mono text-[11px]">{subjects[hoveredIdx].code}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-300">Marks: <strong className="text-violet-lavender font-mono font-bold">
              {subjects[hoveredIdx].percentage !== null && subjects[hoveredIdx].percentage !== undefined ? `${subjects[hoveredIdx].percentage}%` : '--'}
            </strong></span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              subjects[hoveredIdx].percentage !== null && subjects[hoveredIdx].percentage !== undefined ? (
                subjects[hoveredIdx].percentage! >= 75 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                subjects[hoveredIdx].percentage! >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              ) : 'bg-plum-900 text-slate-400 border border-violet-lavender/15'
            }`}>
              {subjects[hoveredIdx].status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
