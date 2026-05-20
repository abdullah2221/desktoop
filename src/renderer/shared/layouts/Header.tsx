import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Calendar, 
  Clock 
} from 'lucide-react';

interface HeaderProps {
  storeName?: string;
  activeUser?: { username: string; role: string };
  appVersion?: string;
}

export const Header: React.FC<HeaderProps> = ({
  storeName = 'Al-Hamd General Store',
  activeUser = { username: 'Admin User', role: 'ADMIN' },
  appVersion = '1.0.0'
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Branch / Shop context */}
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4 text-slate-400" />
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">Active Branch</span>
          <span className="text-xs font-bold text-slate-800">{storeName}</span>
        </div>
      </div>

      {/* Stats and metadata info */}
      <div className="flex items-center gap-6">
        {/* Version Indicator */}
        <div className="text-[10px] px-2 py-0.5 rounded-[2px] bg-slate-100 text-slate-500 border border-slate-200 font-mono font-bold">
          v{appVersion}
        </div>

        {/* DateTime Display */}
        <div className="flex items-center gap-5 text-xs text-slate-600 font-semibold border-r border-slate-200 pr-5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(time)}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(time)}</span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-primary-light flex items-center justify-center border border-primary-blue/20">
            <UserIcon className="w-4 h-4 text-primary-blue" />
          </div>
          <div className="text-left">
            <span className="text-[9px] font-bold text-primary-blue uppercase tracking-wider block bg-primary-light/80 px-1 py-0.25 rounded-[2px]">
              {activeUser.role}
            </span>
            <span className="text-xs font-bold text-slate-800 leading-none block mt-0.5">{activeUser.username}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

