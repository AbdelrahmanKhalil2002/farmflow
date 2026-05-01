import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getListingById, updateListing } from '../../services/listingService';
import { getImageUrl } from '../../utils/format';

// ─── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#FEFAF5',
  card:      '#FFFFFF',
  green:     '#3A7D44',
  greenDark: '#2D6235',
  greenBg:   '#DCFCE7',
  greenText: '#166534',
  amber:     '#D97706',
  amberBg:   '#FEF3C7',
  amberText: '#92400E',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  redText:   '#B91C1C',
  tan:       '#C49A6C',
  border:    '#E8D5C0',
  text:      '#2C1810',
  textMuted: '#8B6B5A',
  shadow:    '0 1px 3px rgba(44,24,16,0.08), 0 4px 12px rgba(44,24,16,0.06)',
  shadowMd:  '0 4px 20px rgba(44,24,16,0.12)',
};

// ─── Static data ────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'المعلومات',  icon: '🐾' },
  { n: 2, label: 'المواصفات',  icon: '⚖️'  },
  { n: 3, label: 'الصور',      icon: '📷' },
  { n: 4, label: 'السعر',      icon: '💰' },
];

const TYPES      = ['cattle', 'sheep', 'goat', 'camel', 'horse', 'poultry', 'other'];
const TYPE_EMOJI = { cattle: '🐄', sheep: '🐑', goat: '🐐', camel: '🐪', horse: '🐎', poultry: '🐔', other: '🐾' };
const TYPE_AR    = { cattle: 'ماشية', sheep: 'أغنام', goat: 'ماعز', camel: 'إبل', horse: 'خيول', poultry: 'دواجن', other: 'أخرى' };

const BREEDS = {
  cattle:  ['فريزيان', 'أنغوس', 'هيرفورد', 'براهمان', 'سيمنتال', 'هولشتاين', 'ليموزين', 'واجو', 'نجدي'],
  sheep:   ['نجدي', 'عواسي', 'نعيمي', 'ميرينو', 'سفولك', 'دورسيت', 'بربرة', 'رومني'],
  goat:    ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين', 'جبلي'],
  camel:   ['دروميدار', 'عربي سباق', 'مجاهيم', 'حُمُر', 'وضحاء', 'صفراء'],
  horse:   ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان'],
  poultry: ['بلدي', 'روس 308', 'كوب 500', 'هبارد', 'فيومي'],
  other:   [],
};

const COLORS = ['بني', 'أسود', 'أبيض', 'رمادي', 'كستنائي', 'منقط', 'مختلط', 'أشهب'];

const HEALTH_OPTS = [
  { key: 'healthy',    emoji: '💚', label: 'صحي',           sub: 'حالة صحية جيدة بشكل عام'       },
  { key: 'vaccinated', emoji: '💉', label: 'معفّى',          sub: 'تم إعطاء اللقاحات الأساسية'    },
  { key: 'certified',  emoji: '📋', label: 'معتمد بيطرياً', sub: 'يحمل شهادة بيطرية رسمية'      },
];

const TRAIT_OPTS = [
  { key: 'dairy',    label: '🥛 ألبان'           },
  { key: 'meat',     label: '🥩 جودة اللحم'      },
  { key: 'breeding', label: '🌱 تربية ونسل'      },
  { key: 'show',     label: '🏆 عروض ومعارض'    },
  { key: 'working',  label: '💪 حيوان عمل'       },
];

const TIPS = [
  'اذكر التاريخ الصحي والتطعيمات والشهادات البيطرية.',
  'صِف المزاج: هادئ، نشيط، سهل التعامل؟',
  'أضف معلومات عن التغذية والنظام الغذائي الحالي.',
  'أبرز الصفات الخاصة أو الجوائز أو الأنساب.',
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
const parseApiError = (err) => {
  const d = err?.response?.data;
  if (!d) return 'Network error. Please try again.';
  if (d.errors?.length) return d.errors[0].msg;
  return d.message || 'Something went wrong.';
};

const toMonths = (val, unit) => {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) return null;
  return unit === 'years' ? Math.round(n * 12) : Math.round(n);
};

const toKg = (val, unit) => {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) return null;
  return unit === 'lbs' ? parseFloat((n * 0.453592).toFixed(2)) : n;
};

const buildDescription = (form) => {
  const meta = [];
  if (form.gender)            meta.push(`Gender: ${form.gender === 'male' ? 'Male ♂' : form.gender === 'female' ? 'Female ♀' : 'Other ⚥'}`);
  const colorStr = form.color === 'custom' ? form.colorCustom : form.color;
  if (colorStr)               meta.push(`Color: ${colorStr}`);
  if (form.health) {
    const h = HEALTH_OPTS.find(x => x.key === form.health);
    if (h) meta.push(`Health: ${h.label}`);
  }
  if (form.traits.length)     meta.push(`Traits: ${form.traits.join(', ')}`);
  if (form.deliveryType !== 'none') meta.push(`Delivery: ${form.deliveryType}${form.deliveryCost ? ` (${form.deliveryCost} ج.م)` : ''}`);
  const header = meta.length ? `[${meta.join(' | ')}]\n\n` : '';
  return `${header}${form.description}`.trim();
};

// Parse the structured metadata prefix back into form fields
const parseMeta = (desc = '') => {
  const result = {
    gender: '', color: '', colorCustom: '', health: '', traits: [],
    deliveryAvailable: false, deliveryCost: '', description: desc,
  };
  const match = desc.match(/^\[([^\]]+)\]\s*/);
  if (!match) return result;

  const metaStr = match[1];
  result.description = desc.slice(match[0].length);

  const get = (key) => {
    const m = metaStr.match(new RegExp(`${key}:\\s*([^|\\]]+)`));
    return m ? m[1].trim() : '';
  };

  const genderStr = get('Gender');
  result.gender = genderStr.includes('Male') ? 'male' : genderStr.includes('Female') ? 'female' : genderStr.includes('Other') ? 'other' : '';

  const colorStr = get('Color');
  result.color = COLORS.includes(colorStr) ? colorStr : colorStr ? 'custom' : '';
  result.colorCustom = result.color === 'custom' ? colorStr : '';

  const healthStr = get('Health');
  const healthObj = HEALTH_OPTS.find(h => h.label === healthStr);
  result.health = healthObj ? healthObj.key : '';

  const traitsStr = get('Traits');
  result.traits = traitsStr ? traitsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const deliveryStr = get('Delivery');
  result.deliveryAvailable = deliveryStr.includes('Available');
  const costMatch = deliveryStr.match(/\((\d+)/);
  result.deliveryCost = costMatch ? costMatch[1] : '';

  return result;
};

// ─── UI primitives ──────────────────────────────────────────────────────────────
const Lbl = ({ children, req }) => (
  <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '7px' }}>
    {children}{req && <span style={{ color: C.red, marginLeft: '3px' }}>*</span>}
  </div>
);

const ErrMsg = ({ msg }) => msg
  ? <div style={{ fontSize: '12px', color: C.redText, marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}><span aria-hidden="true">⚠</span>{msg}</div>
  : null;

const FocusInput = ({ style = {}, ...rest }) => {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...rest}
      onFocus={e => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={e => { setFocus(false); rest.onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '11px 13px',
        borderRadius: '10px', border: `1.5px solid ${focus ? C.green : C.border}`,
        background: '#fff', fontSize: '14px', color: C.text,
        transition: 'border-color 0.15s', fontFamily: 'inherit', ...style,
      }}
    />
  );
};

const UnitPill = ({ value, onChange, opts, labels }) => (
  <div role="group" style={{ display: 'flex', border: `1.5px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
    {opts.map((o, i) => (
      <button key={o} type="button" onClick={() => onChange(o)}
        aria-pressed={value === o}
        style={{ padding: '0 14px', height: '44px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s', background: value === o ? C.green : '#fff', color: value === o ? '#fff' : C.textMuted }}>
        {labels ? labels[i] : o}
      </button>
    ))}
  </div>
);

const Toggle = ({ on, onToggle, label, sub }) => (
  <div role="button" tabIndex={0} aria-pressed={on}
    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: C.card, border: `1.5px solid ${on ? C.green : C.border}`, borderRadius: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
    onClick={onToggle}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: '700', fontSize: '14px', color: C.text }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{sub}</div>}
    </div>
    <div aria-hidden="true" style={{ width: '44px', height: '24px', borderRadius: '12px', background: on ? C.green : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>{children}</h3>
);

// ─── Main component ─────────────────────────────────────────────────────────────
const SellerEditListing = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');
  const [step,     setStep]     = useState(1);
  const [form,     setForm]     = useState({
    type: 'sheep', breed: '', ageValue: '', ageUnit: 'months', gender: '',
    weightValue: '', weightUnit: 'kg', color: '', colorCustom: '',
    health: '', traits: [],
    pricePerKg: '', location: '', deliveryType: 'none', deliveryCost: '', description: '',
    eidAvailable: false, slaughterService: false, slaughterCost: '',
    depositRequired: false, depositPercentage: '',
    qurbaniEnabled: false,
    qurbaniShares: {
      seventh: { enabled: false, pricePerShare: '', totalShares: '' },
      quarter:  { enabled: false, pricePerShare: '', totalShares: '' },
      half:     { enabled: false, pricePerShare: '', totalShares: '' },
    },
  });

  // Server-side images
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages,  setRemovedImages]  = useState(new Set());

  // New photos to upload
  const [newPhotoFiles,    setNewPhotoFiles]    = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [dragOver,         setDragOver]         = useState(false);

  const [errors,     setErrors]     = useState({});
  const [submitErr,  setSubmitErr]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [breedOpen,  setBreedOpen]  = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const photoInputRef = useRef(null);
  const breedRef      = useRef(null);

  // ── Load listing ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getListingById(id);
        const l   = res.data;
        const meta = parseMeta(l.description || '');
        setForm({
          type:             l.type || 'sheep',
          breed:            l.breed || '',
          ageValue:         String(l.age ?? ''),
          ageUnit:          'months',
          gender:           meta.gender,
          weightValue:      String(l.weight ?? ''),
          weightUnit:       'kg',
          color:            meta.color,
          colorCustom:      meta.colorCustom,
          health:           meta.health,
          traits:           meta.traits,
          pricePerKg:       String(l.pricePerKg ?? ''),
          location:         l.location || '',
          deliveryType:     l.deliveryType || 'none',
          deliveryCost:     String(l.deliveryCost ?? ''),
          description:      meta.description,
          eidAvailable:       l.eidAvailable || false,
          slaughterService:   l.slaughterService || false,
          slaughterCost:      String(l.slaughterCost ?? ''),
          depositRequired:    l.depositRequired || false,
          depositPercentage:  String(l.depositPercentage ?? ''),
          qurbaniEnabled:     (l.qurbaniShares?.length > 0) || false,
          qurbaniShares: (() => {
            const base = { seventh: { enabled: false, pricePerShare: '', totalShares: '' }, quarter: { enabled: false, pricePerShare: '', totalShares: '' }, half: { enabled: false, pricePerShare: '', totalShares: '' } };
            (l.qurbaniShares || []).forEach(s => {
              if (base[s.shareType]) base[s.shareType] = { enabled: true, pricePerShare: String(s.pricePerShare ?? ''), totalShares: String(s.totalShares ?? '') };
            });
            return base;
          })(),
        });
        setExistingImages(l.images || []);
      } catch {
        setLoadErr('Listing not found or you do not have permission to edit it.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Outside-click closes breed dropdown ───────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (breedRef.current && !breedRef.current.contains(e.target)) setBreedOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── New photo previews ────────────────────────────────────────────────────────
  useEffect(() => {
    const urls = newPhotoFiles.map(f => URL.createObjectURL(f));
    setNewPhotoPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [newPhotoFiles]);

  // ── Setters ───────────────────────────────────────────────────────────────────
  const set   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setFs = (obj)  => setForm(p => ({ ...p, ...obj }));
  const toggleTrait = (key) => set('traits',
    form.traits.includes(key) ? form.traits.filter(t => t !== key) : [...form.traits, key]
  );

  // ── Image management ──────────────────────────────────────────────────────────
  const keepImages   = existingImages.filter(img => !removedImages.has(img));
  const totalSlots   = keepImages.length + newPhotoFiles.length;

  const toggleRemove = (img) => {
    setRemovedImages(prev => {
      const next = new Set(prev);
      next.has(img) ? next.delete(img) : next.add(img);
      return next;
    });
  };

  const addNewPhotos = (files) => {
    const imgs  = files.filter(f => f.type.startsWith('image/'));
    const slots = 5 - totalSlots;
    if (slots <= 0) return;
    setNewPhotoFiles(prev => [...prev, ...imgs.slice(0, slots)]);
  };

  const removeNewPhoto = (i) => setNewPhotoFiles(prev => prev.filter((_, j) => j !== i));

  // ── Breed suggestions ─────────────────────────────────────────────────────────
  const breedSuggestions = form.breed.length > 0
    ? (BREEDS[form.type] || []).filter(b => b.toLowerCase().includes(form.breed.toLowerCase()))
    : [];

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = (n) => {
    const e = {};
    if (n === 1) {
      if (!form.ageValue) e.ageValue = 'أدخل العمر';
      if (!form.gender)   e.gender   = 'اختر الجنس';
    }
    if (n === 2) {
      if (!form.weightValue) e.weightValue = 'أدخل الوزن';
      if (!form.health)      e.health      = 'اختر الحالة الصحية';
    }
    if (n === 4) {
      if (!form.pricePerKg) e.pricePerKg = 'أدخل السعر لكل كجم';
      if (!form.location) e.location = 'أدخل موقع الاستلام';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate(step)) return;
    setStep(s => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate(4)) return;
    setSubmitErr('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type',        form.type);
      if (form.breed) fd.append('breed', form.breed);
      fd.append('age',         toMonths(form.ageValue, form.ageUnit));
      fd.append('weight',      toKg(form.weightValue, form.weightUnit));
      fd.append('pricePerKg',  form.pricePerKg);
      const weightKg = toKg(form.weightValue, form.weightUnit);
      if (weightKg && form.pricePerKg) fd.append('price', (parseFloat(form.pricePerKg) * weightKg).toFixed(2));
      fd.append('deliveryType', form.deliveryType);
      if (form.deliveryType !== 'none' && form.deliveryCost) fd.append('deliveryCost', form.deliveryCost);
      fd.append('location',    form.location);
      fd.append('description', buildDescription(form));
      fd.append('eidAvailable',     form.eidAvailable);
      fd.append('slaughterService', form.slaughterService);
      if (form.slaughterService && form.slaughterCost) fd.append('slaughterCost', form.slaughterCost);
      fd.append('depositRequired', form.depositRequired);
      if (form.depositRequired && form.depositPercentage) fd.append('depositPercentage', form.depositPercentage);
      if (form.qurbaniEnabled) {
        const shares = ['seventh', 'quarter', 'half']
          .filter(k => form.qurbaniShares[k].enabled && form.qurbaniShares[k].pricePerShare && form.qurbaniShares[k].totalShares)
          .map(k => ({ shareType: k, pricePerShare: Number(form.qurbaniShares[k].pricePerShare), totalShares: Number(form.qurbaniShares[k].totalShares) }));
        fd.append('qurbaniShares', JSON.stringify(shares));
      } else {
        fd.append('qurbaniShares', JSON.stringify([]));
      }
      fd.append('keepImages',  JSON.stringify(keepImages));
      newPhotoFiles.forEach(f => fd.append('images', f));
      await updateListing(id, fd);
      setSuccess(true);
    } catch (err) {
      setSubmitErr(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>🐾</div>
          <div style={{ fontSize: '15px', color: C.textMuted, fontWeight: '600' }}>جاري تحميل الإعلان…</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (loadErr) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '380px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: C.text }}>لا يمكن تعديل هذا الإعلان</h2>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: C.textMuted, lineHeight: 1.6 }}>{loadErr}</p>
          <button type="button" onClick={() => navigate('/seller/listings')}
            style={{ padding: '11px 22px', borderRadius: '10px', background: C.green, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            ← العودة إلى الإعلانات
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>✅</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '800', color: C.text }}>تم تحديث الإعلان!</h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: C.textMuted, lineHeight: 1.65 }}>
            تم حفظ التعديلات. إذا كان الإعلان معلقاً أو مرفوضاً، فقد أُعيد إرساله للمراجعة.
          </p>
          <button type="button" onClick={() => navigate('/seller/listings')}
            style={{ padding: '12px 26px', borderRadius: '10px', background: C.green, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            ← عرض إعلاناتي
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Step 1 ── Basic Info
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionTitle>نوع المواشي والمعلومات الأساسية</SectionTitle>

      {/* نوع المواشي */}
      <div>
        <Lbl req>نوع المواشي</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {TYPES.map(t => {
            const active = form.type === t;
            return (
              <button key={t} type="button" onClick={() => setFs({ type: t, breed: '' })}
                style={{ padding: '14px 8px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.tan; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ fontSize: '26px', marginBottom: '5px' }}>{TYPE_EMOJI[t]}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{TYPE_AR[t]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* السلالة */}
      <div>
        <Lbl>السلالة <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اختياري)</span></Lbl>
        <div style={{ position: 'relative' }} ref={breedRef}>
          <FocusInput
            type="text"
            role="combobox"
            aria-label="السلالة"
            aria-autocomplete="list"
            aria-expanded={breedOpen && breedSuggestions.length > 0}
            aria-controls="breed-suggestions"
            value={form.breed}
            onChange={e => { set('breed', e.target.value); setBreedOpen(true); }}
            onFocus={() => setBreedOpen(true)}
            placeholder={`مثال: ${(BREEDS[form.type] || ['—'])[0]}`}
            dir="rtl"
          />
          {breedOpen && breedSuggestions.length > 0 && (
            <ul id="breed-suggestions" role="listbox" aria-label="اقتراحات السلالة"
              style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: '10px', boxShadow: C.shadowMd, zIndex: 200, overflow: 'hidden', listStyle: 'none', margin: 0, padding: 0 }}>
              {breedSuggestions.map(b => (
                <li key={b} role="option" aria-selected="false"
                  onMouseDown={() => { set('breed', b); setBreedOpen(false); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', color: C.text, borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s', direction: 'rtl' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* العمر */}
      <div>
        <Lbl req>العمر</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <FocusInput type="number" min="0" step="0.5" value={form.ageValue} onChange={e => set('ageValue', e.target.value)} placeholder="مثال: 18" />
          </div>
          <UnitPill value={form.ageUnit} onChange={v => set('ageUnit', v)} opts={['months', 'years']} labels={['أشهر', 'سنوات']} />
        </div>
        <ErrMsg msg={errors.ageValue} />
        {form.ageValue && form.ageUnit === 'years' && (
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>= {toMonths(form.ageValue, 'years')} شهرًا</div>
        )}
      </div>

      {/* الجنس */}
      <div>
        <Lbl req>الجنس</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[{ key: 'male', emoji: '♂', label: 'ذكر' }, { key: 'female', emoji: '♀', label: 'أنثى' }, { key: 'other', emoji: '⚥', label: 'آخر' }].map(g => {
            const active = form.gender === g.key;
            return (
              <button key={g.key} type="button" onClick={() => set('gender', g.key)}
                style={{ flex: 1, padding: '14px 12px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', marginBottom: '5px', color: active ? C.greenText : C.textMuted }}>{g.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: active ? C.greenText : C.text }}>{g.label}</div>
              </button>
            );
          })}
        </div>
        <ErrMsg msg={errors.gender} />
      </div>
    </div>
  );

  // Step 2 ── Physical Details
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionTitle>المواصفات الجسدية والحالة الصحية</SectionTitle>

      {/* الوزن */}
      <div>
        <Lbl req>الوزن</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <FocusInput type="number" min="0" step="0.1" value={form.weightValue} onChange={e => set('weightValue', e.target.value)} placeholder="مثال: 45" />
          </div>
          <UnitPill value={form.weightUnit} onChange={v => set('weightUnit', v)} opts={['kg', 'lbs']} labels={['كجم', 'رطل']} />
        </div>
        <ErrMsg msg={errors.weightValue} />
        {form.weightValue && form.weightUnit === 'lbs' && (
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>= {toKg(form.weightValue, 'lbs')} كجم</div>
        )}
      </div>

      {/* اللون / العلامات المميزة */}
      <div>
        <Lbl>اللون / العلامات المميزة <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اختياري)</span></Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          {COLORS.map(c => {
            const active = form.color === c;
            return (
              <button key={c} type="button" onClick={() => set('color', active ? '' : c)}
                style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, color: active ? C.greenText : C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                {c}
              </button>
            );
          })}
          <button type="button" onClick={() => set('color', form.color === 'custom' ? '' : 'custom')}
            style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${form.color === 'custom' ? C.green : C.border}`, background: form.color === 'custom' ? C.greenBg : C.card, color: form.color === 'custom' ? C.greenText : C.textMuted, fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
            ✏️ مخصص
          </button>
        </div>
        {form.color === 'custom' && (
          <div style={{ marginTop: '9px' }}>
            <FocusInput type="text" value={form.colorCustom} onChange={e => set('colorCustom', e.target.value)} placeholder="صِف اللون والعلامات والأنماط…" dir="rtl" />
          </div>
        )}
      </div>

      {/* حالة الصحة */}
      <div>
        <Lbl req>حالة الصحة</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {HEALTH_OPTS.map(h => {
            const active = form.health === h.key;
            return (
              <button key={h.key} type="button" onClick={() => set('health', h.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'right', width: '100%' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{h.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: active ? C.greenText : C.text }}>{h.label}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '1px' }}>{h.sub}</div>
                </div>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {active && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            );
          })}
        </div>
        <ErrMsg msg={errors.health} />
      </div>

      {/* الصفات المميزة */}
      <div>
        <Lbl>الصفات المميزة <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اختر كل ما ينطبق)</span></Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TRAIT_OPTS.map(t => {
            const active = form.traits.includes(t.key);
            return (
              <button key={t.key} type="button" onClick={() => toggleTrait(t.key)}
                style={{ padding: '8px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, color: active ? C.greenText : C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                {active && <span style={{ marginLeft: '4px' }}>✓</span>}{t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Step 3 ── Photos & Media
  const renderStep3 = () => {
    const allRemoved = removedImages.size > 0;
    const firstKeptImg = keepImages[0] ? getImageUrl(keepImages[0]) : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <SectionTitle>الصور والوسائط</SectionTitle>

        {/* الصور الحالية */}
        {existingImages.length > 0 && (
          <div>
            <Lbl>الصور الحالية <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>— انقر ✕ للحذف</span></Lbl>

            {/* الصورة الرئيسية الحالية */}
            {keepImages.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.greenText, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ background: C.green, color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>الرئيسية</span>
                  الصورة الأولى المحفوظة هي الصورة الرئيسية
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
              {existingImages.map((img, i) => {
                const removed = removedImages.has(img);
                const isHero  = !allRemoved && keepImages[0] === img;
                return (
                  <div key={img} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1 / 1', border: `1.5px solid ${isHero ? C.green : C.border}`, opacity: removed ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                    <img src={getImageUrl(img)} alt={`صورة ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {isHero && (
                      <div style={{ position: 'absolute', top: 6, left: 6, background: C.green, color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>رئيسية</div>
                    )}
                    {removed && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: C.redText, background: '#fff', padding: '3px 8px', borderRadius: '8px', border: `1px solid ${C.redText}` }}>محذوفة</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleRemove(img)}
                      aria-label={removed ? 'تراجع عن الحذف' : `حذف الصورة ${i + 1}`}
                      style={{ position: 'absolute', top: 6, right: 6, width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: removed ? C.green : 'rgba(220,38,38,0.88)', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', lineHeight: 1 }}>
                      <span aria-hidden="true">{removed ? '↩' : '✕'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {allRemoved && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: C.amberText }}>
                ⚠ جميع الصور الحالية مُحددة للحذف. أضف صوراً جديدة أدناه.
              </div>
            )}
          </div>
        )}

        {existingImages.length === 0 && (
          <div style={{ padding: '12px 16px', background: '#F9F5F0', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', color: C.textMuted }}>
            لا توجد صور في الإعلان الأصلي. أضف أول صورة أدناه.
          </div>
        )}

        {/* صور جديدة */}
        <div>
          <Lbl>إضافة صور جديدة <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({5 - totalSlots} متبقية)</span></Lbl>

          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
            onChange={e => addNewPhotos(Array.from(e.target.files))} />

          {totalSlots < 5 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addNewPhotos(Array.from(e.dataTransfer.files)); }}
              onClick={() => newPhotoFiles.length === 0 && photoInputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? C.green : C.border}`, borderRadius: '14px', background: dragOver ? '#F0FDF4' : '#FDFAF7', transition: 'all 0.2s', minHeight: newPhotoFiles.length === 0 ? '160px' : 'auto', display: 'flex', flexDirection: 'column', alignItems: newPhotoFiles.length === 0 ? 'center' : 'stretch', justifyContent: newPhotoFiles.length === 0 ? 'center' : 'flex-start', padding: '16px', cursor: newPhotoFiles.length === 0 ? 'pointer' : 'default' }}>
              {newPhotoFiles.length === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: C.text, marginBottom: '5px' }}>اسحب وأفلت الصور هنا</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '5px' }}>أو انقر للاستعراض — JPG، PNG، WebP</div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>📸 الصور الواضحة تزيد الاهتمام بإعلانك</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                  {newPhotoPreviews.map((url, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1 / 1', border: `1.5px solid ${C.border}` }}>
                      <img src={url} alt={`جديدة ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', top: 4, left: 6, background: C.amber, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '8px' }}>جديدة</div>
                      <button type="button" onClick={e => { e.stopPropagation(); removeNewPhoto(i); }}
                        aria-label={`حذف الصورة الجديدة ${i + 1}`}
                        style={{ position: 'absolute', top: 4, right: 4, width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'rgba(220,38,38,0.88)', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>
                  ))}
                  {totalSlots < 5 && newPhotoFiles.length > 0 && (
                    <button type="button" onClick={e => { e.stopPropagation(); photoInputRef.current?.click(); }}
                      aria-label={`إضافة المزيد، ${5 - totalSlots} متبقية`}
                      style={{ borderRadius: '10px', border: `2px dashed ${C.border}`, aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '4px', background: 'transparent', fontFamily: 'inherit' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = '#F0FDF4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}>
                      <span aria-hidden="true" style={{ fontSize: '20px', color: C.textMuted }}>+</span>
                      <span aria-hidden="true" style={{ fontSize: '10px', color: C.textMuted, fontWeight: '600' }}>{5 - totalSlots} متبقية</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {totalSlots >= 5 && (
            <div style={{ padding: '10px 14px', background: C.greenBg, border: `1px solid #BBF7D0`, borderRadius: '10px', fontSize: '13px', color: C.greenText }}>
              ✓ تم الوصول للحد الأقصى (5 صور). احذف صوراً من الحاليات لإفساح المجال.
            </div>
          )}
        </div>

        <div style={{ fontSize: '12px', color: C.textMuted, background: '#F9F5F0', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
          💡 <strong>محفوظة:</strong> {keepImages.length} · <strong>جديدة:</strong> {newPhotoFiles.length} · <strong>الإجمالي:</strong> {totalSlots} / 5
        </div>
      </div>
    );
  };

  // Step 4 ── Pricing & Description
  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionTitle>السعر والموقع والوصف</SectionTitle>

      {/* السعر لكل كجم */}
      <div>
        <Lbl req>السعر لكل كجم</Lbl>
        <div style={{ position: 'relative' }}>
          <FocusInput type="number" min="0" step="0.01" value={form.pricePerKg} onChange={e => set('pricePerKg', e.target.value)} placeholder="مثال: 150" style={{ paddingRight: '80px' }} />
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م/كجم</span>
        </div>
        {form.pricePerKg && form.weightValue && (
          <div style={{ marginTop: '8px', padding: '8px 14px', background: C.greenBg, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: C.greenText, fontWeight: '600' }}>السعر الإجمالي المحتسب</span>
            <span style={{ fontSize: '15px', fontWeight: '800', color: C.greenText }}>
              {(parseFloat(form.pricePerKg) * toKg(form.weightValue, form.weightUnit)).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        )}
        <ErrMsg msg={errors.pricePerKg} />
      </div>

      {/* موقع الاستلام */}
      <div>
        <Lbl req>موقع الاستلام</Lbl>
        <FocusInput type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="مثال: القاهرة، الجيزة…" dir="rtl" />
        <ErrMsg msg={errors.location} />
      </div>

      {/* نوع التوصيل */}
      <div>
        <Lbl>خيار التوصيل</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {[
            { key: 'none',  label: 'بدون توصيل',         sub: 'الاستلام من المزرعة فقط',                   emoji: '🏠' },
            { key: 'farm',  label: 'توصيل بواسطة المزرعة', sub: 'المزرعة تتولى التوصيل بتكلفة محددة',       emoji: '🚚' },
            { key: 'admin', label: 'توصيل عبر المنصة',     sub: 'المنصة تتولى التوصيل وتحدد التكلفة',       emoji: '📦' },
          ].map(opt => {
            const active = form.deliveryType === opt.key;
            return (
              <button key={opt.key} type="button" onClick={() => set('deliveryType', opt.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'right', width: '100%' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: active ? C.greenText : C.text }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '1px' }}>{opt.sub}</div>
                </div>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {active && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            );
          })}
        </div>
        {form.deliveryType === 'farm' && (
          <div style={{ marginTop: '10px', animation: 'slideDown 0.2s ease' }}>
            <Lbl>تكلفة التوصيل <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اتركه فارغاً إذا كان قابلاً للتفاوض)</span></Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="1" value={form.deliveryCost} onChange={e => set('deliveryCost', e.target.value)} placeholder="مثال: 150" style={{ paddingRight: '60px' }} />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
            </div>
          </div>
        )}
      </div>

      {/* خيارات عيد الأضحى */}
      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: '#15803D', marginBottom: '12px' }}>🌙 خيارات عيد الأضحى</div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={form.eidAvailable}
            onChange={e => set('eidAvailable', e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>متاح لعروض العيد</div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>سيظهر هذا الإعلان في قسم "عروض العيد" الخاص بالمشترين</div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.slaughterService}
            onChange={e => set('slaughterService', e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>خدمة الذبح متاحة</div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>يمكنك تقديم خدمة الذبح مقابل رسوم إضافية</div>
          </div>
        </label>

        {form.slaughterService && (
          <div style={{ marginTop: '12px', animation: 'slideDown 0.2s ease' }}>
            <Lbl>تكلفة الذبح <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اتركه فارغاً إذا كانت قابلة للتفاوض)</span></Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="1" value={form.slaughterCost} onChange={e => set('slaughterCost', e.target.value)} placeholder="مثال: 200" style={{ paddingRight: '60px' }} />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
            </div>
          </div>
        )}

        {/* depositRequired toggle */}
        <div style={{ marginTop: '14px', borderTop: '1px solid #86EFAC', paddingTop: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.depositRequired}
              onChange={e => set('depositRequired', e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>دفع عربون مسبق</div>
              <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>أتِح للمشترين حجز الحيوان بدفع عربون مسبق</div>
            </div>
          </label>
          {form.depositRequired && (
            <div style={{ marginTop: '10px' }}>
              <Lbl req>نسبة العربون (%)</Lbl>
              <div style={{ position: 'relative', maxWidth: '180px' }}>
                <FocusInput
                  type="number" min="1" max="100" step="1"
                  value={form.depositPercentage}
                  onChange={e => set('depositPercentage', e.target.value)}
                  placeholder="مثال: 20"
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>%</span>
              </div>
            </div>
          )}
        </div>

        {/* Qurbani shares */}
        {!['poultry','rabbit'].includes(form.type) && (
          <div style={{ marginTop: '14px', borderTop: '1px solid #86EFAC', paddingTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: form.qurbaniEnabled ? '12px' : '0' }}>
              <input
                type="checkbox"
                checked={form.qurbaniEnabled}
                onChange={e => set('qurbaniEnabled', e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>نظام الأسهم (الأضحية المشتركة)</div>
                <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>أتِح للمشترين شراء أسهم: سُبع / ربع / نصف من هذا الرأس</div>
              </div>
            </label>

            {form.qurbaniEnabled && (
              <div style={{ animation: 'slideDown 0.2s ease', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'seventh', label: 'سُبع (١/٧)', hint: 'البقر والجاموس والإبل' },
                  { key: 'quarter', label: 'ربع (١/٤)',  hint: '' },
                  { key: 'half',    label: 'نصف (١/٢)',  hint: '' },
                ].map(({ key, label, hint }) => {
                  const share = form.qurbaniShares[key];
                  const setShare = (field, val) => set('qurbaniShares', { ...form.qurbaniShares, [key]: { ...share, [field]: val } });
                  return (
                    <div key={key} style={{ background: share.enabled ? '#fff' : '#F0FDF4', border: `1px solid ${share.enabled ? '#86EFAC' : '#BBF7D0'}`, borderRadius: '10px', padding: '10px 12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: share.enabled ? '10px' : '0' }}>
                        <input type="checkbox" checked={share.enabled} onChange={e => setShare('enabled', e.target.checked)}
                          style={{ accentColor: '#15803D', width: '14px', height: '14px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#15803D' }}>{label}</span>
                        {hint && <span style={{ fontSize: '11px', color: C.textMuted }}>{hint}</span>}
                      </label>
                      {share.enabled && (
                        <div style={{ display: 'flex', gap: '10px', animation: 'slideDown 0.15s ease' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textMuted, marginBottom: '4px' }}>سعر السهم (ج.م) *</div>
                            <div style={{ position: 'relative' }}>
                              <FocusInput type="number" min="0" step="1" value={share.pricePerShare} onChange={e => setShare('pricePerShare', e.target.value)} placeholder="مثال: 3500" style={{ paddingRight: '48px' }} />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textMuted, marginBottom: '4px' }}>عدد الأسهم المتاحة *</div>
                            <FocusInput type="number" min="1" step="1" value={share.totalShares} onChange={e => setShare('totalShares', e.target.value)} placeholder="مثال: 7" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* الوصف التفصيلي */}
      <div>
        <Lbl>الوصف التفصيلي <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>(اختياري)</span></Lbl>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="صِف مواشيك بالتفصيل — المزاج، عادات الأكل، التاريخ الصحي، الصفات المميزة…"
          rows={6}
          dir="rtl"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '14px', color: C.text, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8, transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = C.green}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '12px', color: C.textMuted }}>كن محدداً — الأوصاف الدقيقة تُسرّع البيع</span>
          <span aria-hidden="true" style={{ fontSize: '12px', color: form.description.length > 20 ? C.greenText : C.textMuted }}>{form.description.length} حرف</span>
        </div>
      </div>

      {/* نصائح الوصف */}
      <div style={{ background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 16px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: C.amberText, marginBottom: '9px' }}>💡 نصائح للوصف</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TIPS.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: C.amberText, direction: 'rtl' }}>
              <span style={{ flexShrink: 0 }}>•</span><span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {submitErr && (
        <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '10px', padding: '11px 14px', color: C.redText, fontSize: '14px' }}>
          {submitErr}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVIEW MODAL content
  // ─────────────────────────────────────────────────────────────────────────────
  const firstKept     = keepImages[0] ? getImageUrl(keepImages[0]) : (newPhotoPreviews[0] || null);
  const previewEmoji  = TYPE_EMOJI[form.type] || '🐾';

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4][step - 1];

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1A3A24 0%, #2D6235 55%, #3A7D44 100%)', padding: '22px 32px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -8, top: -16, fontSize: '110px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>✏️</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <button type="button" onClick={() => navigate('/seller/listings')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: '600' }}>
                ← إعلاناتي
              </button>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>/</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: '600' }}>تعديل</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>تعديل الإعلان</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              الخطوة {step} من 4 · {TYPE_EMOJI[form.type]} {TYPE_AR[form.type]}{form.breed ? ` — ${form.breed}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setShowPreview(true)}
            style={{ padding: '8px 15px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            👁 معاينة
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px 48px', maxWidth: '620px', margin: '0 auto' }}>

        {/* ── Progress stepper ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '30px' }}>
          {STEPS.map((s, i) => {
            const done   = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? '1 1 auto' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: `2px solid ${done || active ? C.green : C.border}`, background: done ? C.green : active ? C.greenBg : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: done ? '#fff' : active ? C.greenText : C.textMuted, transition: 'all 0.3s', fontWeight: '700' }}>
                    {done ? '✓' : s.icon}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: done || active ? C.green : C.textMuted, whiteSpace: 'nowrap', textAlign: 'center' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: step > s.n ? C.green : C.border, margin: '0 4px', marginBottom: '18px', transition: 'background 0.3s' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step card ── */}
        <div style={{ background: C.card, borderRadius: '18px', padding: '28px', boxShadow: C.shadow, border: `1px solid ${C.border}`, marginBottom: '20px' }}>
          {stepContent()}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" onClick={goBack} disabled={step === 1}
            style={{ padding: '12px 20px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.card, color: step === 1 ? '#D1D5DB' : C.text, fontSize: '14px', fontWeight: '700', cursor: step === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
            رجوع →
          </button>
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button type="button" onClick={goNext}
              style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.greenDark}
              onMouseLeave={e => e.currentTarget.style.background = C.green}>
              ← متابعة
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              aria-busy={submitting || undefined}
              style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: submitting ? '#6AAF74' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
              {submitting ? 'جاري الحفظ…' : '💾 حفظ التعديلات'}
            </button>
          )}
        </div>
      </div>

      {/* ── Preview modal ── */}
      {showPreview && (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowPreview(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title"
            style={{ background: C.bg, borderRadius: '20px', padding: '24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideDown 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="preview-dialog-title" style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>معاينة المشتري</h3>
              <button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview" style={{ background: 'none', border: 'none', fontSize: '20px', color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}><span aria-hidden="true">✕</span></button>
            </div>
            <div style={{ background: C.card, borderRadius: '16px', border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ height: '200px', background: firstKept ? undefined : C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {firstKept
                  ? <img src={firstKept} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '72px' }}>{previewEmoji}</span>
                }
                {form.health && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: C.greenBg, color: C.greenText, border: `1px solid #BBF7D0`, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '12px' }}>
                    {HEALTH_OPTS.find(h => h.key === form.health)?.label || form.health}
                  </div>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '17px', color: C.text }}>{TYPE_AR[form.type] || '—'}</div>
                    <div style={{ fontSize: '13px', color: C.textMuted }}>{form.breed || 'السلالة غير محددة'}</div>
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: C.green }}>
                    {form.pricePerKg ? `${Number(form.pricePerKg).toLocaleString()} ج.م/كجم` : 'السعر غير محدد'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {form.ageValue && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted }}>{form.ageValue} {form.ageUnit}</span>}
                  {form.weightValue && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted }}>{form.weightValue} {form.weightUnit}</span>}
                  {form.gender && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted, textTransform: 'capitalize' }}>{form.gender}</span>}
                  {form.deliveryType !== 'none' && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: C.greenBg, color: C.greenText }}>🚛 {form.deliveryType === 'farm' ? 'توصيل من المزرعة' : 'توصيل عبر المنصة'}</span>}
                </div>
                {form.location && <div style={{ marginTop: '8px', fontSize: '12px', color: C.textMuted }}>📍 {form.location}</div>}
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.textMuted, textAlign: 'center' }}>هكذا سيرى المشترون إعلانك.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerEditListing;
