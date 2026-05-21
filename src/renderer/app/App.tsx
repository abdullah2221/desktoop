import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { useErp } from './providers/ErpContext';
import { MainLayout } from '../shared/layouts/MainLayout';
import { AppRoutes } from './routes/AppRoutes';
import { CheckCircle } from 'lucide-react';
import { LoginPage } from '../features/auth/LoginPage';

function AppContent() {
  const { 
    activeTab, 
    setActiveTab, 
    storeName, 
    activeUser, 
    isAuthenticated,
    authLoading,
    hasPermission,
    logout,
    appVersion,
    accessibleBranches,
    activeBranchId,
    setActiveBranch,
    checkoutNotification,
    appNotification
  } = useErp();

  if (authLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-xs font-bold text-slate-500">Restoring secure session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        {appNotification && <div className="fixed top-4 right-4 z-50 p-3 bg-red-50 border border-red-300 text-red-700 text-xs font-semibold rounded-[4px]">{appNotification.message}</div>}
        <LoginPage />
      </>
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      storeName={storeName}
      activeUser={{
        username: activeUser?.username || '',
        fullName: activeUser?.full_name || '',
        email: activeUser?.email || '',
        role: activeUser?.role_name || activeUser?.role || '',
        branchId: activeUser?.branch_id || ''
      }}
      appVersion={appVersion}
      branches={accessibleBranches}
      activeBranchId={activeBranchId}
      hasPermission={hasPermission}
      onBranchChange={setActiveBranch}
      onLogout={logout}
    >
      {/* CHECKOUT NOTIFICATION */}
      {checkoutNotification && (
        <div className="p-3 bg-success-light border border-success-green/30 text-success-green text-xs font-semibold rounded-[4px] flex items-center gap-2 shadow-sm animate-fade-in select-none">
          <CheckCircle className="w-4 h-4" />
          <span>{checkoutNotification}</span>
        </div>
      )}
      {appNotification && (
        <div className={`p-3 border text-xs font-semibold rounded-[4px] flex items-center gap-2 shadow-sm animate-fade-in select-none ${
          appNotification.type === 'success'
            ? 'bg-success-light border-success-green/30 text-success-green'
            : appNotification.type === 'info'
              ? 'bg-primary-light border-primary-blue/20 text-primary-blue'
            : 'bg-red-50 border-red-300 text-red-700'
        }`}>
          <CheckCircle className="w-4 h-4" />
          <span>{appNotification.message}</span>
        </div>
      )}

      {/* DYNAMIC FEATURE ROUTER */}
      <AppRoutes />
    </MainLayout>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
