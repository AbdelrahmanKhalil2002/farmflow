import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { updateProfile, updatePassword } from '../services/authService';
import LocationPicker from '../components/LocationPicker';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#F4F6F4',
  white:    '#FFFFFF',
  green:    '#16A34A',
  greenDk:  '#15803D',
  greenLt:  '#F0FDF4',
  greenBd:  '#BBF7D0',
  border:   '#E5E7EB',
  text:     '#111827',
  muted:    '#6B7280',
  midMuted: '#9CA3AF',
  danger:   '#DC2626',
  dangerBg: '#FEF2F2',
  amber:    '#D97706',
  amberBg:  '#FFFBEB',
  shadow:   '0 1px 4px rgba(0,0,0,0.06)',
};

const GOVERNORATES = [
  'القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الشرقية','القليوبية',
  'المنوفية','الغربية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس',
  'شمال سيناء','جنوب سيناء','الفيوم','بني سويف','المنيا','أسيوط','سوهاج',
  'قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح',
];

const ANIMAL_TYPES_AR = {
  cattle: 'أبقار', buffalo: 'جاموس', sheep: 'أغنام',
  goat: 'ماعز', camel: 'جِمال', horse: 'خيول',
  poultry: 'دواجن', rabbit: 'أرانب', other: 'أخرى',
};

const FARM_CERTIFICATES = [
  'بيطري معتمد',
  'منشأة مرخصة',
  'تحت الرقابة البيطرية',
  'مزرعة عضوية',
  'مُصدِّر معتمد',
  'معتمد من وزارة الزراعة',
];

const SECTIONS = [
  { id: 'profile',  icon: '👤', label: 'الملف الشخصي'   },
  { id: 'security', icon: '🔒', label: 'الأمان وكلمة المرور' },
  { id: 'notifs',   icon: '🔔', label: 'الإشعارات'       },
  { id: 'language', icon: '🌐', label: 'اللغة والمنطقة'  },
  { id: 'payment',  icon: '💳', label: 'طرق الدفع'       },
  { id: 'support',  icon: '❓', label: 'المساعدة والدعم' },
  { id: 'logout',   icon: '🚪', label: 'تسجيل الخروج', danger: true },
];

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#e84393','#00cec9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const FAQ_ITEMS = [
  { q: 'كيف أتابع طلبي؟', a: 'يمكنك متابعة طلباتك من صفحة "طلباتي" ورؤية حالتها بشكل فوري.' },
  { q: 'كيف أتواصل مع البائع؟', a: 'استخدم زر "اتصال" أو "واتساب" في صفحة تفاصيل الإعلان للتواصل المباشر مع البائع.' },
  { q: 'ما هي سياسة الإلغاء؟', a: 'يمكن إلغاء الطلب قبل موافقة البائع مع استرداد كامل للعربون.' },
  { q: 'كيف يحمي FarmFlow معاملاتي؟', a: 'يتم تسجيل جميع الطلبات والتحقق من الطرفين. في حالة نزاع، يتدخل فريق الدعم لحل المشكلة.' },
  { q: 'كيف أضيف منتجاً للبيع؟', a: 'اذهب إلى لوحة التحكم > إعلاناتي > إضافة إعلان جديد، وأكمل بيانات الحيوان والسعر.' },
];

// ─── Field input style ────────────────────────────────────────────────────────
const inp = (extra = {}) => ({
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px',
  color: C.text, background: C.white, fontFamily: 'inherit', outline: 'none',
  ...extra,
});

// ─── Label ────────────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '7px', letterSpacing: '0.2px' }}>
    {children}
  </label>
);

// ─── Section heading ──────────────────────────────────────────────────────────
const SH = ({ children }) => (
  <div style={{ fontSize: '13px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
    {children}
  </div>
);

// ─── Save button ──────────────────────────────────────────────────────────────
const SaveBtn = ({ onClick, loading, label = 'حفظ التغييرات', disabled }) => (
  <button type="button" onClick={onClick} disabled={loading || disabled}
    style={{ padding: '11px 28px', background: loading || disabled ? C.midMuted : C.green, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: loading || disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }}
    onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = C.greenDk; }}
    onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.background = C.green; }}>
    {loading ? 'جاري الحفظ…' : label}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const role     = user?.role || 'buyer';

  const [active,      setActive]      = useState('profile');
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);
  const [showContent, setShowContent] = useState(false);

  // ── Profile form ─────────────────────────────────────────────────────────────
  const [prof, setProf] = useState({
    name:            user?.name            || '',
    email:           user?.email           || '',
    governorate:     user?.governorate     || '',
    bio:             user?.bio             || '',
    // seller-specific
    farmName:        user?.farmName        || '',
    farmPhone:       user?.farmPhone       || '',
    personalPhone:   user?.personalPhone   || '',
    experience:      user?.experience      || '',
    animalTypes:     user?.animalTypes     || [],
    farmDescription: user?.farmDescription || '',
    // buyer-specific
    phone:           user?.phone           || '',
  });
  const [bannerFile,         setBannerFile]         = useState(null);
  const [bannerPreview,      setBannerPreview]      = useState(user?.farmBanner ? `http://localhost:5000${user.farmBanner}` : null);
  const [farmLocation,       setFarmLocation]       = useState(user?.farmLocation ?? null);
  const [farmCertificates,   setFarmCertificates]   = useState(user?.farmCertificates ?? []);
  const [workingHours,       setWorkingHours]       = useState({ days: user?.workingHours?.days ?? [], from: user?.workingHours?.from ?? '08:00', to: user?.workingHours?.to ?? '17:00' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Security form ─────────────────────────────────────────────────────────────
  const [passwords,  setPasswords]  = useState({ current: '', next: '', confirm: '' });
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [showPwd,    setShowPwd]    = useState({ current: false, next: false, confirm: false });

  // ── Notifications ─────────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({ orderUpdates: true, sellerMessages: true, promotions: false, sms: false });

  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState('ar');

  // ── FAQ ───────────────────────────────────────────────────────────────────────
  const [openFaq, setOpenFaq] = useState(null);

  // ── Responsive ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowContent(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const selectSection = (id) => {
    setActive(id);
    if (isMobile) setShowContent(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleAnimalType = (type) => {
    setProf(p => ({
      ...p,
      animalTypes: p.animalTypes.includes(type)
        ? p.animalTypes.filter(t => t !== type)
        : [...p.animalTypes, type],
    }));
  };

  const toggleCertificate = (cert) => {
    setFarmCertificates(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  const toggleWorkingDay = (day) => {
    setWorkingHours(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      let payload;
      if (bannerFile && role === 'seller') {
        // Use FormData when a banner image is being uploaded
        payload = new FormData();
        payload.append('name', prof.name);
        payload.append('governorate', prof.governorate || '');
        payload.append('bio', prof.bio || '');
        payload.append('farmName', prof.farmName || '');
        payload.append('farmPhone', prof.farmPhone || '');
        payload.append('personalPhone', prof.personalPhone || '');
        payload.append('experience', prof.experience || '');
        prof.animalTypes.forEach(t => payload.append('animalTypes[]', t));
        payload.append('farmDescription', prof.farmDescription || '');
        payload.append('email', prof.email || '');
        payload.append('farmBanner', bannerFile);
        if (farmLocation?.lat != null) {
          payload.append('farmLocation', JSON.stringify(farmLocation));
        }
        farmCertificates.forEach(c => payload.append('farmCertificates[]', c));
        payload.append('workingHours', JSON.stringify(workingHours));
      } else {
        payload = {
          name: prof.name,
          governorate: prof.governorate,
          bio: prof.bio,
          ...(role === 'seller' ? {
            farmName: prof.farmName,
            farmPhone: prof.farmPhone,
            personalPhone: prof.personalPhone,
            experience: prof.experience,
            animalTypes: prof.animalTypes,
            farmDescription: prof.farmDescription,
            email: prof.email,
            farmLocation: farmLocation ?? undefined,
            farmCertificates,
            workingHours,
          } : {}),
          ...(role === 'buyer' ? {
            phone: prof.phone,
          } : {}),
        };
      }
      await updateProfile(payload);
      if (bannerFile) setBannerFile(null);
      toast.success('تم حفظ الملف الشخصي بنجاح');
    } catch (err) {
      const msg = err?.response?.data?.message || 'فشل الحفظ، حاول مرة أخرى';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (passwords.next.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setSavingPwd(true);
    try {
      await updatePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'فشل تغيير كلمة المرور';
      toast.error(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Role badge ────────────────────────────────────────────────────────────────
  const ROLE_LABELS = { seller: { ar: 'بائع / مزارع', icon: '🌾', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' }, buyer: { ar: 'مشتري', icon: '🛒', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' }, admin: { ar: 'مدير', icon: '⚙️', bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' } };
  const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.buyer;

  // ══ SECTION: Profile ═════════════════════════════════════════════════════════
  const renderProfile = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} dir="rtl">

      {/* Avatar + info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: C.greenLt, borderRadius: '14px', border: `1px solid ${C.greenBd}` }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: avatarColor(user?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
          {initials(user?.name || '')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: '800', color: C.text, marginBottom: '6px' }}>{user?.name || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: roleMeta.color, background: roleMeta.bg, border: `1px solid ${roleMeta.border}`, padding: '3px 10px', borderRadius: '20px' }}>
              {roleMeta.icon} {roleMeta.ar}
            </span>
            {user?.governorate && (
              <span style={{ fontSize: '12px', color: C.muted }}>📍 {user.governorate}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Common fields ── */}
      <div>
        <SH>البيانات الأساسية</SH>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
          <div>
            <Label>الاسم الكامل</Label>
            <input type="text" value={prof.name} onChange={e => setProf(p => ({ ...p, name: e.target.value }))}
              placeholder="أدخل اسمك الكامل" style={inp()} dir="rtl"
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>

          <div>
            <Label>المحافظة</Label>
            <select value={prof.governorate} onChange={e => setProf(p => ({ ...p, governorate: e.target.value }))} style={inp()} dir="rtl">
              <option value="">— اختر المحافظة —</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {role === 'admin' && (
            <div>
              <Label>البريد الإلكتروني</Label>
              <input type="email" value={prof.email} readOnly style={inp({ background: '#F9FAFB', color: C.muted, cursor: 'not-allowed' })} />
            </div>
          )}
        </div>
      </div>

      {/* ── Seller fields ── */}
      {role === 'seller' && (
        <div>
          <SH>بيانات المزرعة</SH>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <Label>اسم المزرعة</Label>
              <input type="text" value={prof.farmName} onChange={e => setProf(p => ({ ...p, farmName: e.target.value }))}
                placeholder="اسم المزرعة" style={inp()} dir="rtl"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>رقم هاتف المزرعة</Label>
              <input type="tel" value={prof.farmPhone} onChange={e => setProf(p => ({ ...p, farmPhone: e.target.value }))}
                placeholder="01X XXXX XXXX" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>رقم الهاتف الشخصي</Label>
              <input type="tel" value={prof.personalPhone} onChange={e => setProf(p => ({ ...p, personalPhone: e.target.value }))}
                placeholder="01X XXXX XXXX" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>البريد الإلكتروني (اختياري)</Label>
              <input type="email" value={prof.email} onChange={e => setProf(p => ({ ...p, email: e.target.value }))}
                placeholder="example@email.com" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>سنوات الخبرة</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[['<1','أقل من سنة'],['1-3','1–3 سنوات'],['3-5','3–5 سنوات'],['5-10','5–10 سنوات'],['>10','أكثر من 10']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setProf(p => ({ ...p, experience: val }))}
                    style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${prof.experience === val ? C.green : C.border}`, background: prof.experience === val ? C.greenLt : C.white, color: prof.experience === val ? C.green : C.text, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>أنواع الحيوانات في مزرعتك</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(ANIMAL_TYPES_AR).map(([type, label]) => {
                  const sel = prof.animalTypes.includes(type);
                  return (
                    <button key={type} type="button" onClick={() => toggleAnimalType(type)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : C.white, color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>نبذة مختصرة</Label>
              <textarea value={prof.bio} onChange={e => setProf(p => ({ ...p, bio: e.target.value }))}
                placeholder="جملة أو جملتان عن مزرعتك…" rows={2} dir="rtl"
                style={{ ...inp(), resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Label>وصف تفصيلي للمزرعة</Label>
              <textarea value={prof.farmDescription} onChange={e => setProf(p => ({ ...p, farmDescription: e.target.value }))}
                placeholder="اشرح منتجاتك، أسلوب تربيتك، ما يميز مزرعتك عن غيرها…" rows={4} dir="rtl"
                style={{ ...inp(), resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>

            {/* Banner image uploader */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>صورة غلاف المزرعة</Label>
              {bannerPreview && (
                <div style={{ marginBottom: 10, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${C.border}`, height: 120, position: 'relative' }}>
                  <img src={bannerPreview} alt="غلاف" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button"
                    onClick={() => { setBannerPreview(null); setBannerFile(null); }}
                    style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
                    إزالة
                  </button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1.5px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: C.muted }}>
                <span style={{ fontSize: 20 }}>🖼</span>
                {bannerFile ? bannerFile.name : 'اختر صورة (JPEG, PNG, WebP — حتى 5 ميجا)'}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setBannerFile(f);
                    setBannerPreview(URL.createObjectURL(f));
                  }} />
              </label>
            </div>

            {/* Farm location picker */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>موقع المزرعة على الخريطة</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                حدد موقع مزرعتك حتى يتمكن المشترون من معرفة مكانك بدقة.
              </div>
              <LocationPicker
                value={farmLocation}
                onChange={loc => setFarmLocation(loc)}
                label="موقع المزرعة"
                height={300}
              />
              {farmLocation?.lat != null && (
                <button type="button" onClick={() => setFarmLocation(null)}
                  style={{ marginTop: 8, padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✕ إزالة الموقع
                </button>
              )}
            </div>

            {/* Farm certificates */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>شهادات واعتمادات المزرعة</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                اختر الشهادات والاعتمادات التي حصلت عليها مزرعتك — تظهر كشارات على صفحة مزرعتك.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {FARM_CERTIFICATES.map(cert => {
                  const sel = farmCertificates.includes(cert);
                  return (
                    <button key={cert} type="button" onClick={() => toggleCertificate(cert)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : C.white, color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sel ? '✓' : '+'} {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Working hours */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>أوقات العمل</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                حدد أيام وساعات استقبال المشترين والتواصل — تظهر على صفحة مزرعتك.
              </div>
              {/* Day toggles */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => {
                  const sel = workingHours.days.includes(day);
                  return (
                    <button key={day} type="button" onClick={() => toggleWorkingDay(day)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : C.white, color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sel ? '✓' : '+'} {day}
                    </button>
                  );
                })}
              </div>
              {/* Time range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>من</div>
                  <input type="time" value={workingHours.from}
                    onChange={e => setWorkingHours(prev => ({ ...prev, from: e.target.value }))}
                    style={{ ...inp({ width: 'auto', paddingLeft: '10px', paddingRight: '10px' }) }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border} />
                </div>
                <div style={{ fontSize: '13px', color: C.muted, marginTop: '22px' }}>—</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>إلى</div>
                  <input type="time" value={workingHours.to}
                    onChange={e => setWorkingHours(prev => ({ ...prev, to: e.target.value }))}
                    style={{ ...inp({ width: 'auto', paddingLeft: '10px', paddingRight: '10px' }) }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Buyer fields ── */}
      {role === 'buyer' && (
        <div>
          <SH>بيانات التواصل</SH>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <Label>رقم الهاتف</Label>
              <input type="tel" value={prof.phone} onChange={e => setProf(p => ({ ...p, phone: e.target.value }))}
                placeholder="01X XXXX XXXX" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <input type="email" value={prof.email} readOnly style={inp({ background: '#F9FAFB', color: C.muted, cursor: 'default' })} dir="ltr" />
              <div style={{ fontSize: '11px', color: C.midMuted, marginTop: '4px' }}>لا يمكن تعديل البريد الإلكتروني</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <SaveBtn onClick={saveProfile} loading={savingProfile} />
      </div>
    </div>
  );

  // ══ SECTION: Security ════════════════════════════════════════════════════════
  const renderSecurity = () => {
    const pwMatch = passwords.next === passwords.confirm;
    const canSave = passwords.current && passwords.next.length >= 8 && pwMatch;
    const pwStrength = passwords.next.length === 0 ? null : passwords.next.length < 8 ? 'weak' : passwords.next.length < 12 ? 'medium' : 'strong';
    const strengthColors = { weak: '#DC2626', medium: '#D97706', strong: '#16A34A' };
    const strengthLabels = { weak: 'ضعيفة', medium: 'متوسطة', strong: 'قوية' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir="rtl">

        {/* Change password */}
        <div style={{ padding: '22px', background: C.white, borderRadius: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: C.text, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 تغيير كلمة المرور
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { id: 'current', label: 'كلمة المرور الحالية', ac: 'current-password' },
              { id: 'next',    label: 'كلمة المرور الجديدة', ac: 'new-password'     },
              { id: 'confirm', label: 'تأكيد كلمة المرور الجديدة', ac: 'new-password' },
            ].map(({ id, label, ac }) => (
              <div key={id}>
                <Label>{label}</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd[id] ? 'text' : 'password'}
                    value={passwords[id]}
                    onChange={e => setPasswords(p => ({ ...p, [id]: e.target.value }))}
                    autoComplete={ac}
                    dir="ltr"
                    style={{ ...inp({ paddingLeft: '40px' }) }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  <button type="button" onClick={() => setShowPwd(p => ({ ...p, [id]: !p[id] }))}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '15px', lineHeight: 1, padding: '4px' }}>
                    {showPwd[id] ? '🙈' : '👁'}
                  </button>
                </div>
                {id === 'next' && pwStrength && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: strengthColors[pwStrength], width: pwStrength === 'weak' ? '33%' : pwStrength === 'medium' ? '66%' : '100%', transition: 'width 0.3s, background 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: strengthColors[pwStrength] }}>
                      {strengthLabels[pwStrength]}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {passwords.confirm.length > 0 && !pwMatch && (
              <div style={{ fontSize: '12px', color: C.danger, display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ كلمتا المرور غير متطابقتين</div>
            )}
            {passwords.next.length >= 8 && pwMatch && passwords.confirm.length > 0 && (
              <div style={{ fontSize: '12px', color: C.green, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ كلمتا المرور متطابقتان</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <SaveBtn onClick={savePassword} loading={savingPwd} label="تغيير كلمة المرور" disabled={!canSave} />
            </div>
          </div>
        </div>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 18px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.greenBd}` }} dir="rtl">
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🛡</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '3px' }}>حساب آمن ومحمي</div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.65 }}>
              جميع الجلسات مشفرة ومحمية بواسطة FarmFlow. استخدم كلمة مرور قوية وفريدة لحساباتك.
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ padding: '18px 20px', background: C.dangerBg, borderRadius: '14px', border: '1px solid #FECACA' }} dir="rtl">
          <div style={{ fontSize: '13px', fontWeight: '800', color: C.danger, marginBottom: '8px' }}>⚠️ منطقة الخطر</div>
          <div style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.65, marginBottom: '14px' }}>
            حذف الحساب نهائي ولا يمكن التراجع عنه — سيتم مسح جميع بياناتك وطلباتك وإعلاناتك.
          </div>
          <button type="button"
            style={{ padding: '9px 20px', background: 'transparent', color: C.danger, border: `1.5px solid ${C.danger}`, borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑 حذف الحساب نهائياً
          </button>
        </div>
      </div>
    );
  };

  // ══ SECTION: Notifications ═══════════════════════════════════════════════════
  const renderNotifications = () => {
    const TOGGLES = [
      { key: 'orderUpdates',   label: 'تحديثات الطلبات',      sub: 'احصل على إشعار عند تغيير حالة طلبك' },
      { key: 'sellerMessages', label: 'رسائل البائع',          sub: 'استقبل رسائل مباشرة من البائعين' },
      { key: 'promotions',     label: 'العروض والتخفيضات',     sub: 'اعروض خاصة وإعلانات مميزة' },
      { key: 'sms',            label: 'إشعارات SMS',           sub: 'استقبل التحديثات عبر رسالة نصية' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} dir="rtl">
        {TOGGLES.map(({ key, label, sub }) => (
          <div key={key}
            onClick={() => setNotifs(p => ({ ...p, [key]: !p[key] }))}
            role="switch" aria-checked={notifs[key]} tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setNotifs(p => ({ ...p, [key]: !p[key] }))}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: notifs[key] ? C.greenLt : C.white, borderRadius: '12px', border: `1px solid ${notifs[key] ? C.greenBd : C.border}`, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: notifs[key] ? C.green : C.text }}>{label}</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{sub}</div>
            </div>
            <div style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: notifs[key] ? C.green : '#D1D5DB', transition: 'background 0.2s' }} />
              <div style={{ position: 'absolute', top: '3px', left: notifs[key] ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
        <div style={{ padding: '12px 16px', background: C.greenLt, borderRadius: '10px', border: `1px solid ${C.greenBd}`, fontSize: '12px', color: C.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✅</span>
          <span>يتم تطبيق إعدادات الإشعارات تلقائياً</span>
        </div>
      </div>
    );
  };

  // ══ SECTION: Language & Region ═══════════════════════════════════════════════
  const renderLanguage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir="rtl">

      <div>
        <SH>اللغة</SH>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[['ar', 'العربية', '🇪🇬'], ['en', 'English', '🇬🇧']].map(([val, label, flag]) => (
            <button key={val} type="button" onClick={() => setLang(val)}
              style={{ flex: 1, padding: '16px 10px', border: `2px solid ${lang === val ? C.green : C.border}`, borderRadius: '12px', background: lang === val ? C.greenLt : C.white, cursor: 'pointer', fontSize: '14px', fontWeight: lang === val ? '700' : '500', color: lang === val ? C.green : C.text, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '26px' }}>{flag}</span>
              {label}
              {lang === val && <span style={{ fontSize: '10px', fontWeight: '700', color: C.green }}>✓ محدد</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SH>العملة</SH>
        <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: C.muted, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🪙</span>
          <span>الجنيه المصري (ج.م)</span>
          <span style={{ marginRight: 'auto', fontSize: '11px', fontWeight: '400', color: C.midMuted }}>ثابت</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <SaveBtn onClick={() => toast.success('تم حفظ إعدادات اللغة')} label="حفظ" />
      </div>
    </div>
  );

  // ══ SECTION: Payment Methods ══════════════════════════════════════════════════
  const renderPayment = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
      {[
        { icon: '💵', label: 'الدفع عند الاستلام', sub: 'الطريقة الافتراضية — ادفع نقداً عند تسليم الحيوان أو استلامه.', active: true, color: C.green, bg: C.greenLt, border: C.greenBd },
        { icon: '📱', label: 'InstaPay', sub: 'ادفع بسرعة وسهولة عبر تطبيق InstaPay المصري.', active: true, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
        { icon: '🏦', label: 'دفع العربون', sub: 'احجز الحيوان بدفع عربون مسبق ثم سدّد الباقي عند الاستلام.', active: false, color: C.muted, bg: '#F9FAFB', border: C.border },
        { icon: '💳', label: 'بطاقة فيزا / ماستركارد', sub: 'قريباً — سيتم إضافة الدفع بالبطاقة في تحديثات مستقبلية.', active: false, soon: true, color: C.midMuted, bg: '#F9FAFB', border: C.border },
      ].map(({ icon, label, sub, active, soon, color, bg, border }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', background: bg, borderRadius: '14px', border: `1px solid ${border}` }}>
          <span style={{ fontSize: '24px', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>{sub}</div>
          </div>
          {active && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: color, background: bg, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>✓ مفعّل</span>
          )}
          {soon && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.amber, background: C.amberBg, padding: '3px 10px', borderRadius: '20px', border: '1px solid #FDE68A', flexShrink: 0 }}>قريباً</span>
          )}
        </div>
      ))}
      <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '12px', color: '#92400E', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, fontSize: '14px' }}>🛡</span>
        <span>جميع المعاملات محمية ومؤمّنة بواسطة منصة FarmFlow.</span>
      </div>
    </div>
  );

  // ══ SECTION: Help & Support ═══════════════════════════════════════════════════
  const renderSupport = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
        {[
          { icon: '💬', label: 'واتساب', sub: 'للدعم الفوري', href: 'https://wa.me/201000000000', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
          { icon: '📧', label: 'البريد الإلكتروني', sub: 'support@farmflow.com.eg', href: 'mailto:support@farmflow.com.eg', color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
        ].map(({ icon, label, sub, href, color, bg, border }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: bg, borderRadius: '12px', border: `1px solid ${border}`, textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color }}>{label}</div>
              <div style={{ fontSize: '11px', color, opacity: 0.75, marginTop: '2px' }}>{sub}</div>
            </div>
          </a>
        ))}
      </div>

      <SH>الأسئلة الشائعة</SH>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', padding: '13px 16px', background: openFaq === i ? C.greenLt : C.white, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontFamily: 'inherit', transition: 'background 0.15s' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: C.text, textAlign: 'right', flex: 1, lineHeight: 1.4 }} dir="rtl">{item.q}</span>
              <span aria-hidden="true" style={{ fontSize: '12px', color: C.muted, flexShrink: 0, display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: '12px 16px', background: '#FAFDF9', fontSize: '12px', color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}` }} dir="rtl">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', background: C.greenLt, borderRadius: '10px', border: `1px solid ${C.greenBd}`, fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🌾</span>
        <span>فريق دعم FarmFlow متاح من السبت إلى الخميس، من 9 صباحاً حتى 6 مساءً.</span>
      </div>
    </div>
  );

  // ══ SECTION: Logout ══════════════════════════════════════════════════════════
  const renderLogout = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center', gap: '16px' }} dir="rtl">
      <span style={{ fontSize: '54px', lineHeight: 1 }}>🚪</span>
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>تسجيل الخروج</h3>
        <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65, maxWidth: '340px', margin: '0 auto' }}>
          هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button type="button" onClick={() => { setActive('profile'); if (isMobile) setShowContent(false); }}
          style={{ padding: '12px 24px', background: '#F3F4F6', color: C.text, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          إلغاء
        </button>
        <button type="button" onClick={handleLogout}
          style={{ padding: '12px 28px', background: C.danger, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
          onMouseLeave={e => e.currentTarget.style.background = C.danger}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  );

  // ── Section → renderer map ───────────────────────────────────────────────────
  const RENDERERS = {
    profile:  renderProfile,
    security: renderSecurity,
    notifs:   renderNotifications,
    language: renderLanguage,
    payment:  renderPayment,
    support:  renderSupport,
    logout:   renderLogout,
  };

  const activeSection = SECTIONS.find(s => s.id === active);

  // ── Nav sidebar ───────────────────────────────────────────────────────────────
  const renderNav = () => (
    <div>
      {/* User mini card */}
      <div style={{ padding: '14px', marginBottom: '8px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.greenBd}`, display: 'flex', alignItems: 'center', gap: '10px' }} dir="rtl">
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarColor(user?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
          {initials(user?.name || '')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || '—'}</div>
          <div style={{ fontSize: '11px', color: roleMeta.color, fontWeight: '600' }}>{roleMeta.icon} {roleMeta.ar}</div>
        </div>
      </div>

      <nav aria-label="إعدادات">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {SECTIONS.map(sec => {
            const isActive = active === sec.id;
            return (
              <button key={sec.id} type="button"
                onClick={() => selectSection(sec.id)}
                style={{
                  width: '100%', padding: '11px 12px', border: 'none', borderRadius: '10px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive
                    ? (sec.danger ? 'rgba(220,38,38,0.07)' : C.greenLt)
                    : 'transparent',
                  borderRight: `3px solid ${isActive ? (sec.danger ? C.danger : C.green) : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = sec.danger ? 'rgba(220,38,38,0.05)' : '#F9FAF9'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span aria-hidden="true" style={{ fontSize: '17px', flexShrink: 0, lineHeight: 1 }}>{sec.icon}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? '700' : '600', color: sec.danger ? C.danger : (isActive ? C.green : C.text), textAlign: 'right' }} dir="rtl">
                  {sec.label}
                </span>
                {!sec.danger && <span aria-hidden="true" style={{ fontSize: '11px', color: C.midMuted, flexShrink: 0 }}>‹</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir="rtl">
      <style>{`
        *:focus-visible { outline: 2px solid #16A34A; outline-offset: 2px; border-radius: 4px; }
        select { appearance: auto; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
      `}</style>

      {/* Page heading */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          ⚙️ الإعدادات
        </h1>
        <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
          إدارة حسابك وبياناتك الشخصية
        </p>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: '20px', alignItems: 'flex-start' }}>

        {/* ── Nav panel ── */}
        {(!isMobile || !showContent) && (
          <div style={{ background: C.white, borderRadius: '16px', padding: '10px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
            {renderNav()}
          </div>
        )}

        {/* ── Content panel ── */}
        {(!isMobile || showContent) && (
          <div style={{ background: C.white, borderRadius: '16px', padding: isMobile ? '20px' : '26px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>

            {/* Content header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${C.border}` }}>
              {isMobile && (
                <button type="button" onClick={() => setShowContent(false)} aria-label="رجوع"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '20px', padding: '4px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <span aria-hidden="true" style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>{activeSection?.icon}</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: activeSection?.danger ? C.danger : C.text, margin: 0, lineHeight: 1.2 }} dir="rtl">
                {activeSection?.label}
              </h2>
            </div>

            {/* Rendered section */}
            {RENDERERS[active]?.()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
