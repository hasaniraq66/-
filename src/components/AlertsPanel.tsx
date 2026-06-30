import React, { useMemo } from 'react';
import { 
  Bell, 
  Trash2, 
  Check, 
  MessageSquare, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  User,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { SystemAlert, Debt } from '../types';
import { formatCurrency, formatDate, generateWhatsAppLink } from '../utils';

interface AlertsPanelProps {
  alerts: SystemAlert[];
  debts: Debt[];
  currency: string;
  onMarkAlertAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearReadAlerts: () => void;
  onNavigate: (tab: string) => void;
}

export default function AlertsPanel({
  alerts,
  debts,
  currency,
  onMarkAlertAsRead,
  onMarkAllAsRead,
  onClearReadAlerts,
  onNavigate,
}: AlertsPanelProps) {
  // Unread alerts count
  const unreadCount = useMemo(() => {
    return alerts.filter(a => !a.isRead).length;
  }, [alerts]);

  return (
    <div className="space-y-6" id="alerts-viewport">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="alerts-header">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>مركز تنبيهات الاستحقاق</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                {unreadCount} جديد
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">تابع مواعيد السداد القادمة وتنبيهات المتأخرات لتسديدها في مواعيدها</p>
        </div>

        <div className="flex gap-2" id="alerts-header-actions">
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={onMarkAllAsRead}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}

          {alerts.length > unreadCount && (
            <button
              id="clear-read-alerts-btn"
              onClick={onClearReadAlerts}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح التنبيهات المقروءة</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-3" id="alerts-list-container">
        {alerts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-slate-100 text-slate-400" id="empty-alerts">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm mb-1">كل شيء سليم ولا توجد تنبيهات!</h4>
            <p className="text-xs max-w-sm mx-auto text-slate-400">لا توجد أي التزامات سداد متأخرة أو مستحقة حالياً. ذمتك المالية آمنة تماماً.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const matchedDebt = debts.find(d => d.id === alert.debtId);

            return (
              <div 
                key={alert.id} 
                id={alert.id}
                className={`rounded-2xl border p-4 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                  alert.isRead 
                    ? alert.type === 'overdue'
                      ? 'bg-rose-50/10 border-rose-100/50 opacity-70'
                      : 'bg-white opacity-65 border-slate-100'
                    : alert.type === 'overdue'
                    ? 'bg-rose-50/60 border-rose-200'
                    : 'bg-amber-50/5 border-amber-100 bg-white'
                }`}
              >
                <div className="flex gap-3 items-start flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    alert.type === 'overdue' 
                      ? 'bg-red-50 text-red-600' 
                      : alert.type === 'due_today' 
                      ? 'bg-amber-50 text-amber-600' 
                      : 'bg-sky-50 text-sky-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!alert.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>}
                      <h4 className="text-sm font-bold text-slate-800 truncate">{alert.title}</h4>
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {alert.type === 'overdue' ? 'متأخر' : alert.type === 'due_today' ? 'اليوم' : 'قريباً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
                    
                    {matchedDebt && (
                      <div className="flex gap-4 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>الشخص: {matchedDebt.personName}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>تاريخ الاستحقاق: {formatDate(matchedDebt.dueDate)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions right side */}
                <div className="flex gap-2 self-end sm:self-auto shrink-0" id={`alert-actions-${alert.id}`}>
                  {/* Mark as read */}
                  {!alert.isRead && (
                    <button
                      id={`mark-alert-read-panel-${alert.id}`}
                      onClick={() => onMarkAlertAsRead(alert.id)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {/* WhatsApp message */}
                  {matchedDebt && (
                    <a
                      id={`whatsapp-alert-panel-${alert.id}`}
                      href={generateWhatsAppLink(matchedDebt, currency)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>تذكير واتساب</span>
                    </a>
                  )}

                  {/* Go to Debts */}
                  <button
                    id={`view-debt-alert-panel-${alert.id}`}
                    onClick={() => onNavigate('debts')}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>عرض التفاصيل</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
