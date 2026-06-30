import React, { useRef, useState } from 'react';
import { 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw,
  FileJson,
  Info
} from 'lucide-react';
import { exportDataToJson } from '../utils';

interface BackupRestoreProps {
  onImportData: (data: any) => boolean;
  onResetData: () => void;
  exportPayload: any;
}

export default function BackupRestore({ onImportData, onResetData, exportPayload }: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Export Click
  const handleExport = () => {
    exportDataToJson(exportPayload, `backup_debts_and_budget_${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Handle Import Click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result as string);
        const success = onImportData(json);
        if (success) {
          setImportStatus('success');
          setErrorMessage('');
          setTimeout(() => setImportStatus('idle'), 4000);
        } else {
          setImportStatus('error');
          setErrorMessage('الملف غير متوافق. تأكد من أنه ملف نسخ احتياطي تم تصديره من هذا التطبيق سابقاً.');
        }
      } catch (err) {
        setImportStatus('error');
        setErrorMessage('فشل في قراءة الملف. تأكد من أن الملف بصيغة JSON صالحة.');
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-uploading the same file
    e.target.value = '';
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6" id="backup-viewport">
      <div className="border-b border-slate-100 pb-4 space-y-1">
        <h2 className="text-base font-bold text-slate-800">النسخ الاحتياطي وإدارة البيانات 💾</h2>
        <p className="text-xs text-slate-400">احفظ بياناتك محلياً أو استعدها من ملف نسخ احتياطي خارجي للحفاظ على سرية معلوماتك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="backup-restore-grid">
        {/* Export Column */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between" id="backup-export-box">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
              <Download className="w-5 h-5" />
              <span>تصدير نسخة احتياطية</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              قم بتحميل ملف يحتوي على كافة تفاصيل الديون، العمليات المسجلة، الفواتير المدفوعة، والميزانيات الشهرية المخزنة على هذا المتصفح. يمكنك تخزينه بآمان على حاسوبك أو هاتفك.
            </p>
          </div>
          <button
            id="export-backup-btn"
            onClick={handleExport}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors mt-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل ملف النسخ الاحتياطي (JSON)</span>
          </button>
        </div>

        {/* Import Column */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between" id="backup-import-box">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Upload className="w-5 h-5" />
              <span>استعادة نسخة احتياطية</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              قم برفع ملف النسخ الاحتياطي (بصيغة JSON) الذي قمت بتنزيله سابقاً لاستعادة الديون والمصاريف والميزانية. سيقوم هذا الإجراء بدمج وتحديث بياناتك الحالية بالملف المرفوع.
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="import-backup-file-input"
            />
            <button
              id="import-backup-btn"
              onClick={handleImportClick}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>اختر ملف واسترجع البيانات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message statuses */}
      <div id="backup-status-indicators">
        {importStatus === 'success' && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex gap-2 items-center">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>تم استيراد النسخة الاحتياطية بنجاح وتحديث كافة الديون والمصاريف والميزانيات!</span>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-800 flex gap-2 items-center">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>خطأ: {errorMessage}</span>
          </div>
        )}
      </div>

      {/* Warning resetting data */}
      <div className="p-5 border border-red-100 bg-red-50/20 rounded-2xl space-y-3" id="backup-danger-zone">
        <div className="flex items-center gap-2 text-red-800 font-extrabold text-xs">
          <ShieldAlert className="w-4 h-4" />
          <span>منطقة الخطر: حذف البيانات نهائياً</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          حذف البيانات سيمسح جميع الديون والميزانيات والمصاريف المسجلة في هذا المتصفح نهائياً ولا يمكن التراجع عن هذا الإجراء إلا إذا كان لديك نسخة احتياطية محفوظة.
        </p>
        <button
          id="reset-all-data-btn"
          onClick={() => {
            if (confirm('تحذير نهائي: هل أنت متأكد من حذف وإعادة تهيئة جميع البيانات في التطبيق؟ لا يمكن التراجع عن هذا!')) {
              onResetData();
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
        >
          حذف وإعادة ضبط كافة البيانات
        </button>
      </div>
    </div>
  );
}
