# نتائج اختبار الإنتاج على Vercel — ملاحظات داخلية (QA)

## النطاق الإنتاجي
- URL الإنتاج: https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app/
- محمي بـ Vercel Authentication (تجاوز برابط وصول مؤقت أثناء الاختبار).
- آخر نشر: مرتبط بآخر التزام GitHub 3ead2669 (تم التحقق سابقاً).

## حساب الاختبار (يُحذف بعد الاختبار)
- البريد: qa.production.20260816212259@example.com
- الاسم: اختبار إنتاجي
- تم إنشاؤه وتسجيل الدخول بنجاح (Firebase Auth في الإنتاج يعمل).

## نتائج الاختبار حتى الآن (16 أغسطس 2026)
1. ✅ المصادقة وإنشاء الحساب: نجح، شاشة التحميل متعددة المراحل ظهرت وعمل الدخول.
2. ✅ عرض الواجهة الكاملة: لوحة التحكم الرئيسية، التنقل الجانبي، مؤشرات KPI، تجربة التحميل — كلها سليمة.
3. ✅ إضافة دين جديد: دين بقيمة 250 ر.س باسم "اختبار إنتاجي للرفع" أُنشئ بنجاح مع رقم مرجعي تلقائي DBT-2026-0001.
4. ✅ رفع المرفق مع إنشاء السجل: رفع PNG (vercel-qa-test.png) قبل الحفظ، وعُرضت الصورة المرفقة داخل سجل الحركة (مضمنة base64 في كشف الحركة).
5. ⬜ ملاحظة: المعاينة داخل كشف الحركة تبدو مضمنة (base64) وليس من رابط تخزين S3 — يجب التحقق مما إذا كان `/api/attachments/upload` يُستخدم في الإنتاج فعلياً أو أن الرفع يتم كتضمين محلي فقط.
6. ⬜ اختبار مسار `/api/attachments/upload` المباشر في الإنتاج (التحقق من حالة الاستجابة).
7. ⬜ التحقق من أن رفع المرفق يحفظ في S3 ويعرض من رابط آمن.

## التنظيف المطلوب بعد الاختبار
- حذف مرفق الاختبار وسجل الدين DBT-2026-0001 وحساب qa.production.*@example.com من Firestore.

## نتيجة اختبار مسار `/api/attachments/upload` في الإنتاج (21:27)
- عند الضغط على "إرفاق فاتورة أو إيصال" ثم رفع ملف PNG، ظهر خطأ في الواجهة:
  `Unexpected token 'A', "A server e"... is not valid JSON`
- هذا يشير إلى أن الاستجابة القادمة من الخادم ليست JSON صالح — على الأرجح رسالة خطأ نصية مثل "A server error occurred" تُرجعها Dالة Vercel serverless (400/500) أو خطأ من `storageProxy`/Forge (ERR_INVALID_THIS الموثق محلياً).
- الخطأ المحلي الموثق سابقاً: `[Attachments] upload failed TypeError [ERR_INVALID_THIS]: Value of "this" must be of type Crypto` — يحدث في Node 22 عند استخدام crypto.webcrypto بطريقة غير متوافقة مع Vite server proxy، لكنه ظهر في dev server أيضاً مما يستدعي التحقق.
- ملاحظة: الرفع أثناء إنشاء الدين (النموذج) نجح لأن الصورة تُضمن كـ base64 محلياً داخل كشف الحركة ولا تمر بمسار /api/attachments/upload.
- المطلوب: قراءة logs الإنتاج (manus-webdev-logs) أو فحص response فعلي لـ /api/attachments/upload في الإنتاج لتحديد السبب الجذري.
https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app/api/attachments/upload?_vercel_share=SKGVarlW5xVvJhWxax8jI4AdwU3CFAqt

## التشخيص النهائي (21:30)
سبب فشل رفع المرفقات في إنتاج Vercel هو خطأ في استيراد الوحدات: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/app' imported from /var/task/api/index.js`. المسار المنشور على Vercel هو `dpl_BfTYMfeTUPtUEDAz2512zS11s5qJ` (الفرع main). السبب الجذري أن `api/index.ts` يستورد `../server/app` بصيغة بدون امتداد، وفي بيئة Node ESM على Vercel يتطلب استيراد الامتداد `.js` النهائي عند البناء. الحل: تحويل الاستيراد في `api/index.ts` إلى مسار مُجمَّع أو إضافة امتداد `.js`، ثم إعادة النشر والتحقق مرة أخرى.

## مسار التنفيذ القادم
1. فحص `package.json` و`vercel.json` لمعرفة كيفية بناء api bundle (هل يتم tsc على api/ أم لا).
2. إصلاح الاستيراد (استخدام `server/app.js` أو بناء منفصل لـ api).
3. التزام، انتظار auto-sync، نشر Vercel (إعادة نشر من Vercel إن لزم)، ثم إعادة اختبار الرفع في الإنتاج.
4. تنظيف بيانات الاختبار (حساب qa.production ودين DBT-2026-0001) من Firestore بعد نجاح الاختبار.
