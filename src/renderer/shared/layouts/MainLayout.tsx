import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeName?: string;
  activeUser?: { username: string; role: string };
  appVersion?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  storeName,
  activeUser,
  appVersion
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 select-none">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header navbar */}
        <Header storeName={storeName} activeUser={activeUser} appVersion={appVersion} />

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

