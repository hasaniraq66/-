import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), 'utf8');

/**
 * المحتوى النشط ملفوف في `motion.div` من Framer Motion. وأي عنصر عليه
 * `transform` يصير الكتلة الحاوية لكل `position: fixed` بداخله ويفتح سياق
 * تكديس جديداً، فتُموضَع النافذة نسبةً إليه لا إلى الشاشة: يهبط شريط الحفظ
 * خارج المساحة المرئية، ويُرسم شريط التنقل السفلي فوق النافذة رغم أن
 * z-index النافذة أعلى.
 *
 * سبق أن مرّت محاولتا إصلاح على هذه المشكلة في CI ثم فشلتا على الجهاز، لأن
 * الاختبارات كانت تتحقق من قواعد CSS داخل النافذة بينما النافذة نفسها معلّقة
 * بمرجع خاطئ. لذلك يتحقق هذا الملف من العقد الحقيقي: كل نافذة تُعرَض عبر
 * ModalPortal إلى document.body.
 */
const COMPONENTS_WITH_MODALS = [
  'client/src/components/DebtsManager.tsx',
  'client/src/components/BudgetManager.tsx',
  'client/src/components/ProjectManager.tsx',
  'client/src/components/PermissionsManager.tsx',
  'client/src/components/ActivityLog.tsx',
  'client/src/components/FinancialAttachments.tsx',
  'client/src/components/ConfirmModal.tsx',
];

/** طبقات التغطية `fixed inset-0` التي تمثّل نافذة منبثقة. */
function countModalOverlays(source: string): number {
  return (source.match(/className="[^"]*\bfixed inset-0\b/g) ?? []).length;
}

function countPortals(source: string): number {
  return (source.match(/<ModalPortal>/g) ?? []).length;
}

describe('عرض النوافذ المنبثقة عبر Portal', () => {
  it('ينشئ ModalPortal فوق document.body لا داخل الشجرة', () => {
    const portal = read('client/src/components/ModalPortal.tsx');
    expect(portal).toContain('createPortal');
    expect(portal).toContain('document.body');
  });

  it.each(COMPONENTS_WITH_MODALS)('%s يلفّ كل نوافذه بـ ModalPortal', (file) => {
    const source = read(file);
    const overlays = countModalOverlays(source);

    expect(overlays).toBeGreaterThan(0);
    expect(source).toContain("import ModalPortal from './ModalPortal'");
    expect(countPortals(source)).toBe(overlays);
  });

  it('يبقي المحتوى النشط ملفوفاً بحركة، وهي علّة وجود هذا العقد', () => {
    // إن أُزيلت الحركة يوماً يبقى Portal صحيحاً، لكن هذا التوثيق يشرح السبب.
    const app = read('client/src/App.tsx');
    expect(app).toContain('<motion.div');
  });

  it('لا يلفّ الشاشات المعروضة أصلاً خارج غلاف الحركة', () => {
    // LockScreen و CommandPalette تُعرضان من App مباشرة خارج motion.div،
    // فلا تحتاجان Portal ولا يجوز أن يوحي الاختبار بغير ذلك.
    const app = read('client/src/App.tsx');
    const motionStart = app.indexOf('<motion.div');
    const motionEnd = app.indexOf('</motion.div>');
    const lockScreen = app.indexOf('<LockScreen');
    const palette = app.indexOf('<CommandPalette');

    expect(motionStart).toBeGreaterThan(-1);
    expect(lockScreen === -1 || lockScreen < motionStart || lockScreen > motionEnd).toBe(true);
    expect(palette === -1 || palette < motionStart || palette > motionEnd).toBe(true);
  });
});
