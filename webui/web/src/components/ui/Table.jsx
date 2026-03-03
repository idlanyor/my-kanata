import React from 'react';
import { clsx } from 'clsx';

export const TableWrap = ({ className, children }) => (
  <div className={clsx('w-full max-w-full min-w-0 overflow-x-auto scrollbar-pretty', className)}>{children}</div>
);

const Table = ({ className, children }) => (
  <table className={clsx('w-full text-left border-collapse', className)}>{children}</table>
);

export const THead = ({ className, children }) => (
  <thead className={className}>{children}</thead>
);

export const TBody = ({ className, children }) => (
  <tbody className={clsx('divide-y divide-[var(--border-color)]', className)}>{children}</tbody>
);

export const Th = ({ className, children }) => (
  <th className={clsx('px-3 sm:px-6 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap', className)}>{children}</th>
);

export const Td = ({ className, children, colSpan }) => (
  <td colSpan={colSpan} className={clsx('px-3 sm:px-6 py-2.5 sm:py-3', className)}>{children}</td>
);

export default Table;
