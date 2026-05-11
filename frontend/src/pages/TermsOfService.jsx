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

const P = ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>;

const UL = ({ items }) => (
  <ul style={{ margin: '6px 0 10px', paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

const AR = {
  pageTitle:   'شروط الخدمة',
  lastUpdated: 'آخر تحديث: مايو ٢٠٢٦',
  intro: 'مرحبًا بك في FarmFlow. يُرجى قراءة هذه الشروط بعناية قبل استخدام المنصة. باستخدامك للخدمة فإنك توافق على الالتزام بها.',

  s1Title: '١. قبول الشروط',
  s1p1: 'تُشكّل هذه الشروط عقدًا ملزمًا بينك وبين FarmFlow. إن كنت تستخدم المنصة نيابةً عن شركة أو كيان آخر، فإنك تؤكد أنك مفوّض للموافقة على هذه الشروط بالنيابة عنهم.',
  s1p2: 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة، ويُعدّ استمرار استخدامك للخدمة قبولًا للشروط المحدّثة.',

  s2Title: '٢. وصف الخدمة',
  s2p1: 'FarmFlow هي منصة رقمية مصرية تربط المزارعين والبائعين المتخصصين في تربية وبيع المواشي والدواجن والحيوانات الأخرى بالمشترين في جميع أنحاء مصر. تتيح المنصة:',
  s2items: [
    'نشر إعلانات بيع الحيوانات والمنتجات الزراعية',
    'تصفّح الإعلانات وإجراء عمليات الشراء',
    'إدارة الطلبات والمعاملات المالية',
    'التواصل المباشر بين البائعين والمشترين',
    'إدارة القطيع والمصروفات للمزارعين',
  ],

  s3Title: '٣. إنشاء الحساب',
  s3p1: 'يشترط التسجيل في FarmFlow:',
  s3items: [
    'أن يكون عمرك ١٦ عامًا على الأقل',
    'تقديم رقم قومي مصري صحيح وساري المفعول',
    'تقديم معلومات صحيحة ودقيقة وكاملة',
    'الحفاظ على سرية كلمة المرور وعدم مشاركتها',
    'إخطارنا فورًا في حال الاشتباه في اختراق حسابك',
  ],
  s3p2: 'تتحمل المسؤولية الكاملة عن جميع الأنشطة التي تتم من خلال حسابك. يحق لنا تعليق أو إنهاء الحساب في حال الإخلال بهذه الشروط.',

  s4Title: '٤. البائعون والإعلانات',
  s4p1: 'يلتزم البائعون المسجّلون بما يلي:',
  s4items: [
    'نشر معلومات صحيحة وشاملة عن الحيوانات والمنتجات المعروضة',
    'الالتزام بالأسعار المعلنة خلال مدة سريان الإعلان',
    'الاستجابة لاستفسارات المشترين في غضون ٢٤ ساعة',
    'الالتزام بجميع القوانين والأنظمة المصرية المتعلقة ببيع الحيوانات',
    'الحصول على التراخيص والموافقات البيطرية اللازمة',
    'عدم نشر إعلانات مضللة أو مزيفة',
  ],
  s4p2: 'تحتفظ FarmFlow بالحق في إزالة أي إعلان يخالف هذه الشروط أو يُعدّ مضللًا دون إشعار مسبق.',

  s5Title: '٥. المشترون والطلبات',
  s5p1: 'يقرّ المشترون بما يلي:',
  s5items: [
    'الطلب يُعدّ التزامًا فعليًا بالشراء عند قبوله من البائع',
    'ضرورة فحص الحيوانات شخصيًا أو عبر طرف موثوق قبل إتمام الصفقة',
    'FarmFlow لا تضمن جودة الحيوانات أو صحتها أو مطابقتها للوصف إلا في حدود ما هو مُدوّن في الإعلان',
    'يجب إبلاغ FarmFlow فورًا في حال وجود نزاع مع البائع',
  ],

  s6Title: '٦. الأنشطة المحظورة',
  s6p1: 'يُحظر على جميع المستخدمين:',
  s6items: [
    'نشر معلومات كاذبة أو مضللة',
    'التحايل على منصة FarmFlow لإجراء صفقات خارجها بعد التواصل من خلالها',
    'مضايقة أو إساءة معاملة المستخدمين الآخرين',
    'محاولة اختراق أنظمة المنصة أو التلاعب بها',
    'نشر محتوى مسيء أو ينتهك القوانين المصرية',
    'استخدام المنصة لأغراض غير مشروعة',
    'إنشاء حسابات وهمية أو متعددة للتحايل على القيود',
  ],

  s7Title: '٧. الرسوم والمدفوعات',
  s7p1: 'التسجيل والتصفح مجانيان. قد تُطبَّق رسوم على بعض الخدمات المميزة في المستقبل مع إشعار مسبق. FarmFlow غير مسؤولة عن المدفوعات التي تتم خارج المنصة بشكل مباشر بين البائع والمشتري.',

  s8Title: '٨. حدود المسؤولية',
  s8p1: 'تُقدَّم FarmFlow "كما هي" دون أي ضمانات صريحة أو ضمنية. FarmFlow ليست طرفًا في المعاملات التجارية بين البائعين والمشترين ولا تتحمل المسؤولية عن:',
  s8items: [
    'جودة أو صحة الحيوانات المباعة',
    'الخسائر المالية الناتجة عن الصفقات',
    'توقف الخدمة أو الأعطال التقنية',
    'سرقة بيانات الحساب نتيجة إهمال المستخدم',
  ],
  s8p2: 'في جميع الأحوال لا تتجاوز مسؤولية FarmFlow المبلغ المدفوع مقابل الخدمة خلال آخر ٣ أشهر.',

  s9Title: '٩. القانون الحاكم والنزاعات',
  s9p1: 'تخضع هذه الشروط لقوانين جمهورية مصر العربية. يتم الفصل في أي نزاعات ابتداءً عبر التفاوض الودّي، وإن تعذّر ذلك، يُحال النزاع إلى المحاكم المختصة في القاهرة.',

  s10Title: '١٠. التواصل معنا',
  s10p1: 'لأي استفسارات حول هذه الشروط:',
  s10email: 'البريد الإلكتروني: support@farmflow.eg',
  s10phone: 'هاتف الدعم: 16XXX',
};

const EN = {
  pageTitle:   'Terms of Service',
  lastUpdated: 'Last updated: May 2026',
  intro: 'Welcome to FarmFlow. Please read these terms carefully before using the platform. By using the service you agree to be bound by them.',

  s1Title: '1. Acceptance of Terms',
  s1p1: 'These Terms constitute a binding agreement between you and FarmFlow. If you are using the platform on behalf of a company or other entity, you confirm that you are authorized to accept these Terms on their behalf.',
  s1p2: 'We reserve the right to modify these Terms at any time. You will be notified of material changes by email or an in-platform notice, and your continued use of the service constitutes acceptance of the updated Terms.',

  s2Title: '2. Description of Service',
  s2p1: 'FarmFlow is an Egyptian digital marketplace connecting farmers and sellers specializing in livestock, poultry, and other animals with buyers across Egypt. The platform enables:',
  s2items: [
    'Posting listings for animals and agricultural products',
    'Browsing listings and completing purchases',
    'Managing orders and financial transactions',
    'Direct communication between sellers and buyers',
    'Herd and expense management for farmers',
  ],

  s3Title: '3. Account Creation',
  s3p1: 'Registering on FarmFlow requires:',
  s3items: [
    'Being at least 16 years of age',
    'Providing a valid and current Egyptian national ID number',
    'Providing truthful, accurate, and complete information',
    'Keeping your password confidential and not sharing it',
    'Notifying us immediately if you suspect your account has been compromised',
  ],
  s3p2: 'You are fully responsible for all activities conducted through your account. We reserve the right to suspend or terminate accounts that violate these Terms.',

  s4Title: '4. Sellers and Listings',
  s4p1: 'Registered sellers agree to:',
  s4items: [
    'Post accurate and complete information about the animals and products listed',
    'Honor advertised prices for the duration of the listing',
    'Respond to buyer inquiries within 24 hours',
    'Comply with all Egyptian laws and regulations related to the sale of animals',
    'Obtain required veterinary licenses and approvals',
    'Not post misleading or fraudulent listings',
  ],
  s4p2: 'FarmFlow reserves the right to remove any listing that violates these Terms or is deemed misleading, without prior notice.',

  s5Title: '5. Buyers and Orders',
  s5p1: 'Buyers acknowledge:',
  s5items: [
    'Placing an order constitutes a genuine commitment to purchase upon seller acceptance',
    'Animals should be inspected in person or via a trusted representative before completing the transaction',
    'FarmFlow does not guarantee the quality, health, or conformity of animals except as described in the listing',
    'FarmFlow must be notified immediately in case of a dispute with the seller',
  ],

  s6Title: '6. Prohibited Activities',
  s6p1: 'All users are prohibited from:',
  s6items: [
    'Posting false or misleading information',
    'Circumventing the FarmFlow platform to conduct transactions outside it after initial contact through it',
    'Harassing or abusing other users',
    'Attempting to breach or tamper with platform systems',
    'Posting offensive content or content that violates Egyptian law',
    'Using the platform for unlawful purposes',
    'Creating fake or multiple accounts to circumvent restrictions',
  ],

  s7Title: '7. Fees and Payments',
  s7p1: 'Registration and browsing are free. Fees may be applied to certain premium services in the future with advance notice. FarmFlow is not responsible for payments made directly between sellers and buyers outside the platform.',

  s8Title: '8. Limitation of Liability',
  s8p1: 'FarmFlow is provided "as is" without any express or implied warranties. FarmFlow is not a party to commercial transactions between sellers and buyers and is not liable for:',
  s8items: [
    'The quality or health of animals sold',
    'Financial losses resulting from transactions',
    'Service outages or technical failures',
    'Account data theft resulting from user negligence',
  ],
  s8p2: "In all cases, FarmFlow's liability shall not exceed the amount paid for the service during the last 3 months.",

  s9Title: '9. Governing Law and Disputes',
  s9p1: 'These Terms are governed by the laws of the Arab Republic of Egypt. Disputes will be resolved first through amicable negotiation, and if that fails, referred to the competent courts in Cairo.',

  s10Title: '10. Contact Us',
  s10p1: 'For any inquiries about these Terms:',
  s10email: 'Email: support@farmflow.eg',
  s10phone: 'Support line: 16XXX',
};

export default function TermsOfService() {
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
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
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
          <UL items={T.s4items} />
          <P>{T.s4p2}</P>
        </Section>

        <Section title={T.s5Title}>
          <P>{T.s5p1}</P>
          <UL items={T.s5items} />
        </Section>

        <Section title={T.s6Title}>
          <P>{T.s6p1}</P>
          <UL items={T.s6items} />
        </Section>

        <Section title={T.s7Title}>
          <P>{T.s7p1}</P>
        </Section>

        <Section title={T.s8Title}>
          <P>{T.s8p1}</P>
          <UL items={T.s8items} />
          <P>{T.s8p2}</P>
        </Section>

        <Section title={T.s9Title}>
          <P>{T.s9p1}</P>
        </Section>

        <Section title={T.s10Title}>
          <P>{T.s10p1}</P>
          <P style={{ fontWeight: '700', color: C.green }}>{T.s10email}</P>
          <P style={{ fontWeight: '700', color: C.green }}>{T.s10phone}</P>
        </Section>

        {/* Footer nav */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/privacy" style={{ color: C.green, fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
            {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
