import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  TrendingUp, 
  AlertCircle, 
  MessageSquare, 
  HelpCircle,
  TrendingDown,
  ArrowLeftRight,
  Calculator,
  Compass,
  Lightbulb
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Debt, Expense, Budget, Project, Employee, SalaryPayment } from '../types';
import { formatCurrency } from '../utils';
import Markdown from 'react-markdown';

interface SmartAdvisorProps {
  debts: Debt[];
  expenses: Expense[];
  budgets: Budget[];
  projects: Project[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  currency: string;
  userName: string;
  currentUser: FirebaseUser | null;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function SmartAdvisor({
  debts,
  expenses,
  budgets,
  projects,
  employees,
  salaryPayments,
  currency,
  userName,
  currentUser
}: SmartAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: `مرحباً بك يا **${userName || 'شريكي المالي'}** في **المستشار المالي الذكي**!\n\nأحلل ملخص بياناتك المالية الحالية وسجل مشاريعك وديونك عبر خدمة ذكاء اصطناعي محمية.\n\nيمكنني مساعدتك في:\n- **تحليل الوضع المالي الشامل** وتقديم أولويات ادخار عملية.\n- **وضع خطة لسداد ديونك** بشكل منظم.\n- **مراقبة سقف ميزانيات مشاريعك** والتنبيه عند اقتراب الخطر.\n\nالإجابات تعليمية للمساعدة على التنظيم وليست توصية استثمارية ملزمة. اضغط على أحد الأسئلة المقترحة أو اكتب سؤالك.`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle send message
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-msg-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get the ID token from Firebase to authenticate with the server
      const token = currentUser ? await currentUser.getIdToken() : '';

      // Map message history to simple structure required by server API
      const chatHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/advisor/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          debts,
          expenses,
          budgets,
          projects,
          employees,
          salaryPayments,
          currency,
          userName,
          userMessage: textToSend,
          chatHistory
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر الاتصال بالمستشار المالي الذكي.');
      }
      
      const aiMsg: Message = {
        id: `ai-msg-${Date.now()}`,
        role: 'model',
        text: data.text || 'عذراً، لم أتمكن من الحصول على إجابة صحيحة من الذكاء الاصطناعي.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Advisor Error:", error);
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        role: 'model',
        text: `تعذر الاتصال بالمستشار المالي الذكي حالياً. ${error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  // Quick Stats overview
  const totalDebtsWeOwe = debts
    .filter(d => d.type === 'to_others' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const totalDebtsToUs = debts
    .filter(d => d.type === 'to_me' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  const totalExpensesThisMonth = expenses
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6" id="ai-advisor-workspace">
      
      {/* Visual Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 text-right relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-[11px] font-black border border-sky-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تحليل ذكي عبر خدمة خادمية محمية</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <span>المستشار المالي الذكي 🧠✨</span>
          </h2>
          <p className="text-xs text-sky-200/80 font-semibold leading-relaxed">
            التحليل المالي المدعوم بالذكاء الاصطناعي لمساعدتك على اتخاذ القرارات المالية الصائبة، سداد الديون بسرعة، وضبط ميزانيات مشاريعك الشخصية والمهنية.
          </p>
        </div>

        <div className="flex gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 relative z-10 w-full md:w-auto">
          <div className="text-center flex-1 px-4 border-l border-white/10">
            <span className="text-[10px] text-sky-200 block font-bold">الديون عليك</span>
            <span className="text-sm font-black text-rose-400 block mt-0.5">{formatCurrency(totalDebtsWeOwe, currency)}</span>
          </div>
          <div className="text-center flex-1 px-4">
            <span className="text-[10px] text-sky-200 block font-bold">المستحقات لك</span>
            <span className="text-sm font-black text-emerald-400 block mt-0.5">{formatCurrency(totalDebtsToUs, currency)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chat & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Financial Insights / Tips */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between h-full">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-right flex-1">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>إرشادات سريعة 💡</span>
            </h3>
            
            <div className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/60 leading-relaxed">
                <span className="text-amber-700 block mb-1">💡 قاعدة سداد الديون الأولى:</span>
                رتب ديونك التنازلية وابدأ بسداد الدين الأكثر إلحاحاً أو الأصغر حجماً (طريقة كرة الثلج).
              </div>
              
              <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/60 leading-relaxed">
                <span className="text-emerald-700 block mb-1">📊 مراقبة ميزانية المشروع:</span>
                تأكد دائماً أن سقف ديون مشاريعك لا يتجاوز 75% من الميزانية الكلية لضمان هوامش ربح ممتازة.
              </div>

              <div className="bg-sky-50/50 p-3 rounded-2xl border border-sky-100/60 leading-relaxed">
                <span className="text-sky-700 block mb-1">🔒 الأمان والحماية:</span>
                مستشارك المالي الذكي يحلل بياناتك المجهولة في سياق محمي تماماً لتقديم أدق النتائج المالية.
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Conversation Workspace */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden h-[550px]" id="chat-workspace">
          
          {/* Chat Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-right">
              <div className="p-2 bg-sky-600 rounded-xl text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                  <span>المستشار المالي الذكي</span>
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">جاهز لتحليل بياناتك المالية فوراً</p>
              </div>
            </div>
          </div>

          {/* Chat Messages Workspace */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30" id="chat-messages-container">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'mr-auto flex-row-reverse text-left' : 'ml-auto text-right'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`p-2 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-sky-600 text-white rounded-tl-none font-bold' 
                      : 'bg-white text-slate-800 border border-slate-100 shadow-3xs rounded-tr-none'
                  }`}>
                    <div className="markdown-body text-right">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    <span className={`block text-[8px] mt-1.5 ${
                      msg.role === 'user' ? 'text-sky-200' : 'text-slate-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex gap-3 max-w-[85%] ml-auto text-right"
              >
                <div className="p-2 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center bg-indigo-600 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white text-slate-800 border border-slate-100 shadow-3xs rounded-2xl rounded-tr-none px-4 py-3 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span className="font-bold text-slate-500">جاري تحليل وضعك المالي وتجهيز الاستجابة الذكية...</span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 text-right justify-start">
            <span className="text-[10px] text-slate-400 font-bold self-center w-full mb-1">أسئلة مقترحة:</span>
            <button
              onClick={() => handleSuggestClick("حلل وضعي المالي وقدم لي نصيحة ملخصة شاملة.")}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-200 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>تحليل وضعي الشامل 📈</span>
            </button>
            <button
              onClick={() => handleSuggestClick("كيف يمكنني سداد ديوني بشكل أسرع وأكثر فعالية؟")}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-200 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>خطة سداد الديون 💳</span>
            </button>
            <button
              onClick={() => handleSuggestClick("تحقق من ميزانيات مشاريع العمل والمصاريف وسقف ديونها.")}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-200 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>تحليل ديون المشاريع 💼</span>
            </button>
            <button
              onClick={() => handleSuggestClick("قدم لي نصائح عامة لتوفير المال وتقليل المصاريف.")}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-200 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>نصائح ادخار وتوفير 💰</span>
            </button>
          </div>

          {/* Message Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-4 border-t border-slate-100 flex gap-2.5 bg-white"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="اكتب هنا أي سؤال مالي تريد طرحه للمستشار الذكي..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-semibold disabled:opacity-75"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
