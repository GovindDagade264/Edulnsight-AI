import React from 'react';
import { HeroVisual } from './HeroVisual';
import {
  Sparkles,
  BookOpen,
  Users,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  Building,
  GraduationCap,
  Layers,
  FileText,
  Calendar
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuthModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuthModal }) => {
  return (
    <div className="min-h-screen bg-plum-950 text-slate-100 ambient-glow-bg overflow-hidden flex flex-col selection:bg-violet-brand selection:text-white relative">
      {/* Dynamic atmospheric ambient purple glow mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="glow-blob-1"></div>
        <div className="glow-blob-2"></div>
        <div className="glow-blob-3"></div>
      </div>

      {/* Top Navigation Bar (Reference-Inspired) */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-plum-950/70 border-b border-violet-lavender/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center border border-white/25">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
                EduInsight <span className="text-violet-lavender font-mono text-sm px-1.5 py-0.5 rounded-md bg-violet-brand/20 border border-violet-brand/40">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">Academic Analytics Platform</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Platform Features</a>
            <a href="#indian-context" className="hover:text-white transition-colors">Indian Curricula</a>
            <a href="#two-section-design" className="hover:text-white transition-colors">Statistics & Summary</a>
          </nav>

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAuthModal}
              className="liquid-btn px-5 py-2.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-violet-pill"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Access Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Text Column */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill text-xs font-semibold text-violet-lavender border-violet-lavender/30">
              <Sparkles className="w-3.5 h-3.5 text-violet-brand animate-pulse" />
              <span>Engineered for CBSE, ICSE, State Boards & Indian Universities</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Understand Performance. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-lavender via-violet-light to-violet-brand">
                Unlock Potential.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Transform academic data into meaningful insights that help students grow, empower teachers, and support better educational decisions.
            </p>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenAuthModal}
                className="liquid-btn px-7 py-3.5 rounded-full text-sm font-bold tracking-wide flex items-center gap-2 shadow-violet-pill"
              >
                <span>Access Academic Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAuthModal}
                className="glass-outline-btn px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide flex items-center gap-2"
              >
                <span>Sign In / Register</span>
              </button>
            </div>

            {/* Institutional Security & Privacy Indicators */}
            <div className="pt-6 border-t border-violet-lavender/15 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CBSE & ICSE Aligned</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Strict Multi-Tenant Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Role-Based Secure Access</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Column (Glass Mastery Hub) */}
          <div className="lg:col-span-5 flex justify-center">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Interactive Section A & Section B Architecture Preview */}
      <section id="two-section-design" className="py-16 bg-plum-900/40 border-y border-violet-lavender/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-brand/20 text-violet-lavender text-xs font-bold uppercase tracking-wider mb-3 border border-violet-brand/40">
            Mandatory Core Philosophy
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Statistics & Summary Architecture
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2">
            Every user portal cleanly distinguishes empirical numerical statistics from verified summaries and explainable AI insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 text-left">
            {/* Box 1: Statistics */}
            <div className="glass-panel-elevated rounded-2xl p-6 border border-violet-lavender/25 relative overflow-hidden">
              <div className="flex items-center gap-2 text-violet-lavender font-bold text-sm uppercase tracking-wider mb-2">
                <BarChart3 className="w-4 h-4 text-violet-brand" />
                <span>Statistics</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Numerical & Chart Visualizations</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Clean bar charts comparing subject scores against pass marks, longitudinal term trend lines, and circular attendance compliance indicators.
              </p>
              <div className="p-3.5 rounded-xl bg-plum-950/80 border border-violet-lavender/15 font-mono text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between">
                  <span>Mathematics (Pre-Board):</span>
                  <strong className="text-white">67.5% (54/80)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Science (Pre-Board):</span>
                  <strong className="text-white">91.2% (73/80)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Computer Applications:</span>
                  <strong className="text-emerald-400 font-bold">96.0% (Highest)</strong>
                </div>
              </div>
            </div>

            {/* Box 2: Summary */}
            <div className="glass-panel-elevated rounded-2xl p-6 border border-violet-lavender/25 relative overflow-hidden">
              <div className="flex items-center gap-2 text-violet-lavender font-bold text-sm uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-violet-glow" />
                <span>Summary</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Narrative & AI Insights</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Dynamic written summaries computed directly from active records, paired with explainable AI diagnostic cards disclosing supporting evidence and recommended remediation.
              </p>
              <div className="p-3.5 rounded-xl bg-plum-950/80 border border-violet-brand/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Mathematics Score Deceleration</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">MODERATE</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  <strong>Evidence:</strong> Scores dropped by 20.5% between UT1 (88%) and Pre-Board (67.5%). Primary friction in 4-mark geometry proofs.
                </p>
                <p className="text-emerald-300 text-[11px]">
                  <strong>Action:</strong> 1-on-1 revision of circle theorem proofs scheduled with Mrs. Priya Deshmukh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-brand/20 text-violet-lavender text-xs font-bold uppercase tracking-wider mb-3 border border-violet-brand/40">
          Comprehensive Capabilities
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Enterprise Educational Architecture
        </h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2">
          Engineered for institutional scale, data privacy, and actionable pedagogical support.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          {/* F1: Indian Curricula */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Indian School & College Models</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Native support for CBSE, ICSE, State Boards (Class 6–12), and University Semester patterns (B.Tech, B.Sc, B.Com) with configurable grading scales and passing criteria.
            </p>
          </div>

          {/* F2: Teacher Academic & Attendance Synchronization */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Faculty Records & Live Sync</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Teacher-controlled marks entry and daily attendance recording synchronized instantly with student portals, featuring truthful missing-data indicators and robust audit logging.
            </p>
          </div>

          {/* F3: Bulk CSV / Excel Import */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">9-Step Batch Import Engine</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Batch CSV/Excel upload with column mapping, roll number verification, duplicate detection, invalid row reporting, and safe non-zero preservation of absent and unsubmitted marks.
            </p>
          </div>

          {/* F4: Private Communication & Auditing */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Multi-Tenant Isolation & Privacy</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Strict institution-level partitioning ensures records cannot be accessed across institutions. Administrators cannot view private student-teacher chats without logged audit events.
            </p>
          </div>

          {/* F5: Printable PDF Reports */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Printable Report Cards & Transcripts</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Authorized students and teachers can generate cleanly formatted, printable academic report cards with official institution watermarks, subject tables, and faculty signatures.
            </p>
          </div>

          {/* F6: Early Warnings */}
          <div className="glass-panel rounded-2xl p-6 border border-violet-lavender/15 bg-plum-850/60">
            <div className="p-3 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/35 w-fit mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Early Warning Review Workflow</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Authorized teachers can review, flag, or dismiss early warning notices with mandatory justification recording, ensuring AI never makes consequential decisions alone.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-violet-lavender/10 bg-plum-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-brand" />
            <span className="text-white font-semibold">EduInsight AI</span>
            <span>— AI-Based Student Performance Analysis System</span>
          </div>
          <div>
            Built for Indian Schools, Junior Colleges & Universities • Strict Multi-Tenant Isolation
          </div>
        </div>
      </footer>
    </div>
  );
};
