import React, { useState, useRef } from 'react';
import { Award, TrendingUp, Sparkles, CheckCircle2, ShieldCheck, Zap, Activity } from 'lucide-react';

export const HeroVisual: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 22, y: -y * 22 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-lg lg:max-w-none flex items-center justify-center py-10 select-none group cursor-pointer"
      style={{ perspective: '1100px' }}
    >
      {/* Background Volumetric Glow (reacts to hover with intensified bloom) */}
      <div
        className={`absolute w-96 h-96 rounded-full pointer-events-none transition-all duration-700 ease-out ${
          isHovered
            ? 'bg-violet-brand/40 scale-125 blur-3xl opacity-100'
            : 'bg-violet-brand/20 scale-100 blur-2xl opacity-75'
        }`}
      />
      <div
        className={`absolute w-72 h-72 rounded-full pointer-events-none transition-all duration-700 ease-out -top-6 -right-6 ${
          isHovered
            ? 'bg-violet-light/35 scale-120 blur-2xl opacity-90'
            : 'bg-violet-deep/30 scale-95 blur-xl opacity-60'
        }`}
      />

      {/* 3D Tilted Interactive Canvas Container */}
      <div
        className="relative z-10 w-80 sm:w-96 h-80 sm:h-96 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg) scale(${isHovered ? 1.04 : 1})`,
        }}
      >
        {/* =========================================================================
            SIRI FLUIDIC CIRCLING RINGS (LAYER 1: OUTERMOST CELESTIAL ORBIT)
           ========================================================================= */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-violet-lavender/25 siri-orbit-fast transition-all duration-500 pointer-events-none ${
            isHovered ? 'scale-115 border-violet-lavender/50 opacity-100' : 'scale-105 opacity-60'
          }`}
        >
          {/* Orbiting Satellite Light Beads */}
          <span className="absolute -top-1.5 left-1/2 w-3 h-3 -ml-1.5 rounded-full bg-violet-light shadow-[0_0_12px_#C6A5FF]" />
          <span className="absolute -bottom-1 left-1/3 w-2 h-2 rounded-full bg-violet-brand shadow-[0_0_8px_#8B32F5]" />
          <span className="absolute top-1/3 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34D399]" />
        </div>

        {/* =========================================================================
            SIRI FLUIDIC CIRCLING RINGS (LAYER 2: FLUIDIC MORPHING AURA RING 1)
           ========================================================================= */}
        <div
          className={`absolute w-76 sm:w-88 h-76 sm:h-88 siri-fluid-ring-1 transition-all duration-500 pointer-events-none border border-violet-light/40 shadow-[0_0_25px_rgba(168,85,247,0.35)] ${
            isHovered
              ? 'scale-110 border-violet-lavender/70 shadow-[0_0_40px_rgba(198,165,255,0.6)]'
              : 'scale-100'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(139, 50, 245, 0.12) 0%, rgba(198, 165, 255, 0.05) 50%, rgba(56, 189, 248, 0.12) 100%)',
          }}
        />

        {/* =========================================================================
            SIRI FLUIDIC CIRCLING RINGS (LAYER 3: COUNTER-ROTATING FLUIDIC RING 2)
           ========================================================================= */}
        <div
          className={`absolute w-72 sm:w-80 h-72 sm:h-80 siri-fluid-ring-2 transition-all duration-500 pointer-events-none border border-violet-brand/45 shadow-[inset_0_0_20px_rgba(139,50,245,0.3)] ${
            isHovered
              ? 'scale-108 border-violet-brand/80 shadow-[inset_0_0_30px_rgba(168,85,247,0.5)]'
              : 'scale-98'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* =========================================================================
            SIRI FLUIDIC CIRCLING RINGS (LAYER 4: INNER WAVE DISK WITH FROSTED GLASS)
           ========================================================================= */}
        <div
          className={`relative z-10 w-64 sm:w-72 h-64 sm:h-72 rounded-full p-1.5 transition-all duration-500 flex items-center justify-center ${
            isHovered
              ? 'shadow-[0_0_50px_rgba(139,50,245,0.65),inset_0_0_25px_rgba(255,255,255,0.25)] border border-violet-lavender/50'
              : 'shadow-[0_0_30px_rgba(139,50,245,0.35),inset_0_0_15px_rgba(255,255,255,0.12)] border border-violet-lavender/25'
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(76, 29, 149, 0.85) 0%, rgba(32, 19, 43, 0.95) 75%, rgba(15, 6, 25, 0.98) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Specular Apple Glass Lens Sheen */}
          <div className="absolute top-1 left-2 right-2 h-1/2 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-full pointer-events-none" />

          {/* Core Glowing Siri Orb Disk */}
          <div className="relative w-52 sm:w-56 h-52 sm:h-56 rounded-full flex flex-col items-center justify-center p-5 text-center overflow-hidden siri-pulse-core border border-white/15">
            {/* Ambient Multi-Hue Chromatic Fluid Plasma Background */}
            <div
              className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                isHovered ? 'opacity-95' : 'opacity-70'
              }`}
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(139, 50, 245, 0.45) 0%, rgba(79, 70, 229, 0.3) 45%, rgba(20, 10, 31, 0.9) 80%)',
              }}
            />

            {/* Siri Animated Audio Waveform Spectrum (surges upon hover) */}
            <div className="relative z-10 flex items-center gap-1.5 mb-2.5 h-9">
              {[0.5, 0.85, 1.2, 0.7, 1.4, 0.9, 0.6].map((scale, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-violet-lavender via-violet-light to-white transition-all duration-300"
                  style={{
                    height: isHovered ? `${Math.min(36, 14 * scale + 12)}px` : `${Math.max(6, 12 * scale)}px`,
                    animation: isHovered
                      ? `siriWavePulse ${0.6 + i * 0.12}s ease-in-out infinite alternate`
                      : `siriWavePulse ${1.2 + i * 0.18}s ease-in-out infinite alternate`,
                    boxShadow: '0 0 8px rgba(198, 165, 255, 0.8)',
                  }}
                />
              ))}
            </div>

            {/* Core Academic Index */}
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
                88.4%
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-lavender mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-brand" />
                <span>AI Mastery Index</span>
              </span>
              <span className="text-[10px] text-slate-300/80 font-medium mt-0.5 font-mono">
                Class 10-A • CBSE Benchmark
              </span>
            </div>

            {/* Interactive State Feedback Badge */}
            <div
              className={`relative z-10 mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                isHovered
                  ? 'bg-violet-brand/35 text-white border-violet-lavender/60 shadow-[0_0_12px_rgba(139,50,245,0.7)]'
                  : 'bg-plum-950/60 text-slate-400 border-violet-lavender/20'
              }`}
            >
              {isHovered ? 'Active Cognition' : 'Neural Idle'}
            </div>
          </div>
        </div>

        {/* =========================================================================
            iOS-STYLE TRANSLUCENT FLOATING GLOW CARDS (APPLE INTELLIGENCE WIDGETS)
           ========================================================================= */}

        {/* Floating Card 1: Top-Right (Attendance Compliance) */}
        <div
          className={`absolute -top-4 -right-6 sm:-right-10 rounded-2xl p-3 border border-white/20 shadow-2xl flex items-center gap-3 transition-all duration-500 ${
            isHovered
              ? 'translate-x-1 -translate-y-1 shadow-[0_12px_30px_rgba(16,185,129,0.25)] border-emerald-400/40'
              : 'translate-x-0 translate-y-0'
          }`}
          style={{
            background: 'rgba(32, 19, 43, 0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              CBSE Mandate
            </span>
            <strong className="text-xs font-mono font-bold text-white">94.3% Attendance</strong>
          </div>
        </div>

        {/* Floating Card 2: Bottom-Left (Explainable AI Insight) */}
        <div
          className={`absolute -bottom-6 -left-6 sm:-left-10 rounded-2xl p-3.5 border border-white/20 shadow-2xl flex items-start gap-3 max-w-[240px] text-left transition-all duration-500 ${
            isHovered
              ? '-translate-x-1 translate-y-1 shadow-[0_12px_35px_rgba(139,50,245,0.35)] border-violet-lavender/40'
              : 'translate-x-0 translate-y-0'
          }`}
          style={{
            background: 'rgba(32, 19, 43, 0.78)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-2 rounded-xl bg-violet-brand/25 text-violet-lavender border border-violet-brand/40 mt-0.5 shrink-0">
            <Sparkles className="w-4 h-4 text-violet-light animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-violet-lavender font-bold uppercase tracking-wider block">
              AI Early Warning
            </span>
            <p className="text-xs font-bold text-white mt-0.5">Calculus Proof Dip</p>
            <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
              Remedial sheet generated
            </span>
          </div>
        </div>

        {/* Floating Card 3: Mid-Right (Longitudinal Growth Pill) */}
        <div
          className={`absolute bottom-14 -right-8 sm:-right-12 rounded-xl px-3.5 py-2 border border-white/20 shadow-xl flex items-center gap-2 transition-all duration-500 ${
            isHovered
              ? 'translate-x-1.5 shadow-[0_8px_25px_rgba(16,185,129,0.3)] border-emerald-400/40'
              : 'translate-x-0'
          }`}
          style={{
            background: 'rgba(32, 19, 43, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-black text-white">+14.2%</span>
          <span className="text-[10px] text-slate-300 font-semibold">Pre-Board Growth</span>
        </div>
      </div>
    </div>
  );
};
