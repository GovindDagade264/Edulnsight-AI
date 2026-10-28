import React, { useState, useEffect } from 'react';
import { AttendanceStats } from '../../types';
import { Calendar, AlertCircle } from 'lucide-react';

interface AttendanceDonutChartProps {
  attendance: AttendanceStats & { has_data?: boolean; status_message?: string | null };
  title?: string;
}

export const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({
  attendance,
  title = 'Attendance',
}) => {
  const hasData =
    attendance &&
    attendance.has_data !== false &&
    attendance.percentage !== null &&
    attendance.percentage !== undefined &&
    attendance.total_days > 0;

  const percentage = hasData ? (attendance.percentage as number) : 0;
  const { total_days = 0, present_days = 0, absent_days = 0, late_days = 0, is_compliant = true } =
    attendance || {};
  const [animatedPct, setAnimatedPct] = useState<number>(0);

  useEffect(() => {
    if (!hasData) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPct(percentage);
      return;
    }

    let start: number | null = null;
    const duration = 1100;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(+(percentage * eased).toFixed(1));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setAnimatedPct(percentage);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [percentage, hasData]);

  if (!hasData) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md flex flex-col justify-between min-h-[260px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            {title}
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Pending Update
          </span>
        </div>

        <div className="my-auto py-6 px-4 text-center rounded-xl bg-plum-900/40 border border-violet-lavender/10">
          <Calendar className="w-8 h-8 text-amber-400/80 mx-auto mb-2.5" />
          <h4 className="text-sm font-bold text-white mb-1">
            Attendance not updated yet. Please contact your faculty.
          </h4>
          <p className="text-xs text-slate-400">
            No attendance data available for this academic period.
          </p>
        </div>
      </div>
    );
  }

  const radius = 64;
  const stroke = 14;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60 backdrop-blur-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              is_compliant ? 'bg-emerald-400' : 'bg-rose-400'
            } animate-pulse-subtle`}
          ></span>
          {title}
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            is_compliant
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {is_compliant ? 'Compliant' : 'Shortfall'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around py-3 gap-6">
        {/* Animated Circular Donut Ring */}
        <div className="relative flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
            {/* Background track */}
            <circle
              stroke="rgba(198, 165, 255, 0.12)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Value stroke animating smoothly from 0 */}
            <circle
              stroke={is_compliant ? '#8B32F5' : '#F43F5E'}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          {/* Centered Percentage Counter */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {animatedPct}%
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Present
            </span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="flex flex-col gap-2 text-xs w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-4 p-2 rounded-lg bg-plum-900/60 border border-violet-lavender/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Present:</span>
            </div>
            <strong className="text-white font-mono font-bold">
              {present_days} / {total_days}
            </strong>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 p-2 rounded-lg bg-plum-900/60 border border-violet-lavender/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="text-slate-300">Absent:</span>
            </div>
            <strong className="text-rose-300 font-mono font-bold">{absent_days}</strong>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 p-2 rounded-lg bg-plum-900/60 border border-violet-lavender/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">Late:</span>
            </div>
            <strong className="text-amber-300 font-mono font-bold">{late_days}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
