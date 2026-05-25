import React from 'react';
import { Tooltip, TooltipPosition } from './Tooltip';

interface IconActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  tooltip: string;
  tooltipPosition?: TooltipPosition;
  disabledTooltip?: string;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  danger?: boolean;
}

export const IconActionButton: React.FC<IconActionButtonProps> = ({
  icon,
  tooltip,
  tooltipPosition = 'top',
  disabledTooltip,
  variant = 'default',
  danger = false,
  className = '',
  disabled,
  ...props
}) => {
  const tooltipText = disabled && disabledTooltip ? disabledTooltip : tooltip;
  let tone = 'text-slate-500 hover:text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50';
  if (variant === 'primary') tone = 'text-primary-blue hover:text-primary-hover border-primary-light hover:border-primary-blue hover:bg-primary-light/20';
  if (variant === 'success') tone = 'text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50';
  if (variant === 'danger' || danger) tone = 'text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50';

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        title={tooltipText}
        aria-label={tooltipText}
        disabled={disabled}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-[4px] border bg-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 disabled:opacity-40 disabled:cursor-not-allowed ${tone} ${className}`}
        {...props}
      >
        {icon}
      </button>
      {tooltipText ? <Tooltip text={tooltipText} position={tooltipPosition} /> : null}
    </span>
  );
};
