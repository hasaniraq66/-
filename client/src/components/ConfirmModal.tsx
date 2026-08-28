import React from 'react';
import { ShieldAlert, Info, AlertTriangle, LucideIcon } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  let headerBg = 'bg-rose-950 text-rose-200';
  let confirmBtnBg = 'bg-rose-600 hover:bg-rose-500 text-white';
  let Icon: LucideIcon = ShieldAlert;

  if (variant === 'warning') {
    headerBg = 'bg-amber-950 text-amber-200';
    confirmBtnBg = 'bg-amber-600 hover:bg-amber-500 text-white';
    Icon = AlertTriangle;
  } else if (variant === 'info') {
    headerBg = 'bg-[#0f172a] text-sky-400';
    confirmBtnBg = 'bg-sky-600 hover:bg-sky-500 text-white';
    Icon = Info;
  }

  return (
    <div className="app-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="app-modal-surface max-w-sm overflow-hidden bg-white text-right" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={`flex items-center justify-between p-5 ${headerBg}`}>
          <button 
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base opacity-90 transition hover:bg-white/20 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="إغلاق نافذة التأكيد"
          >
            ✕
          </button>
          <h2 id="confirm-modal-title" className="flex items-center gap-2 text-sm font-extrabold">
            <Icon className="w-4 h-4 shrink-0" />
            <span>{title}</span>
          </h2>
        </div>
        <div className="p-6 space-y-4 text-slate-700 font-bold text-xs">
          <p className="leading-relaxed text-slate-600 font-medium">{message}</p>
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-11 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 transition-all hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              className={`flex-1 min-h-11 rounded-xl py-2.5 font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${confirmBtnBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
