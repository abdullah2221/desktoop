import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  prefix,
  error,
  id,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label htmlFor={id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}
      <div className="relative rounded-[4px] shadow-sm flex items-stretch w-full">
        {prefix && (
          <span className="inline-flex items-center px-2.5 rounded-l-[4px] border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-semibold select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={`erp-input ${prefix ? 'rounded-l-none border-l-0' : ''} ${error ? 'border-danger-red focus:border-danger-red focus:box-shadow-[0_0_0_3px_rgba(198,40,40,0.15)]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-[10px] font-bold text-danger-red block">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
