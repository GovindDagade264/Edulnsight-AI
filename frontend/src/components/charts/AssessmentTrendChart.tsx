import React, { useState, useEffect } from 'react';
import { AssessmentTrendPoint } from '../../types';

interface AssessmentTrendChartProps {
  trends: AssessmentTrendPoint[];
  title?: string;
}

export const AssessmentTrendChart: React.FC<AssessmentTrendChartProps> = ({
  trends,
  title = 'Performance Trend',
}) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [animProgress, setAnimProgress] = useState<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimProgress(1);
      return;
    }

    let start: number | null = null;
    const duration = 1200;
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
  }, [trends]);

  if (!trends || trends.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md text-center flex flex-col items-center justify-center min-h-[260px]">
        <h4 className="text-sm font-bold text-white mb-1">No assessment trends available yet.</h4>
        <p className="text-xs text-slate-400">Chronological performance trends will appear once assessments are recorded and published.</p>
      </div>
    );
  }

  const height = 200;
  const paddingX = 50;
  const paddingY = 20;
  const usableWidth = 440;
  const width = usableWidth + paddingX * 2;

  // Compute point coordinates
  const points = trends.map((t, idx) => {
    const x = paddingX + (idx / Math.max(1, trends.length - 1)) * usableWidth;
    const y = paddingY + height - (t.average / 100) * height;
    return { x, y, trend: t, idx };
  });

  // Build SVG path
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Fill area under the line
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height + paddingY} L ${points[0].x} ${height + paddingY} Z`
    : '';

  // Eased progress for left-to-right sweep animation
  const eased = 1 - Math.pow(1 - animProgress, 3);
  const revealWidth = paddingX + usableWidth * eased + 15;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-light shadow-violet-glow"></span>
          {title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2.5 h-0.5 bg-violet-light inline-block"></span>
          <span>Term Average</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${width} ${height + paddingY * 2}`} className="w-full h-52 select-none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B32F5" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#301747" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Animated left-to-right clipPath */}
            <clipPath id="lineClip">
              <rect x="0" y="0" width={revealWidth} height={height + paddingY * 2} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {[20, 40, 60, 80, 100].map((val) => {
            const y = paddingY + height - (val / 100) * height;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(198, 165, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
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

          {/* Area fill - revealed progressively */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#areaGradient)"
              clipPath="url(#lineClip)"
            />
          )}

          {/* Animated Line path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#A855F7"
              strokeWidth="2.5"
              filter="url(#glow)"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#lineClip)"
            />
          )}

          {/* Data nodes revealed as the line sweep reaches them */}
          {points.map((p) => {
            const isHovered = selectedPoint === p.idx;
            const nodeProgressThreshold = p.idx / Math.max(1, points.length - 1);
            const isVisible = eased >= nodeProgressThreshold;
            const nodeOpacity = isVisible ? Math.min(1, (eased - nodeProgressThreshold + 0.1) / 0.2) : 0;

            return (
              <g
                key={p.idx}
                onMouseEnter={() => setSelectedPoint(p.idx)}
                onMouseLeave={() => setSelectedPoint(null)}
                className="cursor-pointer"
                opacity={nodeOpacity}
                style={{ transition: 'opacity 0.2s ease-out' }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : 5}
                  fill={isHovered ? '#FFFFFF' : '#8B32F5'}
                  stroke="#C6A5FF"
                  strokeWidth="2"
                  filter={isHovered ? 'drop-shadow(0 0 8px #C6A5FF)' : undefined}
                />

                {/* Score label above node */}
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#FFFFFF"
                  className="font-mono"
                >
                  {p.trend.average}%
                </text>

                {/* Assessment label at bottom */}
                <text
                  x={p.x}
                  y={height + paddingY + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isHovered ? '#C6A5FF' : '#94A3B8'}
                  className="font-medium"
                >
                  {p.trend.assessment_name.length > 14
                    ? `${p.trend.assessment_name.slice(0, 13)}...`
                    : p.trend.assessment_name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating detail card on hover */}
      {selectedPoint !== null && trends[selectedPoint] && (
        <div className="mt-2 p-2.5 rounded-xl bg-plum-900/95 border border-violet-lavender/30 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div>
            <span className="font-bold text-white">{trends[selectedPoint].assessment_name}</span>
            <span className="text-slate-400 ml-2 font-mono text-[11px]">{trends[selectedPoint].date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Average:</span>
            <strong className="text-violet-lavender font-mono font-bold text-sm">{trends[selectedPoint].average}%</strong>
          </div>
        </div>
      )}
    </div>
  );
};
