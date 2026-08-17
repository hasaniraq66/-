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

## حالة النشرات (21:35)
النشرة الجديدة `dpl_HJvVZ1UiMLQBQjnYoi4C834jb1Cm` (المرتبطة بالتزام ecbe9b78) فشلت في البناء بالخطأ: `Error: Function Runtimes must have a valid version, for example now-php@1.0.0`. السبب: صيغة `nodejs22.x` غير معروفة لدى Vercel؛ الصيغة الصحيحة هي `nodejs22.x` ضمن صيغة اسم runtime معروفة مثل `@vercel/node` لا، بل يجب استخدام قيمة مثل `nodejs22.x` ضمن قائمة runtimes المدعومة: الصيغ المقبولة هي أسماء مثل `nodejs20.x`/`nodejs22.x` لكن Vercel يتطلب أحياناً صيغة `runtime` غير مدرجة في old builder. البديل الأضمن: إسقاط `functions.runtime` نهائياً (Vercel يستنتج runtime تلقائياً) أو استخدام `runtime: "nodejs22.x"` — لكن الخطأ يشير إلى أن builder قديم لا يفهمها، فالأفضل إسقاط الحقل.

### معلومات Vercel MCP الأساسية
- teamId: `team_uL2DiMwbChY7rfkQd8WzXQSf` (slug: hassan-s9-projects)
- projectId: `prj_UU6ojo9kq2kAPJzBdsuBymWrXpW8` (اسمه "-")
- رابط الإنتاج: https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app (محمي بـ Vercel Auth)
- github/main = ecbe9b78 (آخر التزام إصلاح حزمة API)

## جولة الاختبار بعد الإصلاح الشامل (2026-08-16)

- النشرة dpl_91mCNSXwXJ5bBz3KbJBXMSdcQLya بنيت ونشرت على الإنتاج بنجاح (READY) بعد:
  1) إعادة api/index.ts لاستيراد createApp من ../server/app.js مباشرة.
  2) إضافة امتدادات .js صريحة لجميع الاستيرادات النسبية (43 استيراداً) عبر scripts/add-ext.mjs.
  3) إزالة functions من vercel.json.
- رابط الوصول المؤقت (يُجدد عند انتهاء الصلاحية): https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app/?_vercel_share=Y62wAN0sb4WaxahfAR69lEQw7WoSKdxA
- تمت المصادقة في الإنتاج بحساب الاختبار "اختبار إنتاجي للرفع" وعرض لوحة التحكم وصفحة الديون (دين DBT-2026-0001 السابق موجود).
- فُتحت نافذة إضافة دين جديد، أُدخل ملف PNG qa-upload-prod.png في حقل المرفق، وظهرت المعاينة "صورة مرفقة بنجاح ✓ تم إرفاق صورة".
- الخطوة التالية: تعبئة الحقول (الشخص، المبلغ 50، استحقاق) وحفظ الدين للتحقق من نجاح POST /api/attachments/upload في الإنتاج.

## نتيجة حفظ الدين مع المرفق (2026-08-16)

نجح حفظ الدين الجديد DBT-2026-0002 (50 ر.س، استحقاق 10 سبتمبر 2026) مع مرفق PNG عبر مسار رفع التخزين في الإنتاج، إذ ظهرت المعاينة في السجل مباشرة داخل بيئة Vercel. هذا يعني أن POST /api/attachments/upload ومسار storagePut عملا بنجاح في وضع Serverless بعد الإصلاح (الامتدادات الصريحة واستيراد createApp من المصدر). بقي اختبار المسار التكميلي /api/attachments/review وسجل التدقيق ثم تنظيف بيانات الاختبار.

## ملاحظات إضافية (2026-08-16)

عرض الديون في الإنتاج يعمل، والمرفق PNG لسجل DBT-2026-0002 يظهر معاينة base64 صحيحة في السجل. استدعاء fetch مباشر إلى /api/attachments من وحدة التحكم (بدون Authorization header) أرجع FUNCTION_INVOCATION_FAILED 500 — قد يكون بسبب غياب التوثيق (مطلوب) أو خطأ تشغيل في مسار الجلب. أزرار "مرفق" في السجل تعرض "(0)" مع أن المعاينة ظاهرة (العدد من حقل مرفقات مستقل)، والمطلوب الآن: اختبار مسار المراجعة وسجل التدقيق عبر الواجهة ثم التنظيف.

## تشخيص الخطأ 500 على /api/attachments (2026-08-16)

أظهرت سجلات runtime في Vercel أن جميع أخطاء 500 (POST /api/attachments/upload عند 21:27 و GET /api/attachments عند 21:45-21:46) تعود للنشرة القديمة dpl_BfTYMfeT (التزام 3ead2669) التي تعيد خطأ ERR_MODULE_NOT_FOUND: /var/task/server/app. أما النشرة الحالية النشطة dpl_91mCNSXw (التزام 4f10ab6b، 21:41 UTC) فهي READY وتم فيها حفظ الدين DBT-2026-0002 مع مرفق PNG بنجاح، ما يعني أن مسار الرفع يعمل في النشرة الجديدة. طلب GET /api/attachments الذي أجرته وحدة التحكم في المتصفح أصاب النشرة القديمة بسبب تأخر نشر النشرة الجديدة آنذاك. المطلوب الآن: إعادة اختبار جلب/مراجعة المرفقات في النشرة الجديدة ثم التنظيف.

## حالة الإنتاج الفعلية (21:48 UTC)

طلب GET /api/attachments و POST /api/trpc/system.ping على رابط الإنتاج يرجعان FUNCTION_INVOCATION_FAILED، مما يشير إلى أن رابط الإنتاج https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app ما زال يخدم النشرة القديمة dpl_BfTYMfeT (3ead2669) ذات الخطأ ERR_MODULE_NOT_FOUND. النشرة الناجحة dpl_91mCNSXw (4f10ab6b) حالتها READY لكنها ربما لم تُربط بعد بـ alias الإنتاج، أو أن النجاح السابق لرفع المرفق حدث في نافذة قصيرة بين نشرتين. الإجراء التالي: التحقق من alias الإنتاج في Vercel وتحديد النشرة النشطة عليه، ثم تصحيح التوزيع.

## الاكتشاف الحاسم (21:49 UTC)

نشرة الإنتاج الناجحة dpl_91mCNSXw (commit 4f10ab6b) وُزعت على URL مختلف تماماً: https://1fjstwfyh-8ozrimmvz-hassan-s9-projects.vercel.app وليس على https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app الذي ما زال يعمل بـ dpl_6TPJKQt8. السبب المرجح: تم إنشاء مشروع Vercel جديد (أو alias مختلف) مرتبط بالـ repo عند إعادة بناء التاريخ في GitHub، فصار لدينا مشروعان/names متشابهان. الإجراء: اختبار الرابط الجديد 1fjstwfyh-8ozrimmvz للتأكد من أنه الإصدار المصحح، ثم توجيه المستخدم له، أو إعادة ربط المشروع الصحيح.

## حساب اختبار V2 والنشرة الجديدة (21:50 UTC)

الرابط الإنتاجي الجديد (النشرة المصححة 4f10ab6b، dpl_91mCNSXw): https://1fjstwfyh-8ozrimmvz-hassan-s9-projects.vercel.app/ — تم إنشاء حساب اختبار V2 وتسجيل الدخول بنجاح مع شاشة التحميل متعددة المراحل وعرض لوحة التحكم سليمة (v2.5.0).

بيانات حساب الاختبار V2 (يُحذف بعد الاختبار):
- البريد: qa.production.v2.20260816215034@example.com
- كلمة المرور: QATest#2026!
- الاسم: اختبار إنتاجي V2
- رابط وصول مؤقت (ينتهي 17/8 20:49): https://1fjstwfyh-8ozrimmvz-hassan-s9-projects.vercel.app/?_vercel_share=Ye5kB4LSLOArxOBWudlvCuAP2x4Me0F4

ملاحظة مهمة: رابط الإنتاج الأصلي https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app ما زال يعرض الدالة القديمة المعطوبة (FUNCTION_INVOCATION_FAILED) — يحتاج فحص alias الإنتاج في Vercel أو إبلاغ المستخدم بالرابط الجديد.

## نجاح الاختبار في النشرة المصححة (21:51 UTC)

تم حفظ دين DBT-2026-0001 (150 ر.س، دين لي، شخصي، استحقاق 30 سبتمبر 2026) بحساب "اختبار إنتاجي V2" في النشرة المصححة dpl_91mCNSXw (1fjstwfyh-8ozrimmvz) مع مرفق PNG — ظهرت المعاينة بنجاح داخل السجل. هذا يؤكد أن مسار رفع التخزين في الإنتاج يعمل بعد إصلاح الامتدادات الصريحة (43 استيراداً). يبقى: اختبار مسار المراجعة وسجل التدقيق، ثم التنظيف، ثم حسم قضية alias الإنتاج الأصلي (aeoczdhyw) الذي ما زال يعرض النشرة المعطوبة.

## اختبار نافذة المرفقات في النشرة المصححة (21:52 UTC)

فُتحت قائمة "فواتير وإيصالات" لسجل DBT-2026-0001 وتعرض حالة "لا توجد مرفقات بعد" و"إرفاق فاتورة أو إيصال" بنجاح (GET /api/attachments عمل). النافذة المنبثقة ظهرت لكن أزرارها ليست في قائمة العناصر بعد — الخطوة التالية: إدراج ملف PNG عبر DataTransfer في input[type=file] داخل النافذة ثم رفعه للتحقق من POST /api/attachments/upload في النشرة المصححة، ثم اختبار review وسجل التدقيق، ثم التنظيف.

## اكتشاف مهم (21:53 UTC)

استدعاء GET /api/attachments من وحدة التحكم على رابط 1fjstwfyh-8ozrimmvz أرجع 500 FUNCTION_INVOCATION_FAILED (نفس رسالة النشرة القديمة)، و /version.json يعيد HTML كامل SPA (يُعالج بـ SPA rewrite في vercel.json). كما أن window.firebaseApp غير معرّف في سياق التنفيذ في هذه النشرة (hasToken=false). التفسير الأرجح: النشرة 8ozrimmvz تعمل على نفس الدالة المعطوبة (أو أن خطأ التوثيق 401 يُعرض كـ 500). يجب فحص أخطاء runtime الفعلية في Vercel عبر MCP لهذه المنطقة الزمنية (21:52) ومعرفة أي deployment خدم الطلب.

## الإصلاح الثالث: ERR_IMPORT_ATTRIBUTE_MISSING — استيراد JSON الثابت (2026-08-17)

| البند | التفاصيل |
|---|---|
| الخطأ الإنتاجي | `TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]` في `server/attachments.ts` عند استيراد `../client/firebase-applet-config.json` بدون `with { type: "json" }` |
| البيئة | Node 22 في وضع ESM الصارم على Vercel: استيراد JSON الثابت يتطلب سمة `with { type: "json" }` صريحة، وإلا يُرفع خطأ وقت تشغيل |
| الحل | وحدة جديدة `server/firebaseConfig.ts` تقرأ ملف التكوين في وقت التشغيل عبر `readFileSync` مع `import.meta.url` (بدون أي استيراد JSON ثابت)، وتحديث `server/attachments.ts` و`server/advisor.ts` لاستخدامها |
| سبب اختيار fs | يحافظ على التوافق مع Vite في التطوير وحزمة Vercel في الإنتاج دون الاعتماد على سمة الاستيراد التي قد تتعارض مع بعض أدوات التجميع |
| حماية من التكرار | اختبار وحدة جديد `server/firebaseConfig.test.ts` يفحص شجرة `server/` و`api/` بالكامل ويرفض أي استيراد JSON ثابت (فحص regress دائم) |
| التحقق | 56 اختبار وحدة ناجح (شمل اختباران جديدان)، فحص TypeScript نظيف، بناء إنتاجي (vite + api) ناجح |

## حالة الاختبار الحالية (21:53 UTC) — ملخص قبل مواصلة

- رابط الإنتاج الأصلي: https://1fjstwfyh-aeoczdhyw-hassan-s9-projects.vercel.app — يخدم دالة معطوبة (FUNCTION_INVOCATION_FAILED على /api/*).
- رابط النشرة الجديدة: https://1fjstwfyh-8ozrimmvz-hassan-s9-projects.vercel.app (dpl_91mCNSXw، التزام 4f10ab6b).
- نجح في 8ozrimmvz: تسجيل دخول بحساب V2، حفظ دين DBT-2026-0001 مع مرفق PNG (المعاينة base64 ظهرت في كشف الحركة).
- فشل في 8ozrimmvz عند 21:52: GET /api/attachments → 500 FUNCTION_INVOCATION_FAILED (id: sfo1::w9nd2-1786917170690-6ffaffef2c20) — نفس رسالة الدالة المعطوبة.
- get_runtime_errors يتطلب since نص (ISO) وليس رقم.
- فرضيات: (أ) الطلب أصاب النشرة القديمة، (ب) النشرة الجديدة تفتقد متغيرات بيئة (JWT_SECRET/FIREBASE) في بيئة Vercel.
- الخطوة التالية: فحص سجلات runtime بصيغة نصية since="-1d" أو similar، ثم التحقق من فحص الأخطاء حسب منطقة زمنية.

### بيانات اختبار V2
- البريد: qa.production.v2.20260816215034@example.com / كلمة: QATest#2026!
- رابط وصول مؤقت لـ 8ozrimmvz (ينتهي 17/8 20:49): ?_vercel_share=Ye5kB4LSLOArxOBWudlvCuAP2x4Me0F4

## تشخيص حاسم (21:53 UTC)

سجلات runtime أكدت: الدالة dpl_91mCNSXw تفشل على /api/attachments و /api/attachments/upload بخطأ `ERR_MODULE_NOT_FOUND: Cannot find package '@shared/const' imported from /var/task/server/_core/oauth.js`. السبب: Vercel يبني api/ بمعزل عن مجلد server/ في الـ bundler الافتراضي، ومسارات TypeScript alias مثل `@shared/const` (المعرّفة في tsconfig paths) تُحوَّل إلى استيراد نسبّي `../../shared/const` لكن bundler Vercel لا يضمّن ملفات shared/ خارج شجرة api/ إلى /var/task، فتفشل عند runtime. ملاحظة مهمة: نجاح POST الرفع سابقاً مع المرفق كان نجاح UI مبكراً، لكن مسار الخادم نفسه يفشل في هذا الـ deployment.
الحل المطلوب: إزالة الاعتماد على alias @shared من شجرة api/server أو ضبط functions في vercel.json لتضمين shared. الحل الأنظف: إضافة `"shared/**"` ضمن files، أو تحويل الدالة إلى حزمة واحدة. في Vercel functions configuration يمكن استخدام `includeFiles`.

## اختبار النشرة الجديدة dpl_FfWfQKS (21:58 UTC)

النشرة الجديدة dpl_FfWfQKSFZTQPEtcjwzbvZmnqfEdx (التزام 4e173784، إصلاح @shared aliases) جاهزة و READY على الإنتاج. رابط وصول مؤقت (ساعة): https://1fjstwfyh-k2t0r4os9-hassan-s9-projects.vercel.app/?_vercel_share=LLyyhMGcNkG0d01bSj02ljSVGham6wSy
تسجيل الدخول بحساب V2 (qa.production.v2.20260816215034@example.com / QATest#2026!) نجح بنجاح كامل (شاشة التحميل المتحركة ثم لوحة التحكم ظهرت). الخطوة التالية: صفحة الديون → فحص GET /api/attachments (هل يعمل الآن) → رفع مرفق PNG عبر نافذة الإرفاق → التحقق من POST upload → اختبار review → التنظيف (حذف المرفق + بيانات الاختبار) → التقرير النهائي.
ملاحظة: النشرة القديمة 8ozrimmvz (4f10ab6b) كانت أيضاً فاشلة بسبب نفس الخطأ @shared.

## النشرة الجديدة dpl_FfWfQKS (22:00 UTC)

- تسجيل الدخول نجح ✅، لوحة التحكم ظهرت مع شاشة التحميل المتحركة.
- لكن المسار /api/attachments/debt/list ما زال يرجع FUNCTION_INVOCATION_FAILED في الدالة الجديدة أيضاً.
- سبب محتمل: buildCommand يعمل لكن Vercel قد لا يستخدمه عند النسخ من GitHub (Vercel GitHub import يدعم buildCommand لكن يجب التأكد من أن settings في Vercel لا تتجاوز vercel.json — الأهم: Vercel يتجاهل functions إذا لم يكن هناك api/index.ts؟ لا، النشرة السابقة نجحت في بناء dist.
- الأهم: يجب فحص سجل البناء لهذه النشرة — قد يكون dist/server.js لم يُبنَ في /var/task (buildCommand ينتج في /vercel/output/static؟). الحل البديهي المتين: إلغاء functions rewrite إلى api/index وإرجاع api/index.ts ليحمّل dist/server.js عبر import ديناميكي مع path مطلق، أو جعل dpl تعمل من dist عبر includeFiles صحيح.

## تشخيص جوهري (22:00 UTC)

سجل بناء dpl_FfWfQKS يوضح: build:api نجح وأنتج dist/server.js (3.4MB)، لكن بعد ذلك قامت Vercel بتجميع api/index.ts بأنواع TypeScript (tsc من @vercel/build-utils) وفشلت لأن api/index.ts يستورد الحزمة dist/server.js (ملف JS عادي بلا أنواع + لا يمكن لـ tsc التحقق منه → أخطاء TS2344/2345/2349 + أخطاء types على ملفات server/*.ts عند التحقق من شجرة الاستيراد؟ لا — الأخطاء على server/routers.ts وserver/advisor.ts تعني أن tsc تحقق من شجرة المصدر كاملة). البناء فشل مع TS errors لكن النشرة وصلت حالة READY لأن Vercel قد يُكمل رغم أخطاء TS؟ لا — الأخطاء ظهرت في مرحلة "Building Functions" — FUNCTION_INVOCATION_FAILED بسبب أن الدالة لم تُنشر بشكل صحيح (failed build silently -> placeholder).
الحل الحاسم: يجب إيقاف tsc verification للدالة. Vercel يجمع الدوال بـ esbuild فقط عادة — أخطاء TS هذه تظهر عند "Verifying TypeScript" إذا وُجد tsconfig. وجود tsconfig في الجذر يجعل Vercel ينفذ typecheck. الحل: إضافة `"compilerOptions": {"noEmit": true}` هو الموجود — لكن Vercel قد يتجاوز. الحل الأنظف والأكثر موثوقية: **تحويل api/index.ts إلى JavaScript خالص (api/index.js)** وكتابة منطق التوجيه كـ JS عادي يستورد dist/server.js عبر import ديناميكي لـ URL نسبي، وإزالة api/index.ts من Git، فتتخطى Vercel typecheck على الدالة (JS لا يُتحقق منه) أو تجمعه بـ esbuild بسهولة.

## الحل المنفذ (22:02 UTC)

1. التشخيص النهائي من سجل بناء dpl_FfWfQKS: build:api نجح وأنتج dist/server.js، لكن Vercel نفّذ typecheck على api/index.ts (tsc) ففشل شجرة server/ كاملة → FUNCTION_INVOCATION_FAILED صامتة في الدالة.
2. الحل: استبدال api/index.ts بـ **api/index.js نقي** (JS بدون import type) مع إزالة index.ts من Git (نُقل إلى index.ts.bak-for-dev خارج المتابعة). يستورد createApp من ../server/app.js مباشرة.
3. حالة الاختبارات: اختبار vercelApiBundle "rewrites /api routes" فشل لأن destination الفعلي في vercel.json هو "/api?path=:path*" وليس "/api?path=*". اختبار vercelDeployment فشل التحميل لأن api/index.js يستورد ../server/app.js الذي لا يحلّه vite في الاختبارات.
4. المُتبقى: (أ) تصحيح التوقع في الاختبار الثاني إلى "/api?path=:path*"، (ب) جعل api/index.js غير مدرج في اختبارات vitest (استيراد ../api/index.js في vercelDeployment.test.ts يحمله عبر vite — يجب إما حذف هذا الاستيراد واستنساخ الدالة في الاختبار أو استبدال api/index.js بملف dev proxy، أو الأفضل: تحويل api/index.js ليقرأ استيراد require ديناميكي). أبسط حل: حذف import restoreForwardedApiPath من vercelDeployment.test.ts واستبدال الدالة المحلية بنسخة منفصلة (نسخة اختبارية) مع ملاحظة تطابقها.
5. بيانات حساب الاختبار V2: qa.production.v2.20260816215034@example.com / QATest#2026! — نجح تسجيل الدخول في dpl_FfWfQKS، ومسار attachments ما زال يفشل FUNCTION_INVOCATION_FAILED.
6. رابط الوصول المؤقت للنشرة الجديدة dpl_FfWfQKS: https://1fjstwfyh-k2t0r4os9-hassan-s9-projects.vercel.app/?_vercel_share=LLyyhMGcNkG0d01bSj02ljSVGham6wSy (ينتهي بعد ساعة).
7. بعد الإصلاح: push تلقائي عبر خطاف GitHub (auto-sync) ثم مراقبة n=1 أحدث نشرات الإنتاج، ثم إعادة اختبار: تسجيل دخول → ديون → مرفق PNG → GET attachments → POST upload → review → تنظيف → تقرير نهائي.
8. النشرات: dpl_FfWfQKS (التزام 4e173784، READY) | dpl_91mCNSXw (4f10ab6b، جاهز لكن يفشل runtime بسبب @shared) | aeoczdhyw (نشرة قديمة).

## النشرة dpl_5utSh3oL (1fjstwfyh-4tcqqxtnd) — 2026-08-16 22:11
- البناء نجح (Deployment completed، التزام c64ce03c) رغم تحذيرات tsc على Vercel (لا توقف البناء).
- رابط وصول: https://1fjstwfyh-4tcqqxtnd-hassan-s9-projects.vercel.app/?_vercel_share=G07tZhtIiIzF9mLggmFzj4wweXlnEBEB
- تسجيل الدخول بحساب V2 (qa.production.v2.20260816215034@example.com) نجح، والواجهة ورسوم التحميل تظهران بشكل صحيح.
- المرفق الحالي للخطوة القادمة: اختبار GET /api/attachments و POST /api/attachments/upload ومسار المراجعة وسجل التدقيق في هذه النشرة، ثم التنظيف.

## النشرة dpl_5utSh3oL (4tcqqxtnd) ما زالت فاشلة (22:12 UTC)

GET /api/attachments أرجع 500 FUNCTION_INVOCATION_FAILED (dpl: fh6vg-1786918350271) رغم أن هذه النشرة بُنيت بـ api/index.js نقي دون استيرادات @shared. window.firebaseApp غير معرّف هنا (hasToken=false) — أي أن خطأ الدالة يحدث قبل الوصول للمصادقة، أي خطأ تحميل/تصريف الدالة نفسها. يجب فحص سجل runtime لهذه الدالة عبر MCP ومعرفة exception الكامل (قد تكون بنية handler مخالفة لواجهة Vercel أو خطأ require لملف غير موجود مثل _vercel_share handling أو missing firebase-applet-config.json runtime).

## السبب الجذري النهائي (22:12 UTC) — ERR_IMPORT_ATTRIBUTE_MISSING

سجل Vercel runtime أوضح الخطأ في كل النشرات الأخيرة (dpl_91mCNSXw: @shared missing، dpl_FfWfQKS و dpl_5utSh3oL):
`TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]: Module "file:///var/task/client/firebase-applet-config.json" needs an import attribute of "type: json"`
أي أن الكود يستورد ملف JSON عبر import ESM دون `with { type: "json" }`، وNode 22 على Vercel يرفض ذلك منذ Node 22.9+ (المعيار أصبح إلزامياً). الحل: تحويل استيراد firebase-applet-config.json إلى fs.readFileSync بدلاً من import static، أو إضافة import attribute. الأمل: أن استيراد TS يُولّد import عادي — يجب تعديل طريقة قراءة الملف إلى require (لا يعمل في ESM) أو fs.readFileSync.

## نتيجة اختبار QA بعد إصلاح JSON (2026-08-17)

| البند | النتيجة |
|---|---|
| النشرة المختبرة | `1fjstwfyh-33dx7bpeq-hassan-s9-projects.vercel.app` عبر رابط وصول Vercel مؤقت |
| المصادقة | نجح تسجيل الدخول بحساب QA V2 وظهرت لوحة التحكم وقائمة الديون |
| مسارات الدالة | لم يعد خطأ `ERR_IMPORT_ATTRIBUTE_MISSING` يمنع تشغيل الدالة؛ وصلت واجهة الرفع إلى مسار `POST /api/attachments/upload` |
| اختبار رفع PNG غير حساس | أرجع المسار رسالة الواجهة العامة الخاصة بـ 500؛ لم يُسجَّل مرفق صالح في كشف الحساب |
| سبب المتابعة | `storagePut` و`/manus-storage/*` يعتمدان على `BUILT_IN_FORGE_API_URL` و`BUILT_IN_FORGE_API_KEY`، وهما غير متاحين في نشر Vercel المستقل، لذلك لا يكفي إصلاح ESM لرفع الملفات أو معاينتها |

### الإصلاح المُعَد للنشر

أُضيف مسار تخزين بديل في `server/firebaseStorage.ts`. عند توفر مفاتيح Forge يستمر النظام باستخدام التخزين الأصلي دون تغيير. أما عند غيابها في Vercel، فيرفع الخادم الملف إلى Firebase Storage باستخدام رمز Firebase ID الخاص بصاحب الطلب، ويكتب رمز تنزيل عشوائياً داخل بيانات المرفق. لا يعاد رابط Firebase إلا من مسار المعاينة المحمي بعد تأكيد ملكية سجل الدين أو المصروف في Firestore. يشمل الإصلاح اختبارات موحّدة للرفع وبناء الرابط وتفويض المعاينة؛ نتائج التحقق المحلي: **60 اختباراً ناجحاً**، وفحص TypeScript وبناء Vite ناجحان.

### حالة النشر التالي للاختبار

تأكدت Vercel من النشرة `dpl_2L5ByQGXfwUXGi88utPLVYvQHFTR` في حالة **READY** وهدفها **production**. وهي مرتبطة بالالتزام `019cbc322c31ed681d081283a03867741b998955` لنقطة إصلاح Firebase Storage، ورابطها: `https://1fjstwfyh-pnvisw5yf-hassan-s9-projects.vercel.app`.

### التحقق من الدخول على النشرة الجديدة

في 17 أغسطس 2026 تم إنشاء حساب QA محدود الغرض وتشغيله على النشرة الجديدة عبر رابط الوصول المؤقت المحمي. أتمت الواجهة إنشاء جلسة Firebase وفتحت لوحة التحكم العربية بنجاح، وظهر الحساب بحالة «حساب سحابي (المدير)» دون أخطاء تشغيل ظاهرة. سيقتصر هذا الحساب على سجل ومرفق اختبار واحد، ثم تُحذف بياناته التطبيقية بعد اكتمال الاختبار.

أُنشئ سجل دين تجريبي واحد فقط بقيمة 1 ر.س للجهة «جهة فحص مرفق QA»، بالرقم المرجعي `DBT-2026-0001`. فتح النظام لوحة «فواتير وإيصالات» للسجل بنجاح وأظهر أن عدد المرفقات صفر قبل الرفع. هذا السجل مخصص لاختبار رفع ملف غير حساس، المعاينة، والحالة «قيد المراجعة» ثم حذفه.

ملاحظة عن تنفيذ الاختبار: حقل اختيار الملف في الواجهة موجود ويقبل `image/jpeg` و`image/png` و`image/webp` و`application/pdf`، لكنه مخفي بصرياً خلف زر الرفع؛ لم تتمكن أداة الاختبار من استهدافه مباشرة في المحاولة الأولى. لم يُرسل أي ملف إلى الخادم ولم يحدث خطأ جديد في المنتج بهذه المحاولة.

في المحاولة الثانية أُرسل ملف WebP غير حساس من بيئة QA عبر حقل الرفع نفسه. ظهر مؤشر «يجري الرفع» ثم عادت الواجهة برسالة «تعذر حفظ المرفق حالياً. حاول مجدداً.» ولم يُنشأ سجل مرفق. ستُستخرج استجابة HTTP وسجل وقت التشغيل قبل اتخاذ تعديل إضافي؛ لا يُعد مسار Firebase Storage مثبتاً في الإنتاج بعد.

### نتيجة فحص الرفع على النشرة `dpl_2L5ByQGXfwUXGi88utPLVYvQHFTR`

أكد سجل تشغيل Vercel أن طلب `POST /api/attachments/upload` وصل إلى مسار Firebase البديل، لكنه فشل بـ `404 Not Found` من واجهة Firebase Storage عند محاولة رفع الملف إلى `gen-lang-client-0759922046.firebasestorage.app`. كما أعاد فحص عنوان الحاوية الافتراضي القديم المحتمل `gen-lang-client-0759922046.appspot.com` النتيجة `404` أيضاً؛ ولذلك لا توجد حاوية تخزين Firebase مهيأة فعلياً لهذا المشروع. لم يظهر في إعدادات مشروع Vercel أي مزود تخزين آخر أو اعتماد بديل يمكن استخدامه تلقائياً.

**الأثر:** منطق التطبيق والنشرة يعملان حتى نقطة التخزين، لكن رفع المرفقات والمعاينة لن ينجحا إلى أن يُفعَّل Firebase Storage للمشروع بحساب Google المالك (أو يُزوَّد التطبيق باعتماد تخزين خارجي صالح). لا ينبغي التحايل بتخزين الملفات داخل Firestore أو قاعدة البيانات، لأن ذلك يخالف تصميم المرفقات ويضعف الأداء والعزل.

### تحديث التهيئة

تم تأكيد تهيئة Firebase Storage لاحقاً من Firebase Console للحساب المالك. الحاوية الفعلية هي `gs://gen-lang-client-0759922046.firebasestorage.app` وتظهر خالية وجاهزة لاستقبال المرفقات. ستُعاد الآن اختبارات الرفع والمعاينة والمراجعة على النشرة الإنتاجية نفسها.

أعادت واجهة Firebase Storage عند الاستعلام العام رمز `403` بعد التهيئة (بدلاً من `404` السابق)، وهو السلوك المتوقع لحاوية موجودة ومحميّة بالقواعد. كما فتحت النشرة الإنتاجية رابط `1fjstwfyh-pnvisw5yf-hassan-s9-projects.vercel.app` بجلسة QA المصادق عليها وظهر سجل الدين `DBT-2026-0001` ولوحة المرفقات بعدد صفر، استعداداً لإعادة الرفع برمز Firebase ID الخاص بالجلسة.

في إعادة الاختبار، قُبل اختيار ملف WebP بحجم صغير وظهرت حالة «يجري الرفع»، ثم أعادت الواجهة رسالة «تعذر حفظ المرفق حالياً. حاول مجدداً.» وبقي العداد صفراً. إذن انتقل العائق من **غياب الحاوية** إلى **رفض أو فشل عملية الكتابة/حفظ بيانات المرفق**؛ ستُراجع الآن استجابة الشبكة وسجل وقت تشغيل Vercel لتحديد طبقة الفشل التالية بدقة.

أظهر سجل وقت تشغيل Vercel للطلب `POST /api/attachments/upload` أن محاولة الكتابة وصلت إلى Firebase Storage وفشلت بـ `403 Permission denied` من الدالة `firebaseStoragePut`. فُتحت صفحة قواعد الحاوية في Firebase Console بجلسة حساب المالك، وتم الحصول على موافقة صريحة لنشر قاعدة مقيدة لمسار `financial-attachments/{userId}/**` بشرط تطابق `request.auth.uid` مع `userId`، من دون فتح القراءة أو الكتابة العامة.

القاعدة المُراجعة قبل النشر هي:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /financial-attachments/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

تم نشر القاعدة من محرر Firebase بعد التحقق من تركيبها. اختفى زر النشر بعد العملية وبقيت قاعدة المسار المقيد ظاهرة في المحرر؛ سيؤكد اختبار الرفع التالي فعاليتها من سلوك الحاوية نفسه.

### إعادة اختبار الرفع بعد القاعدة المقيدة

عادت جلسة QA إلى النشرة الإنتاجية نفسها عبر رابط Vercel المصرح. لا يزال حساب QA مصادقاً وسجل الدين المؤقت `DBT-2026-0001` موجوداً دون مرفقات. فُتحت لوحة المرفقات وواجهة «إرفاق فاتورة أو إيصال» لإرسال ملف WebP غير حساس للمرة الثالثة؛ النتيجة التالية ستفصل بين نجاح قاعدة الكتابة وبين أي عائق في حفظ بيانات المرفق.

**نتيجة ناجحة:** اكتمل رفع ملف WebP الاختباري على النشرة الإنتاجية، وظهر في سجل `DBT-2026-0001` كمرفق واحد بحالة **قيد المراجعة**. تؤكد الواجهة أن حفظ الملف في Firebase Storage وتسجيل بياناته في التطبيق نجحا بعد نشر القاعدة المقيدة. بقيت اختبارات المعاينة وتغيير الحالة وسجل التدقيق ثم تنظيف بيانات QA.

**نتيجة المعاينة الحالية:** بعد نجاح الرفع، أعاد مسار المعاينة رابط تنزيل Firebase يحوي رمز تنزيل، لكن فتحه أعاد `403 Permission denied`. القاعدة المقيدة تقبل طلب التخزين المصادق برمز Firebase ID Token، في حين أن فتح الرابط المباشر من المتصفح لا يرسل ذلك الرمز. الإصلاح المطلوب هو أن تعيد واجهة المعاينة رابطاً محمياً من التطبيق يُمرر رمز الجلسة إلى Firebase ثم ينشئ `Blob URL` محلياً؛ وبذلك تبقى قاعدة الحاوية مقيدة ولا يُفتح أي رابط عام.

### إصلاح معاينة Firebase المصادق — جاهز للنشر

عُدِّل عقد مسار المعاينة ليشير صراحةً إلى أن ملفات Firebase تتطلب مصادقة، ثم عُدِّلت الواجهة لتطلب رابط التطبيق المحمي أولاً، وتنزّل الملف من Firebase برمز Firebase ID Token للمالك، وتحوله إلى رابط `Blob` قصير العمر للعرض أو الفتح في تبويب جديد. لا يُعاد استخدام الرابط المباشر كعنوان عام، ويُلغى رابط الـBlob عند إغلاق المعاينة أو بعد مهلة الفتح في تبويب جديد. تبقى روابط Forge الموقعة في المسار السابق دون تغيير.

اجتازت النسخة المحلية **64 اختبار وحدة**، وفحص TypeScript دون أخطاء، وبناء الإنتاج (`Vite` وESM للخادم) بنجاح. بقي اختبار النشرة الجديدة على Vercel ثم تغيير الحالة والتحقق من سجل التدقيق والتنظيف.
