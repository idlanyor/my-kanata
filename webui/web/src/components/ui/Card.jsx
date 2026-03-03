import React from 'react';
import { clsx } from 'clsx';

const Card = ({ className, children }) => (
  <div className={clsx('card-base', className)}>{children}</div>
);

export const CardHeader = ({ className, children }) => (
  <div className={clsx('p-3 sm:p-4 border-b border-[var(--border-color)]', className)}>{children}</div>
);

export const CardBody = ({ className, children }) => (
  <div className={clsx('p-3 sm:p-4', className)}>{children}</div>
);

export const CardFooter = ({ className, children }) => (
  <div className={clsx('px-3 sm:px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-main)]/50', className)}>{children}</div>
);

export default Card;
