# تطبيق الجوال (Android/iOS) عبر Capacitor

يُغلَّف تطبيق **ديوني وميزانيتي برو** كتطبيق جوال حقيقي باستخدام [Capacitor](https://capacitorjs.com)، الذي يشغّل واجهة الويب الحالية (React) داخل غلاف أصلي (WebView) على Android وiOS دون إعادة كتابة الواجهة.

## الإعداد

- `capacitor.config.ts` في جذر المشروع يضبط معرّف التطبيق (`appId`) واسمه ومجلد الويب المبني (`dist/public`).
- تمت إضافة مجلد `android/` كمشروع Android أصلي جاهز (Gradle)، ويُبنى منه ملف APK/AAB.
- حزمة `@capacitor/ios` مضافة كاعتماد، لكن **لم يُنشأ مجلد `ios/`** لأن إنشاءه وبناءه يتطلبان macOS مع Xcode وCocoaPods، وهي أدوات غير متوفرة في بيئة التطوير الحالية (Linux). لإضافته لاحقاً على جهاز Mac:

  ```bash
  npx cap add ios
  ```

## طريقتا التشغيل

### 1) تحميل نسخة الموقع المنشور مباشرة (موصى بها)

بما أن الواجهة تعتمد نداءات `/api/*` (مثل تسجيل الدخول عبر OAuth في `client/src/const.ts`) على `window.location.origin`، فإن أسهل طريقة لضمان عملها بلا تعديل هي جعل تطبيق الجوال يعرض الموقع المنشور فعلياً بدل نسخة مجمّعة محلياً:

```bash
export CAPACITOR_SERVER_URL="https://your-production-domain.example"
pnpm run cap:sync
```

بهذا الشكل يعمل تسجيل الدخول وFirebase Auth وFirestore وأي نداء API بلا أي فرق عن المتصفح، لأن كل شيء يُحمَّل من النطاق الحقيقي نفسه. تذكّر إضافة نطاق `androidapp://` أو استخدام `https` فقط (المُفعّل افتراضياً هنا) حتى يبقى ضمن نطاقات Firebase المصرح بها.

### 2) تعبئة نسخة الويب محلياً داخل التطبيق (بدون اتصال بخادم)

بدون ضبط `CAPACITOR_SERVER_URL`، يُحمَّل التطبيق نسخة `dist/public` المبنية محلياً ضمن الحزمة، وتُخدَّم من `https://localhost` (نطاق مصرح به افتراضياً في Firebase Authentication). يعمل Firebase Auth وFirestore بشكل طبيعي بهذا الوضع لأنهما يعتمدان على SDK العميل مباشرة لا على نداءات `/api/*` النسبية. أي مسار يعتمد على `/api/*` (النسخ الاحتياطي عبر خادم Vercel مثلاً) يحتاج عندها إلى ضبط عنوان مطلق للخادم بدل الاعتماد على `window.location.origin`.

## أوامر البناء والتشغيل

```bash
# مزامنة أحدث نسخة من واجهة الويب مع المشروع الأصلي
pnpm run cap:sync

# فتح المشروع في Android Studio لبنائه وتشغيله على جهاز/محاكي
pnpm run cap:android

# فتح المشروع في Xcode (على macOS فقط، بعد إضافة منصة iOS)
pnpm run cap:ios
```

يتطلب `cap:android` تثبيت Android Studio أو Android SDK محلياً؛ لا يمكن بناء أو تشغيل APK داخل بيئة التطوير السحابية الحالية.

## قبل النشر في المتاجر

1. غيّر `appId` في `capacitor.config.ts` (القيمة الحالية `com.diyuni.budgetpro`) إلى معرّف فريد يخصك.
2. أضف أيقونة التطبيق وشاشة البداية (Splash) عبر [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets).
3. أضف النطاق المستخدم فعلياً (إن اعتمدت الطريقة الأولى) إلى **Authorized domains** في Firebase Authentication، كما هو موضح في `PRODUCTION_SETUP.md`.
4. راجع أذونات Android في `android/app/src/main/AndroidManifest.xml` وأزل ما لا يحتاجه التطبيق.
