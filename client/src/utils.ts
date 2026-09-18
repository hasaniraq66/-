import { Debt, SystemAlert, Expense } from './types';

// Format currency
export function formatCurrency(amount: number, currency: string = 'د.إ'): string {
  return `${amount.toLocaleString('ar-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

// Convert date string to readable Arabic date
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    let date: Date;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1; // 0-indexed
        const day = Number(parts[2]);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    // Use ar-EG-u-nu-latn to display beautiful Arabic months/days with Western digits (0-9)
    // for high legibility and clarity in financial/business reporting.
    return date.toLocaleDateString('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Get standard YYYY-MM-DD string for current local date
export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get standard YYYY-MM for current month
export function getCurrentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Generate alerts based on debts
export function generateAlerts(debts: Debt[]): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const todayStr = getLocalDateString();
  const today = new Date(todayStr);

  debts.forEach((debt) => {
    if (debt.status === 'paid' || !debt.dueDate) return;

    const dueDate = new Date(debt.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingAmount = debt.amount - debt.paidAmount;

    if (diffDays < 0) {
      // Overdue
      alerts.push({
        id: `alert-overdue-${debt.id}`,
        type: 'overdue',
        title: 'دفعة متأخرة!',
        message: `الدين المستحق لـ ${debt.personName} بقيمة ${remainingAmount} كان يستحق في تاريخ ${debt.dueDate} (متأخر منذ ${Math.abs(diffDays)} يوم).`,
        date: todayStr,
        debtId: debt.id,
        isRead: false,
      });
    } else if (diffDays === 0) {
      // Due Today
      alerts.push({
        id: `alert-today-${debt.id}`,
        type: 'due_today',
        title: 'يستحق اليوم!',
        message: `اليوم هو موعد سداد دفعة ${debt.personName} بقيمة ${remainingAmount}.`,
        date: todayStr,
        debtId: debt.id,
        isRead: false,
      });
    } else if (diffDays <= 3) {
      // Due Soon (within 3 days)
      alerts.push({
        id: `alert-soon-${debt.id}`,
        type: 'due_soon',
        title: 'استحقاق قريب جداً',
        message: `تبقت ${diffDays} أيام على موعد سداد دفعة ${debt.personName} بقيمة ${remainingAmount}.`,
        date: todayStr,
        debtId: debt.id,
        isRead: false,
      });
    }
  });

  return alerts;
}

// Generate WhatsApp message template
export function generateWhatsAppLink(debt: Debt, currency: string = 'د.إ'): string {
  const remainingAmount = debt.amount - debt.paidAmount;
  let text = '';
  const dueSuffix = debt.dueDate ? ` والمستحقة في تاريخ ${debt.dueDate}` : '';

  if (debt.type === 'to_me') {
    text = `مرحباً ${debt.personName}، أرجو أن تكون بخير. أود فقط تذكيرك بلطف بموعد الدفعة المستحقة بقيمة ${remainingAmount} ${currency}${dueSuffix}. شكراً لك وجزاك الله خيراً.`;
  } else {
    text = `مرحباً ${debt.personName}، أرجو أن تكون بخير. بخصوص دفعتكم المستحقة عليّ بقيمة ${remainingAmount} ${currency}${dueSuffix}، أود أن أؤكد لكم أنني أعمل على سدادها في أقرب فرصة بإذن الله.`;
  }

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

// Export data to JSON file
export function exportDataToJson(data: any, fileName: string = 'backup_debts_manager.json') {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
