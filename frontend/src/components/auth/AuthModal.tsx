import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  X,
  Lock,
  Mail,
  User,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, isLoading, isSupabaseActive } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password, fullName, role);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-violet-lavender/30 shadow-2xl relative bg-plum-900/95 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-deep to-violet-brand shadow-violet-pill flex items-center justify-center mx-auto mb-3 border border-white/25">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to EduInsight AI' : 'Create Your Account'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSupabaseActive ? 'Connected to Supabase Authentication' : 'Academic Performance & Analytics Platform'}
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="flex rounded-xl bg-plum-950/80 p-1 mb-5 border border-violet-lavender/15">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-violet-brand text-white shadow-violet-pill'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-violet-brand text-white shadow-violet-pill'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your legal full name"
                    className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand focus:ring-1 focus:ring-violet-brand transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Institutional Role</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['student', 'teacher', 'parent', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`p-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        role === r
                          ? 'bg-violet-brand text-white border-violet-lavender/50 shadow-violet-pill'
                          : 'bg-plum-950/60 text-slate-400 border-violet-lavender/15 hover:text-white'
                      }`}
                    >
                      {r === 'admin' ? 'Administrator' : r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu.in"
                className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand focus:ring-1 focus:ring-violet-brand transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                className="w-full bg-plum-950/90 border border-violet-lavender/20 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand focus:ring-1 focus:ring-violet-brand transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-0.5 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full liquid-btn py-2.5 rounded-xl text-xs font-bold shadow-violet-pill flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <Sparkles className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
