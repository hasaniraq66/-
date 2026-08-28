import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Wallet, 
  BarChart3, 
  Bell, 
  Database, 
  Menu, 
  X, 
  Coins, 
  User, 
  CheckCircle,
  HelpCircle,
  Info,
  Shield,
  LockKeyhole,
  Unlock,
  ShieldAlert,
  Briefcase,
  Users,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Settings,
  History,
  HeartHandshake,
  Command as CommandIcon,
  Search
} from 'lucide-react';

import { onIdTokenChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  fetchUserProfile, 
  saveUserProfile, 
  fetchCollection, 
  saveDocument, 
  deleteDocument,
  sanitizeFinancialValue
} from './utils/firebaseService';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';
import { AppDataLoadingExperience, DeferredSectionLoadingExperience } from './components/DataLoadingExperience';
import type { DataLoadingStage } from './lib/loadingExperience';
import { getFinancialDataLoadErrorMessage } from './lib/firestoreError';
import { resolveCollection, shouldReportLoadFailure } from './lib/collectionAccess';
import { sanitizeRecordsForExport } from './lib/backupSanitizer';
import { clearPin, hasPin, migrateLegacyPin, setPin, verifyPin } from './lib/appLockCredential';
import { runWithFirebaseSessionRecovery } from './lib/firebaseSession';
import { createAuthLoadCoordinator } from './lib/authLoadCoordinator';
import { createAuthBootstrapWatchdog } from './lib/authBootstrapWatchdog';
import {
  FIREBASE_PROFILE_LOAD_TIMEOUT_MS,
  FIREBASE_RECORDS_LOAD_TIMEOUT_MS,
  withDataLoadTimeout,
} from './lib/loadingTimeout';

import { Debt, Expense, Budget, SystemAlert, Project, Employee, SalaryPayment, UserProfile } from './types';
import { generateAlerts, getCurrentMonthString } from './utils';
import { createIndependentDebt } from './utils/debtRecords';
import { createNextReferenceNumber } from './utils/recordReferences';

// Import components
import Dashboard from './components/Dashboard';
import FinancialDataLoadErrorNotice from './components/FinancialDataLoadErrorNotice';
import LockScreen from './components/LockScreen';
import CommandPalette from './components/CommandPalette';

const DebtsManager = lazy(() => import('./components/DebtsManager'));
const BudgetManager = lazy(() => import('./components/BudgetManager'));
const AlertsPanel = lazy(() => import('./components/AlertsPanel'));
const FinancialUiReviewPreview = lazy(() => import('./components/FinancialUiReviewPreview'));
const Reports = lazy(() => import('./components/Reports'));
const BackupRestore = lazy(() => import('./components/BackupRestore'));
const ProjectManager = lazy(() => import('./components/ProjectManager'));
const SmartAdvisor = lazy(() => import('./components/SmartAdvisor'));
const PermissionsManager = lazy(() => import('./components/PermissionsManager'));
const ActivityLog = lazy(() => import('./components/ActivityLog'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const ModalExperiencePreview = lazy(() => import('./components/ModalExperiencePreview'));

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// No starting mock data to ensure a completely clean start for new users
const initialDebts: Debt[] = [];

const initialExpenses: Expense[] = [];

const initialBudgets: Budget[] = [];

function DeferredViewLoader({ label }: { label: string }) {
  return <DeferredSectionLoadingExperience label={label} />;
}

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<DataLoadingStage>('auth');
  const [authBootstrapRecoveryMessage, setAuthBootstrapRecoveryMessage] = useState<string | null>(null);
  
  // User Profile configuration
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Calculate target database owner ID (adminId for sub-users, or their own uid)
  const targetUid = useMemo(() => {
    return (currentUser && userProfile?.adminId) ? userProfile.adminId : (currentUser?.uid || '');
  }, [currentUser, userProfile]);

  // State variables (will be populated immediately once Auth state loads)
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  const [currency, setCurrency] = useState<string>('ر.س');
  const [userName, setUserName] = useState<string>('مستخدم جديد');
  const [initialCapital, setInitialCapital] = useState<number>(0);

  // Track read Alert IDs to persist user clearing actions
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  // PIN security states
  const [pinEnabled, setPinEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app_pin_enabled') === 'true';
  });

  // لا نحتفظ بالرمز نفسه في حالة التطبيق إطلاقاً. المطابقة تجري داخل
  // appLockCredential على تلبيح مملّح، فلا يمر الرمز الصريح في شجرة React.

  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    return localStorage.getItem('app_pin_enabled') === 'true' && hasPin();
  });

  // PIN Setup interactive form states inside the Settings Modal
  const [pinSetupStep, setPinSetupStep] = useState<'none' | 'setup_enter' | 'setup_confirm' | 'disable_verify' | 'change_verify' | 'change_enter' | 'change_confirm'>('none');
  const [pinInputValue, setPinInputValue] = useState<string>('');
  const [pinConfirmValue, setPinConfirmValue] = useState<string>('');
  const [pinSetupError, setPinSetupError] = useState<string>('');

  // Navigation and UI
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Theme state (light / dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  // Synchronize and apply theme changes
  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  // Projects, Employees, and Salary Payments states
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);

  // Auth state listener and initial data loader
  useEffect(() => {
    const loadCoordinator = createAuthLoadCoordinator();
    let receivedInitialAuthState = false;
    const recoverFromAuthBootstrapFailure = () => {
      if (receivedInitialAuthState) return;
      loadCoordinator.invalidate();
      setCurrentUser(null);
      setUserProfile(null);
      setDataLoadError(null);
      setLoadingStage('auth');
      setAuthBootstrapRecoveryMessage('تعذر تهيئة جلسة الدخول تلقائياً. يمكنك تسجيل الدخول من جديد أو إعادة تحميل الصفحة.');
      setIsAuthLoading(false);
    };
    const authBootstrapWatchdog = createAuthBootstrapWatchdog(recoverFromAuthBootstrapFailure);
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      receivedInitialAuthState = true;
      authBootstrapWatchdog.acknowledge();
      setAuthBootstrapRecoveryMessage(null);
      const requestId = loadCoordinator.begin();
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        setIsAuthLoading(true);
        setLoadingStage('profile');
        setDataLoadError(null);
        try {
          // Firestore rules require a current Firebase Auth token. The helper
          // refreshes before this first read and retries it once if Auth and
          // Firestore are still completing their post-login handoff.
          const profile = await withDataLoadTimeout(
            runWithFirebaseSessionRecovery(
              firebaseUser,
              () => fetchUserProfile(firebaseUser.uid),
            ),
            FIREBASE_PROFILE_LOAD_TIMEOUT_MS,
          );
          if (!loadCoordinator.isCurrent(requestId)) return;
          let finalUid = firebaseUser.uid;
          if (profile) {
            setUserProfile(profile);
            setUserName(profile.displayName);
            setCurrency(profile.currency);
            setInitialCapital(profile.initialCapital || 0);
            if (profile.adminId) {
              finalUid = profile.adminId;
              // If current active tab is not in allowedTabs, route to the first allowed tab
              const allowed = profile.allowedTabs || [];
              if (allowed.length > 0) {
                setActiveTab((prevTab) => allowed.includes(prevTab) ? prevTab : allowed[0]);
              }
            }
          } else {
            // Register profile for new users
            const newProfile = {
              userId: firebaseUser.uid,
              displayName: firebaseUser.displayName || userName || 'مستثمر جديد',
              email: firebaseUser.email || undefined,
              currency: currency,
              initialCapital: initialCapital,
              createdAt: new Date().toISOString()
            };
            await saveUserProfile(newProfile);
            if (!loadCoordinator.isCurrent(requestId)) return;
            setUserProfile(newProfile);
          }

          // Fetch user-isolated cloud collections from Firestore using final database owner ID
          setLoadingStage('records');
          // allSettled لا all: قواعد Firestore تطبّق صلاحيات التبويبات، فرفض
          // مجموعة واحدة أمر متوقَّع لمساعد محدود الصلاحية ولا يجوز أن يُسقط
          // تحميل التبويبات المسموح له بها.
          const settled = await withDataLoadTimeout(
            Promise.allSettled([
              fetchCollection<Debt>(finalUid, 'debts'),
              fetchCollection<Expense>(finalUid, 'expenses'),
              fetchCollection<Budget>(finalUid, 'budgets'),
              fetchCollection<Project>(finalUid, 'projects'),
              fetchCollection<Employee>(finalUid, 'employees'),
              fetchCollection<SalaryPayment>(finalUid, 'salaryPayments')
            ]),
            FIREBASE_RECORDS_LOAD_TIMEOUT_MS,
          );
          if (!loadCoordinator.isCurrent(requestId)) return;

          const [settledDebts, settledExpenses, settledBudgets, settledProjects, settledEmployees, settledPayments] =
            settled as [
              PromiseSettledResult<Debt[]>,
              PromiseSettledResult<Expense[]>,
              PromiseSettledResult<Budget[]>,
              PromiseSettledResult<Project[]>,
              PromiseSettledResult<Employee[]>,
              PromiseSettledResult<SalaryPayment[]>,
            ];

          if (shouldReportLoadFailure(settled)) {
            const failure = settled.find((result) => result.status === 'rejected');
            if (failure && failure.status === 'rejected') throw failure.reason;
          }

          // Load cloud values, falling back to user-isolated localStorage if offline/empty
          const localDebtsSaved = localStorage.getItem(`personal_debts_${finalUid}`);
          const localExpensesSaved = localStorage.getItem(`personal_expenses_${finalUid}`);
          const localBudgetsSaved = localStorage.getItem(`personal_budgets_${finalUid}`);
          const localProjectsSaved = localStorage.getItem(`personal_projects_${finalUid}`);
          const localEmployeesSaved = localStorage.getItem(`personal_employees_list_${finalUid}`);
          const localPaymentsSaved = localStorage.getItem(`personal_salary_payments_${finalUid}`);
          const localReadAlertsSaved = localStorage.getItem(`personal_read_alerts_${finalUid}`);

          const finalDebts = resolveCollection<Debt>(settledDebts, localDebtsSaved ? JSON.parse(localDebtsSaved) : null);
          const finalExpenses = resolveCollection<Expense>(settledExpenses, localExpensesSaved ? JSON.parse(localExpensesSaved) : null);
          const finalBudgets = resolveCollection<Budget>(settledBudgets, localBudgetsSaved ? JSON.parse(localBudgetsSaved) : null);
          const finalProjects = resolveCollection<Project>(settledProjects, localProjectsSaved ? JSON.parse(localProjectsSaved) : null);
          const finalEmployees = resolveCollection<Employee>(settledEmployees, localEmployeesSaved ? JSON.parse(localEmployeesSaved) : null);
          const finalPayments = resolveCollection<SalaryPayment>(settledPayments, localPaymentsSaved ? JSON.parse(localPaymentsSaved) : null);
          const finalReadAlerts = localReadAlertsSaved ? JSON.parse(localReadAlertsSaved) : [];

          setDebts(finalDebts);
          setExpenses(finalExpenses);
          setBudgets(finalBudgets);
          setProjects(finalProjects);
          setEmployees(finalEmployees);
          setSalaryPayments(finalPayments);
          setReadAlertIds(finalReadAlerts);
        } catch (err) {
          if (!loadCoordinator.isCurrent(requestId)) return;
          console.error('Error fetching user collections:', err);
          setDataLoadError(getFinancialDataLoadErrorMessage(err));
        } finally {
          if (loadCoordinator.isCurrent(requestId)) {
            setIsAuthLoading(false);
          }
        }
      } else {
        if (!loadCoordinator.isCurrent(requestId)) return;
        setCurrentUser(null);
        setUserProfile(null);
        setDataLoadError(null);
        setLoadingStage('auth');
        setIsAuthLoading(false);
        // Clear sensitive states on logout
        setDebts([]);
        setExpenses([]);
        setBudgets([]);
        setProjects([]);
        setEmployees([]);
        setSalaryPayments([]);
      }
    }, () => {
      if (receivedInitialAuthState) return;
      authBootstrapWatchdog.acknowledge();
      recoverFromAuthBootstrapFailure();
    });
    return () => {
      loadCoordinator.invalidate();
      authBootstrapWatchdog.cancel();
      unsubscribe();
    };
  }, []);

  // Synchronize dynamic, user-isolated localStorage with state edits
  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_debts_${targetUid}`, JSON.stringify(debts));
    }
  }, [debts, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_expenses_${targetUid}`, JSON.stringify(expenses));
    }
  }, [expenses, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_budgets_${targetUid}`, JSON.stringify(budgets));
    }
  }, [budgets, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_projects_${targetUid}`, JSON.stringify(projects));
    }
  }, [projects, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_employees_list_${targetUid}`, JSON.stringify(employees));
    }
  }, [employees, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_salary_payments_${targetUid}`, JSON.stringify(salaryPayments));
    }
  }, [salaryPayments, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_currency_${targetUid}`, currency);
    }
  }, [currency, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_username_${targetUid}`, userName);
    }
  }, [userName, currentUser, targetUid]);

  useEffect(() => {
    if (currentUser && targetUid) {
      localStorage.setItem(`personal_read_alerts_${targetUid}`, JSON.stringify(readAlertIds));
    }
  }, [readAlertIds, currentUser, targetUid]);

  // Synchronize general PIN security setting
  useEffect(() => {
    localStorage.setItem('app_pin_enabled', String(pinEnabled));
  }, [pinEnabled]);

  // ترحيل التثبيتات التي حفظت الرمز نصاً صريحاً قبل هذا الإصدار.
  useEffect(() => {
    void migrateLegacyPin();
  }, []);

  // Global, non-destructive access shortcut. Ctrl/Cmd + K opens the command palette.
  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleCommandShortcut);
    return () => window.removeEventListener('keydown', handleCommandShortcut);
  }, []);

  // Keep mobile navigation focused: prevent the page behind the open drawer from scrolling.
  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  // Save changes to username & currency to Firestore profile
  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      saveUserProfile({
        userId: currentUser.uid,
        displayName: userName,
        currency: currency,
        createdAt: new Date().toISOString()
      });
    }
  }, [userName, currency, currentUser, isAuthLoading]);

  // Generate Alerts in Real-time from Debts
  const alerts: SystemAlert[] = useMemo(() => {
    const generated = generateAlerts(debts);
    return generated.map((alert) => ({
      ...alert,
      isRead: readAlertIds.includes(alert.id),
    }));
  }, [debts, readAlertIds]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.isRead).length;
  }, [alerts]);

  // Get current active budget limit
  const activeBudget = useMemo(() => {
    const currentMonth = getCurrentMonthString();
    const found = budgets.find((b) => b.month === currentMonth);
    return found || { monthlyLimit: 0, month: currentMonth };
  }, [budgets]);

  // --- ACTIONS ---

  // --- PIN Lock Handlers ---
  const handleStartSetupPin = () => {
    setPinSetupStep('setup_enter');
    setPinInputValue('');
    setPinConfirmValue('');
    setPinSetupError('');
  };

  const handleStartChangePin = () => {
    setPinSetupStep('change_verify');
    setPinInputValue('');
    setPinConfirmValue('');
    setPinSetupError('');
  };

  const handleDisablePin = () => {
    setPinSetupStep('disable_verify');
    setPinInputValue('');
    setPinSetupError('');
  };

  const handleCancelPinSetup = () => {
    setPinSetupStep('none');
    setPinInputValue('');
    setPinConfirmValue('');
    setPinSetupError('');
  };

  const handleSetupPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError('');

    if (pinSetupStep === 'setup_enter') {
      if (pinInputValue.length !== 4 || !/^\d+$/.test(pinInputValue)) {
        setPinSetupError('يجب أن يتكون رمز PIN من 4 أرقام فقط.');
        return;
      }
      setPinSetupStep('setup_confirm');
    } else if (pinSetupStep === 'setup_confirm') {
      if (pinConfirmValue !== pinInputValue) {
        setPinSetupError('الرموز المدخلة غير متطابقة، يرجى المحاولة مرة أخرى.');
        return;
      }
      void setPin(pinInputValue);
      setPinEnabled(true);
      setPinSetupStep('none');
      setPinInputValue('');
      setPinConfirmValue('');
      setPinSetupError('');
    }
  };

  const handleDisablePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError('');

    if (!(await verifyPin(pinInputValue))) {
      setPinSetupError('رمز PIN الحالي غير صحيح.');
      return;
    }
    setPinEnabled(false);
    clearPin();
    setPinSetupStep('none');
    setPinInputValue('');
    setPinSetupError('');
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError('');

    if (pinSetupStep === 'change_verify') {
      if (!(await verifyPin(pinInputValue))) {
        setPinSetupError('رمز PIN الحالي غير صحيح.');
        return;
      }
      setPinSetupStep('change_enter');
      setPinInputValue('');
    } else if (pinSetupStep === 'change_enter') {
      if (pinInputValue.length !== 4 || !/^\d+$/.test(pinInputValue)) {
        setPinSetupError('يجب أن يتكون رمز PIN من 4 أرقام فقط.');
        return;
      }
      setPinSetupStep('change_confirm');
    } else if (pinSetupStep === 'change_confirm') {
      if (pinConfirmValue !== pinInputValue) {
        setPinSetupError('الرموز المدخلة غير متطابقة، يرجى المحاولة مرة أخرى.');
        return;
      }
      void setPin(pinInputValue);
      setPinSetupStep('none');
      setPinInputValue('');
      setPinConfirmValue('');
      setPinSetupError('');
    }
  };

  // 1. Debt operations
  const handleAddDebt = (newDebtData: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => {
    const newDebt = createIndependentDebt(
      {
        ...newDebtData,
        amount: sanitizeFinancialValue(Number(newDebtData.amount) || 0),
        referenceNumber: createNextReferenceNumber(debts, 'DBT', newDebtData.startDate),
      },
      `debt-${generateId()}`,
    );

    setDebts((prev) => [newDebt, ...prev]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'debts', newDebt.id, newDebt);
    }
  };

  const handleEditDebt = (editedDebt: Debt) => {
    setDebts((prev) => prev.map((d) => (d.id === editedDebt.id ? editedDebt : d)));
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'debts', editedDebt.id, editedDebt);
    }
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'debts', id);
    }
    // Remove linked expenses if any
    const expensesToDelete = expenses.filter((e) => e.linkedDebtId === id);
    setExpenses((prev) => prev.filter((e) => e.linkedDebtId !== id));
    if (currentUser && targetUid) {
      expensesToDelete.forEach((e) => {
        deleteDocument(targetUid, 'expenses', e.id);
      });
    }
  };

  const handleAddInstallment = (debtId: string, amount: number, date: string, notes: string, linkToBudget: boolean) => {
    const installmentId = `inst-${generateId()}`;
    let updatedDebtItem: Debt | null = null;

    setDebts((prev) => 
      prev.map((debt) => {
        if (debt.id !== debtId) return debt;

        const safeAmount = sanitizeFinancialValue(amount);
        const updatedInstallments = [...debt.installments, { id: installmentId, amount: safeAmount, date, notes }];
        const newPaidAmount = debt.paidAmount + safeAmount;
        let newStatus: Debt['status'] = 'unpaid';

        if (newPaidAmount >= debt.amount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const updated = {
          ...debt,
          paidAmount: Math.min(newPaidAmount, debt.amount),
          status: newStatus,
          installments: updatedInstallments,
        };
        updatedDebtItem = updated;
        return updated;
      })
    );

    // Link repayment to budget as an expense
    if (linkToBudget) {
      const debtItem = debts.find(d => d.id === debtId);
      const expenseDescription = `دفعة سداد لدين: ${debtItem?.personName || ''} (${notes || 'بدون ملاحظات'})`;
      
      const newExpense: Expense = {
        id: `exp-${generateId()}`,
        referenceNumber: createNextReferenceNumber(expenses, 'INV', date),
        amount: sanitizeFinancialValue(amount),
        category: 'تسديد ديون',
        date,
        description: expenseDescription,
        linkedDebtId: debtId,
      };
      setExpenses((prev) => [newExpense, ...prev]);
      if (currentUser && targetUid) {
        saveDocument(targetUid, 'expenses', newExpense.id, newExpense);
      }
    }

    if (currentUser && targetUid && updatedDebtItem) {
      saveDocument(targetUid, 'debts', debtId, updatedDebtItem);
    }
  };

  const handleDeleteInstallment = (debtId: string, installmentId: string) => {
    let updatedDebtItem: Debt | null = null;
    let instToDeleteAmount: number | null = null;
    const debtWithInst = debts.find((d) => d.id === debtId);
    const instToDeleteRef = debtWithInst?.installments.find((i) => i.id === installmentId);
    instToDeleteAmount = instToDeleteRef ? instToDeleteRef.amount : null;

    setDebts((prev) => 
      prev.map((debt) => {
        if (debt.id !== debtId) return debt;

        const instToDelete = debt.installments.find((i) => i.id === installmentId);
        if (!instToDelete) return debt;

        const updatedInstallments = debt.installments.filter((i) => i.id !== installmentId);
        const newPaidAmount = sanitizeFinancialValue(debt.paidAmount - instToDelete.amount);
        let newStatus: Debt['status'] = 'unpaid';

        if (newPaidAmount >= debt.amount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const updated = {
          ...debt,
          paidAmount: newPaidAmount,
          status: newStatus,
          installments: updatedInstallments,
        };
        updatedDebtItem = updated;
        return updated;
      })
    );

    // Delete linked expense if exists (match by debt id AND deleted installment amount for precision)
    setExpenses((prev) => {
      const matchingExpense = prev.find(e => e.linkedDebtId === debtId && instToDeleteAmount !== null && Math.abs(e.amount - instToDeleteAmount) < 0.01);
      if (currentUser && targetUid && matchingExpense) {
        deleteDocument(targetUid, 'expenses', matchingExpense.id);
      }
      return prev.filter(e => e.id !== matchingExpense?.id);
    });

    if (currentUser && targetUid && updatedDebtItem) {
      saveDocument(targetUid, 'debts', debtId, updatedDebtItem);
    }
  };

  // 2. Budget and expenses
  const handleSetBudget = (month: string, limit: number, categoryLimits?: { [category: string]: number }) => {
    const updatedBudget: Budget = { month, monthlyLimit: limit, categoryLimits };
    setBudgets((prev) => {
      const exists = prev.some((b) => b.month === month);
      if (exists) {
        return prev.map((b) => (b.month === month ? updatedBudget : b));
      } else {
        return [...prev, updatedBudget];
      }
    });
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'budgets', month, updatedBudget);
    }
  };

  const handleAddExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp-${generateId()}`,
      referenceNumber: createNextReferenceNumber(expenses, 'INV', newExpenseData.date),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'expenses', newExpense.id, newExpense);
    }
  };

  const handleEditExpense = (editedExpense: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === editedExpense.id ? editedExpense : e)));
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'expenses', editedExpense.id, editedExpense);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'expenses', id);
    }
  };

  const handleUpdateInitialCapital = async (newCapital: number) => {
    setInitialCapital(newCapital);
    if (userProfile && currentUser) {
      const updatedProfile = { ...userProfile, initialCapital: newCapital };
      setUserProfile(updatedProfile);
      try {
        await saveUserProfile(updatedProfile);
      } catch (err) {
        console.error('Error saving initial capital:', err);
      }
    }
  };

  // 3. Alerts Clearance
  const handleMarkAlertAsRead = (id: string) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const handleMarkAllAlertsAsRead = () => {
    const allAlertIds = alerts.map((a) => a.id);
    setReadAlertIds(allAlertIds);
  };

  const handleClearReadAlerts = () => {
    const currentActiveAlertIds = alerts.map(a => a.id);
    setReadAlertIds((prev) => prev.filter(id => !currentActiveAlertIds.includes(id)));
  };

  // 4. Project, Employee and Salary operations
  const handleAddProject = (newProjData: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...newProjData,
      id: `project-${generateId()}`,
    };
    setProjects((prev) => [...prev, newProj]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'projects', newProj.id, newProj);
    }
  };

  const handleEditProject = (editedProj: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === editedProj.id ? editedProj : p)));
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'projects', editedProj.id, editedProj);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'projects', projectId);
    }

    // Remove references
    const employeesToDelete = employees.filter((e) => e.projectId === projectId);
    setEmployees((prev) => prev.filter((e) => e.projectId !== projectId));
    if (currentUser && targetUid) {
      employeesToDelete.forEach((e) => {
        deleteDocument(targetUid, 'employees', e.id);
      });
    }

    const salaryPaymentsToDelete = salaryPayments.filter((sp) => sp.projectId === projectId);
    setSalaryPayments((prev) => prev.filter((sp) => sp.projectId !== projectId));
    if (currentUser && targetUid) {
      salaryPaymentsToDelete.forEach((sp) => {
        deleteDocument(targetUid, 'salaryPayments', sp.id);
        deleteDocument(targetUid, 'expenses', `salary-exp-${sp.id}`);
      });
    }

    // Nullify project links on debts and expenses so they move back to the personal ledger
    const detachDebts = debts.filter((d) => d.projectId === projectId);
    const detachExpenses = expenses.filter((e) => e.projectId === projectId);

    setDebts((prev) => prev.map((d) => d.projectId === projectId ? { ...d, projectId: undefined } : d));
    if (currentUser && targetUid) {
      detachDebts.forEach((d) => {
        saveDocument(targetUid, 'debts', d.id, { ...d, projectId: undefined });
      });
    }

    setExpenses((prev) => prev.map((e) => e.projectId === projectId ? { ...e, projectId: undefined } : e));
    if (currentUser && targetUid) {
      detachExpenses.forEach((e) => {
        saveDocument(targetUid, 'expenses', e.id, { ...e, projectId: undefined });
      });
    }
  };

  const handleAddEmployee = (newEmpData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: `employee-${generateId()}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'employees', newEmp.id, newEmp);
    }
  };

  const handleEditEmployee = (editedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === editedEmp.id ? editedEmp : e)));
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'employees', editedEmp.id, editedEmp);
    }
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'employees', employeeId);
    }
    // Remove salary payments and their auto-generated expenses
    const paymentsToRemove = salaryPayments.filter((sp) => sp.employeeId === employeeId);
    if (currentUser && targetUid) {
      paymentsToRemove.forEach((p) => {
        deleteDocument(targetUid, 'salaryPayments', p.id);
        deleteDocument(targetUid, 'expenses', `salary-exp-${p.id}`);
      });
    }
    setSalaryPayments((prev) => prev.filter((sp) => sp.employeeId !== employeeId));
    setExpenses((prev) => prev.filter((e) => !paymentsToRemove.some((p) => e.id === `salary-exp-${p.id}`)));
  };

  const handleAddSalaryPayment = (newPaymentData: Omit<SalaryPayment, 'id'>) => {
    const paymentId = `payment-${generateId()}`;
    const newPayment: SalaryPayment = {
      ...newPaymentData,
      id: paymentId,
    };
    
    setSalaryPayments((prev) => [...prev, newPayment]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'salaryPayments', newPayment.id, newPayment);
    }

    // Automatically create a linked expense
    const emp = employees.find(e => e.id === newPaymentData.employeeId);
    const proj = projects.find(p => p.id === newPaymentData.projectId);
    
    const newExpense: Expense = {
      id: `salary-exp-${paymentId}`,
      referenceNumber: createNextReferenceNumber(expenses, 'INV', newPaymentData.paymentDate),
      amount: newPaymentData.amount,
      category: 'عمل',
      date: newPaymentData.paymentDate,
      description: `[راتب موظف] صرف راتب الموظف (${emp ? emp.name : 'موظف'}) لشهر (${newPaymentData.month}) - مشروع: ${proj ? proj.name : 'غير معروف'}`,
      projectId: newPaymentData.projectId,
      note: newPaymentData.notes
    };
    
    setExpenses((prev) => [newExpense, ...prev]);
    if (currentUser && targetUid) {
      saveDocument(targetUid, 'expenses', newExpense.id, newExpense);
    }
  };

  const handleDeleteSalaryPayment = (paymentId: string) => {
    setSalaryPayments((prev) => prev.filter((sp) => sp.id !== paymentId));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'salaryPayments', paymentId);
    }
    // Delete auto-generated expense
    setExpenses((prev) => prev.filter((e) => e.id !== `salary-exp-${paymentId}`));
    if (currentUser && targetUid) {
      deleteDocument(targetUid, 'expenses', `salary-exp-${paymentId}`);
    }
  };

  // 5. Backup & Restore
  const handleImportBackupData = (parsedData: any): boolean => {
    if (!parsedData || typeof parsedData !== 'object') return false;
    
    const hasDebts = Array.isArray(parsedData.personal_debts || parsedData.debts);
    const hasExpenses = Array.isArray(parsedData.personal_expenses || parsedData.expenses);
    
    if (hasDebts || hasExpenses || parsedData.personal_projects) {
      const dbt = parsedData.personal_debts || parsedData.debts || [];
      const exp = parsedData.personal_expenses || parsedData.expenses || [];
      const bdg = parsedData.personal_budgets || parsedData.budgets || [];
      const prj = parsedData.personal_projects || [];
      const emp = parsedData.personal_employees_list || [];
      const sal = parsedData.personal_salary_payments || [];
      const cur = parsedData.currency || currency;
      const usr = parsedData.username || userName;

      setDebts(dbt);
      setExpenses(exp);
      setBudgets(bdg);
      setProjects(prj);
      setEmployees(emp);
      setSalaryPayments(sal);
      if (parsedData.currency) setCurrency(parsedData.currency);
      if (parsedData.username) setUserName(parsedData.username);

      if (currentUser && targetUid) {
        Promise.all([
          ...dbt.map((d: any) => saveDocument(targetUid, 'debts', d.id, d)),
          ...exp.map((e: any) => saveDocument(targetUid, 'expenses', e.id, e)),
          ...bdg.map((b: any) => saveDocument(targetUid, 'budgets', b.month, b)),
          ...prj.map((p: any) => saveDocument(targetUid, 'projects', p.id, p)),
          ...emp.map((em: any) => saveDocument(targetUid, 'employees', em.id, em)),
          ...sal.map((s: any) => saveDocument(targetUid, 'salaryPayments', s.id, s)),
          saveUserProfile({
            userId: currentUser.uid,
            displayName: usr,
            currency: cur,
            createdAt: new Date().toISOString(),
            ...(userProfile?.adminId ? { adminId: userProfile.adminId, allowedTabs: userProfile.allowedTabs } : {})
          })
        ]).catch((syncErr) => {
          console.error('Error syncing imported backup to Firestore:', syncErr);
        });
      }
      return true;
    }
    return false;
  };

  const handleResetAllData = async () => {
    if (currentUser && targetUid) {
      try {
        await Promise.all([
          ...debts.map((d) => deleteDocument(targetUid, 'debts', d.id)),
          ...expenses.map((e) => deleteDocument(targetUid, 'expenses', e.id)),
          ...budgets.map((b) => deleteDocument(targetUid, 'budgets', b.month)),
          ...projects.map((p) => deleteDocument(targetUid, 'projects', p.id)),
          ...employees.map((em) => deleteDocument(targetUid, 'employees', em.id)),
          ...salaryPayments.map((sp) => deleteDocument(targetUid, 'salaryPayments', sp.id))
        ]);
      } catch (resetErr) {
        console.error('Error resetting Firestore data:', resetErr);
      }
    }

    setDebts([]);
    setExpenses([]);
    setBudgets([]);
    setReadAlertIds([]);
    setProjects([]);
    setEmployees([]);
    setSalaryPayments([]);
    setCurrency('ر.س');
    setUserName('مستخدم جديد');

    // Preserve app-level settings (theme / PIN) while clearing all personal financial caches
    const preservedTheme = theme;
    const preservedPinEnabled = pinEnabled;
    const preservedPinSalt = localStorage.getItem('app_pin_salt');
    const preservedPinHash = localStorage.getItem('app_pin_hash');
    localStorage.clear();
    localStorage.setItem('app_theme', preservedTheme);
    localStorage.setItem('app_pin_enabled', String(preservedPinEnabled));
    if (preservedPinSalt && preservedPinHash) {
      localStorage.setItem('app_pin_salt', preservedPinSalt);
      localStorage.setItem('app_pin_hash', preservedPinHash);
    }
  };

  // Combined Payload to Export
  // النسخة الاحتياطية تغادر التطبيق (تنزيل محلي أو Google Drive)، فتُجرَّد
  // المرفقات من مفاتيح التنزيل التي تفتح الملفات بلا مصادقة.
  const exportPayload = {
    personal_debts: sanitizeRecordsForExport(debts),
    personal_expenses: sanitizeRecordsForExport(expenses),
    personal_budgets: budgets,
    personal_projects: projects,
    personal_employees_list: employees,
    personal_salary_payments: salaryPayments,
    currency,
    username: userName,
  };

  const financialUiReviewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('ui-review') : null;
  const isFinancialUiReview = financialUiReviewMode === 'financial-empty';
  const isFinancialErrorReview = financialUiReviewMode === 'financial-error';
  const isModalExperienceReview = financialUiReviewMode === 'modal-experience';

  if (isModalExperienceReview) {
    return (
      <Suspense fallback={<DeferredViewLoader label="معاينة النوافذ المنبثقة" />}>
        <ModalExperiencePreview />
      </Suspense>
    );
  }

  if (isFinancialUiReview) {
    return (
      <Suspense fallback={<DeferredViewLoader label="معاينة الواجهة المالية" />}>
        <FinancialUiReviewPreview />
      </Suspense>
    );
  }

  if (isFinancialErrorReview) {
    return (
      <main className="vault-content-shell min-h-screen w-full overflow-x-hidden p-4 md:p-8" aria-label="معاينة حالة استعادة التحميل">
        <div className="mx-auto w-full max-w-3xl pt-12">
          <FinancialDataLoadErrorNotice message="تعذر تحديث البيانات المالية من السحابة." onRetry={() => window.location.reload()} />
        </div>
      </main>
    );
  }

  if (isAuthLoading) {
    return <AppDataLoadingExperience stage={loadingStage} />;
  }

  if (!currentUser) {
    return (
        <AuthScreen
        statusMessage={authBootstrapRecoveryMessage}
        onAuthSuccess={(_userId, displayName, userCurrency) => {
          setAuthBootstrapRecoveryMessage(null);
          setUserName(displayName);
          setCurrency(userCurrency);
          // يجدد الرمز بعد نجاح نموذج الدخول كي يستمر المستمع المركزي بتهيئة البيانات.
          void auth.currentUser?.getIdToken(true);
        }} 
      />
    );
  }

  if (isPinLocked) {
    return (
      <LockScreen
        verifyPin={verifyPin}
        userName={userName}
        onUnlock={() => setIsPinLocked(false)}
      />
    );
  }

  const hasTabPermission = (tabId: string): boolean => {
    if (!currentUser) return false;
    if (tabId === 'support') return true;
    if (!userProfile?.adminId) return true;
    return userProfile.allowedTabs?.includes(tabId) || false;
  };

  const hasCategoryPermission = (tabIds: string[]): boolean => {
    return tabIds.some(hasTabPermission);
  };

  const navigateFromCommandPalette = (tab: string) => {
    if (!hasTabPermission(tab)) return;
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const focusReferenceLookupFromCommandPalette = () => {
    navigateFromCommandPalette('dashboard');
    window.setTimeout(() => document.getElementById('reference-quick-lookup-input')?.focus(), 80);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" id="app-container">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-950 px-3 py-2.5 text-white flex justify-between items-center z-40" id="mobile-top-header">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm tracking-tight">ديوني وميزانيتي <span className="text-sky-300">برو</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="mobile-command-palette-trigger"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="min-h-11 min-w-11 rounded-lg bg-slate-800 p-1.5 text-sky-300 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label="فتح الأوامر السريعة"
            title="الأوامر السريعة"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          {unreadAlertsCount > 0 && (
            <button 
              id="mobile-alerts-badge"
              onClick={() => { setActiveTab('alerts'); setIsSidebarOpen(false); }}
              className="relative min-h-11 min-w-11 rounded-lg bg-slate-800 p-1 text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
              aria-label={`فتح مركز التنبيهات، لديك ${unreadAlertsCount} تنبيه غير مقروء`}
              title="فتح مركز التنبيهات"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-rose-500 rounded-full" aria-hidden="true"></span>
            </button>
          )}
          <button 
            id="mobile-menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="min-h-11 min-w-11 rounded-lg bg-slate-800 p-1.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-expanded={isSidebarOpen}
            aria-controls="app-sidebar"
            aria-label={isSidebarOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل'}
            title={isSidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            {isSidebarOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {isSidebarOpen && (
        <button
          type="button"
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 z-[45] bg-slate-950/55 backdrop-blur-[1px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="إغلاق قائمة التنقل والعودة إلى المحتوى"
        />
      )}

      {/* Responsive Sidebar */}
      <aside 
        id="app-sidebar"
        className={`vault-sidebar fixed md:sticky top-0 right-0 h-full w-64 md:w-72 text-slate-300 z-50 flex flex-col justify-between transition-all duration-300 transform md:transform-none border-l border-slate-800/40 shadow-xl ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-5 p-5 flex-1 overflow-y-auto">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4" id="sidebar-logo-header">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl text-white shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                <Coins className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h1 className="font-black text-white text-sm tracking-tight flex items-center gap-1">ديوني وميزانيتي <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1 py-0.5 rounded-md">برو</span></h1>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">الإدارة المالية الآمنة</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="md:hidden p-1.5 bg-slate-900 rounded-lg hover:text-white border border-slate-800/80 transition-colors"
              aria-label="إغلاق قائمة التنقل"
              title="إغلاق القائمة"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* User profile card */}
          <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800/60" id="sidebar-user-card">
            <div className="relative">
              <div className="p-2 bg-slate-800 text-sky-400 rounded-full">
                <User className="w-4 h-4" />
              </div>
              {/* Pulsing online status indicator */}
              <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#090d16] animate-pulse"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {userProfile?.adminId ? (
                  <span className="text-[9px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md font-extrabold">مساعد مخوّل 🛡️</span>
                ) : (
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-extrabold">حساب سحابي (المدير)</span>
                )}
              </div>
              <h4 className="font-bold text-white text-xs truncate mt-0.5">{userName}</h4>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button 
                id="settings-trigger-btn"
                onClick={() => setIsSettingsOpen(true)}
                className="text-[9px] text-sky-400 hover:text-sky-300 hover:underline font-bold bg-sky-500/10 px-2 py-0.5 rounded-md transition-all cursor-pointer text-center"
              >
                إعدادات
              </button>
              <button 
                id="logout-btn"
                onClick={() => {
                  setConfirmModal({
                    title: 'تسجيل الخروج 🚪',
                    message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟',
                    confirmText: 'تسجيل الخروج',
                    variant: 'danger',
                    onConfirm: async () => {
                      try {
                        await signOut(auth);
                      } catch (err) {
                        console.error('Error signing out:', err);
                      }
                    }
                  });
                }}
                className="text-[9px] text-red-400 hover:text-red-300 hover:underline font-bold bg-red-500/10 px-2 py-0.5 rounded-md transition-all cursor-pointer text-center"
              >
                خروج
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4" id="sidebar-nav" aria-label="التنقل الرئيسي">
            {/* Category 1: Overview */}
            {hasCategoryPermission(['dashboard', 'advisor']) && (
              <div className="space-y-1">
                <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">الرئيسية</span>
                {hasTabPermission('dashboard') && (
                  <button
                    id="nav-dashboard"
                    onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'dashboard' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span>لوحة التحكم الرئيسية</span>
                    </span>
                    {activeTab === 'dashboard' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}

                {hasTabPermission('advisor') && (
                  <button
                    id="nav-advisor"
                    onClick={() => { setActiveTab('advisor'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'advisor' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>المستشار المالي الذكي (AI)</span>
                    </span>
                    {activeTab === 'advisor' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}
              </div>
            )}

            {/* Category 2: Core Operations */}
            {hasCategoryPermission(['debts', 'budget', 'projects']) && (
              <div className="space-y-1">
                <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">المعاملات المالية</span>
                
                {hasTabPermission('debts') && (
                  <button
                    id="nav-debts"
                    onClick={() => { setActiveTab('debts'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'debts' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <span>الديون والالتزامات</span>
                    </span>
                    {activeTab === 'debts' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}

                {hasTabPermission('budget') && (
                  <button
                    id="nav-budget"
                    onClick={() => { setActiveTab('budget'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'budget' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span>الميزانية والمصاريف</span>
                    </span>
                    {activeTab === 'budget' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}

                {hasTabPermission('projects') && (
                  <button
                    id="nav-projects"
                    onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'projects' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>مشاريع العمل والرواتب</span>
                    </span>
                    {activeTab === 'projects' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}
              </div>
            )}

            {/* Category 3: Reporting & Alerts */}
            {hasCategoryPermission(['reports', 'alerts', 'activity_log', 'backup']) && (
              <div className="space-y-1">
                <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">التقارير والأدوات</span>

                {hasTabPermission('reports') && (
                  <button
                    id="nav-reports"
                    onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'reports' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 shrink-0" />
                      <span>التقارير الرسومية</span>
                    </span>
                    {activeTab === 'reports' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}

                {hasTabPermission('activity_log') && (
                  <button
                    id="nav-activity-log"
                    onClick={() => { setActiveTab('activity_log'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'activity_log' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <History className="w-4 h-4 shrink-0" />
                      <span>سجل العمليات الشامل</span>
                    </span>
                    {activeTab === 'activity_log' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}

                {hasTabPermission('alerts') && (
                  <button
                    id="nav-alerts"
                    onClick={() => { setActiveTab('alerts'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'alerts' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 shrink-0" />
                      <span>مركز التنبيهات</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {unreadAlertsCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                          {unreadAlertsCount}
                        </span>
                      )}
                      {activeTab === 'alerts' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </button>
                )}

                {hasTabPermission('backup') && (
                  <button
                    id="nav-backup"
                    onClick={() => { setActiveTab('backup'); setIsSidebarOpen(false); }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      activeTab === 'backup' 
                        ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 shrink-0" />
                      <span>النسخ الاحتياطي والبيانات</span>
                    </span>
                    {activeTab === 'backup' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">الدعم</span>
              <button
                id="nav-support"
                onClick={() => { setActiveTab('support'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  activeTab === 'support'
                    ? 'bg-rose-600 text-white font-extrabold shadow-[0_4px_12px_rgba(225,29,72,0.25)]'
                    : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  <span>دعم التطبيق</span>
                </span>
                {activeTab === 'support' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </button>
            </div>

            {/* Category 4: Permissions (Only for Admin / Managers) */}
            {!userProfile?.adminId && (
              <div className="space-y-1">
                <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">التحكم والأمان</span>
                <button
                  id="nav-permissions"
                  onClick={() => { setActiveTab('permissions'); setIsSidebarOpen(false); }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    activeTab === 'permissions' 
                      ? 'bg-sky-600 text-white font-extrabold shadow-[0_4px_12px_rgba(2,132,199,0.25)]' 
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>صلاحيات المساعدين</span>
                  </span>
                  {activeTab === 'permissions' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-center text-[10px] text-slate-500 space-y-1.5" id="sidebar-footer">
          <p className="flex items-center justify-center gap-1">
            <span>بياناتك مشفرة ومحفوظة محلياً</span>
            <span>🔒</span>
          </p>
          <div className="border-t border-slate-900/60 pt-1.5 mt-1 space-y-0.5">
            <p className="text-slate-400 font-bold text-[10px]">تطوير وبرمجة: حسن الشمري</p>
            <p className="font-mono text-[9px] text-slate-500">📞 07812149176</p>
          </div>
          <p className="font-mono text-[9px] text-slate-600">v2.5.0 • 2026</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="vault-content-shell flex-1 p-3 md:p-5 xl:p-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full space-y-4" id="main-scrollable-content">
        {dataLoadError && (activeTab === 'dashboard' || activeTab === 'debts') && (
          <FinancialDataLoadErrorNotice message={dataLoadError} onRetry={() => window.location.reload()} />
        )}
        {/* Dynamic active view injection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                debts={debts}
                expenses={expenses}
                budget={activeBudget}
                alerts={alerts}
                currency={currency}
                onNavigate={setActiveTab}
                onMarkAlertAsRead={handleMarkAlertAsRead}
                projects={projects}
                employees={employees}
                salaryPayments={salaryPayments}
                onAddDebt={handleAddDebt}
                onAddExpense={handleAddExpense}
                initialCapital={initialCapital}
                onUpdateInitialCapital={handleUpdateInitialCapital}
              />
            )}

            {activeTab === 'debts' && (
              <Suspense fallback={<DeferredViewLoader label="سجل الديون" />}>
                <DebtsManager
                  debts={debts}
                  currency={currency}
                  ownerUid={targetUid}
                  onAddDebt={handleAddDebt}
                  onEditDebt={handleEditDebt}
                  onDeleteDebt={handleDeleteDebt}
                  onAddInstallment={handleAddInstallment}
                  onDeleteInstallment={handleDeleteInstallment}
                />
              </Suspense>
            )}

            {activeTab === 'budget' && (
              <Suspense fallback={<DeferredViewLoader label="الميزانية والمصاريف" />}>
                <BudgetManager
                  expenses={expenses}
                  budgets={budgets}
                  currency={currency}
                  ownerUid={targetUid}
                  onSetBudget={handleSetBudget}
                  onAddExpense={handleAddExpense}
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              </Suspense>
            )}

            {activeTab === 'reports' && (
              <Suspense fallback={<DeferredViewLoader label="التقارير" />}>
                <Reports 
                  debts={debts}
                  expenses={expenses}
                  budgets={budgets}
                  currency={currency}
                />
              </Suspense>
            )}

            {activeTab === 'alerts' && (
              <Suspense fallback={<DeferredViewLoader label="مركز التنبيهات" />}>
                <AlertsPanel
                  alerts={alerts}
                  debts={debts}
                  currency={currency}
                  onMarkAlertAsRead={handleMarkAlertAsRead}
                  onMarkAllAsRead={handleMarkAllAlertsAsRead}
                  onClearReadAlerts={handleClearReadAlerts}
                  onNavigate={setActiveTab}
                />
              </Suspense>
            )}

            {activeTab === 'activity_log' && (
              <Suspense fallback={<DeferredViewLoader label="سجل العمليات" />}>
                <ActivityLog
                  debts={debts}
                  expenses={expenses}
                  budgets={budgets}
                  projects={projects}
                  employees={employees}
                  salaryPayments={salaryPayments}
                  currency={currency}
                  onNavigate={setActiveTab}
                />
              </Suspense>
            )}

            {activeTab === 'backup' && (
              <Suspense fallback={<DeferredViewLoader label="النسخ الاحتياطي" />}>
                <BackupRestore
                  onImportData={handleImportBackupData}
                  onResetData={handleResetAllData}
                  exportPayload={exportPayload}
                />
              </Suspense>
            )}

            {activeTab === 'projects' && (
              <Suspense fallback={<DeferredViewLoader label="المشاريع والموظفين" />}>
                <ProjectManager
                  projects={projects}
                  employees={employees}
                  salaryPayments={salaryPayments}
                  debts={debts}
                  expenses={expenses}
                  currency={currency}
                  onAddProject={handleAddProject}
                  onEditProject={handleEditProject}
                  onDeleteProject={handleDeleteProject}
                  onAddEmployee={handleAddEmployee}
                  onEditEmployee={handleEditEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onAddSalaryPayment={handleAddSalaryPayment}
                  onDeleteSalaryPayment={handleDeleteSalaryPayment}
                  onAddDebt={handleAddDebt}
                  onAddExpense={handleAddExpense}
                  onEditDebt={handleEditDebt}
                  onDeleteDebt={handleDeleteDebt}
                  onAddInstallment={handleAddInstallment}
                  onDeleteInstallment={handleDeleteInstallment}
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              </Suspense>
            )}

            {activeTab === 'advisor' && (
              <Suspense fallback={<DeferredViewLoader label="المستشار المالي" />}>
                <SmartAdvisor
                  debts={debts}
                  expenses={expenses}
                  budgets={budgets}
                  projects={projects}
                  employees={employees}
                  salaryPayments={salaryPayments}
                  currency={currency}
                  userName={userName}
                  currentUser={currentUser}
                />
              </Suspense>
            )}

            {activeTab === 'support' && (
              <Suspense fallback={<DeferredViewLoader label="صفحة الدعم" />}>
                <SupportPage />
              </Suspense>
            )}

            {activeTab === 'permissions' && !userProfile?.adminId && currentUser && (
              <Suspense fallback={<DeferredViewLoader label="صلاحيات المساعدين" />}>
                <PermissionsManager currentUserId={currentUser.uid} currency={currency} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer with Developer Rights */}
        <footer className="pt-8 pb-4 mt-12 border-t border-slate-200/60 text-center text-[11px] text-slate-500 space-y-1" id="main-footer-copyright">
          <p className="font-bold text-slate-700 flex items-center justify-center gap-1.5 flex-wrap">
            <span>© جميع الحقوق محفوظة لبرنامج ديوني وميزانيتي</span>
            <span className="text-slate-300">•</span>
            <span>تطوير وبرمجة: <span className="text-sky-600 font-extrabold">حسن الشمري</span></span>
          </p>
          <p className="font-mono text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <span>📱 الدعم الفني والبرمجة:</span>
            <span className="text-slate-600 font-bold hover:text-sky-600 transition-colors">07812149176</span>
          </p>
        </footer>
      </main>

      <button
        id="command-palette-trigger"
        type="button"
        onClick={() => setIsCommandPaletteOpen(true)}
        className="fixed bottom-6 left-6 z-30 hidden items-center gap-2 rounded-2xl border border-sky-200 bg-white/95 px-3 py-2.5 text-xs font-black text-sky-800 shadow-[0_12px_28px_rgba(14,116,144,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/95 dark:text-sky-300 dark:hover:bg-slate-800 md:inline-flex"
        aria-label="فتح الأوامر السريعة عبر Control K"
        title="أوامر سريعة (Ctrl + K)"
      >
        <CommandIcon className="h-4 w-4" aria-hidden="true" />
        <span>أوامر سريعة</span>
        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">Ctrl K</kbd>
      </button>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigateFromCommandPalette}
        onFocusReferenceLookup={focusReferenceLookupFromCommandPalette}
        onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
        onOpenSettings={userProfile?.adminId ? undefined : () => setIsSettingsOpen(true)}
        allowedTabs={hasTabPermission}
      />

      {/* Mobile Bottom Tab Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/60 py-1.5 px-3 flex justify-around items-center z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe" 
        id="mobile-bottom-nav"
        aria-label="التنقل السريع للجوال"
      >
        {/* Tab 1: Dashboard */}
        {hasTabPermission('dashboard') && (
          <button
            id="mobile-nav-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === 'dashboard'
                ? 'text-sky-600 dark:text-sky-400 font-black scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 font-bold'
            }`}
            aria-label="الانتقال إلى لوحة التحكم الرئيسية"
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <LayoutDashboard className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
            <span className="text-[10px]">الرئيسية</span>
            {activeTab === 'dashboard' && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5 animate-pulse"></span>}
          </button>
        )}

        {/* Tab 2: Debts */}
        {hasTabPermission('debts') && (
          <button
            id="mobile-nav-debts"
            onClick={() => setActiveTab('debts')}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === 'debts'
                ? 'text-sky-600 dark:text-sky-400 font-black scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 font-bold'
            }`}
            aria-label="الانتقال إلى الديون والالتزامات"
            aria-current={activeTab === 'debts' ? 'page' : undefined}
          >
            <CreditCard className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
            <span className="text-[10px]">الديون</span>
            {activeTab === 'debts' && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5 animate-pulse"></span>}
          </button>
        )}

        {/* Tab 3: Budget */}
        {hasTabPermission('budget') && (
          <button
            id="mobile-nav-budget"
            onClick={() => setActiveTab('budget')}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              activeTab === 'budget'
                ? 'text-sky-600 dark:text-sky-400 font-black scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 font-bold'
            }`}
            aria-label="الانتقال إلى الميزانية والمصروفات"
            aria-current={activeTab === 'budget' ? 'page' : undefined}
          >
            <Wallet className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
            <span className="text-[10px]">الميزانية</span>
            {activeTab === 'budget' && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5 animate-pulse"></span>}
          </button>
        )}

        {/* Tab 4: Settings */}
        <button
          id="mobile-nav-settings"
          onClick={() => setIsSettingsOpen(true)}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
            isSettingsOpen
              ? 'text-sky-600 dark:text-sky-400 font-black scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 font-bold'
          }`}
          aria-label="فتح إعدادات الحساب والعملة"
          aria-current={isSettingsOpen ? 'page' : undefined}
        >
          <Settings className={`w-5 h-5 transition-transform duration-200 ${isSettingsOpen ? 'rotate-45' : ''}`} aria-hidden="true" />
          <span className="text-[10px]">الإعدادات</span>
          {isSettingsOpen && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5 animate-pulse"></span>}
        </button>
      </nav>

      {/* Quick Settings Overlay/Modal */}
      {isSettingsOpen && (
        <div className="app-modal-overlay fixed inset-0 flex items-center justify-center p-4 z-50" id="settings-modal" role="presentation">
          <div className="app-modal-surface max-w-sm bg-white" role="dialog" aria-modal="true" aria-label="إعدادات الحساب والعملة">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">إعدادات الحساب والعملة ⚙️</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50" aria-label="إغلاق الإعدادات" title="إغلاق الإعدادات">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs" id="settings-form">
              {pinSetupStep === 'setup_enter' && (
                <form onSubmit={handleSetupPinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">تفعيل قفل PIN</h3>
                    <p className="text-slate-500 text-[10px]">الرجاء تعيين رمز PIN جديد مكون من 4 أرقام</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">رمز PIN الجديد</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInputValue}
                      onChange={(e) => setPinInputValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPinSetup}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      التالي
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'setup_confirm' && (
                <form onSubmit={handleSetupPinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">تأكيد رمز PIN</h3>
                    <p className="text-slate-500 text-[10px]">أعد كتابة الرمز السري للتأكيد والتفعيل</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">تأكيد رمز PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinConfirmValue}
                      onChange={(e) => setPinConfirmValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPinSetupStep('setup_enter')}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      رجوع
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      تأكيد وتفعيل
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'disable_verify' && (
                <form onSubmit={handleDisablePinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
                      <Unlock className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">إلغاء قفل PIN</h3>
                    <p className="text-slate-500 text-[10px]">الرجاء إدخال رمز PIN الحالي لإلغاء القفل</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">رمز PIN الحالي</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInputValue}
                      onChange={(e) => setPinInputValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPinSetup}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      تعطيل الآن
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'change_verify' && (
                <form onSubmit={handleChangePinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">تغيير رمز PIN</h3>
                    <p className="text-slate-500 text-[10px]">أدخل رمز PIN الحالي للتحقق من هويتك</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">رمز PIN الحالي</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInputValue}
                      onChange={(e) => setPinInputValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPinSetup}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      التحقق والمتابعة
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'change_enter' && (
                <form onSubmit={handleChangePinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">تغيير رمز PIN</h3>
                    <p className="text-slate-500 text-[10px]">الرجاء كتابة رمز PIN الجديد المكون من 4 أرقام</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">رمز PIN الجديد</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInputValue}
                      onChange={(e) => setPinInputValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelPinSetup}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      التالي
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'change_confirm' && (
                <form onSubmit={handleChangePinSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="mx-auto w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm">تأكيد رمز PIN الجديد</h3>
                    <p className="text-slate-500 text-[10px]">أعد كتابة الرمز الجديد لتأكيد التغيير</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">تأكيد الرمز الجديد</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinConfirmValue}
                      onChange={(e) => setPinConfirmValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[1.5em] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-lg"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>

                  {pinSetupError && (
                    <div className="text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-[10px] font-bold flex gap-1.5 items-center">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{pinSetupError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPinSetupStep('change_enter')}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      رجوع
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      تأكيد وتحديث
                    </button>
                  </div>
                </form>
              )}

              {pinSetupStep === 'none' && (
                <>
                  {/* User Name */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold">اسم المستخدم</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                      placeholder="مثال: حسن أحمد..."
                    />
                  </div>

                  {/* Initial Capital Setting */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold">رأس المال الابتدائي / الرصيد الأولي 🏦</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={initialCapital || ''}
                        onChange={(e) => handleUpdateInitialCapital(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                        placeholder="0"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{currency}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">سيتم إضافة تسديدات ديونك إلي هذا الرصيد وخصم المصاريف منه تلقائياً.</p>
                  </div>

                  {/* Currency Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold">العملة المفضلة</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                    >
                      <option value="ر.س">ريال سعودي (ر.س)</option>
                      <option value="د.إ">درهم إماراتي (د.إ)</option>
                      <option value="د.ع">دينار عراقي (د.ع)</option>
                      <option value="ج.م">جنيه مصري (ج.م)</option>
                      <option value="د.أ">دينار أردني (د.أ)</option>
                      <option value="$">دولار أمريكي ($)</option>
                    </select>
                  </div>

                  {/* Theme Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 font-semibold text-right">مظهر التطبيق 🎨</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          theme === 'light'
                            ? 'bg-white text-sky-600 shadow-xs border border-slate-100 font-extrabold'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        id="theme-light-btn"
                      >
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>نهاري (مضيء)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 text-sky-400 shadow-xs border border-slate-700 font-extrabold'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        id="theme-dark-btn"
                      >
                        <Moon className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>ليلي (مريح)</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive PIN Lock Option */}
                  <div className="border-t border-slate-100 pt-3.5 space-y-3">
                    <h3 className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                      <Shield className="w-4 h-4 text-sky-600" />
                      <span>حماية التطبيق والخصوصية</span>
                    </h3>
                    
                    {pinEnabled ? (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            قفل التطبيق برمز PIN نشط حالياً 🔒
                          </span>
                          <button
                            type="button"
                            onClick={handleDisablePin}
                            className="text-rose-600 hover:text-rose-700 font-extrabold text-[10px] bg-white border border-rose-100 px-2.5 py-1.5 rounded-lg hover:bg-rose-50/50 transition-all cursor-pointer shadow-3xs"
                          >
                            تعطيل القفل
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartChangePin}
                          className="w-full text-center py-2 bg-white text-sky-600 hover:text-sky-700 font-bold border border-sky-100 rounded-lg hover:bg-sky-50/40 transition-all text-[10px] cursor-pointer"
                        >
                          تغيير رمز PIN السري
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold text-[10px] flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                            قفل التطبيق غير مفعّل 🔓
                          </span>
                          <button
                            type="button"
                            onClick={handleStartSetupPin}
                            className="text-sky-600 hover:text-sky-700 font-extrabold text-[10px] bg-white border border-sky-100 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-all cursor-pointer shadow-3xs"
                          >
                            تفعيل القفل
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-normal">عند تفعيل رمز PIN، سيطلب منك التطبيق الرمز السري عند فتحه لحماية بياناتك المالية الحساسة من المتطفلين.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-[10px] text-sky-700 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>عند تغيير العملة، سيتم تلقائياً تحديث الرمز المصاحب لجميع المبالغ المسجلة في التطبيق فوراً.</span>
                  </div>

                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    حفظ وإغلاق
                  </button>

                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setConfirmModal({
                          title: 'تسجيل الخروج 🚪',
                          message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟',
                          confirmText: 'تسجيل الخروج',
                          variant: 'danger',
                          onConfirm: async () => {
                            try {
                              await signOut(auth);
                            } catch (err) {
                              console.error('Error signing out:', err);
                            }
                          }
                        });
                      }}
                      className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-all cursor-pointer border border-red-100 text-center"
                    >
                      تسجيل الخروج من الحساب سحابياً
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
