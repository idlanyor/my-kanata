import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const Modal = ({ open, onClose, children, widthClass = 'max-w-md' }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3">
      <button className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Close modal" />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className={clsx('relative w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-2xl', widthClass)}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default Modal;
