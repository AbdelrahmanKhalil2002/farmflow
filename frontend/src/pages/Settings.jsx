import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../components/Toast';
import { updateProfile, updatePassword, getNotifPrefs, updateNotifPrefs } from '../services/authService';
import LocationPicker from '../components/LocationPicker';
import ThemePanel from '../components/ThemePanel';
import { C as _C } from '../tokens';

const C = {
  ..._C,
  // Settings-specific aliases
  greenLt:  _C.greenLt,
  greenBd:  _C.greenBd,
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
  { id: 'profile',    icon: '👤', labelKey: 'settings.sec.profile'    },
  { id: 'security',   icon: '🔒', labelKey: 'settings.sec.security'   },
  { id: 'notifs',     icon: '🔔', labelKey: 'settings.sec.notifs'     },
  { id: 'appearance', icon: '🎨', labelKey: 'settings.sec.appearance' },
  { id: 'language',   icon: '🌐', labelKey: 'settings.sec.language'   },
  { id: 'payment',    icon: '💳', labelKey: 'settings.sec.payment'    },
  { id: 'support',    icon: '❓', labelKey: 'settings.sec.support'    },
  { id: 'logout',     icon: '🚪', labelKey: 'settings.sec.logout', danger: true },
];

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#e84393','#00cec9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const FAQ_KEY_PAIRS = [
  ['settings.faq.q1', 'settings.faq.a1'],
  ['settings.faq.q2', 'settings.faq.a2'],
  ['settings.faq.q3', 'settings.faq.a3'],
  ['settings.faq.q4', 'settings.faq.a4'],
  ['settings.faq.q5', 'settings.faq.a5'],
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
const SaveBtn = ({ onClick, loading, label, loadingLabel, disabled }) => (
  <button type="button" onClick={onClick} disabled={loading || disabled}
    style={{ padding: '11px 28px', background: loading || disabled ? C.midMuted : C.green, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: loading || disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }}
    onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = C.greenDk; }}
    onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.background = C.green; }}>
    {loading ? (loadingLabel || label) : label}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const { t, isRTL, lang: globalLang, setLang: setGlobalLang } = useLang();
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
  const [notifs,        setNotifs]        = useState({ orders: true, reminders: true, dairy: true, messages: true });
  const [notifsDirty,   setNotifsDirty]   = useState(false);
  const [savingNotifs,  setSavingNotifs]  = useState(false);
  const [notifsLoaded,  setNotifsLoaded]  = useState(false);

  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(globalLang);

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

  // ── Load notification preferences once ────────────────────────────────────────
  useEffect(() => {
    if (notifsLoaded) return;
    getNotifPrefs()
      .then(({ data }) => { setNotifs(p => ({ ...p, ...data })); setNotifsLoaded(true); })
      .catch(() => setNotifsLoaded(true)); // fall back to defaults silently
  }, [notifsLoaded]);

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
      toast.success(t('settings.profile.saveSuccess'));
    } catch (err) {
      const msg = err?.response?.data?.message || t('settings.profile.saveErr');
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (passwords.next.length < 8) {
      toast.error(t('reg.pwdMin'));
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error(t('reg.err.pwdMatch'));
      return;
    }
    setSavingPwd(true);
    try {
      await updatePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      toast.success(t('settings.pwd.saveSuccess'));
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || t('settings.pwd.saveErr');
      toast.error(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Role badge ────────────────────────────────────────────────────────────────
  const ROLE_LABELS = { seller: { labelKey: 'settings.role.seller', icon: '🌾', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' }, buyer: { labelKey: 'settings.role.buyer', icon: '🛒', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' }, admin: { labelKey: 'settings.role.admin', icon: '⚙️', bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' } };
  const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.buyer;

  // ══ SECTION: Profile ═════════════════════════════════════════════════════════
  const renderProfile = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Avatar + info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: C.greenLt, borderRadius: '14px', border: `1px solid ${C.greenBd}` }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: avatarColor(user?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
          {initials(user?.name || '')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: '800', color: C.text, marginBottom: '6px' }}>{user?.name || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: roleMeta.color, background: roleMeta.bg, border: `1px solid ${roleMeta.border}`, padding: '3px 10px', borderRadius: '20px' }}>
              {roleMeta.icon} {t(roleMeta.labelKey)}
            </span>
            {user?.governorate && (
              <span style={{ fontSize: '12px', color: C.muted }}>📍 {user.governorate}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Common fields ── */}
      <div>
        <SH>{t('settings.profile.basicData')}</SH>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
          <div>
            <Label>{t('settings.profile.name')}</Label>
            <input type="text" value={prof.name} onChange={e => setProf(p => ({ ...p, name: e.target.value }))}
              placeholder={t('settings.profile.namePlaceholder')} style={inp()} dir={isRTL ? 'rtl' : 'ltr'}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>

          <div>
            <Label>{t('settings.profile.gov')}</Label>
            <select value={prof.governorate} onChange={e => setProf(p => ({ ...p, governorate: e.target.value }))} style={inp()} dir={isRTL ? 'rtl' : 'ltr'}>
              <option value="">{t('settings.profile.govSelect')}</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {role === 'admin' && (
            <div>
              <Label>{t('settings.profile.email')}</Label>
              <input type="email" value={prof.email} readOnly style={inp({ background: '#F9FAFB', color: C.muted, cursor: 'not-allowed' })} />
            </div>
          )}
        </div>
      </div>

      {/* ── Seller fields ── */}
      {role === 'seller' && (
        <div>
          <SH>{t('settings.profile.farmData')}</SH>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <Label>{t('settings.profile.farmName')}</Label>
              <input type="text" value={prof.farmName} onChange={e => setProf(p => ({ ...p, farmName: e.target.value }))}
                placeholder={t('settings.profile.farmName')} style={inp()} dir={isRTL ? 'rtl' : 'ltr'}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>{t('settings.profile.farmPhone')}</Label>
              <input type="tel" value={prof.farmPhone} onChange={e => setProf(p => ({ ...p, farmPhone: e.target.value }))}
                placeholder="01X XXXX XXXX" maxLength={11} inputMode="numeric" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>{t('reg.personalPhone')}</Label>
              <input type="tel" value={prof.personalPhone} onChange={e => setProf(p => ({ ...p, personalPhone: e.target.value }))}
                placeholder="01X XXXX XXXX" maxLength={11} inputMode="numeric" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>{t('reg.emailOptional')}</Label>
              <input type="email" value={prof.email} onChange={e => setProf(p => ({ ...p, email: e.target.value }))}
                placeholder="example@email.com" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.experience')}</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[['<1', t('reg.expLt1')],['1-3', t('reg.exp13')],['3-5', t('reg.exp35')],['5-10', t('reg.exp510')],['>10', t('reg.expGt10')]].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setProf(p => ({ ...p, experience: val }))}
                    style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${prof.experience === val ? C.green : C.border}`, background: prof.experience === val ? C.greenLt : C.white, color: prof.experience === val ? C.green : C.text, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.animalTypes')}</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.keys(ANIMAL_TYPES_AR).map(type => {
                  const sel = prof.animalTypes.includes(type);
                  return (
                    <button key={type} type="button" onClick={() => toggleAnimalType(type)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : C.white, color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                      {t(`herd.type.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.bio')}</Label>
              <textarea value={prof.bio} onChange={e => setProf(p => ({ ...p, bio: e.target.value }))}
                placeholder={t('settings.profile.bioPlaceholder')} rows={2} dir={isRTL ? 'rtl' : 'ltr'}
                style={{ ...inp(), resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.farmDesc')}</Label>
              <textarea value={prof.farmDescription} onChange={e => setProf(p => ({ ...p, farmDescription: e.target.value }))}
                placeholder={t('settings.profile.farmDescPlaceholder')} rows={4} dir={isRTL ? 'rtl' : 'ltr'}
                style={{ ...inp(), resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>

            {/* Banner image uploader */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.banner')}</Label>
              {bannerPreview && (
                <div style={{ marginBottom: 10, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${C.border}`, height: 120, position: 'relative' }}>
                  <img src={bannerPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button"
                    onClick={() => { setBannerPreview(null); setBannerFile(null); }}
                    style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
                    {t('settings.profile.removeBanner')}
                  </button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1.5px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: C.muted }}>
                <span style={{ fontSize: 20 }}>🖼</span>
                {bannerFile ? bannerFile.name : t('settings.profile.bannerHint')}
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
              <Label>{t('settings.profile.location')}</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                {t('settings.profile.locationHint')}
              </div>
              <LocationPicker
                value={farmLocation}
                onChange={loc => setFarmLocation(loc)}
                label={t('settings.profile.location')}
                height={300}
              />
              {farmLocation?.lat != null && (
                <button type="button" onClick={() => setFarmLocation(null)}
                  style={{ marginTop: 8, padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✕ {t('settings.profile.removeLocation')}
                </button>
              )}
            </div>

            {/* Farm certificates */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>{t('settings.profile.certificates')}</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                {t('settings.profile.certificatesHint')}
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
              <Label>{t('settings.profile.workHours')}</Label>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                {t('settings.profile.workHoursHint')}
              </div>
              {/* Day toggles — keys stay in Arabic for backend compatibility */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[['الأحد','settings.day.sun'],['الاثنين','settings.day.mon'],['الثلاثاء','settings.day.tue'],['الأربعاء','settings.day.wed'],['الخميس','settings.day.thu'],['الجمعة','settings.day.fri'],['السبت','settings.day.sat']].map(([arKey, labelKey]) => {
                  const sel = workingHours.days.includes(arKey);
                  return (
                    <button key={arKey} type="button" onClick={() => toggleWorkingDay(arKey)}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : C.white, color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sel ? '✓' : '+'} {t(labelKey)}
                    </button>
                  );
                })}
              </div>
              {/* Time range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{t('settings.time.from')}</div>
                  <input type="time" value={workingHours.from}
                    onChange={e => setWorkingHours(prev => ({ ...prev, from: e.target.value }))}
                    style={{ ...inp({ width: 'auto', paddingLeft: '10px', paddingRight: '10px' }) }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border} />
                </div>
                <div style={{ fontSize: '13px', color: C.muted, marginTop: '22px' }}>—</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{t('common.to')}</div>
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
          <SH>{t('settings.profile.contactData')}</SH>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <Label>{t('settings.profile.phone')}</Label>
              <input type="tel" value={prof.phone} onChange={e => setProf(p => ({ ...p, phone: e.target.value }))}
                placeholder="01X XXXX XXXX" maxLength={11} inputMode="numeric" style={inp()} dir="ltr"
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <Label>{t('settings.profile.email')}</Label>
              <input type="email" value={prof.email} readOnly style={inp({ background: '#F9FAFB', color: C.muted, cursor: 'default' })} dir="ltr" />
              <div style={{ fontSize: '11px', color: C.midMuted, marginTop: '4px' }}>{t('settings.profile.emailReadOnly')}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <SaveBtn onClick={saveProfile} loading={savingProfile} label={t('settings.profile.save')} loadingLabel={t('settings.saving')} />
      </div>
    </div>
  );

  // ══ SECTION: Security ════════════════════════════════════════════════════════
  const renderSecurity = () => {
    const pwMatch = passwords.next === passwords.confirm;
    const canSave = passwords.current && passwords.next.length >= 8 && pwMatch;
    const pwStrength = passwords.next.length === 0 ? null : passwords.next.length < 8 ? 'weak' : passwords.next.length < 12 ? 'medium' : 'strong';
    const strengthColors = { weak: '#DC2626', medium: '#D97706', strong: '#16A34A' };
    const strengthLabelKeys = { weak: 'settings.pwd.weak', medium: 'settings.pwd.medium', strong: 'settings.pwd.strong' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Change password */}
        <div style={{ padding: '22px', background: C.white, borderRadius: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: C.text, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 {t('settings.pwd.title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { id: 'current', labelKey: 'settings.pwd.current', ac: 'current-password' },
              { id: 'next',    labelKey: 'settings.pwd.new',     ac: 'new-password'     },
              { id: 'confirm', labelKey: 'settings.pwd.confirm', ac: 'new-password'     },
            ].map(({ id, labelKey, ac }) => (
              <div key={id}>
                <Label>{t(labelKey)}</Label>
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
                      {t(strengthLabelKeys[pwStrength])}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {passwords.confirm.length > 0 && !pwMatch && (
              <div style={{ fontSize: '12px', color: C.danger, display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ {t('reg.pwdNoMatch')}</div>
            )}
            {passwords.next.length >= 8 && pwMatch && passwords.confirm.length > 0 && (
              <div style={{ fontSize: '12px', color: C.green, display: 'flex', alignItems: 'center', gap: '6px' }}>✓ {t('reg.pwdMatch')}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <SaveBtn onClick={savePassword} loading={savingPwd} label={t('settings.pwd.save')} loadingLabel={t('settings.saving')} disabled={!canSave} />
            </div>
          </div>
        </div>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 18px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.greenBd}` }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🛡</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '3px' }}>{t('settings.pwd.secureTitle')}</div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.65 }}>
              {t('settings.pwd.secureNote')}
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ padding: '18px 20px', background: C.dangerBg, borderRadius: '14px', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: C.danger, marginBottom: '8px' }}>⚠️ {t('settings.pwd.dangerZone')}</div>
          <div style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.65, marginBottom: '14px' }}>
            {t('settings.pwd.deleteAccountWarn')}
          </div>
          <button type="button"
            style={{ padding: '9px 20px', background: 'transparent', color: C.danger, border: `1.5px solid ${C.danger}`, borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑 {t('settings.pwd.deleteAccount')}
          </button>
        </div>
      </div>
    );
  };

  // ══ SECTION: Notifications ═══════════════════════════════════════════════════
  const renderNotifications = () => {
    const TOGGLES = [
      { key: 'orders',    icon: '📦', label: 'تحديثات الطلبات',        sub: 'تأكيد الطلب، الإلغاء، واكتمال التسليم'      },
      { key: 'reminders', icon: '💉', label: 'تذكيرات القطيع',          sub: 'مواعيد التطعيم، الوزن، الولادة، والمتابعات الطبية' },
      { key: 'dairy',     icon: '🥛', label: 'تنبيهات منتجات الألبان',  sub: 'تحذير عند اقتراب منتج من تاريخ انتهاء صلاحيته' },
      { key: 'messages',  icon: '💬', label: 'الرسائل الجديدة',          sub: 'إشعار عند وصول رسالة جديدة من مشترٍ أو بائع'  },
    ];

    const toggle = (key) => {
      setNotifs(p => ({ ...p, [key]: !p[key] }));
      setNotifsDirty(true);
    };

    const savePrefs = async () => {
      setSavingNotifs(true);
      try {
        await updateNotifPrefs(notifs);
        setNotifsDirty(false);
        toast.success('تم حفظ تفضيلات الإشعارات');
      } catch {
        toast.error('تعذّر حفظ التفضيلات. حاول مرة أخرى.');
      } finally {
        setSavingNotifs(false);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} dir={isRTL ? 'rtl' : 'ltr'}>
        {!notifsLoaded && (
          <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>جارٍ التحميل…</div>
        )}
        {TOGGLES.map(({ key, icon, label, sub }) => (
          <div key={key}
            onClick={() => toggle(key)}
            role="switch" aria-checked={notifs[key]} tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle(key)}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: notifs[key] ? C.greenLt : C.white, borderRadius: '12px', border: `1px solid ${notifs[key] ? C.greenBd : C.border}`, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>{icon}</span>
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
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn
            onClick={savePrefs}
            loading={savingNotifs}
            disabled={!notifsDirty}
            label="حفظ التفضيلات"
            loadingLabel="جارٍ الحفظ…"
          />
        </div>
      </div>
    );
  };

  // ══ SECTION: Appearance ═══════════════════════════════════════════════════════
  const renderAppearance = () => (
    <div>
      <SH>{t('settings.sec.appearance')}</SH>
      <ThemePanel />
      <div style={{ marginTop: '20px', padding: '10px 14px', background: C.greenLt, borderRadius: '10px', border: `1px solid ${C.greenBd}`, fontSize: '12px', color: C.green, fontWeight: '600' }}>
        ✓ {t('settings.appearance.autoSave')}
      </div>
    </div>
  );

  // ══ SECTION: Language & Region ═══════════════════════════════════════════════
  const renderLanguage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir={isRTL ? 'rtl' : 'ltr'}>

      <div>
        <SH>{t('settings.lang.title')}</SH>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[['ar', t('settings.lang.arabic'), '🇪🇬'], ['en', t('settings.lang.english'), '🇬🇧']].map(([val, lbl, flag]) => (
            <button key={val} type="button" onClick={() => setLang(val)}
              style={{ flex: 1, padding: '16px 10px', border: `2px solid ${lang === val ? C.green : C.border}`, borderRadius: '12px', background: lang === val ? C.greenLt : C.white, cursor: 'pointer', fontSize: '14px', fontWeight: lang === val ? '700' : '500', color: lang === val ? C.green : C.text, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '26px' }}>{flag}</span>
              {lbl}
              {lang === val && <span style={{ fontSize: '10px', fontWeight: '700', color: C.green }}>✓ {t('settings.lang.selected')}</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SH>{t('settings.lang.currency')}</SH>
        <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: C.muted, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🪙</span>
          <span>{t('settings.lang.egp')}</span>
          <span style={{ marginRight: 'auto', fontSize: '11px', fontWeight: '400', color: C.midMuted }}>{t('settings.lang.fixed')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <SaveBtn onClick={() => { setGlobalLang(lang); toast.success(t('settings.lang.saved')); }} label={t('common.save')} loadingLabel={t('settings.saving')} />
      </div>
    </div>
  );

  // ══ SECTION: Payment Methods ══════════════════════════════════════════════════
  const renderPayment = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {[
        { icon: '💵', labelKey: 'settings.payment.cod',      subKey: 'settings.payment.codSub',      active: true,  color: C.green,     bg: C.greenLt, border: C.greenBd },
        { icon: '📱', labelKey: 'settings.payment.instapay', subKey: 'settings.payment.instapaySub', active: true,  color: '#7C3AED',   bg: '#F5F3FF',  border: '#DDD6FE' },
        { icon: '🏦', labelKey: 'settings.payment.deposit',  subKey: 'settings.payment.depositSub',  active: false, color: C.muted,     bg: '#F9FAFB',  border: C.border },
        { icon: '💳', labelKey: 'settings.payment.card',     subKey: 'settings.payment.cardSub',     active: false, soon: true, color: C.midMuted, bg: '#F9FAFB', border: C.border },
      ].map(({ icon, labelKey, subKey, active, soon, color, bg, border }) => (
        <div key={labelKey} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', background: bg, borderRadius: '14px', border: `1px solid ${border}` }}>
          <span style={{ fontSize: '24px', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>{t(labelKey)}</div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>{t(subKey)}</div>
          </div>
          {active && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: color, background: bg, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>✓ {t('settings.payment.active')}</span>
          )}
          {soon && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.amber, background: C.amberBg, padding: '3px 10px', borderRadius: '20px', border: '1px solid #FDE68A', flexShrink: 0 }}>{t('settings.payment.soon')}</span>
          )}
        </div>
      ))}
      <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '12px', color: '#92400E', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, fontSize: '14px' }}>🛡</span>
        <span>{t('settings.payment.protected')}</span>
      </div>
    </div>
  );

  // ══ SECTION: Help & Support ═══════════════════════════════════════════════════
  const renderSupport = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
        {[
          { icon: '💬', labelKey: 'settings.support.whatsapp', sub: t('settings.support.whatsappSub'), href: 'https://wa.me/201000000000', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
          { icon: '📧', labelKey: 'settings.support.email',    sub: 'support@farmflow.com.eg',          href: 'mailto:support@farmflow.com.eg', color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
        ].map(({ icon, labelKey, sub, href, color, bg, border }) => (
          <a key={labelKey} href={href} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: bg, borderRadius: '12px', border: `1px solid ${border}`, textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color }}>{t(labelKey)}</div>
              <div style={{ fontSize: '11px', color, opacity: 0.75, marginTop: '2px' }}>{sub}</div>
            </div>
          </a>
        ))}
      </div>

      <SH>{t('settings.support.faq')}</SH>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {FAQ_KEY_PAIRS.map(([qKey, aKey], i) => (
          <div key={i} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', padding: '13px 16px', background: openFaq === i ? C.greenLt : C.white, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontFamily: 'inherit', transition: 'background 0.15s' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: C.text, textAlign: isRTL ? 'right' : 'left', flex: 1, lineHeight: 1.4 }}>{t(qKey)}</span>
              <span aria-hidden="true" style={{ fontSize: '12px', color: C.muted, flexShrink: 0, display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: '12px 16px', background: '#FAFDF9', fontSize: '12px', color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}` }}>
                {t(aKey)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', background: C.greenLt, borderRadius: '10px', border: `1px solid ${C.greenBd}`, fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🌾</span>
        <span>{t('settings.support.hours')}</span>
      </div>
    </div>
  );

  // ══ SECTION: Logout ══════════════════════════════════════════════════════════
  const renderLogout = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center', gap: '16px' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <span style={{ fontSize: '54px', lineHeight: 1 }}>🚪</span>
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>{t('settings.sec.logout')}</h3>
        <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65, maxWidth: '340px', margin: '0 auto' }}>
          {t('settings.logout.confirm')}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button type="button" onClick={() => { setActive('profile'); if (isMobile) setShowContent(false); }}
          style={{ padding: '12px 24px', background: '#F3F4F6', color: C.text, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('common.cancel')}
        </button>
        <button type="button" onClick={handleLogout}
          style={{ padding: '12px 28px', background: C.danger, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
          onMouseLeave={e => e.currentTarget.style.background = C.danger}>
          🚪 {t('auth.logout')}
        </button>
      </div>
    </div>
  );

  // ── Section → renderer map ───────────────────────────────────────────────────
  const RENDERERS = {
    profile:  renderProfile,
    security: renderSecurity,
    notifs:      renderNotifications,
    appearance:  renderAppearance,
    language:    renderLanguage,
    payment:  renderPayment,
    support:  renderSupport,
    logout:   renderLogout,
  };

  const activeSection = SECTIONS.find(s => s.id === active);

  // ── Nav sidebar ───────────────────────────────────────────────────────────────
  const renderNav = () => (
    <div>
      {/* User mini card */}
      <div style={{ padding: '14px', marginBottom: '8px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.greenBd}`, display: 'flex', alignItems: 'center', gap: '10px' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarColor(user?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
          {initials(user?.name || '')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || '—'}</div>
          <div style={{ fontSize: '11px', color: roleMeta.color, fontWeight: '600' }}>{roleMeta.icon} {t(roleMeta.labelKey)}</div>
        </div>
      </div>

      <nav aria-label={t('settings.title')}>
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
                <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? '700' : '600', color: sec.danger ? C.danger : (isActive ? C.green : C.text), textAlign: isRTL ? 'right' : 'left' }}>
                  {t(sec.labelKey)}
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
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        *:focus-visible { outline: 2px solid #16A34A; outline-offset: 2px; border-radius: 4px; }
        select { appearance: auto; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
      `}</style>

      {/* Page heading */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          ⚙️ {t('settings.title')}
        </h1>
        <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
          {t('settings.subtitle')}
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
                <button type="button" onClick={() => setShowContent(false)} aria-label={t('common.back')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '20px', padding: '4px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <span aria-hidden="true" style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>{activeSection?.icon}</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: activeSection?.danger ? C.danger : C.text, margin: 0, lineHeight: 1.2 }}>
                {activeSection ? t(activeSection.labelKey) : ''}
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
