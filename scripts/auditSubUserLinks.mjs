#!/usr/bin/env node
/**
 * فحص ما قبل نشر قواعد Firestore الجديدة.
 *
 * صارت القواعد تشتق سلطة الإشراف من وجود `/users/{مشرف}/subUsers/{مستخدم}`،
 * بينما كان النموذج القديم يعتمد على حقل `adminId` وحده. لذلك يجب أن نعرف قبل
 * النشر ما إذا كان في قاعدة البيانات ملفات تحمل `adminId` بلا سجل مقابل:
 *
 *   - **معلَّق**: `adminId` بلا سجل `subUsers`. بعد النشر لن يستطيع المشرف
 *     تعديل هذا الملف، ولن يستطيع صاحبه إزالة `adminId` بنفسه. وقد يكون أثراً
 *     لثغرة زرع `adminId` التي كانت مفتوحة، فلا يجوز إصلاحه بإنشاء السجل
 *     الناقص — ذلك يمنح المزروع سلطة حقيقية.
 *   - **مشرف مفقود**: `adminId` يشير إلى مستخدم غير موجود أصلاً.
 *   - **سليم**: الحقل والسجل متطابقان.
 *
 * الأمر يقرأ فقط افتراضياً. الخيار `--detach` يمسح `adminId` من الملفات
 * المعلَّقة، وهو الاتجاه الآمن: يعيد الحساب إلى صاحبه بدل منح سلطة مشكوك فيها.
 *
 *   ACCESS_TOKEN=$(gcloud auth print-access-token) \
 *     node scripts/auditSubUserLinks.mjs [--detach]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

function loadFirebaseConfig() {
  const path = resolve(PROJECT_ROOT, 'client/firebase-applet-config.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function decodeValue(field) {
  if (!field || typeof field !== 'object') return undefined;
  if (typeof field.stringValue === 'string') return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (typeof field.doubleValue === 'number') return field.doubleValue;
  if (typeof field.booleanValue === 'boolean') return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue) return (field.arrayValue.values ?? []).map(decodeValue);
  if (field.mapValue) {
    return Object.fromEntries(
      Object.entries(field.mapValue.fields ?? {}).map(([k, v]) => [k, decodeValue(v)]),
    );
  }
  return undefined;
}

function decodeDocument(doc) {
  return Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decodeValue(v)]),
  );
}

/**
 * يصنّف ملفاً واحداً. منطق خالص حتى يمكن اختباره بلا شبكة.
 */
export function classifyProfile({ userId, adminId, adminExists, linkExists }) {
  if (!adminId) return { userId, status: 'standalone' };
  if (!adminExists) return { userId, adminId, status: 'missing-admin' };
  if (!linkExists) return { userId, adminId, status: 'dangling' };
  return { userId, adminId, status: 'linked' };
}

export function summarize(results) {
  return results.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});
}

async function firestoreRequest(base, path, token, init = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  return response;
}

async function main() {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    console.error('ينقص ACCESS_TOKEN. مثال:\n  ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/auditSubUserLinks.mjs');
    process.exit(2);
  }

  const detach = process.argv.includes('--detach');
  const config = loadFirebaseConfig();
  const databaseId = config.firestoreDatabaseId || '(default)';
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

  console.log(`المشروع: ${config.projectId}`);
  console.log(`قاعدة البيانات: ${databaseId}`);
  console.log(detach ? 'الوضع: فصل الملفات المعلَّقة\n' : 'الوضع: قراءة فقط\n');

  // اجمع ملفات المستخدمين صفحةً صفحة
  const profiles = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300', ...(pageToken ? { pageToken } : {}) });
    const response = await firestoreRequest(base, `users?${query}`, token);
    if (!response.ok) {
      console.error(`تعذّر سرد المستخدمين (${response.status}): ${await response.text()}`);
      process.exit(1);
    }
    const body = await response.json();
    for (const doc of body.documents ?? []) {
      const userId = doc.name.split('/').pop();
      profiles.push({ userId, data: decodeDocument(doc) });
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);

  console.log(`عدد الملفات: ${profiles.length}\n`);

  const knownUserIds = new Set(profiles.map((profile) => profile.userId));
  const results = [];

  for (const { userId, data } of profiles) {
    const adminId = typeof data.adminId === 'string' && data.adminId.trim() ? data.adminId.trim() : '';
    let linkExists = false;

    if (adminId && knownUserIds.has(adminId)) {
      const link = await firestoreRequest(
        base,
        `users/${encodeURIComponent(adminId)}/subUsers/${encodeURIComponent(userId)}`,
        token,
      );
      linkExists = link.ok;
    }

    results.push(classifyProfile({ userId, adminId, adminExists: knownUserIds.has(adminId), linkExists }));
  }

  const counts = summarize(results);
  const problems = results.filter((r) => r.status === 'dangling' || r.status === 'missing-admin');

  console.log('النتيجة:');
  console.log(`  سليم (بلا مشرف):      ${counts.standalone ?? 0}`);
  console.log(`  سليم (مساعد مربوط):   ${counts.linked ?? 0}`);
  console.log(`  معلَّق (بلا سجل):      ${counts.dangling ?? 0}`);
  console.log(`  مشرف مفقود:           ${counts['missing-admin'] ?? 0}\n`);

  if (problems.length === 0) {
    console.log('لا توجد ملفات معلَّقة. نشر القواعد الجديدة آمن من هذه الناحية.');
    return;
  }

  console.log('ملفات تحتاج قراراً قبل النشر:');
  for (const problem of problems) {
    console.log(`  - ${problem.userId}  →  adminId=${problem.adminId}  (${problem.status})`);
  }

  if (!detach) {
    console.log('\nكل ملف أعلاه إمّا إنشاء مساعد لم يكتمل، وإمّا أثر لزرع adminId عبر الثغرة المغلقة.');
    console.log('لا تُنشئ سجل subUsers الناقص لإصلاحه — ذلك يمنح المزروع سلطة حقيقية.');
    console.log('أعد تشغيل الأمر مع --detach لمسح adminId وإعادة الحسابات إلى أصحابها،');
    console.log('ثم أعد إنشاء المساعدين الحقيقيين من شاشة الصلاحيات.');
    process.exitCode = 1;
    return;
  }

  console.log('\nجارٍ فصل الملفات المعلَّقة…');
  for (const problem of problems) {
    const path = `users/${encodeURIComponent(problem.userId)}?updateMask.fieldPaths=adminId&updateMask.fieldPaths=allowedTabs&currentDocument.exists=true`;
    const response = await firestoreRequest(base, path, token, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { adminId: { stringValue: '' }, allowedTabs: { arrayValue: { values: [] } } } }),
    });
    console.log(response.ok ? `  ✓ ${problem.userId}` : `  ✗ ${problem.userId} (${response.status})`);
  }
  console.log('\nتم. أعد تشغيل الأمر بلا --detach للتأكد.');
}

// شغّل فقط عند الاستدعاء المباشر حتى تبقى الدوال قابلة للاختبار
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
