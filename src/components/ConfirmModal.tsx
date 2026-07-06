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
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-100 text-right">
        <div className={`p-5 flex justify-between items-center ${headerBg}`}>
          <button 
            onClick={onCancel}
            className="opacity-70 hover:opacity-100 font-extrabold text-sm cursor-pointer"
          >
            ✕
          </button>
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <Icon className="w-4 h-4 shrink-0" />
            <span>{title}</span>
          </h3>
        </div>
        <div className="p-6 space-y-4 text-slate-700 font-bold text-xs">
          <p className="leading-relaxed text-slate-600 font-medium">{message}</p>
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer font-bold"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer font-bold ${confirmBtnBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
