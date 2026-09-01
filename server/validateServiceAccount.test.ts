import { describe, expect, it } from 'vitest';
// @ts-expect-error سكربت JS بلا أنواع، يُستورد للاختبار وحده
import { diagnose, normalizeCredential, validate } from '../scripts/validateServiceAccount.mjs';

const PROJECT = 'gen-lang-client-0759922046';

const goodKey = JSON.stringify({
  type: 'service_account',
  project_id: PROJECT,
  private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
  client_email: 'github-rules-deployer@example.iam.gserviceaccount.com',
});

/**
 * أول تشغيل حقيقي أخفق برسالة صحيحة عديمة الفائدة: "ليس JSON صالحاً" من دون
 * سبب. هذه الاختبارات تحرس ما يهم — أن تُقبل اللصقات المعقولة، وأن يُسمّى
 * السبب حين يُرفض، وألّا يتسرب شيء من المفتاح إلى السجلّ.
 */
describe('تطبيع اللصقات المعقولة', () => {
  it('يقبل JSON نظيفاً', () => {
    expect(validate(normalizeCredential(goodKey), PROJECT).ok).toBe(true);
  });

  it('يتجاوز المسافات الزائدة حول النص', () => {
    expect(validate(normalizeCredential(`\n\n  ${goodKey}  \n`), PROJECT).ok).toBe(true);
  });

  it('يتجاوز BOM الذي تضيفه بعض المحرّرات', () => {
    expect(validate(normalizeCredential(`﻿${goodKey}`), PROJECT).ok).toBe(true);
  });

  it('يفكّ ترميز base64 الذي توصي به بعض الأدلة', () => {
    const encoded = Buffer.from(goodKey, 'utf8').toString('base64');
    expect(validate(normalizeCredential(encoded), PROJECT).ok).toBe(true);
  });
});

describe('رفض المفاتيح الخاطئة', () => {
  it('يرفض مفتاح مشروع آخر ويسمّيه', () => {
    const other = goodKey.replace(PROJECT, 'some-other-project');
    const result = validate(normalizeCredential(other), PROJECT);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('project');
    expect(result.projectId).toBe('some-other-project');
  });

  it('يرفض ما ليس مفتاح حساب خدمة', () => {
    const wrong = JSON.stringify({ type: 'authorized_user', project_id: PROJECT });
    expect(validate(normalizeCredential(wrong), PROJECT).reason).toBe('type');
  });
});

describe('التشخيص يسمّي السبب', () => {
  it('يكشف لصق معرّف المفتاح بدل الملف — وقع هذا فعلاً', () => {
    const keyId = 'e5bc3375d9c003f2e4498ec1fb3db428b33e572a'; // 40 محرفاً ست عشرياً
    const lines = diagnose(normalizeCredential(keyId)).join('\n');
    expect(lines).toContain('معرّف المفتاح');
    expect(lines).toContain('Create new key');
  });

  it('لا يخلط معرّف المفتاح بنصٍّ آخر طوله أربعون', () => {
    const notHex = 'z'.repeat(40);
    expect(diagnose(normalizeCredential(notHex)).join('\n')).not.toContain('معرّف المفتاح');
  });

  it('يكشف النسخ الجزئي', () => {
    const partial = goodKey.slice(0, 60);
    const lines = diagnose(normalizeCredential(partial)).join('\n');
    expect(lines).toContain('نُسخ جزء من الملف فقط');
  });

  it('يكشف تحوّل أسطر private_key — الخطأ الأشيع', () => {
    // ما يحدث حين يُنسخ المفتاح من عارض يعرض \n أسطراً حقيقية
    const mangled = goodKey.replace(/\\n/g, '\n');
    const lines = diagnose(normalizeCredential(mangled)).join('\n');
    expect(lines).toContain('تحوّلت أسطر private_key');
  });

  it('يذكر الطول ليتبيّن الاقتطاع', () => {
    expect(diagnose('{ تالف }').join('\n')).toContain('الطول:');
  });

  it('لا يطبع أي جزء من المفتاح — ولا رسالة JSON.parse التي تقتبس منه', () => {
    const secret = 'SUPERSECRETPRIVATEKEYMATERIAL';
    const mangled = goodKey.replace('AAAA', secret).replace(/\\n/g, '\n');
    const output = diagnose(normalizeCredential(mangled)).join('\n');
    expect(output).not.toContain(secret);
    expect(output).not.toContain('BEGIN PRIVATE KEY');
    expect(output).not.toContain('gserviceaccount');
  });
});
