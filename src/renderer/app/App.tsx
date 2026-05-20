import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { useErp } from './providers/ErpContext';
import { MainLayout } from '../shared/layouts/MainLayout';
import { AppRoutes } from './routes/AppRoutes';
import { CheckCircle } from 'lucide-react';

function AppContent() {
  const { 
    activeTab, 
    setActiveTab, 
    storeName, 
    activeUser, 
    appVersion,
    checkoutNotification,
    appNotification
  } = useErp();

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      storeName={storeName}
      activeUser={activeUser}
      appVersion={appVersion}
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
