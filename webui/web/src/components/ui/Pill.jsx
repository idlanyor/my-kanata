import React from 'react';
import { clsx } from 'clsx';

const TONE = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  neutral: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'
};

const Pill = ({ tone = 'neutral', className, children, ...props }) => (
  <span className={clsx('badge', TONE[tone] || TONE.neutral, className)} {...props}>
    {children}
  </span>
);

export default Pill;
