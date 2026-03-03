import React from 'react';
import Modal from './Modal';

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Lanjutkan',
  loading = false,
  onCancel,
  onConfirm
}) => {
  return (
    <Modal open={open} onClose={onCancel} widthClass="max-w-md">
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[var(--text-primary)]">{title}</h3>
        <p className="text-[11px] text-[var(--text-secondary)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn border border-[var(--border-color)]">Batal</button>
          <button disabled={loading} onClick={onConfirm} className="btn btn-primary disabled:opacity-50">
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
