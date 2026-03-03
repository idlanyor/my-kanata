import { useState } from 'react';

export const useModalFeedback = () => {
  const [notice, setNotice] = useState({
    open: false,
    title: '',
    message: '',
    tone: 'info'
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Lanjutkan',
    loading: false,
    onConfirm: null
  });

  const showNotice = ({ title, message, tone = 'info' }) => {
    setNotice({ open: true, title, message, tone });
  };

  const closeNotice = () => {
    setNotice((prev) => ({ ...prev, open: false }));
  };

  const openConfirm = ({ title, message, confirmLabel = 'Lanjutkan', onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmLabel,
      loading: false,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      title: '',
      message: '',
      confirmLabel: 'Lanjutkan',
      loading: false,
      onConfirm: null
    });
  };

  const executeConfirm = async () => {
    if (!confirmState.onConfirm) return closeConfirm();
    try {
      setConfirmState((prev) => ({ ...prev, loading: true }));
      await confirmState.onConfirm();
      closeConfirm();
      return true;
    } catch (error) {
      setConfirmState((prev) => ({ ...prev, loading: false }));
      showNotice({
        title: 'Aksi Gagal',
        message: error?.response?.data?.error || error?.message || 'Unknown error',
        tone: 'error'
      });
      return false;
    }
  };

  return {
    notice,
    showNotice,
    closeNotice,
    confirmState,
    openConfirm,
    closeConfirm,
    executeConfirm
  };
};
