import { useLang, LangToggle } from '../context/LangContext';
import { Link } from 'react-router-dom';
import { C } from '../tokens';

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '32px' }}>
    <h2 style={{ fontSize: '17px', fontWeight: '800', color: C.text, marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${C.greenBg}` }}>
      {title}
    </h2>
    <div style={{ color: C.text, fontSize: '14px', lineHeight: '1.85' }}>
      {children}
    </div>
  </section>
);

const P = ({ children, style }) => <p style={{ margin: '0 0 10px', ...style }}>{children}</p>;

const UL = ({ items }) => (
  <ul style={{ margin: '6px 0 10px', paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

const AR = {
  pageTitle:   'سياسة الخصوصية',
  lastUpdated: 'آخر تحديث: مايو ٢٠٢٦',
  intro: 'نحن في FarmFlow نحترم خصوصيتك ونلتزم بحمايتها. توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام منصتنا.',

  s1Title: '١. البيانات التي نجمعها',
  s1p1: 'عند التسجيل واستخدام المنصة، قد نجمع:',
  s1items: [
    'الاسم الكامل ورقم الهوية الوطنية (للتحقق من الهوية فقط)',
    'رقم الهاتف والبريد الإلكتروني',
    'المحافظة وبيانات الموقع الجغرافي',
    'معلومات المزرعة وأنواع الحيوانات',
    'سجل الطلبات والمعاملات',
    'سجلات الدخول وبيانات استخدام المنصة',
    'الرسائل المتبادلة بين المستخدمين',
  ],
  s1p2: 'لا نجمع بيانات بطاقات الائتمان أو الحسابات البنكية مباشرةً عبر المنصة.',

  s2Title: '٢. كيف نستخدم بياناتك',
  s2p1: 'نستخدم بياناتك من أجل:',
  s2items: [
    'إنشاء حسابك والتحقق من هويتك',
    'تشغيل المنصة وتقديم خدماتها',
    'معالجة الطلبات والتواصل بين البائعين والمشترين',
    'إرسال إشعارات مهمة تتعلق بحسابك وطلباتك',
    'تحسين تجربة المستخدم وتطوير الخدمات',
    'الامتثال للمتطلبات القانونية والتنظيمية في مصر',
    'الحماية من الاحتيال وإساءة الاستخدام',
  ],

  s3Title: '٣. مشاركة البيانات',
  s3p1: 'لا نبيع بياناتك الشخصية لأي طرف ثالث. قد نشارك بيانات محدودة في الحالات التالية:',
  s3items: [
    'مع البائعين عند إجراء طلب (الاسم ورقم الهاتف فقط)',
    'مع مزودي الخدمات التقنية الذين يساعدوننا في تشغيل المنصة (ملتزمون بالسرية)',
    'عند وجود متطلب قانوني صادر من جهة حكومية مصرية مختصة',
    'لحماية حقوق FarmFlow أو مستخدميها في حالات الاحتيال',
  ],
  s3p2: 'في جميع حالات المشاركة، نشترط على الأطراف الأخرى الالتزام بمعايير حماية بيانات مماثلة.',

  s4Title: '٤. رقم الهوية الوطنية',
  s4p1: 'يُستخدم رقم الهوية الوطنية للتحقق من هويتك عند التسجيل فقط. لا نشاركه مع أي طرف ثالث ونحمي تخزينه بتشفير قوي. يتم استخراج بيانات محدودة منه (تاريخ الميلاد، المحافظة، النوع) لأغراض عرض المعلومات عليك فقط.',

  s5Title: '٥. أمن البيانات',
  s5p1: 'نتخذ إجراءات أمنية صارمة لحماية بياناتك:',
  s5items: [
    'تشفير SSL/TLS لجميع البيانات المنقولة',
    'تشفير كلمات المرور باستخدام خوارزميات حديثة (bcrypt)',
    'تشفير الرقم القومي وبيانات التعريف الحساسة',
    'مراجعات أمنية دورية للأنظمة',
    'صلاحيات وصول محدودة للفريق التقني',
  ],
  s5p2: 'رغم اتخاذنا كل الإجراءات المعقولة، لا يمكن ضمان الأمن المطلق لأي نظام إلكتروني. ننصحك باستخدام كلمة مرور قوية وعدم مشاركتها.',

  s6Title: '٦. ملفات تعريف الارتباط (Cookies)',
  s6p1: 'تستخدم المنصة ملفات تعريف الارتباط (Cookies) لأغراض ضرورية فقط مثل:',
  s6items: [
    'الحفاظ على جلسة تسجيل الدخول',
    'حفظ تفضيلاتك (اللغة، الثيم)',
    'تحليل استخدام المنصة لتحسين الأداء',
  ],
  s6p2: 'يمكنك تعطيل ملفات الارتباط من إعدادات المتصفح، لكن قد يؤثر ذلك على بعض وظائف المنصة.',

  s7Title: '٧. حقوقك',
  s7p1: 'لديك الحق في:',
  s7items: [
    'الاطلاع على البيانات الشخصية التي نحتفظ بها عنك',
    'تصحيح أي معلومات غير دقيقة',
    'حذف حسابك وبياناتك (مع مراعاة المتطلبات القانونية)',
    'الاعتراض على طريقة معالجة بياناتك',
    'تصدير نسخة من بياناتك',
  ],
  s7p2: 'لممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني المذكور أدناه.',

  s8Title: '٨. بيانات القاصرين',
  s8p1: 'المنصة مخصصة للمستخدمين الذين يبلغون ١٦ عامًا فأكثر. إن علمنا بتسجيل قاصر دون ١٦ عامًا، سنقوم بحذف حسابه وبياناته فورًا.',

  s9Title: '٩. الاحتفاظ بالبيانات',
  s9p1: 'نحتفظ ببياناتك طوال فترة نشاط حسابك. عند حذف الحساب، يتم حذف بياناتك الشخصية خلال ٣٠ يومًا، مع الاحتفاظ ببعض السجلات المطلوبة قانونيًا لمدة ٥ سنوات وفقًا للتشريعات المصرية.',

  s10Title: '١٠. التغييرات على هذه السياسة',
  s10p1: 'قد نحدّث سياسة الخصوصية من وقت لآخر. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة قبل ١٤ يومًا من تطبيقها.',

  s11Title: '١١. التواصل معنا',
  s11p1: 'لأي استفسارات حول سياسة الخصوصية أو لممارسة حقوقك:',
  s11email: 'البريد الإلكتروني: privacy@farmflow.eg',
  s11phone: 'هاتف الدعم: 16XXX',
  s11address: 'العنوان: القاهرة، جمهورية مصر العربية',
};

const EN = {
  pageTitle:   'Privacy Policy',
  lastUpdated: 'Last updated: May 2026',
  intro: 'At FarmFlow, we respect and are committed to protecting your privacy. This policy explains how we collect, use, and protect your data when you use our platform.',

  s1Title: '1. Data We Collect',
  s1p1: 'When you register and use the platform, we may collect:',
  s1items: [
    'Full name and national ID number (for identity verification only)',
    'Phone number and email address',
    'Governorate and location data',
    'Farm information and animal types',
    'Order and transaction history',
    'Login records and platform usage data',
    'Messages exchanged between users',
  ],
  s1p2: 'We do not directly collect credit card or bank account data through the platform.',

  s2Title: '2. How We Use Your Data',
  s2p1: 'We use your data to:',
  s2items: [
    'Create your account and verify your identity',
    'Operate the platform and deliver its services',
    'Process orders and facilitate communication between sellers and buyers',
    'Send important notifications about your account and orders',
    'Improve user experience and develop services',
    'Comply with legal and regulatory requirements in Egypt',
    'Protect against fraud and misuse',
  ],

  s3Title: '3. Data Sharing',
  s3p1: 'We do not sell your personal data to any third party. We may share limited data in the following cases:',
  s3items: [
    'With sellers when you place an order (name and phone number only)',
    'With technical service providers who help us operate the platform (bound by confidentiality)',
    'When required by a legal order from a competent Egyptian government authority',
    'To protect the rights of FarmFlow or its users in cases of fraud',
  ],
  s3p2: 'In all sharing cases, we require other parties to adhere to similar data protection standards.',

  s4Title: '4. National ID Number',
  s4p1: 'Your national ID number is used solely to verify your identity at registration. We do not share it with any third party and protect its storage with strong encryption. Limited data is extracted from it (date of birth, governorate, gender) only for displaying information to you.',

  s5Title: '5. Data Security',
  s5p1: 'We take strict security measures to protect your data:',
  s5items: [
    'SSL/TLS encryption for all data in transit',
    'Password hashing using modern algorithms (bcrypt)',
    'Encryption of national ID and sensitive identification data',
    'Regular security audits of systems',
    'Limited access permissions for the technical team',
  ],
  s5p2: 'Despite taking all reasonable precautions, absolute security cannot be guaranteed for any electronic system. We recommend using a strong password and not sharing it.',

  s6Title: '6. Cookies',
  s6p1: 'The platform uses cookies for essential purposes only, such as:',
  s6items: [
    'Maintaining your login session',
    'Saving your preferences (language, theme)',
    'Analyzing platform usage to improve performance',
  ],
  s6p2: 'You can disable cookies in your browser settings, but this may affect some platform functionality.',

  s7Title: '7. Your Rights',
  s7p1: 'You have the right to:',
  s7items: [
    'Access the personal data we hold about you',
    'Correct any inaccurate information',
    'Delete your account and data (subject to legal requirements)',
    'Object to how your data is being processed',
    'Export a copy of your data',
  ],
  s7p2: 'To exercise any of these rights, contact us via the email address listed below.',

  s8Title: '8. Minors\' Data',
  s8p1: 'The platform is intended for users aged 16 and above. If we become aware that a minor under 16 has registered, we will immediately delete their account and data.',

  s9Title: '9. Data Retention',
  s9p1: 'We retain your data for as long as your account is active. Upon account deletion, your personal data is deleted within 30 days, while certain legally required records are retained for 5 years in accordance with Egyptian legislation.',

  s10Title: '10. Changes to This Policy',
  s10p1: 'We may update this Privacy Policy from time to time. You will be notified of any material changes by email or an in-platform notice at least 14 days before they take effect.',

  s11Title: '11. Contact Us',
  s11p1: 'For any inquiries about this Privacy Policy or to exercise your rights:',
  s11email: 'Email: privacy@farmflow.eg',
  s11phone: 'Support line: 16XXX',
  s11address: 'Address: Cairo, Arab Republic of Egypt',
};

export default function PrivacyPolicy() {
  const { isRTL, lang } = useLang();
  const T = lang === 'ar' ? AR : EN;
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <div dir={dir} style={{ minHeight: '100vh', background: C.bg, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #0E2E1A 0%, #1A5C30 60%, #2D7A42 100%)`, padding: '40px 24px 48px', color: '#fff', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '16px', insetInlineEnd: '20px' }}>
          <LangToggle />
        </div>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>{T.pageTitle}</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{T.lastUpdated}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '16px' }}>🌾</span>
          <span style={{ fontSize: '18px', fontWeight: '800' }}>FarmFlow</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* Intro box */}
        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '36px', fontSize: '14px', color: C.greenText, lineHeight: '1.7' }}>
          {T.intro}
        </div>

        <Section title={T.s1Title}>
          <P>{T.s1p1}</P>
          <UL items={T.s1items} />
          <P>{T.s1p2}</P>
        </Section>

        <Section title={T.s2Title}>
          <P>{T.s2p1}</P>
          <UL items={T.s2items} />
        </Section>

        <Section title={T.s3Title}>
          <P>{T.s3p1}</P>
          <UL items={T.s3items} />
          <P>{T.s3p2}</P>
        </Section>

        <Section title={T.s4Title}>
          <P>{T.s4p1}</P>
        </Section>

        <Section title={T.s5Title}>
          <P>{T.s5p1}</P>
          <UL items={T.s5items} />
          <P>{T.s5p2}</P>
        </Section>

        <Section title={T.s6Title}>
          <P>{T.s6p1}</P>
          <UL items={T.s6items} />
          <P>{T.s6p2}</P>
        </Section>

        <Section title={T.s7Title}>
          <P>{T.s7p1}</P>
          <UL items={T.s7items} />
          <P>{T.s7p2}</P>
        </Section>

        <Section title={T.s8Title}>
          <P>{T.s8p1}</P>
        </Section>

        <Section title={T.s9Title}>
          <P>{T.s9p1}</P>
        </Section>

        <Section title={T.s10Title}>
          <P>{T.s10p1}</P>
        </Section>

        <Section title={T.s11Title}>
          <P>{T.s11p1}</P>
          <P style={{ fontWeight: '700', color: C.green }}>{T.s11email}</P>
          <P style={{ fontWeight: '700', color: C.green }}>{T.s11phone}</P>
          <P style={{ color: C.muted }}>{T.s11address}</P>
        </Section>

        {/* Footer nav */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/terms" style={{ color: C.green, fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
            {lang === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
          </Link>
          <span style={{ color: C.border }}>|</span>
          <Link to="/register" style={{ color: C.muted, fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
            {lang === 'ar' ? 'العودة للتسجيل' : 'Back to Register'}
          </Link>
          <span style={{ color: C.border }}>|</span>
          <Link to="/login" style={{ color: C.muted, fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
