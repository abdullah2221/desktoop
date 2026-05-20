import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  headerActions,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`bg-white rounded-[6px] border border-slate-200 shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {(title || headerActions) && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 select-none">
          {title && (
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {title}
            </h3>
          )}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
