import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Calendar, 
  Clock 
  ,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import type { Branch } from '../types';

interface HeaderProps {
  storeName?: string;
  activeUser?: { username: string; fullName?: string; email?: string; role: string; branchId?: string };
  appVersion?: string;
  branches?: Branch[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storeName = 'Al-Hamd General Store',
  activeUser = { username: 'Admin User', role: 'ADMIN' },
  appVersion = '1.0.0',
  branches = [],
  activeBranchId = '',
  onBranchChange,
  onLogout
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

  const displayName = activeUser.fullName || activeUser.username;
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Branch / Shop context */}
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4 text-slate-400" />
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">Active Branch</span>
          {branches.length > 1 ? (
            <select
              className="mt-1 min-w-48 rounded-[4px] border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-primary-blue"
              value={activeBranchId}
              onChange={(event) => onBranchChange?.(event.target.value)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_code} - {branch.branch_name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-bold text-slate-800">{activeBranch?.branch_name || storeName}</span>
          )}
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
          <div className="w-9 h-9 rounded-[4px] bg-primary-blue text-white flex items-center justify-center border border-primary-blue/20 text-xs font-bold">
            {initials || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-primary-blue uppercase tracking-wider bg-primary-light/80 px-1 py-0.25 rounded-[2px] inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {activeUser.role}
              </span>
              {activeUser.branchId && <span className="text-[9px] text-slate-400 font-bold">{activeUser.branchId}</span>}
            </div>
            <span className="text-xs font-bold text-slate-800 leading-none block mt-0.5">{displayName}</span>
            {activeUser.email && <span className="text-[10px] text-slate-500 leading-none block mt-0.5">{activeUser.email}</span>}
          </div>
          {onLogout && (
            <button className="ml-2 p-2 rounded-[4px] border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={onLogout} title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
