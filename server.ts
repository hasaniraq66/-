import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Load Firebase API key securely on startup
let firebaseApiKey = "";
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    firebaseApiKey = firebaseConfig.apiKey || "";
  }
} catch (err) {
  console.error("Error loading firebase-applet-config.json:", err);
}

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// API endpoint for AI financial advisor analysis & chat
app.post("/api/advisor/analyze", async (req, res) => {
  try {
    const { debts, expenses, budgets, projects, employees, salaryPayments, currency, userName, userMessage, chatHistory } = req.body;

    // Secure verification: check Firebase User Identity
    const authHeader = req.headers.authorization;
    if (firebaseApiKey) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول أولاً لاستخدام المستشار المالي." });
      }
      const idToken = authHeader.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ error: "غير مصرح. رمز التحقق غير صالح." });
      }

      try {
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`;
        const verifyRes = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });

        if (!verifyRes.ok) {
          const errData = await verifyRes.json().catch(() => ({}));
          console.error("Firebase ID Token verification failed:", errData);
          return res.status(401).json({ error: "جلسة العمل غير صالحة أو منتهية الصلاحية." });
        }

        const verifyData = await verifyRes.json();
        const verifiedUid = verifyData.users?.[0]?.localId;
        if (!verifiedUid) {
          return res.status(401).json({ error: "المستخدم غير موجود أو غير صالح." });
        }
      } catch (authError) {
        console.error("Authentication check exception:", authError);
        return res.status(500).json({ error: "حدث خطأ في الخادم أثناء التحقق من هويتك." });
      }
    }

    if (!apiKey || !ai) {
      return res.status(200).json({ 
        error: "مفتاح API الخاص بـ Gemini غير مهيأ. الرجاء إضافة مفتاح GEMINI_API_KEY في الإعدادات.",
        text: "مرحباً بك! لتفعيل المستشار المالي الذكي المدعوم بـ Gemini AI، يرجى تزويد التطبيق بمفتاح GEMINI_API_KEY من خلال لوحة الإعدادات أو ملف التكوين. في غضون ذلك، يمكنك استخدام بقية ميزات التطبيق المحلية بشكل كامل وسلس."
      });
    }

    // Prepare financial state text
    const debtsSummary = debts && debts.length > 0 
      ? debts.map((d: any) => `- ${d.personName}: ${d.amount} ${currency} (النوع: ${d.type === 'to_me' ? 'دين لك من الآخرين' : 'دين عليك للآخرين'}، حالة السداد: ${d.status === 'paid' ? 'مسدد بالكامل' : d.status === 'partial' ? 'مسدد جزئياً' : 'غير مسدد'}، المتبقي غير المسدد: ${d.amount - d.paidAmount} ${currency}، تاريخ الاستحقاق: ${d.dueDate})`).join("\n")
      : "لا توجد ديون مسجلة حالياً.";

    const expensesSummary = expenses && expenses.length > 0
      ? expenses.slice(0, 30).map((e: any) => `- ${e.category}: ${e.amount} ${currency} (${e.description || 'بدون وصف'} في تاريخ ${e.date})`).join("\n")
      : "لا توجد مصاريف حديثة مسجلة.";

    const budgetsSummary = budgets && budgets.length > 0
      ? budgets.map((b: any) => `- ميزانية شهر ${b.month}: الحد الأقصى للمصاريف ${b.monthlyLimit} ${currency}`).join("\n")
      : "لم يتم تحديد ميزانية شهرية عامة.";

    const projectsSummary = projects && projects.length > 0
      ? projects.map((p: any) => {
          const empCount = employees ? employees.filter((e: any) => e.projectId === p.id).length : 0;
          return `- مشروع: ${p.name} (الميزانية الإجمالية: ${p.budget} ${currency}، سقف الديون المرصودة للمشروع: ${p.debtCeiling} ${currency}، الحالة الحالية: ${p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'موقوف مؤقتاً'}، عدد الموظفين المرتبطين به: ${empCount})`;
        }).join("\n")
      : "لا توجد مشاريع عمل مسجلة حالياً.";

    const systemInstruction = `أنت مستشار مالي ذكي وخبير اقتصادي مخصص لمساعدة المستخدم في إدارة شؤونه المالية الشخصية والعملية باللغة العربية.
سوف نزودك ببيانات المستخدم المالية الكاملة لتجيب بدقة وموثوقية بالاعتماد على الأرقام والبيانات الحقيقية للمستخدم:
اسم المستخدم الموقر: ${userName || 'المستخدم'}
العملة المفضلة للتطبيق: ${currency}

البيانات والملخصات الحالية:
1. ملخص الديون والالتزامات الحالية (لك وعليك):
${debtsSummary}

2. ملخص آخر المصاريف المسجلة:
${expensesSummary}

3. الميزانيات والحدود الشهرية:
${budgetsSummary}

4. مشاريع العمل وإدارتها المالية الحالية:
${projectsSummary}

مهمتك هي تقديم تحليلات مالية دقيقة، نصائح لخفض الديون، تذكيرات ذكية، استراتيجيات للادخار والموازنة، وتقديم توصيات احترافية باللغة العربية بأسلوب ودود، واضح ومبسط.
يرجى مراعاة القواعد التالية في ردودك:
- شجع المستخدم دائماً وتحدث معه باحترام وتقدير عاليين.
- قدّم خطوات عملية (مثلاً: ابدأ بسداد الدين الفلاني ذو الفائدة أو المستحق أولاً، أو قلل مصاريف فئة معينة، أو انتبه لسقف ديون المشروع الفلاني الذي قارب على النفاد).
- استخدم تنسيق Markdown رائع وجميل (نقاط، خط عريض، عناوين فرعية) لجعل النص مريحاً وسهلاً في القراءة.
- التحدث دائماً باللغة العربية الفصحى الراقية.
- إذا طرح المستخدم سؤالاً ليس له علاقة بالشؤون المالية أو التطبيق، نبهه بلطف وركز على دورك كمستشار مالي فقط.`;

    const modelName = "gemini-3.5-flash";

    // Format chat contents for generateContent
    let contents: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
      // Add the final user message
      contents.push({
        role: 'user',
        parts: [{ text: userMessage || 'حلل وضعي المالي بالتفصيل وقدم لي نصيحة ملخصة شاملة.' }]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage || 'أهلاً بك، حلل وضعي المالي الحالي بالتفصيل وقدم لي نصائح عملية لتحسينه والسيطرة على الديون والمصاريف.' }]
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء معالجة طلبك مع Gemini." });
  }
});

// Serve assets and handle Vite in dev / prod
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();
