import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label htmlFor={id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`erp-input ${error ? 'border-danger-red focus:border-danger-red' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] font-bold text-danger-red block">{error}</span>}
    </div>
  );
};
