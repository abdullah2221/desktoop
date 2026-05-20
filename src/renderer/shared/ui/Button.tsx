import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  className = '',
  ...props
}) => {
  let baseClass = 'erp-btn font-semibold inline-flex items-center justify-center transition-all duration-150 border disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  // Size classes
  let sizeClass = 'px-3 py-1.5 text-xs';
  if (size === 'md') sizeClass = 'px-4 py-2 text-xs';
  if (size === 'lg') sizeClass = 'px-5 py-2.5 text-sm';
  
  // Variant classes
  let variantClass = 'bg-primary-blue text-white border-primary-blue hover:bg-primary-hover active:bg-primary-hover';
  if (variant === 'secondary') {
    variantClass = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:bg-slate-100';
  } else if (variant === 'success') {
    variantClass = 'bg-success-green text-white border-success-green hover:bg-green-800 active:bg-green-900';
  } else if (variant === 'danger') {
    variantClass = 'bg-danger-red text-white border-danger-red hover:bg-red-800 active:bg-red-900';
  }
  
  const widthClass = fullWidth ? 'w-full flex' : '';
  
  return (
    <button
      className={`${baseClass} ${sizeClass} ${variantClass} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
