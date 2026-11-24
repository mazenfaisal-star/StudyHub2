# StudyHub — منصة المحاضرات

نسخة React + Vite بواجهة عربية RTL، مع تسجيل دخول Supabase، بيانات منفصلة لكل طالب، وقائمة منصات مشتركة يديرها Admin.

## التشغيل المحلي
1. ثبّت Node.js إصدار LTS.
2. نفّذ `npm install`.
3. أنشئ ملف `.env.local` بجوار `package.json` وأضف:
   ```env
   VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
   ```
4. شغّل `npm run dev`.

## إعداد قاعدة البيانات
1. افتح Supabase → SQL Editor.
2. شغّل `supabase/studyhub_v2.sql` مرة واحدة. هذا ملف إضافة مستقل ولا يحذف الجداول القديمة.
3. أنشئ حسابك من صفحة StudyHub أولًا.
4. لمنح حسابك صلاحية Admin، استبدل البريد في الاستعلام التالي ببريد حسابك ثم شغّله في SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'YOUR_LOGIN_EMAIL'
   on conflict (user_id) do update set role = excluded.role;
   ```
5. سجّل الخروج ثم الدخول مرة أخرى، وستظهر صفحة «إدارة المنصات».

## النشر على GitHub Pages
من Settings → Pages اختر GitHub Actions كمصدر النشر. أضف في Settings → Secrets and variables → Actions السرّين:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

لا ترفع `.env.local` ولا تستخدم `service_role` في الواجهة الأمامية.

## ما هو متصل حاليًا
- تسجيل الدخول وإنشاء الحساب عبر Supabase Auth.
- قراءة قائمة المنصات المشتركة من `platform_catalog`.
- حفظ محاضرات كل طالب وتحديث حالتها في `user_lessons`.
- صلاحية Admin محفوظة في `user_roles` وتُفرض أيضًا بسياسات RLS في قاعدة البيانات.
- المنصات المبدئية: بسطتهالك، محمد صلاح، الجوهري، Dr. Clicks. يمكن للـ Admin إضافة أسماء أخرى وتعديلها وإخفاؤها.

ملاحظة: هذا المشروع لا يسجل الدخول إلى حسابات المنصات التعليمية الخارجية ولا يجلب محاضراتها تلقائيًا؛ إدخال المحاضرات يتم من داخل StudyHub.
