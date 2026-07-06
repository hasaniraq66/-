import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';

import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  fetchUserProfile, 
  saveUserProfile, 
  fetchCollection, 
  saveDocument, 
  deleteDocument 
} from './utils/firebaseService';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';

import { Debt, Expense, Budget, SystemAlert, Project, Employee, SalaryPayment } from './types';
import { generateAlerts, getCurrentMonthString } from './utils';

// Import components
import Dashboard from './components/Dashboard';
import DebtsManager from './components/DebtsManager';
import BudgetManager from './components/BudgetManager';
import Reports from './components/Reports';
import AlertsPanel from './components/AlertsPanel';
import BackupRestore from './components/BackupRestore';
import LockScreen from './components/LockScreen';
import ProjectManager from './components/ProjectManager';
import SmartAdvisor from './components/SmartAdvisor';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// No starting mock data to ensure a completely clean start for new users
const initialDebts: Debt[] = [];

const initialExpenses: Expense[] = [];

const initialBudgets: Budget[] = [];

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // State variables (will be populated immediately once Auth state loads)
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);

  const [currency, setCurrency] = useState<string>('ر.س');

  const [userName, setUserName] = useState<string>('مستخدم جديد');

  // Track read Alert IDs to persist user clearing actions
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  // PIN security states
  const [pinEnabled, setPinEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app_pin_enabled') === 'true';
  });

  const [savedPin, setSavedPin] = useState<string>(() => {
    return localStorage.getItem('app_pin_code') || '';
  });

  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    const enabled = localStorage.getItem('app_pin_enabled') === 'true';
    const pin = localStorage.getItem('app_pin_code') || '';
    return enabled && pin.length === 4;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        setIsAuthLoading(true);
        try {
          // Fetch user profile and preferences
          const profile = await fetchUserProfile(firebaseUser.uid);
          if (profile) {
            setUserName(profile.displayName);
            setCurrency(profile.currency);
          } else {
            // Register profile for new users
            const newProfile = {
              userId: firebaseUser.uid,
              displayName: firebaseUser.displayName || userName || 'مستثمر جديد',
              email: firebaseUser.email || undefined,
              currency: currency,
              createdAt: new Date().toISOString()
            };
            await saveUserProfile(newProfile);
          }

          // Fetch user-isolated cloud collections from Firestore
          const [loadedDebts, loadedExpenses, loadedBudgets, loadedProjects, loadedEmployees, loadedPayments] = await Promise.all([
            fetchCollection<Debt>(firebaseUser.uid, 'debts'),
            fetchCollection<Expense>(firebaseUser.uid, 'expenses'),
            fetchCollection<Budget>(firebaseUser.uid, 'budgets'),
            fetchCollection<Project>(firebaseUser.uid, 'projects'),
            fetchCollection<Employee>(firebaseUser.uid, 'employees'),
            fetchCollection<SalaryPayment>(firebaseUser.uid, 'salaryPayments')
          ]);

          // Load cloud values, falling back to user-isolated localStorage if offline/empty
          const localDebtsSaved = localStorage.getItem(`personal_debts_${firebaseUser.uid}`);
          const localExpensesSaved = localStorage.getItem(`personal_expenses_${firebaseUser.uid}`);
          const localBudgetsSaved = localStorage.getItem(`personal_budgets_${firebaseUser.uid}`);
          const localProjectsSaved = localStorage.getItem(`personal_projects_${firebaseUser.uid}`);
          const localEmployeesSaved = localStorage.getItem(`personal_employees_list_${firebaseUser.uid}`);
          const localPaymentsSaved = localStorage.getItem(`personal_salary_payments_${firebaseUser.uid}`);
          const localReadAlertsSaved = localStorage.getItem(`personal_read_alerts_${firebaseUser.uid}`);

          const finalDebts = loadedDebts.length > 0 ? loadedDebts : (localDebtsSaved ? JSON.parse(localDebtsSaved) : []);
          const finalExpenses = loadedExpenses.length > 0 ? loadedExpenses : (localExpensesSaved ? JSON.parse(localExpensesSaved) : []);
          const finalBudgets = loadedBudgets.length > 0 ? loadedBudgets : (localBudgetsSaved ? JSON.parse(localBudgetsSaved) : []);
          const finalProjects = loadedProjects.length > 0 ? loadedProjects : (localProjectsSaved ? JSON.parse(localProjectsSaved) : []);
          const finalEmployees = loadedEmployees.length > 0 ? loadedEmployees : (localEmployeesSaved ? JSON.parse(localEmployeesSaved) : []);
          const finalPayments = loadedPayments.length > 0 ? loadedPayments : (localPaymentsSaved ? JSON.parse(localPaymentsSaved) : []);
          const finalReadAlerts = localReadAlertsSaved ? JSON.parse(localReadAlertsSaved) : [];

          setDebts(finalDebts);
          setExpenses(finalExpenses);
          setBudgets(finalBudgets);
          setProjects(finalProjects);
          setEmployees(finalEmployees);
          setSalaryPayments(finalPayments);
          setReadAlertIds(finalReadAlerts);
        } catch (err) {
          console.error('Error fetching user collections:', err);
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setIsAuthLoading(false);
        // Clear sensitive states on logout
        setDebts([]);
        setExpenses([]);
        setBudgets([]);
        setProjects([]);
        setEmployees([]);
        setSalaryPayments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize dynamic, user-isolated localStorage with state edits
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_debts_${currentUser.uid}`, JSON.stringify(debts));
    }
  }, [debts, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_expenses_${currentUser.uid}`, JSON.stringify(expenses));
    }
  }, [expenses, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_budgets_${currentUser.uid}`, JSON.stringify(budgets));
    }
  }, [budgets, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_projects_${currentUser.uid}`, JSON.stringify(projects));
    }
  }, [projects, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_employees_list_${currentUser.uid}`, JSON.stringify(employees));
    }
  }, [employees, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_salary_payments_${currentUser.uid}`, JSON.stringify(salaryPayments));
    }
  }, [salaryPayments, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_currency_${currentUser.uid}`, currency);
    }
  }, [currency, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_username_${currentUser.uid}`, userName);
    }
  }, [userName, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`personal_read_alerts_${currentUser.uid}`, JSON.stringify(readAlertIds));
    }
  }, [readAlertIds, currentUser]);

  // Synchronize general PIN security setting
  useEffect(() => {
    localStorage.setItem('app_pin_enabled', String(pinEnabled));
  }, [pinEnabled]);

  useEffect(() => {
    localStorage.setItem('app_pin_code', savedPin);
  }, [savedPin]);

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
      setSavedPin(pinInputValue);
      setPinEnabled(true);
      setPinSetupStep('none');
      setPinInputValue('');
      setPinConfirmValue('');
      setPinSetupError('');
    }
  };

  const handleDisablePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError('');

    if (pinInputValue !== savedPin) {
      setPinSetupError('رمز PIN الحالي غير صحيح.');
      return;
    }
    setPinEnabled(false);
    setSavedPin('');
    setPinSetupStep('none');
    setPinInputValue('');
    setPinSetupError('');
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError('');

    if (pinSetupStep === 'change_verify') {
      if (pinInputValue !== savedPin) {
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
      setSavedPin(pinInputValue);
      setPinSetupStep('none');
      setPinInputValue('');
      setPinConfirmValue('');
      setPinSetupError('');
    }
  };

  // 1. Debt operations
  const handleAddDebt = (newDebtData: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => {
    const newDebt: Debt = {
      ...newDebtData,
      id: `debt-${generateId()}`,
      paidAmount: 0,
      status: 'unpaid',
      installments: [],
    };
    setDebts((prev) => [newDebt, ...prev]);
    if (currentUser) {
      saveDocument(currentUser.uid, 'debts', newDebt.id, newDebt);
    }
  };

  const handleEditDebt = (editedDebt: Debt) => {
    setDebts((prev) => prev.map((d) => (d.id === editedDebt.id ? editedDebt : d)));
    if (currentUser) {
      saveDocument(currentUser.uid, 'debts', editedDebt.id, editedDebt);
    }
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'debts', id);
    }
    // Remove linked expenses if any
    const expensesToDelete = expenses.filter((e) => e.linkedDebtId === id);
    setExpenses((prev) => prev.filter((e) => e.linkedDebtId !== id));
    if (currentUser) {
      expensesToDelete.forEach((e) => {
        deleteDocument(currentUser.uid, 'expenses', e.id);
      });
    }
  };

  const handleAddInstallment = (debtId: string, amount: number, date: string, notes: string, linkToBudget: boolean) => {
    const installmentId = `inst-${generateId()}`;
    let updatedDebtItem: Debt | null = null;

    setDebts((prev) => 
      prev.map((debt) => {
        if (debt.id !== debtId) return debt;

        const updatedInstallments = [...debt.installments, { id: installmentId, amount, date, notes }];
        const newPaidAmount = debt.paidAmount + amount;
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
        amount,
        category: 'تسديد ديون',
        date,
        description: expenseDescription,
        linkedDebtId: debtId,
      };
      setExpenses((prev) => [newExpense, ...prev]);
      if (currentUser) {
        saveDocument(currentUser.uid, 'expenses', newExpense.id, newExpense);
      }
    }

    setTimeout(() => {
      if (currentUser && updatedDebtItem) {
        saveDocument(currentUser.uid, 'debts', debtId, updatedDebtItem);
      }
    }, 150);
  };

  const handleDeleteInstallment = (debtId: string, installmentId: string) => {
    let updatedDebtItem: Debt | null = null;
    setDebts((prev) => 
      prev.map((debt) => {
        if (debt.id !== debtId) return debt;

        const instToDelete = debt.installments.find((i) => i.id === installmentId);
        if (!instToDelete) return debt;

        const updatedInstallments = debt.installments.filter((i) => i.id !== installmentId);
        const newPaidAmount = Math.max(0, debt.paidAmount - instToDelete.amount);
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

    // Delete linked expense if exists
    const expenseToDelete = expenses.find(e => e.linkedDebtId === debtId && e.amount === expenses.find(ex => ex.linkedDebtId === debtId)?.amount);
    setExpenses((prev) => prev.filter((e) => !(e.linkedDebtId === debtId && e.amount === expenses.find(ex => ex.linkedDebtId === debtId)?.amount)));
    
    if (currentUser && expenseToDelete) {
      deleteDocument(currentUser.uid, 'expenses', expenseToDelete.id);
    }

    setTimeout(() => {
      if (currentUser && updatedDebtItem) {
        saveDocument(currentUser.uid, 'debts', debtId, updatedDebtItem);
      }
    }, 150);
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
    if (currentUser) {
      saveDocument(currentUser.uid, 'budgets', month, updatedBudget);
    }
  };

  const handleAddExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp-${generateId()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    if (currentUser) {
      saveDocument(currentUser.uid, 'expenses', newExpense.id, newExpense);
    }
  };

  const handleEditExpense = (editedExpense: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === editedExpense.id ? editedExpense : e)));
    if (currentUser) {
      saveDocument(currentUser.uid, 'expenses', editedExpense.id, editedExpense);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'expenses', id);
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
    if (currentUser) {
      saveDocument(currentUser.uid, 'projects', newProj.id, newProj);
    }
  };

  const handleEditProject = (editedProj: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === editedProj.id ? editedProj : p)));
    if (currentUser) {
      saveDocument(currentUser.uid, 'projects', editedProj.id, editedProj);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'projects', projectId);
    }

    // Remove references
    const employeesToDelete = employees.filter((e) => e.projectId === projectId);
    setEmployees((prev) => prev.filter((e) => e.projectId !== projectId));
    if (currentUser) {
      employeesToDelete.forEach((e) => {
        deleteDocument(currentUser.uid, 'employees', e.id);
      });
    }

    const salaryPaymentsToDelete = salaryPayments.filter((sp) => sp.projectId === projectId);
    setSalaryPayments((prev) => prev.filter((sp) => sp.projectId !== projectId));
    if (currentUser) {
      salaryPaymentsToDelete.forEach((sp) => {
        deleteDocument(currentUser.uid, 'salaryPayments', sp.id);
        deleteDocument(currentUser.uid, 'expenses', `salary-exp-${sp.id}`);
      });
    }

    // Nullify or delete linked debts and expenses
    setDebts((prev) => {
      const updated = prev.map((d) => d.projectId === projectId ? { ...d, projectId: undefined } : d);
      if (currentUser) {
        prev.forEach((d) => {
          if (d.projectId === projectId) {
            saveDocument(currentUser.uid, 'debts', d.id, { ...d, projectId: undefined });
          }
        });
      }
      return updated;
    });

    setExpenses((prev) => {
      const updated = prev.map((e) => e.projectId === projectId ? { ...e, projectId: undefined } : e);
      if (currentUser) {
        prev.forEach((e) => {
          if (e.projectId === projectId) {
            saveDocument(currentUser.uid, 'expenses', e.id, { ...e, projectId: undefined });
          }
        });
      }
      return updated;
    });
  };

  const handleAddEmployee = (newEmpData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: `employee-${generateId()}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    if (currentUser) {
      saveDocument(currentUser.uid, 'employees', newEmp.id, newEmp);
    }
  };

  const handleEditEmployee = (editedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === editedEmp.id ? editedEmp : e)));
    if (currentUser) {
      saveDocument(currentUser.uid, 'employees', editedEmp.id, editedEmp);
    }
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'employees', employeeId);
    }
    // Remove salary payments
    setSalaryPayments((prev) => {
      const paymentsToRemove = prev.filter((sp) => sp.employeeId === employeeId);
      const expenseIdsToRemove = paymentsToRemove.map(p => `salary-exp-${p.id}`);
      setExpenses((exPrev) => {
        const updated = exPrev.filter(e => !expenseIdsToRemove.includes(e.id));
        if (currentUser) {
          expenseIdsToRemove.forEach((id) => {
            deleteDocument(currentUser.uid, 'expenses', id);
          });
        }
        return updated;
      });
      if (currentUser) {
        paymentsToRemove.forEach((p) => {
          deleteDocument(currentUser.uid, 'salaryPayments', p.id);
        });
      }
      return prev.filter((sp) => sp.employeeId !== employeeId);
    });
  };

  const handleAddSalaryPayment = (newPaymentData: Omit<SalaryPayment, 'id'>) => {
    const paymentId = `payment-${generateId()}`;
    const newPayment: SalaryPayment = {
      ...newPaymentData,
      id: paymentId,
    };
    
    setSalaryPayments((prev) => [...prev, newPayment]);
    if (currentUser) {
      saveDocument(currentUser.uid, 'salaryPayments', newPayment.id, newPayment);
    }

    // Automatically create a linked expense
    const emp = employees.find(e => e.id === newPaymentData.employeeId);
    const proj = projects.find(p => p.id === newPaymentData.projectId);
    
    const newExpense: Expense = {
      id: `salary-exp-${paymentId}`,
      amount: newPaymentData.amount,
      category: 'عمل',
      date: newPaymentData.paymentDate,
      description: `[راتب موظف] صرف راتب الموظف (${emp ? emp.name : 'موظف'}) لشهر (${newPaymentData.month}) - مشروع: ${proj ? proj.name : 'غير معروف'}`,
      projectId: newPaymentData.projectId,
      note: newPaymentData.notes
    };
    
    setExpenses((prev) => [newExpense, ...prev]);
    if (currentUser) {
      saveDocument(currentUser.uid, 'expenses', newExpense.id, newExpense);
    }
  };

  const handleDeleteSalaryPayment = (paymentId: string) => {
    setSalaryPayments((prev) => prev.filter((sp) => sp.id !== paymentId));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'salaryPayments', paymentId);
    }
    // Delete auto-generated expense
    setExpenses((prev) => prev.filter((e) => e.id !== `salary-exp-${paymentId}`));
    if (currentUser) {
      deleteDocument(currentUser.uid, 'expenses', `salary-exp-${paymentId}`);
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

      if (currentUser) {
        Promise.all([
          ...dbt.map((d: any) => saveDocument(currentUser.uid, 'debts', d.id, d)),
          ...exp.map((e: any) => saveDocument(currentUser.uid, 'expenses', e.id, e)),
          ...bdg.map((b: any) => saveDocument(currentUser.uid, 'budgets', b.month, b)),
          ...prj.map((p: any) => saveDocument(currentUser.uid, 'projects', p.id, p)),
          ...emp.map((em: any) => saveDocument(currentUser.uid, 'employees', em.id, em)),
          ...sal.map((s: any) => saveDocument(currentUser.uid, 'salaryPayments', s.id, s)),
          saveUserProfile({
            userId: currentUser.uid,
            displayName: usr,
            currency: cur,
            createdAt: new Date().toISOString()
          })
        ]);
      }
      return true;
    }
    return false;
  };

  const handleResetAllData = () => {
    if (currentUser) {
      debts.forEach((d) => deleteDocument(currentUser.uid, 'debts', d.id));
      expenses.forEach((e) => deleteDocument(currentUser.uid, 'expenses', e.id));
      budgets.forEach((b) => deleteDocument(currentUser.uid, 'budgets', b.month));
      projects.forEach((p) => deleteDocument(currentUser.uid, 'projects', p.id));
      employees.forEach((em) => deleteDocument(currentUser.uid, 'employees', em.id));
      salaryPayments.forEach((sp) => deleteDocument(currentUser.uid, 'salaryPayments', sp.id));
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
    localStorage.clear();
  };

  // Combined Payload to Export
  const exportPayload = {
    personal_debts: debts,
    personal_expenses: expenses,
    personal_budgets: budgets,
    personal_projects: projects,
    personal_employees_list: employees,
    personal_salary_payments: salaryPayments,
    currency,
    username: userName,
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-slate-300 font-sans" id="auth-loading-screen">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <span className="text-xs font-bold tracking-wider">جاري تحميل بياناتك الآمنة...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen 
        onAuthSuccess={(userId, displayName, userCurrency) => {
          setUserName(displayName);
          setCurrency(userCurrency);
        }} 
      />
    );
  }

  if (isPinLocked) {
    return (
      <LockScreen
        savedPin={savedPin}
        userName={userName}
        onUnlock={() => setIsPinLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]" id="app-container">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-950 text-white p-4 flex justify-between items-center shadow-md z-40" id="mobile-top-header">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm tracking-tight">مدير الديون الشخصي</span>
        </div>
        <div className="flex items-center gap-3">
          {unreadAlertsCount > 0 && (
            <button 
              id="mobile-alerts-badge"
              onClick={() => { setActiveTab('alerts'); setIsSidebarOpen(false); }}
              className="relative p-1 bg-slate-800 rounded-lg text-rose-400"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            </button>
          )}
          <button 
            id="mobile-menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 bg-slate-800 rounded-lg text-slate-300"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Responsive Sidebar */}
      <aside 
        id="app-sidebar"
        className={`fixed md:sticky top-0 right-0 h-full w-64 md:w-72 bg-[#090d16] text-slate-300 z-50 flex flex-col justify-between transition-all duration-300 transform md:transform-none border-l border-slate-800/40 shadow-xl ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-[calc(105vh-70px)] md:max-h-none">
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
            >
              <X className="w-4 h-4" />
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
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md font-extrabold">حساب سحابي</span>
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
          <nav className="space-y-4" id="sidebar-nav">
            {/* Category 1: Overview */}
            <div className="space-y-1">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">الرئيسية</span>
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
            </div>

            {/* Category 2: Core Operations */}
            <div className="space-y-1">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">المعاملات المالية</span>
              
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
            </div>

            {/* Category 3: Reporting & Alerts */}
            <div className="space-y-1">
              <span className="block text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1">التقارير والأدوات</span>

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
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-900 bg-slate-950/40 text-center text-[10px] text-slate-500 space-y-1" id="sidebar-footer">
          <p className="flex items-center justify-center gap-1">
            <span>بياناتك مشفرة ومحفوظة محلياً</span>
            <span>🔒</span>
          </p>
          <p className="font-mono text-[9px]">v2.5.0 • 2026</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6" id="main-scrollable-content">
        
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
              />
            )}

            {activeTab === 'debts' && (
              <DebtsManager
                debts={debts}
                currency={currency}
                onAddDebt={handleAddDebt}
                onEditDebt={handleEditDebt}
                onDeleteDebt={handleDeleteDebt}
                onAddInstallment={handleAddInstallment}
                onDeleteInstallment={handleDeleteInstallment}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetManager
                expenses={expenses}
                budgets={budgets}
                currency={currency}
                onSetBudget={handleSetBudget}
                onAddExpense={handleAddExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'reports' && (
              <Reports 
                debts={debts}
                expenses={expenses}
                budgets={budgets}
                currency={currency}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsPanel
                alerts={alerts}
                debts={debts}
                currency={currency}
                onMarkAlertAsRead={handleMarkAlertAsRead}
                onMarkAllAsRead={handleMarkAllAlertsAsRead}
                onClearReadAlerts={handleClearReadAlerts}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'backup' && (
              <BackupRestore
                onImportData={handleImportBackupData}
                onResetData={handleResetAllData}
                exportPayload={exportPayload}
              />
            )}

            {activeTab === 'projects' && (
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
            )}

            {activeTab === 'advisor' && (
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
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quick Settings Overlay/Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="settings-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">إعدادات الحساب والعملة ⚙️</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
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
