import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral'
}) => {
  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
  
  if (variant === 'success') {
    badgeClass = 'bg-success-light text-success-green border-success-green/20';
  } else if (variant === 'warning') {
    badgeClass = 'bg-warning-light text-warning-amber border-warning-amber/20';
  } else if (variant === 'danger') {
    badgeClass = 'bg-danger-light text-danger-red border-danger-red/10';
  } else if (variant === 'info') {
    badgeClass = 'bg-primary-light text-primary-blue border-primary-blue/15';
  }
  
  return (
    <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold border ${badgeClass} inline-flex items-center gap-1 select-none`}>
      {children}
    </span>
  );
};
