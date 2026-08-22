import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore,
  BarChart3,
  Bell,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Command,
  CreditCard,
  FileSearch,
  HeartHandshake,
  History,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';

type CommandIcon = typeof Command;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onFocusReferenceLookup: () => void;
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
  allowedTabs: (tab: string) => boolean;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: CommandIcon;
  run: () => void;
}

/** لوحة أوامر عالمية للتنقل السريع دون إدخال أي بيانات مالية أو تعديلها. */
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onFocusReferenceLookup,
  onToggleTheme,
  onOpenSettings,
  allowedTabs,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const navigation: Array<Omit<CommandItem, 'run'>> = [
      { id: 'dashboard', label: 'لوحة التحكم', description: 'عرض الملخص المالي اليومي', keywords: 'الرئيسية لوحة تحكم ملخص', icon: LayoutDashboard },
      { id: 'debts', label: 'سجل الديون', description: 'إدارة الديون والأقساط وكشوف الحساب', keywords: 'دين ديون أقساط عميل', icon: CreditCard },
      { id: 'budget', label: 'الميزانية والمصروفات', description: 'تسجيل المصروفات ومتابعة الميزانية', keywords: 'ميزانية مصروف فاتورة inv', icon: Wallet },
      { id: 'projects', label: 'المشاريع والموظفون', description: 'متابعة المشاريع والرواتب', keywords: 'مشروع موظف راتب', icon: ClipboardList },
      { id: 'reports', label: 'التقارير والتحليلات', description: 'عرض المؤشرات والتصدير', keywords: 'تقرير تحليل رسم بياني pdf', icon: BarChart3 },
      { id: 'alerts', label: 'التنبيهات والاستحقاقات', description: 'مراجعة المتأخرات والاستحقاقات', keywords: 'تنبيه استحقاق متأخر', icon: Bell },
      { id: 'activity_log', label: 'سجل العمليات', description: 'استعراض الحركات المالية الأخيرة', keywords: 'سجل نشاط عملية تاريخ', icon: History },
      { id: 'backup', label: 'النسخ الاحتياطي', description: 'تصدير أو استعادة نسخة بيانات', keywords: 'نسخ احتياطي استعادة ملف', icon: ArchiveRestore },
      { id: 'advisor', label: 'المستشار المالي', description: 'الحصول على تحليل مالي ذكي', keywords: 'مستشار ذكاء تحليل ai', icon: BrainCircuit },
      { id: 'support', label: 'دعم التطبيق', description: 'وسائل التبرع ودعم استمرار تطوير التطبيق', keywords: 'دعم تبرع زين كاش ماستر الرافدين مساعدة', icon: HeartHandshake },
    ];

    const availableNavigation = navigation
      .filter((item) => allowedTabs(item.id))
      .map((item) => ({ ...item, run: () => onNavigate(item.id) }));

    const quickCommands: CommandItem[] = [
      {
        id: 'reference-lookup',
        label: 'استخراج سجل بالرقم المرجعي',
        description: 'البحث عن دين أو فاتورة برقم DBT أو INV',
        keywords: 'مرجع رقم dbt inv بحث استخراج دين فاتورة',
        icon: FileSearch,
        run: onFocusReferenceLookup,
      },
      {
        id: 'toggle-theme',
        label: 'تبديل المظهر الفاتح أو الداكن',
        description: 'تحديث مظهر الواجهة فوراً',
        keywords: 'مظهر ثيم فاتح داكن لون',
        icon: CheckCircle2,
        run: onToggleTheme,
      },
    ];

    if (onOpenSettings) {
      quickCommands.push({
        id: 'settings',
        label: 'فتح إعدادات الحساب',
        description: 'إدارة الاسم والعملة وقفل PIN',
        keywords: 'إعدادات عملة اسم pin قفل',
        icon: Settings,
        run: onOpenSettings,
      });
    }

    return [...quickCommands, ...availableNavigation];
  }, [allowedTabs, onFocusReferenceLookup, onNavigate, onOpenSettings, onToggleTheme]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommands = commands.filter((command) => {
    if (!normalizedQuery) return true;
    return `${command.label} ${command.description} ${command.keywords}`.toLowerCase().includes(normalizedQuery);
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRun = (command: CommandItem) => {
    command.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/55 px-3 pt-[12vh] backdrop-blur-sm sm:pt-[16vh]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
          <label className="sr-only" htmlFor="global-command-search">ابحث عن أمر أو صفحة</label>
          <input
            ref={inputRef}
            id="global-command-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن صفحة أو إجراء سريع..."
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="إغلاق لوحة الأوامر"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2" aria-live="polite">
          <div className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-wide text-slate-400" id="command-palette-title">أوامر ووصول سريع</div>
          {visibleCommands.length > 0 ? visibleCommands.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                type="button"
                onClick={() => handleRun(command)}
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition hover:bg-sky-50 focus:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <span className="rounded-xl bg-slate-100 p-2 text-slate-600 transition group-hover:bg-sky-100 group-hover:text-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-sky-950 dark:group-hover:text-sky-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{command.label}</span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{command.description}</span>
                </span>
                <ChevronLeft className="h-4 w-4 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-sky-600 dark:text-slate-600" aria-hidden="true" />
              </button>
            );
          }) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <BookOpenCheck className="mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">لا توجد أوامر مطابقة</p>
              <p className="mt-1 text-xs text-slate-500">جرّب البحث باسم صفحة أو اكتب DBT أو INV.</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-400 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> تعرض الأوامر المصرح بها فقط</span>
          <span>Esc للإغلاق</span>
        </footer>
      </section>
    </div>
  );
}
