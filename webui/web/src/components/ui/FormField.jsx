import React from 'react';
import { clsx } from 'clsx';

export const FormField = ({ label, hint, error, className, children }) => (
  <label className={clsx('block space-y-1', className)}>
    {label && <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>}
    {children}
    {hint && !error && <p className="text-[10px] text-[var(--text-secondary)] opacity-70">{hint}</p>}
    {error && <p className="text-[10px] text-red-500">{error}</p>}
  </label>
);

export const Input = ({ className, ...props }) => (
  <input
    className={clsx(
      'w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-xs',
      className
    )}
    {...props}
  />
);

export default FormField;
