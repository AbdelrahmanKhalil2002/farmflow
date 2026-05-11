import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/authService';
import { useLang, LangToggle } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { COLOR_SCHEMES } from '../themes/presets';
import ThemePanel from '../components/ThemePanel';
import { C as _C } from '../tokens';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = { ..._C, panel: 'linear-gradient(155deg, #1C0E05 0%, #4A2208 48%, #6B3518 100%)' };

// ─── Bilingual content arrays ─────────────────────────────────────────────────
const STATS = [
  { value: '١٢٠٠+', ar: 'إعلان معتمد',  en: 'Verified Listings'  },
  { value: '٣',      ar: 'سنوات تشغيل', en: 'Years Operating'    },
  { value: '٦٠٠+',  ar: 'صفقة ناجحة',  en: 'Successful Sales'   },
  { value: '٩٥٪',   ar: 'رضا العملاء', en: 'Satisfaction Rate'  },
];

const TESTIMONIALS = [
  {
    ar:     '"بعت قطيعي كاملاً في أقل من ٤ أيام. FarmFlow غيّر طريقة بيعي تماماً."',
    en:     '"Sold my entire herd in under 4 days. FarmFlow completely changed how I sell."',
    name:   'أحمد محمود',
    roleAr: 'مربّي أبقار — الشرقية',
    roleEn: 'Cattle farmer — Sharqia',
    avatar: '👨‍🌾',
  },
  {
    ar:     '"الإعلانات المعتمدة أعطتني ثقة كاملة. عرفت بالضبط ما أشتريه قبل الزيارة."',
    en:     '"Verified listings gave me total confidence. I knew what I was buying before visiting."',
    name:   'فاطمة علي',
    roleAr: 'مشترية ماشية — القاهرة',
    roleEn: 'Livestock buyer — Cairo',
    avatar: '👩‍💼',
  },
  {
    ar:     '"إدارة المصاريف والدخل في مكان واحد وفّرت عليّ ساعات كل أسبوع."',
    en:     '"Managing expenses and income in one place saves me hours every week."',
    name:   'خالد إبراهيم',
    roleAr: 'مربّي أغنام — الجيزة',
    roleEn: 'Sheep farmer — Giza',
    avatar: '🧑‍🌾',
  },
];

const RECENT = [
  { ar: '🐑 ١٢ خروف بلدي تم بيعها · ١٨,٠٠٠ ج · منذ ٢ ساعة', en: '🐑 12 local sheep sold · 18,000 EGP · 2 hrs ago' },
  { ar: '🐄 ٣ أبقار هولشتاين · ٤٥,٠٠٠ ج · منذ ٥ ساعات',       en: '🐄 3 Holstein cows · 45,000 EGP · 5 hrs ago'    },
  { ar: '🐃 جاموسة حلوب · ٢٢,٠٠٠ ج · أمس',                    en: '🐃 Dairy buffalo · 22,000 EGP · Yesterday'      },
  { ar: '🐐 ٦ ماعز نوبية · ٩,٦٠٠ ج · أمس',                     en: '🐐 6 Nubian goats · 9,600 EGP · Yesterday'      },
];

const parseError = (err, t) => {
  const data = err.response?.data;
  if (!data) return t('common.networkErr');
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || t('common.unknownErr');
};

// ─── Appearance picker button for login page ──────────────────────────────────
const AppearanceBtn = () => {
  const { theme } = useTheme();
  const { lang }  = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const scheme = COLOR_SCHEMES[theme.colorScheme] || COLOR_SCHEMES.green;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '9px',
          background: open ? 'rgba(28,14,5,0.08)' : 'rgba(28,14,5,0.05)',
          border: '1px solid rgba(28,14,5,0.1)',
          cursor: 'pointer', fontSize: '12px', fontWeight: '600',
          color: C.text, fontFamily: 'inherit', transition: 'all 0.15s',
        }}
      >
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: scheme.swatch, flexShrink: 0 }} />
        {lang === 'ar' ? 'المظهر' : 'Appearance'}
        <span style={{ fontSize: '9px', lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: '280px', background: '#fff', borderRadius: '14px',
          padding: '16px 16px 8px', zIndex: 200,
          boxShadow: '0 8px 32px rgba(28,14,5,0.14)',
          border: '1px solid rgba(28,14,5,0.08)',
          maxHeight: '70vh', overflowY: 'auto',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '14px' }}>
            🎨 {lang === 'ar' ? 'تخصيص المظهر' : 'Customize Appearance'}
          </div>
          <ThemePanel compact />
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const Login = () => {
  const navigate        = useNavigate();
  const { user, login } = useAuth();
  const { t, isRTL, lang } = useLang();

  const [form,        setForm]   = useState({ identifier: '', password: '' });
  const [error,       setError]  = useState('');
  const [submitting,  setSubmit] = useState(false);
  const [showPwd,     setShowPwd] = useState(false);
  const [ticker,      setTicker] = useState(0);
  const [testimonial, setTest]   = useState(0);
  const [isMobile,    setMobile] = useState(window.innerWidth < 768);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  useEffect(() => {
    const id = setInterval(() => setTicker(p => (p + 1) % RECENT.length), 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTest(p => (p + 1) % TESTIMONIALS.length), 5500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmit(true);
    try {
      const { data } = await loginUser(form.identifier, form.password);
      login(data.user, data.token);
    } catch (err) {
      setError(parseError(err, t));
    } finally {
      setSubmit(false);
    }
  };

  const T    = TESTIMONIALS[testimonial];
  const dir  = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';

  return (
    <div dir={dir} style={{ display: 'flex', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        *:focus-visible { outline: 2px solid #3A7D44; outline-offset: 2px; border-radius: 4px; }
        ::placeholder { color: #C4A898; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Left brand panel (desktop only) ── */}
      {!isMobile && (
        <div style={{
          width: '44%', background: C.panel, padding: '48px 40px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          color: '#fff', position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: -90, right: -90, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: '40%', left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(196,154,108,0.08)' }} />

          {/* Logo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '30px' }}>🌾</span>
              <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>FarmFlow</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6, margin: 0, maxWidth: '280px', textAlign: align }}>
              {t('login.marketplace')}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {STATS.map(s => (
              <div key={s.en} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: C.tan, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '4px', textAlign: align }}>
                  {lang === 'ar' ? s.ar : s.en}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div key={testimonial} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.07)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: '22px', color: C.tan, marginBottom: '8px', lineHeight: 1 }}>❝</div>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)', margin: '0 0 14px', textAlign: align }}>
              {lang === 'ar' ? T.ar : T.en}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(196,154,108,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {T.avatar}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>{T.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>
                  {lang === 'ar' ? T.roleAr : T.roleEn}
                </div>
              </div>
            </div>
            <div role="group" style={{ display: 'flex', gap: '5px', marginTop: '14px' }}>
              {TESTIMONIALS.map((_, i) => (
                <button key={i} type="button" onClick={() => setTest(i)}
                  aria-label={`${i + 1}`} aria-pressed={i === testimonial}
                  style={{ width: i === testimonial ? '18px' : '6px', height: '6px', borderRadius: '3px', background: i === testimonial ? C.tan : 'rgba(255,255,255,0.22)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s', flexShrink: 0 }} />
              ))}
            </div>
          </div>

          {/* Live ticker */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>
              {t('login.liveActivity')}
            </div>
            <div key={ticker} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.78)', animation: 'fadeUp 0.4s ease' }}>
              <span aria-hidden="true" style={{ width: '7px', height: '7px', background: '#4ADE80', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 7px #4ADE80' }} />
              {lang === 'ar' ? RECENT[ticker].ar : RECENT[ticker].en}
            </div>
          </div>
        </div>
      )}

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '32px 24px' : '48px 40px', overflowY: 'auto' }}>

        {/* Mobile logo */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <span style={{ fontSize: '26px' }}>🌾</span>
            <span style={{ fontSize: '20px', fontWeight: '800', color: C.text }}>FarmFlow</span>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Lang toggle + appearance row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            {isRTL ? <AppearanceBtn /> : <LangToggle dark={false} />}
            {isRTL ? <LangToggle dark={false} /> : <AppearanceBtn />}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px', textAlign: align }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: C.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              {t('login.welcome')}
            </h1>
            <p style={{ color: C.muted, margin: 0, fontSize: '14px' }}>
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Identifier */}
            <FieldRow label={t('auth.identifier')} name="identifier" type="text"
              placeholder={t('auth.idPlaceholder')} value={form.identifier}
              onChange={handleChange} autoFocus
              maxLength={/^\d/.test(form.identifier) ? 11 : 100} />

            {/* Password + show/hide */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '6px', textAlign: align }}>
                {t('auth.password')}
              </label>
              <PwdInput
                id="password" name="password"
                value={form.password} onChange={handleChange}
                show={showPwd} onToggle={() => setShowPwd(p => !p)}
                toggleLabel={showPwd ? t('auth.hidePwd') : t('auth.showPwd')}
              />
            </div>

            {error && (
              <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '11px 14px', color: C.errorText, fontSize: '13px', lineHeight: 1.5, textAlign: align }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '13px', color: C.green, fontWeight: '600', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </div>

            <button type="submit" disabled={submitting} aria-busy={submitting || undefined}
              style={{ padding: '14px', background: submitting ? '#6AAF74' : C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s', marginTop: '4px', letterSpacing: '-0.2px' }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.greenDk; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.green; }}>
              {submitting ? t('login.signing') : t('auth.login') + ' →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 18px' }}>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
            <span style={{ fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' }}>{t('login.newHere')}</span>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
          </div>

          {/* Register cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { role: 'buyer',  emoji: '🛒', label: t('login.buyerRole'),  desc: t('login.buyerDesc')  },
              { role: 'seller', emoji: '🐄', label: t('login.sellerRole'), desc: t('login.sellerDesc') },
            ].map(({ role, emoji, label, desc }) => (
              <Link key={role} to={`/register?role=${role}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{ border: `2px solid ${C.border}`, borderRadius: '14px', padding: '16px 12px', textAlign: 'center', background: '#fff', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 1px 6px rgba(28,14,5,0.05)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(58,125,68,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(28,14,5,0.05)'; }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{emoji}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: C.text }}>{label}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>{desc}</div>
                  <div style={{ marginTop: '10px', padding: '7px', background: C.green, color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                    {t('login.getStarted')} →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: C.muted, lineHeight: 1.5 }}>
            {t('login.secure')}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Simple text input ────────────────────────────────────────────────────────
const FieldRow = ({ label, name, type, placeholder, value, onChange, autoFocus, maxLength }) => {
  const { isRTL } = useLang();
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={name} style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '6px', textAlign: isRTL ? 'right' : 'left' }}>
        {label}
      </label>
      <input
        id={name} name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required autoFocus={autoFocus}
        maxLength={maxLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', boxSizing: 'border-box',
          border: `1.5px solid ${focused ? C.green : C.border}`,
          borderRadius: '10px', background: '#fff', fontSize: '15px',
          color: C.text, transition: 'border-color 0.15s', fontFamily: 'inherit', outline: 'none',
          direction: 'ltr', textAlign: 'left',
        }}
      />
    </div>
  );
};

// ─── Password input with show/hide ────────────────────────────────────────────
const PwdInput = ({ id, name, value, onChange, show, onToggle, toggleLabel }) => {
  const [focused, setFocused] = useState(false);
  const { isRTL } = useLang();
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id} name={name} type={show ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder="••••••••" required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          paddingTop: '12px', paddingBottom: '12px',
          paddingInlineStart: '14px', paddingInlineEnd: '48px',
          boxSizing: 'border-box',
          border: `1.5px solid ${focused ? C.green : C.border}`,
          borderRadius: '10px', background: '#fff', fontSize: '15px',
          color: C.text, transition: 'border-color 0.15s', fontFamily: 'inherit', outline: 'none',
          direction: 'ltr',
        }}
      />
      <button
        type="button" onClick={onToggle} aria-label={toggleLabel}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '17px', padding: '4px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
};

export default Login;
