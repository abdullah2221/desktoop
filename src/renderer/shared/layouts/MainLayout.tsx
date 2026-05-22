import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { Branch } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeName?: string;
  activeUser?: { username: string; fullName?: string; email?: string; role: string; branchId?: string };
  appVersion?: string;
  branches?: Branch[];
  activeBranchId?: string;
  hasPermission?: (permission: string) => boolean;
  onBranchChange?: (branchId: string) => void;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  userRole?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  storeName,
  activeUser,
  appVersion,
  branches,
  activeBranchId,
  hasPermission,
  onBranchChange,
  onLogout,
  onOpenNotifications,
  userRole
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 select-none">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} hasPermission={hasPermission} userRole={userRole} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header navbar */}
        <Header
          storeName={storeName}
          activeUser={activeUser}
          appVersion={appVersion}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={onBranchChange}
          onLogout={onLogout}
          onOpenNotifications={onOpenNotifications}
        />

        {/* Content view with scroll support */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
