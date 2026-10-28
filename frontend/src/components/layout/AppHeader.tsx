import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  MessageSquare,
  MessageCircle,
  FileSpreadsheet,
  FileText,
  LogOut,
  Bell,
  ChevronDown,
  Building,
  Sparkles,
  BookOpen,
  Users,
  ShieldCheck
} from 'lucide-react';

interface AppHeaderProps {
  onOpenMessages: () => void;
  onOpenImport?: () => void;
  onOpenReport?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenMessages,
  onOpenImport,
  onOpenReport,
}) => {
  const { user, profile, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'student': return GraduationCap;
      case 'teacher': return BookOpen;
      case 'parent': return Users;
      case 'admin': return ShieldCheck;
      default: return GraduationCap;
    }
  };

  const RoleIcon = getRoleIcon(user?.role);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-plum-950/80 border-b border-violet-lavender/15 px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
      {/* Brand & Institution Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center border border-white/25">
          <RoleIcon className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-white tracking-tight font-sans">
              EduInsight AI
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-brand/20 text-violet-lavender border border-violet-brand/40">
              {user?.role} portal
            </span>
          </div>
          <span className="text-xs text-slate-400 block truncate max-w-[240px] sm:max-w-none">
            {user?.institution_name || 'Academic Institution'}
          </span>
        </div>
      </div>

      {/* Action Controls & Navigation */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Feature Action Buttons */}
        {user?.role === 'teacher' && onOpenImport && (
          <button
            onClick={onOpenImport}
            className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Batch CSV/Excel Import"
          >
            <FileSpreadsheet className="w-4 h-4 text-violet-light" />
            <span className="hidden md:inline">Import Marks</span>
          </button>
        )}

        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Academic Transcript Report Card"
          >
            <FileText className="w-4 h-4 text-violet-light" />
            <span className="hidden md:inline">Transcript</span>
          </button>
        )}


        {/* Direct Messages Trigger */}
        <button
          onClick={onOpenMessages}
          className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors relative"
          title="Private Communication"
        >
          <MessageCircle className="w-4 h-4 text-violet-lavender" />
        </button>

        {/* User Profile & Sign Out */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl glass-pill hover:border-violet-brand/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-brand to-violet-light flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-semibold text-white hidden lg:inline max-w-[120px] truncate">
              {user?.full_name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel-elevated p-2 border border-violet-lavender/30 shadow-2xl z-50 bg-plum-900 animate-fadeIn text-left">
              <div className="p-2.5 border-b border-violet-lavender/15 mb-1">
                <span className="text-xs font-bold text-white block truncate">{user?.full_name}</span>
                <span className="text-[10px] text-slate-400 block truncate">{user?.email}</span>
                <span className="text-[10px] text-violet-lavender font-mono mt-1 block">Role: {user?.role?.toUpperCase()}</span>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full p-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/15 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
