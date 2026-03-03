import React from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import Modal from './Modal';

const NoticeModal = ({ open, title, message, tone = 'info', onClose }) => {
  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)]">{title}</h3>
            <p className={clsx('text-[11px] mt-1 whitespace-pre-line', tone === 'error' ? 'text-red-500' : 'text-[var(--text-secondary)]')}>
              {message}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-main)] text-[var(--text-secondary)]">
            <X size={14} />
          </button>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </Modal>
  );
};

export default NoticeModal;
