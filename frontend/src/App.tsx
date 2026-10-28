import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LandingPage } from './components/public/LandingPage';
import { AppHeader } from './components/layout/AppHeader';
import { StudentDashboard } from './components/dashboards/StudentDashboard';
import { TeacherDashboard } from './components/dashboards/TeacherDashboard';
import { ParentDashboard } from './components/dashboards/ParentDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileOnboardingModal } from './components/auth/ProfileOnboardingModal';
import { DirectMessagesModal } from './components/features/DirectMessagesModal';
import { BulkImportModal } from './components/features/BulkImportModal';
import { ReportCardModal } from './components/features/ReportCardModal';
import { api } from './services/api';

export const AppContent: React.FC = () => {
  const { user, isLoading, isProfileComplete } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDashboardData, setReportDashboardData] = useState<any | null>(null);

  const handleOpenReport = async () => {
    try {
      const res = await api.analytics.getDashboard();
      setReportDashboardData(res);
      setIsReportOpen(true);
    } catch (err) {
      console.error('Failed to prepare report data', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-plum-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-brand border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono uppercase tracking-wider text-violet-lavender">
            Initializing EduInsight AI...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Public Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated Portal View
  return (
    <div className="min-h-screen bg-plum-950 text-slate-100 ambient-glow-bg flex flex-col relative overflow-x-hidden">
      {/* Dynamic atmospheric ambient purple glow mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="glow-blob-1"></div>
        <div className="glow-blob-2"></div>
        <div className="glow-blob-3"></div>
      </div>

      {/* Authenticated Application Header */}
      <div className="relative z-10">
        <AppHeader
          onOpenMessages={() => setIsMessagesOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenReport={handleOpenReport}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'student' && (
          <StudentDashboard onOpenReport={handleOpenReport} />
        )}

        {user.role === 'teacher' && (
          <TeacherDashboard onOpenImport={() => setIsImportOpen(true)} />
        )}

        {user.role === 'parent' && (
          <ParentDashboard
            onOpenMessages={() => setIsMessagesOpen(true)}
            onOpenReport={handleOpenReport}
          />
        )}

        {user.role === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-violet-lavender/10 bg-plum-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EduInsight AI • Academic Performance Analysis System (Multi-Tenant Isolated Instance)</span>
          <span className="font-mono text-slate-400">Term: 2024–2025</span>
        </div>
      </footer>

      {/* Profile Onboarding Modal (Automatic for incomplete profiles) */}
      <ProfileOnboardingModal isOpen={Boolean(user && !isProfileComplete)} />

      {/* Modals */}
      <DirectMessagesModal
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={() => {
          window.location.reload();
        }}
      />

      <ReportCardModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        dashboardData={reportDashboardData}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
