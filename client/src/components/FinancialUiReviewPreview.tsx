import { useState } from 'react';
import { CreditCard, LayoutDashboard, ShieldCheck } from 'lucide-react';
import Dashboard from './Dashboard';
import DebtsManager from './DebtsManager';

type ReviewView = 'dashboard' | 'debts';

/** معاينة محصورة بالتطوير لحالات الواجهة الفارغة، ولا تقرأ أو تكتب بيانات المستخدم. */
export default function FinancialUiReviewPreview() {
  const [view, setView] = useState<ReviewView>(() => (
    new URLSearchParams(window.location.search).get('review-tab') === 'debts' ? 'debts' : 'dashboard'
  ));

  return (
    <main className="auth-vault-background min-h-screen p-4 font-sans md:p-8" dir="rtl" id="financial-ui-review-preview">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl border border-sky-300/20 bg-slate-950/80 p-5 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-300 ring-1 ring-sky-300/20"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
            <div>
              <p className="text-[11px] font-black tracking-[0.16em] text-sky-300">معاينة تطويرية آمنة</p>
              <h1 className="mt-1 text-lg font-black text-white md:text-xl">حالات الواجهة الفارغة — بلا بيانات عميل</h1>
              <p className="mt-1 text-xs leading-6 text-slate-400">تُستخدم للتحقق البصري فقط، ولا تتصل بـ Firebase ولا تحفظ أي سجل.</p>
            </div>
          </div>
          <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/80 p-1" role="tablist" aria-label="اختيار الصفحة للمعاينة">
            <button type="button" role="tab" aria-selected={view === 'dashboard'} onClick={() => setView('dashboard')} className={`min-h-11 rounded-xl px-3 text-xs font-black transition ${view === 'dashboard' ? 'bg-sky-500 text-white shadow-lg shadow-sky-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
              <LayoutDashboard className="ml-1.5 inline h-4 w-4" aria-hidden="true" /> لوحة التحكم
            </button>
            <button type="button" role="tab" aria-selected={view === 'debts'} onClick={() => setView('debts')} className={`min-h-11 rounded-xl px-3 text-xs font-black transition ${view === 'debts' ? 'bg-sky-500 text-white shadow-lg shadow-sky-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
              <CreditCard className="ml-1.5 inline h-4 w-4" aria-hidden="true" /> سجل الديون
            </button>
          </div>
        </header>

        <div className="vault-content-shell rounded-3xl p-4 shadow-xl md:p-7" id="financial-ui-review-canvas">
          {view === 'dashboard' ? (
            <Dashboard debts={[]} expenses={[]} budget={null} alerts={[]} currency="ر.ع" onNavigate={() => {}} onMarkAlertAsRead={() => {}} projects={[]} employees={[]} salaryPayments={[]} initialCapital={0} />
          ) : (
            <DebtsManager debts={[]} currency="ر.ع" ownerUid="ui-review-only" onAddDebt={() => {}} onEditDebt={() => {}} onDeleteDebt={() => {}} onAddInstallment={() => {}} onDeleteInstallment={() => {}} />
          )}
        </div>
      </section>
    </main>
  );
}
