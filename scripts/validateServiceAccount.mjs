/**
 * يتحقق من مفتاح حساب الخدمة قبل نشر القواعد، ويطبّعه على القرص.
 *
 * كُتب ملفاً مستقلاً لا سطراً داخل YAML لسببين: أنه قابل للاختبار، وأن أول
 * إخفاق حقيقي أثبت الحاجة — قال الحارس "ليس JSON صالحاً" ولم يقل لماذا، فبقي
 * صاحب المستودع أمام رسالة صحيحة عديمة الفائدة.
 *
 * التشخيص هنا يصف الشكل لا المحتوى: الطول، وهل يبدأ بـ { وينتهي بـ }، وهل
 * حُوّلت أسطر المفتاح. لا يُطبع أي جزء من السر — بما في ذلك رسالة JSON.parse
 * نفسها، فهي تقتبس من النص المُدخَل، وحجب GitHub يطابق السر كاملاً لا أجزاءه.
 *
 *   KEY_PATH=... FIREBASE_PROJECT_ID=... node scripts/validateServiceAccount.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** نُسخ الملف عبر محرر قد تضيف BOM أو مسافات، وكلاهما يُفشل JSON.parse. */
export function normalizeCredential(raw) {
  const text = raw.replace(/^﻿/, '').trim();
  if (text.startsWith('{')) return text;

  // بعض الأدلة توصي بترميز المفتاح بـ base64 قبل لصقه في الأسرار. نقبل ذلك
  // بدل أن نُفشل شخصاً اتّبع دليلاً معقولاً.
  if (/^[A-Za-z0-9+/\r\n=]+$/.test(text) && text.length > 100) {
    try {
      const decoded = Buffer.from(text, 'base64').toString('utf8').trim();
      if (decoded.startsWith('{')) return decoded;
    } catch {
      // ليس base64 صالحاً؛ يسقط إلى التشخيص أدناه.
    }
  }
  return text;
}

/** يصف سبب الإخفاق بالشكل وحده، فلا يتسرب شيء من المفتاح إلى السجلّ. */
export function diagnose(text) {
  const lines = [`  الطول: ${text.length} بايت`];

  if (!text.startsWith('{') || !text.endsWith('}')) {
    lines.push(
      `  يبدأ بـ "{": ${text.startsWith('{') ? 'نعم' : 'لا'} — ينتهي بـ "}": ${text.endsWith('}') ? 'نعم' : 'لا'}`,
      '  ← نُسخ جزء من الملف فقط. الصق محتواه كاملاً من { إلى }.',
    );
    return lines;
  }

  // الخطأ الأشيع: نسخ المفتاح من عارض يحوّل \n داخل private_key إلى أسطر
  // حقيقية. عندها يصير النص أسطراً داخل سلسلة مقتبسة، وهذا JSON غير صالح.
  if (text.includes('BEGIN PRIVATE KEY') && !text.includes('\\n')) {
    lines.push(
      '  ← تحوّلت أسطر private_key إلى أسطر حقيقية داخل النص.',
      '     انسخ ملف JSON كما نزّلته من دون فتحه في محرر يعيد تنسيقه.',
    );
    return lines;
  }

  lines.push('  ← الصق الملف كما نزّلته تماماً، بلا حذف ولا إضافة.');
  return lines;
}

export function validate(text, expectedProjectId) {
  let key;
  try {
    key = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (key.type !== 'service_account') {
    return { ok: false, reason: 'type', type: key.type ?? 'unknown' };
  }
  if (key.project_id !== expectedProjectId) {
    return { ok: false, reason: 'project', projectId: key.project_id };
  }
  return { ok: true, clientEmail: key.client_email, projectId: key.project_id };
}

// يعمل كسكربت فقط عند التشغيل المباشر، فتبقى الدوال قابلة للاختبار.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const keyPath = process.env.KEY_PATH;
  const expected = process.env.FIREBASE_PROJECT_ID;

  const text = normalizeCredential(readFileSync(keyPath, 'utf8'));
  const result = validate(text, expected);

  if (!result.ok) {
    if (result.reason === 'parse') {
      console.error('السر FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً.');
      for (const line of diagnose(text)) console.error(line);
    } else if (result.reason === 'type') {
      console.error(`متوقَّع مفتاح حساب خدمة، والنوع المُعطى "${result.type}".`);
    } else {
      console.error(
        `المفتاح يخصّ المشروع "${result.projectId}" وسير العمل ينشر إلى "${expected}". ` +
          'رُفض النشر بدل إرساله إلى المشروع الخطأ.',
      );
    }
    process.exit(1);
  }

  // يُعاد كتابة النسخة المطبَّعة كي يقرأ firebase مفتاحاً نظيفاً حتى لو وصل
  // مرمَّزاً بـ base64 أو مسبوقاً بـ BOM.
  writeFileSync(keyPath, text, { mode: 0o600 });
  console.log(`تمّت مصادقة حساب الخدمة ${result.clientEmail} على ${result.projectId}.`);
}
