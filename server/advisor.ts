import type { Express, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import firebaseConfig from "../client/firebase-applet-config.json";

type AdvisorRequest = {
  debts?: Array<Record<string, unknown>>;
  expenses?: Array<Record<string, unknown>>;
  budgets?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  employees?: Array<Record<string, unknown>>;
  salaryPayments?: Array<Record<string, unknown>>;
  currency?: string;
  userName?: string;
  userMessage?: string;
  chatHistory?: Array<{ role?: string; text?: string }>;
};

const MAX_ITEMS_PER_GROUP = 30;
const MAX_MESSAGE_LENGTH = 1_200;

function asSafeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 300) : fallback;
}

function asAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function summarizeDebts(debts: AdvisorRequest["debts"], currency: string): string {
  if (!Array.isArray(debts) || debts.length === 0) return "لا توجد ديون مسجلة.";
  return debts.slice(0, MAX_ITEMS_PER_GROUP).map(debt => {
    const amount = asAmount(debt.amount);
    const paid = asAmount(debt.paidAmount);
    const type = debt.type === "to_me" ? "مستحق لك" : "التزام عليك";
    return `- ${asSafeText(debt.personName, "طرف غير مسمى")}: ${type}، المتبقي ${Math.max(0, amount - paid)} ${currency}، الاستحقاق ${asSafeText(debt.dueDate, "غير محدد")}.`;
  }).join("\n");
}

function summarizeExpenses(expenses: AdvisorRequest["expenses"], currency: string): string {
  if (!Array.isArray(expenses) || expenses.length === 0) return "لا توجد مصروفات مسجلة.";
  return expenses.slice(0, MAX_ITEMS_PER_GROUP).map(expense =>
    `- ${asSafeText(expense.category, "مصروف")}: ${asAmount(expense.amount)} ${currency} في ${asSafeText(expense.date, "تاريخ غير محدد")}.`
  ).join("\n");
}

function summarizeBudgets(budgets: AdvisorRequest["budgets"], currency: string): string {
  if (!Array.isArray(budgets) || budgets.length === 0) return "لم تُحدَّد ميزانية شهرية بعد.";
  return budgets.slice(0, 12).map(budget =>
    `- ${asSafeText(budget.month, "شهر غير محدد")}: حد الميزانية ${asAmount(budget.monthlyLimit)} ${currency}.`
  ).join("\n");
}

function summarizeProjects(
  projects: AdvisorRequest["projects"],
  employees: AdvisorRequest["employees"],
  currency: string,
): string {
  if (!Array.isArray(projects) || projects.length === 0) return "لا توجد مشاريع عمل مسجلة.";
  const team = Array.isArray(employees) ? employees : [];
  return projects.slice(0, MAX_ITEMS_PER_GROUP).map(project => {
    const employeeCount = team.filter(employee => employee.projectId === project.id).length;
    return `- ${asSafeText(project.name, "مشروع غير مسمى")}: ميزانية ${asAmount(project.budget)} ${currency}، سقف التزامات ${asAmount(project.debtCeiling)} ${currency}، وعدد الموظفين ${employeeCount}.`;
  }).join("\n");
}

async function verifyFirebaseSession(req: Request): Promise<boolean> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return false;
  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) return false;

  const verification = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!verification.ok) return false;
  const body = await verification.json() as { users?: Array<{ localId?: string }> };
  return Boolean(body.users?.[0]?.localId);
}

export function registerAdvisorRoutes(app: Express) {
  app.post("/api/advisor/analyze", async (req: Request, res: Response) => {
    try {
      const authenticated = await verifyFirebaseSession(req);
      if (!authenticated) {
        return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول أولاً لاستخدام المستشار المالي." });
      }

      const payload = (req.body ?? {}) as AdvisorRequest;
      const currency = asSafeText(payload.currency, "ر.س");
      const question = asSafeText(payload.userMessage, "حلل وضعي المالي الحالي واقترح أولويات عملية.").slice(0, MAX_MESSAGE_LENGTH);
      const recentHistory = Array.isArray(payload.chatHistory)
        ? payload.chatHistory.slice(-8).map(message => ({
            role: message.role === "model" ? "assistant" as const : "user" as const,
            content: asSafeText(message.text).slice(0, MAX_MESSAGE_LENGTH),
          })).filter(message => message.content.length > 0)
        : [];

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت مستشار مالي عربي داخل تطبيق لإدارة الشؤون المالية. قدّم تحليلاً عملياً مبنياً حصراً على البيانات الملخصة، ولا تخترع أرقاماً أو معاملات. لا تطلب أو تنفذ أي تحويلات أو استثمارات أو معاملات مالية. اشرح بوضوح أن الإجابة تعليمية وليست نصيحة استثمارية أو قانونية ملزمة. استخدم عناوين Markdown قصيرة وقائمة أولويات عملية.\n\nالمستخدم: ${asSafeText(payload.userName, "المستخدم")}\nالعملة: ${currency}\n\nالديون:\n${summarizeDebts(payload.debts, currency)}\n\nالمصروفات:\n${summarizeExpenses(payload.expenses, currency)}\n\nالميزانيات:\n${summarizeBudgets(payload.budgets, currency)}\n\nالمشاريع:\n${summarizeProjects(payload.projects, payload.employees, currency)}`,
          },
          ...recentHistory,
          { role: "user", content: question },
        ],
      });

      const text = response.choices?.[0]?.message?.content;
      return res.json({ text: typeof text === "string" && text.trim() ? text : "تعذر إنشاء تحليل الآن. يرجى المحاولة مرة أخرى." });
    } catch (error) {
      console.error("[Advisor] request failed", error);
      return res.status(500).json({ error: "تعذر الاتصال بالمستشار المالي الذكي حالياً." });
    }
  });
}
