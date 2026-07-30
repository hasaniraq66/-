import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  ShieldAlert, 
  Save, 
  X,
  LayoutDashboard,
  Sparkles,
  CreditCard,
  Wallet,
  Briefcase,
  BarChart3,
  Bell,
  Database,
  Loader2,
  History
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query 
} from 'firebase/firestore';
import { db } from '../utils/firebaseService';
import firebaseConfig from '../../firebase-applet-config.json';
import { SubUser } from '../types';

interface PermissionsManagerProps {
  currentUserId: string;
  currency: string;
}

// Map tabs to beautiful Arabic text and icons
const TAB_DEFINITIONS = [
  { id: 'dashboard', label: 'لوحة التحكم الرئيسية', desc: 'رؤية ملخص الديون والمصاريف والحدود الإجمالية', icon: LayoutDashboard, color: 'text-sky-500 bg-sky-50' },
  { id: 'advisor', label: 'المستشار المالي الذكي (AI)', desc: 'المحادثة واستشارات الذكاء الاصطناعي التوليدي', icon: Sparkles, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'debts', label: 'الديون واللتزامات', desc: 'إضافة، تعديل، وسداد الديون والمستحقات والعمليات', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'budget', label: 'الميزانية والمصاريف', desc: 'تحديد الميزانية الشهرية وتسجيل المصاريف اليومية', icon: Wallet, color: 'text-amber-500 bg-amber-50' },
  { id: 'projects', label: 'مشاريع العمل والرواتب', desc: 'إدارة مشاريع المقاولات، الموظفين، وصرف الرواتب', icon: Briefcase, color: 'text-purple-500 bg-purple-50' },
  { id: 'reports', label: 'التقارير الرسومية', desc: 'الرسوم البيانية وتحليلات الأداء المالي والمصاريف', icon: BarChart3, color: 'text-rose-500 bg-rose-50' },
  { id: 'alerts', label: 'مركز التنبيهات', desc: 'استلام التنبيهات الذكية بالديون المستحقة والمتأخرة', icon: Bell, color: 'text-cyan-500 bg-cyan-50' },
  { id: 'activity_log', label: 'سجل العمليات الشامل', desc: 'استعراض التسلسل الزمني لجميع الحركات والعمليات المالية', icon: History, color: 'text-sky-600 bg-sky-50' },
  { id: 'backup', label: 'النسخ الاحتياطي والبيانات', desc: 'تصدير واستيراد وتهيئة بيانات النظام المالي', icon: Database, color: 'text-slate-500 bg-slate-50' }
];

export default function PermissionsManager({ currentUserId, currency }: PermissionsManagerProps) {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields for new subuser
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['dashboard', 'debts', 'budget', 'reports', 'alerts']);
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing subuser permissions
  const [editingUser, setEditingUser] = useState<SubUser | null>(null);
  const [editingTabs, setEditingTabs] = useState<string[]>([]);

  // Fetch sub-users on load
  const loadSubUsers = async () => {
    setIsLoadingList(true);
    setError('');
    if (!db) {
      setIsLoadingList(false);
      return;
    }
    try {
      const q = query(collection(db, 'users', currentUserId, 'subUsers'));
      const querySnapshot = await getDocs(q);
      const list: SubUser[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ ...doc.data() } as SubUser);
      });
      // Sort by creation date
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubUsers(list);
    } catch (err: any) {
      console.error('Error fetching subusers:', err);
      setError('فشل في تحميل قائمة المساعدين وصلاحياتهم.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadSubUsers();
  }, [currentUserId]);

  const toggleTabSelection = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      setSelectedTabs(selectedTabs.filter(id => id !== tabId));
    } else {
      setSelectedTabs([...selectedTabs, tabId]);
    }
  };

  const toggleEditingTabSelection = (tabId: string) => {
    if (editingTabs.includes(tabId)) {
      setEditingTabs(editingTabs.filter(id => id !== tabId));
    } else {
      setEditingTabs([...editingTabs, tabId]);
    }
  };

  // Create Sub-User account
  const handleAddSubUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayName.trim()) {
      setError('يرجى إدخال الاسم الكامل للمساعد.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل لحماية الحساب.');
      return;
    }
    if (selectedTabs.length === 0) {
      setError('يجب تحديد صلاحية واحدة على الأقل للمساعد.');
      return;
    }

    if (!db) {
      setError('خدمة قاعدة البيانات غير متوفرة حالياً.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create a dynamic secondary App instance to sign up the helper securely without signing out the Admin
      const tempAppName = 'subuser-registration-' + Math.random().toString(36).substring(2, 9);
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const credential = await createUserWithEmailAndPassword(tempAuth, email.trim(), password);
      const subUserId = credential.user.uid;

      // Log out of the temporary instance immediately so it leaves client authentication state untouched
      await signOut(tempAuth);

      // 2. Write the user profile for the newly created sub-user
      const subUserProfile = {
        userId: subUserId,
        displayName: displayName.trim(),
        email: email.trim(),
        currency: currency,
        adminId: currentUserId, // Link to this admin
        allowedTabs: selectedTabs,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', subUserId), subUserProfile);

      // 3. Save sub-user record in the Admin's subUsers subcollection for Security Rules lookup
      const subUserRecord: SubUser = {
        id: subUserId,
        displayName: displayName.trim(),
        email: email.trim(),
        allowedTabs: selectedTabs,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', currentUserId, 'subUsers', subUserId), subUserRecord);

      // 4. Success notification and reset fields
      setSuccess(`تم بنجاح إنشاء حساب المساعد (${displayName}) وتعيين صلاحياته المحددة.`);
      setDisplayName('');
      setEmail('');
      setPassword('');
      setSelectedTabs(['dashboard', 'debts', 'budget', 'reports', 'alerts']);
      setShowAddForm(false);
      loadSubUsers();
    } catch (err: any) {
      console.error('Error registering subuser:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل لحساب آخر.');
      } else {
        setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل حساب المساعد.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update permissions
  const handleUpdatePermissions = async () => {
    if (!editingUser) return;
    setError('');
    setSuccess('');

    if (editingTabs.length === 0) {
      setError('يجب تحديد صلاحية واحدة على الأقل للمساعد.');
      return;
    }

    if (!db) {
      setError('خدمة قاعدة البيانات غير متوفرة حالياً.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update subuser's main profile
      await setDoc(doc(db, 'users', editingUser.id), {
        allowedTabs: editingTabs
      }, { merge: true });

      // Update inside admin's subUsers subcollection
      await setDoc(doc(db, 'users', currentUserId, 'subUsers', editingUser.id), {
        allowedTabs: editingTabs
      }, { merge: true });

      setSuccess(`تم تحديث صلاحيات الحساب (${editingUser.displayName}) بنجاح.`);
      setEditingUser(null);
      loadSubUsers();
    } catch (err: any) {
      console.error('Error updating permissions:', err);
      setError('فشل في حفظ التعديلات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Sub-user Account & revoke database access
  const handleDeleteSubUser = (subUser: SubUser) => {
    setError('');
    setSuccess('');
    
    // Check with direct dialog
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف حساب المساعد (${subUser.displayName})؟ سيتم سحب كافة الصلاحيات وإلغاء وصوله للنظام فوراً.`);
    if (!confirmDelete || !db) return;

    setIsSubmitting(true);
    const deleteOp = async () => {
      try {
        // Remove subuser record from admin's subUsers
        await deleteDoc(doc(db, 'users', currentUserId, 'subUsers', subUser.id));
        
        // Update subuser profile to disconnect them from admin
        await setDoc(doc(db, 'users', subUser.id), {
          adminId: '',
          allowedTabs: []
        }, { merge: true });

        setSuccess(`تم حذف حساب المساعد (${subUser.displayName}) وإلغاء صلاحيات وصوله للملفات.`);
        loadSubUsers();
      } catch (err: any) {
        console.error('Error deleting subuser:', err);
        setError('حدث خطأ أثناء محاولة إلغاء الحساب.');
      } finally {
        setIsSubmitting(false);
      }
    };
    deleteOp();
  };

  return (
    <div className="space-y-6" id="permissions-manager-workspace">
      {/* Header Cards */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">إدارة صلاحيات المساعدين</h1>
          </div>
          <p className="text-slate-400 text-xs">
            قم بإنشاء حسابات إضافية لمساعديك، مراجعيك أو شركاء العمل وحدد التبويبات والميزات التي يحق لهم تصفحها أو تعديلها.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(true);
            setError('');
            setSuccess('');
          }}
          className="w-full md:w-auto px-5 py-3 bg-sky-600 hover:bg-sky-500 transition-all rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer z-10"
        >
          <UserPlus className="w-4 h-4" />
          <span>إنشاء حساب مساعد جديد</span>
        </button>
      </div>

      {/* Success and Error Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2.5 text-right"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2.5 text-right"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Account Modal Form */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-sky-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">إنشاء حساب مساعد جديد</h3>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddSubUser} className="p-6 space-y-6">
                
                {/* Identity Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 text-right">الاسم الكامل للمساعد</label>
                    <div className="relative">
                      <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="مثال: أحمد المحمد"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all text-right font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 text-right">البريد الإلكتروني (لتسجيل الدخول)</label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        placeholder="ahmed@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all text-right font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 text-right">كلمة المرور المؤقتة</label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="6 أحرف أو أرقام على الأقل"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all text-right font-mono"
                    />
                  </div>
                  <span className="block text-[9px] text-slate-400 text-right">يرجى تسليم هذا البريد وكلمة المرور للمساعد بعد إنشائها ليتمكن من تسجيل الدخول.</span>
                </div>

                {/* Permissions selector */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="block text-[11px] font-black text-slate-800 text-right">الصلاحيات والتبويبات المسموحة:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTabs(TAB_DEFINITIONS.map(t => t.id))}
                      className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="permissions-grid">
                    {TAB_DEFINITIONS.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = selectedTabs.includes(tab.id);
                      return (
                        <div 
                          key={tab.id}
                          onClick={() => toggleTabSelection(tab.id)}
                          className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? 'bg-sky-50/50 border-sky-300 shadow-3xs' 
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4.5 w-4.5 cursor-pointer shrink-0"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`p-1 rounded-lg ${tab.color} shrink-0`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 text-right">{tab.label}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-relaxed text-right">{tab.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit bar */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 transition-colors text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/10"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ والتسجيل...</span>
                      </>
                    ) : (
                      <>
                        <span>إنشاء وتفعيل الحساب</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">تعديل صلاحيات المساعد: {editingUser.displayName}</h3>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Modal Form */}
              <div className="p-6 space-y-6">
                
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="text-right">
                    <span className="block text-[11px] font-extrabold text-slate-800">{editingUser.displayName}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">{editingUser.email}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 bg-slate-200/50 px-2 py-1 rounded-md">حساب مساعد</span>
                </div>

                {/* Permissions selector */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="block text-[11px] font-black text-slate-800 text-right">تعديل الصلاحيات الممنوحة:</span>
                    <button
                      type="button"
                      onClick={() => setEditingTabs(TAB_DEFINITIONS.map(t => t.id))}
                      className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="permissions-edit-grid">
                    {TAB_DEFINITIONS.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = editingTabs.includes(tab.id);
                      return (
                        <div 
                          key={tab.id}
                          onClick={() => toggleEditingTabSelection(tab.id)}
                          className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50/40 border-indigo-300 shadow-3xs' 
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer shrink-0"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`p-1 rounded-lg ${tab.color} shrink-0`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 text-right">{tab.label}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-relaxed text-right">{tab.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit bar */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdatePermissions}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ التغييرات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Existing Sub-users List */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden" id="subusers-list-container">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5 text-right">
            <h3 className="font-extrabold text-slate-800 text-sm">حسابات المساعدين النشطة</h3>
            <p className="text-slate-400 text-[10px]">قائمة بالشركاء والمساعدين المسجلين تحت إشرافك وصلاحياتهم الفعالة.</p>
          </div>
          
          <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-full text-[10px]">
            عدد الحسابات المضافة: {subUsers.length}
          </span>
        </div>

        {isLoadingList ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            <p className="text-slate-500 text-xs font-bold">جاري تحميل قائمة المساعدين وحساباتهم...</p>
          </div>
        ) : subUsers.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="p-4 bg-sky-50 text-sky-600 rounded-3xl shadow-xs">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-xs">لا يوجد مساعدين مسجلين بعد</h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                بصفتك مديراً للنظام، يمكنك إنشاء حسابات إضافية لأشخاص آخرين وتخصيص صلاحيات محددة لهم ليتمكنوا من مساعدتك في إدارة حسابك المالي بأمان كامل.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true);
                setError('');
                setSuccess('');
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-sky-600/10 cursor-pointer"
            >
              إنشاء أول حساب مساعد الآن
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {subUsers.map((user) => (
              <div 
                key={user.id}
                className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-slate-50/40 transition-colors"
              >
                {/* Details */}
                <div className="space-y-2.5 text-right w-full lg:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-xs">{user.displayName}</span>
                    <span className="bg-emerald-50 text-emerald-700 font-bold text-[9px] px-2 py-0.5 rounded-md border border-emerald-100">صلاحية مخصصة</span>
                    <span className="text-slate-400 text-[9px] font-mono">تاريخ الإنشاء: {new Date(user.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.email}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.allowedTabs && user.allowedTabs.map((tabId) => {
                      const tabDef = TAB_DEFINITIONS.find(t => t.id === tabId);
                      if (!tabDef) return null;
                      const Icon = tabDef.icon;
                      return (
                        <span 
                          key={tabId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-bold"
                        >
                          <Icon className="w-2.5 h-2.5" />
                          <span>{tabDef.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setEditingTabs(user.allowedTabs || []);
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 lg:flex-none px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>تعديل الصلاحيات</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSubUser(user)}
                    className="flex-1 lg:flex-none px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>إلغاء وتجميد الحساب</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
