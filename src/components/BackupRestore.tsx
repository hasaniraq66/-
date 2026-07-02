import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw,
  FileJson,
  Info,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { exportDataToJson } from '../utils';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  saveBackupToDrive, 
  getBackupsFromDrive, 
  downloadBackupFromDrive, 
  deleteBackupFromDrive, 
  DriveBackupFile 
} from '../utils/googleDrive';

interface BackupRestoreProps {
  onImportData: (data: any) => boolean;
  onResetData: () => void;
  exportPayload: any;
}

export default function BackupRestore({ onImportData, onResetData, exportPayload }: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local Backup State
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Cloud Backup State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'loading_backups' | 'backing_up' | 'restoring' | 'deleting' | 'success' | 'error'>('idle');
  const [cloudMessage, setCloudMessage] = useState<string>('');

  // Init Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        loadCloudBackups();
      },
      () => {
        setUser(null);
        setBackups([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Format cloud file modified timestamp
  const formatCloudDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  // Load backups list from Google Drive
  const loadCloudBackups = async () => {
    setIsLoading(true);
    setCloudStatus('loading_backups');
    try {
      const files = await getBackupsFromDrive();
      setBackups(files);
      setCloudStatus('idle');
    } catch (err: any) {
      console.error(err);
      setCloudStatus('error');
      setCloudMessage(err.message || 'فشل تحميل النسخ الاحتياطية السحابية');
    } finally {
      setIsLoading(false);
    }
  };

  // Save new backup to Google Drive
  const handleCloudBackup = async () => {
    setIsLoading(true);
    setCloudStatus('backing_up');
    try {
      const savedFile = await saveBackupToDrive(exportPayload);
      setCloudStatus('success');
      setCloudMessage(`تم حفظ نسخة احتياطية جديدة بنجاح في Google Drive باسم "${savedFile.name}"!`);
      await loadCloudBackups();
      setTimeout(() => setCloudStatus('idle'), 5000);
    } catch (err: any) {
      console.error(err);
      setCloudStatus('error');
      setCloudMessage(err.message || 'فشل حفظ النسخة الاحتياطية في السحابة');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore backup from Google Drive
  const handleCloudRestore = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(
      `هل أنت متأكد من استعادة النسخة الاحتياطية (${fileName}) من السحابة؟ سيتم استبدال البيانات الحالية بالبيانات المحفوظة.`
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setCloudStatus('restoring');
    try {
      const data = await downloadBackupFromDrive(fileId);
      const success = onImportData(data);
      if (success) {
        setCloudStatus('success');
        setCloudMessage(`تمت استعادة البيانات بنجاح من النسخة الاحتياطية "${fileName}"!`);
        setTimeout(() => setCloudStatus('idle'), 5000);
      } else {
        setCloudStatus('error');
        setCloudMessage('الملف السحابي غير متوافق أو تالف.');
      }
    } catch (err: any) {
      console.error(err);
      setCloudStatus('error');
      setCloudMessage(err.message || 'فشل استعادة النسخة الاحتياطية من السحابة');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete backup from Google Drive
  const handleCloudDelete = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(
      `هل أنت متأكد من رغبتك في حذف النسخة الاحتياطية "${fileName}" نهائياً من حساب Google Drive الخاص بك؟`
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setCloudStatus('deleting');
    try {
      await deleteBackupFromDrive(fileId);
      setCloudStatus('success');
      setCloudMessage('تم حذف النسخة الاحتياطية السحابية بنجاح.');
      await loadCloudBackups();
      setTimeout(() => setCloudStatus('idle'), 4000);
    } catch (err: any) {
      console.error(err);
      setCloudStatus('error');
      setCloudMessage(err.message || 'فشل حذف النسخة الاحتياطية من السحابة');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Drive Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        // Load backups
        try {
          const files = await getBackupsFromDrive();
          setBackups(files);
        } catch (e) {
          console.error('Failed to load initial backups', e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setCloudStatus('error');
      setCloudMessage('فشل تسجيل الدخول أو ربط حساب Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setBackups([]);
      setCloudStatus('idle');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Export Click (Local JSON)
  const handleExport = () => {
    exportDataToJson(exportPayload, `backup_debts_and_budget_${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Handle Import Click (Local JSON)
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle File Change (Local JSON)
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
    e.target.value = '';
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6" id="backup-viewport">
      <div className="border-b border-slate-100 pb-4 space-y-1">
        <h2 className="text-base font-bold text-slate-800">النسخ الاحتياطي وإدارة البيانات 💾</h2>
        <p className="text-xs text-slate-400 font-medium">احفظ بياناتك محلياً أو ارفعها تلقائياً على سحابة Google Drive المشفرة والآمنة للحفاظ على سرية معلوماتك واستعادتها من أي جهاز.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="backup-restore-grid">
        {/* Left: Google Drive Cloud Backup (Preferred) */}
        <div className="p-5 bg-gradient-to-tr from-sky-50/40 via-white to-sky-50/20 rounded-2xl border border-sky-100/70 space-y-4 flex flex-col justify-between shadow-xs" id="backup-cloud-box">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-800 font-extrabold text-sm">
              <Cloud className="w-5 h-5 text-sky-600 animate-pulse" />
              <span>النسخ الاحتياطي السحابي (Google Drive)</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">موصى به</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-bold">
              اربط حسابك لتتمكن من رفع نسخة احتياطية مباشرة على حساب Google Drive الشخصي الخاص بك في مجلد آمن وتلقائي. يمكنك استعادتها من أي هاتف أو حاسوب بضغطة زر واحدة.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {!user ? (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-3 px-4 rounded-xl font-extrabold text-xs shadow-xs transition-all hover:border-slate-300 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>تسجيل الدخول وربط Google Drive</span>
              </button>
            ) : (
              <div className="space-y-4">
                {/* User info */}
                <div className="flex items-center justify-between p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-xs font-bold text-slate-700">
                  <div className="flex flex-col">
                    <span className="text-slate-800 text-[11px] font-extrabold">{user.displayName || 'مستخدم متصل'}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="تسجيل الخروج"
                    className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-500 font-extrabold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </button>
                </div>

                {/* Cloud Action Buttons */}
                <div className="flex gap-2.5">
                  <button
                    onClick={handleCloudBackup}
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {cloudStatus === 'backing_up' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>نسخ احتياطي سحابي</span>
                  </button>

                  <button
                    onClick={loadCloudBackups}
                    disabled={isLoading}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title="تحديث قائمة الملفات"
                  >
                    <RefreshCw className={`w-4 h-4 ${cloudStatus === 'loading_backups' ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Cloud backups list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 block border-b border-slate-100 pb-1">الملفات المتوفرة في سحابتك ({backups.length}):</span>
                  {backups.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-medium italic text-center py-2">لا توجد نسخ احتياطية مسجلة في السحابة حالياً.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {backups.map((bk) => (
                        <div key={bk.id} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-xl text-[10px] hover:border-sky-100 transition-all shadow-2xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-extrabold text-slate-700 max-w-[150px] truncate" title={bk.name}>
                              {bk.name}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold">
                              {formatCloudDate(bk.modifiedTime)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCloudRestore(bk.id, bk.name)}
                              disabled={isLoading}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="استعادة هذه النسخة"
                            >
                              استعادة
                            </button>
                            <button
                              onClick={() => handleCloudDelete(bk.id, bk.name)}
                              disabled={isLoading}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                              title="حذف الملف من السحابة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Local File Export/Import */}
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/70 space-y-4 flex flex-col justify-between shadow-2xs" id="backup-local-box">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
              <FileJson className="w-5 h-5 text-slate-500" />
              <span>النسخ الاحتياطي المحلي التقليدي</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              احفظ نسخة احتياطية بصيغة JSON على جهازك الشخصي واسترجعها يدوياً في أي وقت. هذا الخيار يحفظ البيانات بالكامل كملف تقوم أنت بنقله وتخزينه.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="export-backup-btn"
              onClick={handleExport}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف النسخ الاحتياطي (JSON)</span>
            </button>

            <div className="relative">
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
                <span>اختر ملف من جهازك واسترجع البيانات</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message statuses */}
      <div id="backup-status-indicators">
        {importStatus === 'success' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex gap-2 items-center font-bold">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 animate-bounce" />
            <span>تم استيراد النسخة الاحتياطية بنجاح وتحديث كافة الديون والمصاريف والميزانيات!</span>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex gap-2 items-center font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>خطأ: {errorMessage}</span>
          </div>
        )}

        {(cloudStatus === 'success' || cloudStatus === 'error') && (
          <div className={`p-3.5 border rounded-xl text-xs flex gap-2 items-center font-bold ${
            cloudStatus === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            {cloudStatus === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{cloudMessage}</span>
          </div>
        )}
      </div>

      {/* Warning resetting data */}
      <div className="p-5 border border-red-100 bg-red-50/10 rounded-2xl space-y-3 shadow-3xs" id="backup-danger-zone">
        <div className="flex items-center gap-2 text-red-800 font-extrabold text-xs">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>منطقة الخطر: حذف البيانات نهائياً</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
          حذف البيانات سيمسح جميع الديون والميزانيات والمصاريف المسجلة في هذا المتصفح نهائياً ولا يمكن التراجع عن هذا الإجراء إلا إذا كان لديك نسخة احتياطية محفوظة.
        </p>
        <button
          id="reset-all-data-btn"
          onClick={() => {
            if (confirm('تحذير نهائي: هل أنت متأكد من حذف وإعادة تهيئة جميع البيانات في التطبيق؟ لا يمكن التراجع عن هذا!')) {
              onResetData();
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-extrabold transition-colors cursor-pointer"
        >
          حذف وإعادة ضبط كافة البيانات
        </button>
      </div>
    </div>
  );
}
