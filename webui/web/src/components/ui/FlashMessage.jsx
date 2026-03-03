import React from 'react';
import { clsx } from 'clsx';
import { Info, CircleAlert, CircleCheck } from 'lucide-react';

const MAP = {
  info: {
    icon: Info,
    box: 'bg-sky-500/10 border-sky-500/20 text-sky-500'
  },
  success: {
    icon: CircleCheck,
    box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
  },
  error: {
    icon: CircleAlert,
    box: 'bg-red-500/10 border-red-500/20 text-red-500'
  }
};

const FlashMessage = ({ tone = 'info', message, className }) => {
  if (!message) return null;
  const cfg = MAP[tone] || MAP.info;
  const Icon = cfg.icon;

  return (
    <div className={clsx('rounded-lg border px-3 py-2 text-[11px] font-semibold flex items-start gap-2', cfg.box, className)}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
};

export default FlashMessage;
