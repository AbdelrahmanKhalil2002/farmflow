import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createListing } from '../../services/listingService';
import { getAnimals } from '../../services/animalService';
import { getMarketPrices } from '../../services/marketPricesService';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';
import { resolveBreeds } from '../../utils/breedPrefs';

import { C } from '../../tokens';
import { animalImg, imgFallback } from '../../utils/animalImg';

// ─── Static data ───────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, labelKey: 'addListing.step.info',   icon: '🐃' },
  { n: 2, labelKey: 'addListing.step.specs',  icon: '⚖️'  },
  { n: 3, labelKey: 'addListing.step.docs',   icon: '📄' },
  { n: 4, labelKey: 'addListing.step.photos', icon: '📷' },
  { n: 5, labelKey: 'addListing.step.price',  icon: '💰' },
];

const TYPES      = ['cattle', 'buffalo', 'sheep', 'goat', 'camel', 'horse', 'poultry', 'rabbit', 'ostrich', 'gazelle', 'oryx', 'deer', 'llama', 'alpaca', 'donkey', 'mule', 'other'];
const TYPE_EMOJI = { cattle: '🐄', buffalo: '🐃', sheep: '🐑', goat: '🐐', camel: '🐪', horse: '🐎', poultry: '🐔', rabbit: '🐇', ostrich: '🦢', gazelle: '🦌', oryx: '🦬', deer: '🦌', llama: '🦙', alpaca: '🦙', donkey: '🐴', mule: '🐴', other: '🐾' };
const TYPE_KEY   = { cattle: 'herd.type.cattle', buffalo: 'herd.type.buffalo', sheep: 'herd.type.sheep', goat: 'herd.type.goat', camel: 'herd.type.camel', horse: 'herd.type.horse', poultry: 'herd.type.poultry', rabbit: 'herd.type.rabbit', ostrich: 'herd.type.ostrich', gazelle: 'herd.type.gazelle', oryx: 'herd.type.oryx', deer: 'herd.type.deer', llama: 'herd.type.llama', alpaca: 'herd.type.alpaca', donkey: 'herd.type.donkey', mule: 'herd.type.mule', other: 'herd.type.other' };

// ── Expanded poultry sub-types (all set type='poultry', breed=label) ──────────
const POULTRY_SUBTYPES = [
  { id: 'baladi',  label: 'فراخ بلدي',  emoji: '🐓' },
  { id: 'broiler', label: 'فراخ تسمين', emoji: '🐔' },
  { id: 'layers',  label: 'فراخ بياضة', emoji: '🥚' },
  { id: 'duck',    label: 'بط',         emoji: '🦆' },
  { id: 'turkey',  label: 'ديك رومي',  emoji: '🦃' },
  { id: 'pigeon',  label: 'حمام',       emoji: '🕊️' },
  { id: 'quail',   label: 'سمان',       emoji: '🐦' },
  { id: 'goose',   label: 'إوز',        emoji: '🦢' },
  { id: 'guinea',  label: 'دراج',       emoji: '🦜' },
  { id: 'peacock', label: 'طاووس',      emoji: '🦚' },
];

// ── Breed chips per poultry sub-type ─────────────────────────────────────────
const POULTRY_BREEDS_CHIPS = {
  baladi:  ['فيومي', 'دمياطي', 'سيناوي', 'بلدي مصري', 'عسيل', 'دجاج الصخرة', 'حساني'],
  broiler: ['روس 308', 'كوب 500', 'هبارد', 'أريبياكلس', 'راس', 'مارشال'],
  layers:  ['هاي لاين', 'لومان براون', 'نوفوجن', 'إيزا براون', 'شيفر', 'باب كوك'],
  duck:    ['بكين', 'مسكوفي', 'كايوغا', 'رووين', 'إيندير رانر'],
  turkey:  ['برونز الكبير', 'ذهبي', 'أبيض عريض الصدر', 'نيكولاس 300', 'بيوتي'],
  pigeon:  ['زاجل', 'مموه', 'مروب', 'تيلر', 'جيكوبان', 'رومان', 'الملك', 'قاصر'],
  quail:   ['ياباني', 'أمريكي', 'فرنسي', 'بوب وايت', 'كوتورنيكس'],
  goose:   ['إمبدن', 'تولوز', 'أفريكان', 'بيلجريم', 'أوروبي'],
  guinea:  ['بيرل', 'أبيض', 'لافندر', 'كورنيش'],
  peacock: ['هندي أزرق', 'أبيض', 'شابو', 'بياض العين'],
};

const LIVESTOCK_TYPES = [
  { id: 'cattle',  label: 'أبقار', emoji: '🐄' },
  { id: 'buffalo', label: 'جاموس', emoji: '🐃' },
  { id: 'sheep',   label: 'أغنام', emoji: '🐑' },
  { id: 'goat',    label: 'ماعز',  emoji: '🐐' },
  { id: 'camel',   label: 'إبل',   emoji: '🐪' },
];

const EXOTIC_ANIMALS = [
  { id: 'ostrich',    label: 'نعام',    emoji: '🦢' },
  { id: 'gazelle',    label: 'غزلان',   emoji: '🦌' },
  { id: 'oryx',       label: 'مها',     emoji: '🦬' },
  { id: 'deer',       label: 'أيل',     emoji: '🦌' },
  { id: 'llama',      label: 'لاما',    emoji: '🦙' },
  { id: 'alpaca',     label: 'ألبكا',   emoji: '🦙' },
  { id: 'donkey',     label: 'حمير',    emoji: '🐴' },
  { id: 'mule',       label: 'بغال',    emoji: '🐴' },
];

const EXOTIC_BREEDS_CHIPS = {
  ostrich:    ['أفريقي الرقبة الحمراء', 'أفريقي الرقبة الزرقاء', 'أسترالي', 'أمريكي', 'صومالي'],
  gazelle:    ['غزال الريم', 'غزال الدوركاس', 'غزال السبلة', 'غزال الجبلي', 'غزال عفري'],
  oryx:       ['مها عربي أبيض', 'مها عربي أسمر'],
  deer:       ['أيل أحمر', 'أيل الأكسيس', 'أيل الدام'],
  llama:      ['كلاسيكية', 'بنية', 'بيضاء'],
  alpaca:     ['هواكايا', 'سوري'],
  donkey:     ['مصري بلدي', 'صومالي', 'نوبي', 'إيطالي', 'أمريكي'],
  mule:       ['بغل عمل', 'بغل رياضي'],
};

// ── Quick-select breed chips per type ─────────────────────────────────────────
const TYPE_BREEDS_CHIPS = {
  cattle:     ['فريزيان', 'هولشتاين', 'براهمان', 'سيمنتال', 'ليموزين', 'واجو', 'أنغوس', 'بلدي'],
  buffalo:    ['بلدي مصري', 'مري', 'نيلي رافي'],
  sheep:      ['نجدي', 'عواسي', 'بربرة', 'نعيمي', 'ميرينو', 'سفولك', 'بلدي'],
  goat:       ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين'],
  camel:      ['دروميدار', 'مجاهيم', 'حُمُر', 'وضحاء'],
  horse:      ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان', 'خيل عمل'],
  // exotic
  ostrich:    ['أفريقي الرقبة الحمراء', 'أفريقي الرقبة الزرقاء', 'أسترالي', 'أمريكي', 'صومالي'],
  gazelle:    ['غزال الريم', 'غزال الدوركاس', 'غزال السبلة', 'غزال الجبلي', 'غزال عفري'],
  oryx:       ['مها عربي أبيض', 'مها عربي أسمر'],
  deer:       ['أيل أحمر', 'أيل الأكسيس', 'أيل الدام'],
  llama:      ['كلاسيكية', 'بنية', 'بيضاء'],
  alpaca:     ['هواكايا', 'سوري'],
  donkey:     ['مصري بلدي', 'صومالي', 'نوبي', 'إيطالي', 'أمريكي'],
  mule:       ['بغل عمل', 'بغل رياضي'],
};

const BREEDS = {
  cattle:  ['فريزيان', 'أنغوس', 'هيرفورد', 'براهمان', 'سيمنتال', 'هولشتاين', 'ليموزين', 'واجو', 'نجدي'],
  sheep:   ['نجدي', 'عواسي', 'نعيمي', 'ميرينو', 'سفولك', 'دورسيت', 'بربرة', 'رومني'],
  goat:    ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين', 'جبلي'],
  camel:   ['دروميدار', 'عربي سباق', 'مجاهيم', 'حُمُر', 'وضحاء', 'صفراء'],
  horse:   ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان'],
  poultry: ['بلدي', 'روس 308', 'كوب 500', 'هبارد', 'فيومي'],
  other:   [],
};

const COLORS_MAP = {
  poultry: ['أبيض', 'أسود', 'بني', 'ذهبي', 'رقطاء', 'ملون', 'رمادي', 'فضي'],
  horses:  ['أشهب', 'كستنائي', 'أسود', 'بني فاتح', 'رمادي', 'طيلساني', 'مرقط', 'بيج'],
  default: ['بني', 'أسود', 'أبيض', 'رمادي', 'كستنائي', 'منقط', 'مختلط', 'أشهب'],
};

const TRAIT_OPTS_MAP = {
  poultry: [
    { key: 'eggs',      labelKey: 'addListing.trait.eggs'      },
    { key: 'fattening', labelKey: 'addListing.trait.fattening' },
    { key: 'breeding',  labelKey: 'addListing.trait.breeding'  },
    { key: 'show',      labelKey: 'addListing.trait.show'      },
  ],
  horses: [
    { key: 'racing',   labelKey: 'addListing.trait.racing'   },
    { key: 'show',     labelKey: 'addListing.trait.show'     },
    { key: 'working',  labelKey: 'addListing.trait.working'  },
    { key: 'breeding', labelKey: 'addListing.trait.breeding' },
  ],
  default: [
    { key: 'dairy',    labelKey: 'addListing.trait.dairy'    },
    { key: 'meat',     labelKey: 'addListing.trait.meat'     },
    { key: 'breeding', labelKey: 'addListing.trait.breeding' },
    { key: 'show',     labelKey: 'addListing.trait.show'     },
    { key: 'working',  labelKey: 'addListing.trait.working'  },
  ],
};

const HEALTH_OPTS = [
  { key: 'healthy',    emoji: '💚', labelKey: 'addAnimal.health.healthy',    subKey: 'addAnimal.health.healthySub'    },
  { key: 'vaccinated', emoji: '💉', labelKey: 'addAnimal.health.vaccinated', subKey: 'addAnimal.health.vaccinatedSub' },
  { key: 'certified',  emoji: '📋', labelKey: 'addAnimal.health.certified',  subKey: 'addAnimal.health.certifiedSub'  },
];

const DOC_SLOTS = [
  { key: 'vaccine', labelKey: 'addListing.doc.vaccine', emoji: '💉' },
  { key: 'health',  labelKey: 'addListing.doc.health',  emoji: '📋' },
  { key: 'vet',     labelKey: 'addListing.doc.vet',     emoji: '🏥' },
];

const DRAFT_KEY = 'farmflow_listing_draft';

const TIPS_KEYS = [
  'addListing.tip1',
  'addListing.tip2',
  'addListing.tip3',
  'addListing.tip4',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

const HEALTH_LABEL = { healthy: 'صحي', vaccinated: 'ملقح', certified: 'معتمد بيطرياً' };

const buildDescription = (form) => {
  const meta = [];
  if (form.gender)               meta.push(`Gender: ${form.gender === 'male' ? 'Male ♂' : form.gender === 'female' ? 'Female ♀' : 'Other ⚥'}`);
  const colorStr = form.color === 'custom' ? form.colorCustom : form.color;
  if (colorStr)                  meta.push(`Color: ${colorStr}`);
  if (form.health) {
    const label = HEALTH_LABEL[form.health] || form.health;
    meta.push(`Health: ${label}`);
  }
  if (form.traits.length)        meta.push(`Traits: ${form.traits.join(', ')}`);
  if (form.deliveryType === 'farm')  meta.push(`Delivery: Farm${form.deliveryCost ? ` (${form.deliveryCost} ج.م)` : ''}`);
  if (form.deliveryType === 'admin') meta.push('Delivery: Via Admin');

  const header = meta.length ? `[${meta.join(' | ')}]\n\n` : '';
  return `${header}${form.description}`.trim();
};

// ─── Field components ──────────────────────────────────────────────────────────
const Lbl = ({ children, req }) => (
  <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '7px' }}>
    {children}{req && <span style={{ color: C.red, marginLeft: '3px' }}>*</span>}
  </div>
);

const ErrMsg = ({ msg }) => msg
  ? <div style={{ fontSize: '12px', color: C.redText, marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}><span>⚠</span>{msg}</div>
  : null;

const FocusInput = ({ style = {}, onFocusStyle, ...rest }) => {
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
        transition: 'border-color 0.15s', fontFamily: 'inherit',
        ...style,
        ...(focus ? onFocusStyle : {}),
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
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: C.card, border: `1.5px solid ${on ? C.green : C.border}`, borderRadius: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
    onClick={onToggle}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: '700', fontSize: '14px', color: C.text }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{sub}</div>}
    </div>
    <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: on ? C.green : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>{children}</h3>
);

// ─── Main component ────────────────────────────────────────────────────────────
const SellerAddListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, isRTL } = useLang();
  const { activeFarm } = useFarm();

  const farmType = activeFarm?.type;
  const pageTitle = farmType === 'poultry' ? 'إضافة دواجن جديدة'
                  : farmType === 'horses'  ? 'إضافة خيل جديد'
                  : farmType === 'exotic'  ? 'إضافة حيوان نادر'
                  : farmType === 'dairy'   ? 'إضافة ماشية جديدة'
                  : 'إضافة ماشية جديدة';
  const step1Title = farmType === 'poultry' ? 'نوع الدواجن والمعلومات الأساسية'
                   : farmType === 'horses'  ? 'نوع الخيل والمعلومات الأساسية'
                   : farmType === 'exotic'  ? 'نوع الحيوان والمعلومات الأساسية'
                   : 'نوع المواشي والمعلومات الأساسية';
  const traitOpts  = TRAIT_OPTS_MAP[farmType] || TRAIT_OPTS_MAP.default;
  const activeColors = COLORS_MAP[farmType] || COLORS_MAP.default;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const pType      = searchParams.get('type');
    const pBreed     = searchParams.get('breed');
    const pWeight    = searchParams.get('weight');
    const pAgeMonths = searchParams.get('ageMonths');
    const pGender    = searchParams.get('gender');
    const pColor     = searchParams.get('color');
    const pVaccinated= searchParams.get('vaccinated') === 'true';

    const farmTypes = activeFarm?.animalTypes;
    const farmDefault =
      activeFarm?.type === 'poultry' ? 'poultry' :
      activeFarm?.type === 'horses'  ? 'horse'   :
      activeFarm?.type === 'dairy'   ? 'cattle'  :
      farmTypes?.find(t => TYPES.includes(t)) || 'cattle';

    // Age: convert months → display unit
    let ageValue = '', ageUnit = 'months';
    if (pAgeMonths) {
      const m = parseInt(pAgeMonths, 10);
      if (!isNaN(m) && m > 0) {
        if (m >= 24) { ageValue = String(Math.floor(m / 12)); ageUnit = 'years'; }
        else         { ageValue = String(m); }
      }
    }

    // Gender: map 'unknown' → '' (don't pre-select)
    const genderValue = pGender === 'male' || pGender === 'female' ? pGender : pGender ? 'other' : '';

    // Color: if it matches a chip use it directly, else use custom
    const allColors = [...new Set([...COLORS_MAP.default, ...COLORS_MAP.poultry, ...COLORS_MAP.horses])];
    const colorValue  = pColor && allColors.includes(pColor) ? pColor : pColor ? 'custom' : '';
    const colorCustom = colorValue === 'custom' ? (pColor || '') : '';

    // Health: auto-fill if coming from animal with vaccinations
    const healthValue = pVaccinated ? 'vaccinated' : '';

    return {
      type:        pType   || farmDefault,
      poultryType: '',
      breed:       pBreed  || '',
      ageValue, ageUnit,
      gender:      genderValue,
      weightValue: pWeight || '', weightUnit: 'kg',
      color: colorValue, colorCustom,
      health: healthValue, traits: [], purpose: 'general',
      pricePerKg: '', location: '', deliveryType: 'none', deliveryCost: '', description: '',
      eidAvailable: false, slaughterService: false, slaughterCost: '',
      depositRequired: false, depositPercentage: '',
      qurbaniEnabled: false,
      qurbaniShares: {
        seventh: { enabled: false, pricePerShare: '', totalShares: '' },
        quarter:  { enabled: false, pricePerShare: '', totalShares: '' },
        half:     { enabled: false, pricePerShare: '', totalShares: '' },
      },
    };
  });

  const [docFiles,      setDocFiles]      = useState({ vaccine: null, health: null, vet: null, extra: [] });
  const [photoFiles,    setPhotoFiles]    = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [dragOver,      setDragOver]      = useState(false);

  const [errors,      setErrors]      = useState({});
  const [submitErr,   setSubmitErr]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const [draftSaved,  setDraftSaved]  = useState(false);
  const [breedOpen,   setBreedOpen]   = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [marketAvg,   setMarketAvg]   = useState(null);

  // Load market average for selected animal type when reaching step 5
  useEffect(() => {
    if (step !== 5 || !form.type) return;
    getMarketPrices()
      .then(({ data }) => {
        const entry = data.find(e => e.type === form.type);
        setMarketAvg(entry?.avgPricePerKg || null);
      })
      .catch(() => {});
  }, [step, form.type]);

  const photoInputRef = useRef(null);
  const breedRef      = useRef(null);

  // ── Herd picker state ──────────────────────────────────────────────────────
  const [herdQuery,    setHerdQuery]    = useState('');
  const [herdResults,  setHerdResults]  = useState([]);
  const [herdLoading,  setHerdLoading]  = useState(false);
  const [herdOpen,     setHerdOpen]     = useState(false);
  const [pickedAnimal, setPickedAnimal] = useState(null);
  const herdPickerRef = useRef(null);

  // Close herd dropdown on outside click
  useEffect(() => {
    const h = e => { if (herdPickerRef.current && !herdPickerRef.current.contains(e.target)) setHerdOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Fetch matching herd animals (debounced)
  useEffect(() => {
    if (!herdOpen) return;
    const t = setTimeout(() => {
      setHerdLoading(true);
      getAnimals({ status: 'active', search: herdQuery || undefined, limit: 15, page: 1 })
        .then(r => setHerdResults(r.data?.items || []))
        .catch(() => setHerdResults([]))
        .finally(() => setHerdLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [herdQuery, herdOpen]);

  // Fill form fields from a herd animal
  const fillFromAnimal = useCallback((a) => {
    const ageMonths = a.dob
      ? Math.floor((Date.now() - new Date(a.dob).getTime()) / (30.44 * 24 * 3600 * 1000))
      : null;
    let ageValue = '', ageUnit = 'months';
    if (ageMonths) {
      if (ageMonths >= 24) { ageValue = String(Math.floor(ageMonths / 12)); ageUnit = 'years'; }
      else                 { ageValue = String(ageMonths); }
    }
    const genderValue  = a.gender === 'male' || a.gender === 'female' ? a.gender : a.gender ? 'other' : '';
    const allColors    = [...new Set([...COLORS_MAP.default, ...COLORS_MAP.poultry, ...COLORS_MAP.horses])];
    const colorValue   = a.color && allColors.includes(a.color) ? a.color : a.color ? 'custom' : '';
    const colorCustom  = colorValue === 'custom' ? (a.color || '') : '';
    const healthValue  = (a.vaccinationLog || []).length > 0 ? 'vaccinated' : a.healthStatus === 'healthy' ? 'healthy' : '';

    setFs({
      type:        a.type  || form.type,
      breed:       a.breed || '',
      ageValue, ageUnit,
      gender:      genderValue,
      weightValue: a.currentWeight ? String(a.currentWeight) : '',
      weightUnit:  'kg',
      color: colorValue, colorCustom,
      health: healthValue,
    });
    setPickedAnimal(a);
    setHerdOpen(false);
  }, [form.type]);

  // ── Draft restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('fromAnimal')) return; // URL params take priority over draft
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { setForm(JSON.parse(raw)); setDraftBanner(true); }
    } catch {}
  }, []);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  // ── Close breed dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (breedRef.current && !breedRef.current.contains(e.target)) setBreedOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Photo object URLs ──────────────────────────────────────────────────────
  useEffect(() => {
    const urls = photoFiles.map(f => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [photoFiles]);

  // ── Setters ────────────────────────────────────────────────────────────────
  const set   = (k, v)  => setForm(p => ({ ...p, [k]: v }));
  const setFs = (obj)   => setForm(p => ({ ...p, ...obj }));

  const toggleTrait = (key) => set('traits',
    form.traits.includes(key) ? form.traits.filter(t => t !== key) : [...form.traits, key]
  );

  // ── Photo management ───────────────────────────────────────────────────────
  const addPhotos = (incoming) => {
    const imgs = incoming.filter(f => f.type.startsWith('image/'));
    const slots = 5 - photoFiles.length;
    if (slots <= 0) return;
    setPhotoFiles(prev => [...prev, ...imgs.slice(0, slots)]);
  };

  const removePhoto = (i) => setPhotoFiles(prev => prev.filter((_, j) => j !== i));

  const movePhoto = (i, dir) => {
    const t = i + dir;
    if (t < 0 || t >= photoFiles.length) return;
    setPhotoFiles(prev => {
      const a = [...prev]; [a[i], a[t]] = [a[t], a[i]]; return a;
    });
  };

  // ── Breed suggestions ──────────────────────────────────────────────────────
  const breedSuggestions = form.breed.length > 0
    ? (BREEDS[form.type] || []).filter(b => b.toLowerCase().includes(form.breed.toLowerCase()))
    : [];

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (n) => {
    const e = {};
    if (n === 1) {
      if (!form.type)     e.type     = t('addListing.err.type');
      if (!form.ageValue) e.ageValue = t('addListing.err.age');
      if (!form.gender)   e.gender   = t('addListing.err.gender');
    }
    if (n === 2) {
      if (!form.weightValue) e.weightValue = t('addListing.err.weight');
      if (!form.health)      e.health      = t('addListing.err.health');
    }
    if (n === 5) {
      if (!form.pricePerKg || Number(form.pricePerKg) <= 0) e.pricePerKg = t('addListing.err.price');
      if (!form.location) e.location = t('addListing.err.location');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate(step)) return;
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validate(5)) return;
    setSubmitErr('');
    setSubmitting(true);
    try {
      const weightKg   = toKg(form.weightValue, form.weightUnit) || 0;
      const pricePerKg = parseFloat(form.pricePerKg) || 0;
      const totalPrice = parseFloat((weightKg * pricePerKg).toFixed(2));

      const fd = new FormData();
      fd.append('type', form.type);
      if (form.breed) fd.append('breed', form.breed);
      // Only send numeric fields when they have real values (skip nulls for drafts)
      const ageMonths = toMonths(form.ageValue, form.ageUnit);
      if (ageMonths !== null) fd.append('age', ageMonths);
      if (weightKg > 0)   fd.append('weight',      weightKg);
      if (pricePerKg > 0) fd.append('pricePerKg',  pricePerKg);
      if (totalPrice > 0) fd.append('price',        totalPrice);
      fd.append('deliveryType', form.deliveryType);
      if (form.deliveryType === 'farm' && form.deliveryCost) fd.append('deliveryCost', form.deliveryCost);
      if (form.location)    fd.append('location',    form.location);
      fd.append('description', buildDescription(form));
      fd.append('purpose', form.purpose || 'general');
      fd.append('eidAvailable',     form.eidAvailable);
      fd.append('slaughterService', form.slaughterService);
      if (form.slaughterService && form.slaughterCost) fd.append('slaughterCost', form.slaughterCost);
      fd.append('depositRequired', form.depositRequired);
      if (form.depositRequired && form.depositPercentage) fd.append('depositPercentage', form.depositPercentage);
      if (asDraft) fd.append('status', 'draft');

      // Link to herd animal if navigated from animal detail or picked from herd
      const linkedAnimalId = searchParams.get('fromAnimal') || pickedAnimal?._id;
      if (linkedAnimalId) fd.append('animal', linkedAnimalId);

      if (form.qurbaniEnabled) {
        const shares = ['seventh', 'quarter', 'half']
          .filter(k => form.qurbaniShares[k].enabled && form.qurbaniShares[k].pricePerShare && form.qurbaniShares[k].totalShares)
          .map(k => ({ shareType: k, pricePerShare: Number(form.qurbaniShares[k].pricePerShare), totalShares: Number(form.qurbaniShares[k].totalShares) }));
        if (shares.length) fd.append('qurbaniShares', JSON.stringify(shares));
      }

      if (activeFarm?._id) fd.append('farmId', activeFarm._id);

      // Photos first (primary at index 0), then docs
      photoFiles.forEach(f => fd.append('images', f));
      const docs = [docFiles.vaccine, docFiles.health, docFiles.vet, ...docFiles.extra].filter(Boolean);
      const room = 5 - photoFiles.length;
      docs.slice(0, room).forEach(f => fd.append('images', f));

      await createListing(fd);
      localStorage.removeItem(DRAFT_KEY);
      setSuccess(asDraft ? 'draft' : 'published');
    } catch (err) {
      setSubmitErr(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset for "Add Another" ────────────────────────────────────────────────
  const resetAll = () => {
    const resetType =
      activeFarm?.type === 'poultry' ? 'poultry' :
      activeFarm?.type === 'horses'  ? 'horse'   :
      activeFarm?.type === 'dairy'   ? 'cattle'  :
      activeFarm?.animalTypes?.[0]   || 'cattle';
    setForm({ type: resetType, breed: '', poultryType: '', ageValue: '', ageUnit: 'months', gender: '', weightValue: '', weightUnit: 'kg', color: '', colorCustom: '', health: '', traits: [], purpose: 'general', pricePerKg: '', location: '', deliveryType: 'none', deliveryCost: '', description: '', eidAvailable: false, slaughterService: false, slaughterCost: '', qurbaniEnabled: false, qurbaniShares: { seventh: { enabled: false, pricePerShare: '', totalShares: '' }, quarter: { enabled: false, pricePerShare: '', totalShares: '' }, half: { enabled: false, pricePerShare: '', totalShares: '' } } });
    setDocFiles({ vaccine: null, health: null, vet: null, extra: [] });
    setPhotoFiles([]);
    setErrors({});
    setSubmitErr('');
    setStep(1);
    setSuccess(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (success === 'draft') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: '32px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>💾</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '800', color: C.text }}>تم حفظ المسودة</h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: C.textMuted, lineHeight: 1.65 }}>
            تم حفظ الإعلان كمسودة. يمكنك مراجعته ونشره لاحقاً من صفحة إعلاناتي.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/seller/drafts')}
              style={{ padding: '11px 22px', borderRadius: '10px', background: C.green, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              عرض المسودات ←
            </button>
            <button type="button" onClick={resetAll}
              style={{ padding: '11px 22px', borderRadius: '10px', background: C.card, color: C.text, border: `1.5px solid ${C.border}`, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + إضافة إعلان جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: '32px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>✅</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '800', color: C.text }}>{t('addListing.success.title')}</h2>
          <p style={{ margin: '0 0 10px', fontSize: '15px', color: C.textMuted, lineHeight: 1.65 }}>
            {t('addListing.success.body')}
          </p>
          <p style={{ margin: '0 0 28px', fontSize: '13px', color: C.textMuted, background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 14px' }}>
            ⏳ {t('addListing.success.reviewTime')}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/seller/listings')}
              style={{ padding: '11px 22px', borderRadius: '10px', background: C.green, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {t('addListing.success.viewBtn')} ←
            </button>
            <button type="button" onClick={resetAll}
              style={{ padding: '11px 22px', borderRadius: '10px', background: C.card, color: C.text, border: `1.5px solid ${C.border}`, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + {t('addListing.success.addAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW MODAL
  // ─────────────────────────────────────────────────────────────────────────
  const previewImg   = photoPreviews[0] || null;
  const previewEmoji = TYPE_EMOJI[form.type] || '🐾';

  // ─────────────────────────────────────────────────────────────────────────
  // STEP CONTENT
  // ─────────────────────────────────────────────────────────────────────────

  // Step 1 ── Basic Info
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionTitle>{step1Title}</SectionTitle>

      {/* ── اختر من قطيعك ── */}
      <div ref={herdPickerRef} style={{ position: 'relative' }}>
        {pickedAnimal ? (
          /* Picked animal banner */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: `${C.green}12`, border: `1.5px solid ${C.green}`, borderRadius: 12 }}>
            <span style={{ fontSize: 24 }}>{TYPE_EMOJI[pickedAnimal.type] || '🐾'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.greenText }}>
                {pickedAnimal.breed || pickedAnimal.type} {pickedAnimal.tagId ? `— 🏷 ${pickedAnimal.tagId}` : ''}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>تم ملء البيانات تلقائيًا من القطيع ✓</div>
            </div>
            <button type="button" onClick={() => setPickedAnimal(null)}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        ) : (
          /* Search trigger */
          <button type="button" onClick={() => setHerdOpen(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: `1.5px dashed ${C.green}`, background: `${C.green}08`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
            <span style={{ fontSize: 20 }}>🐃</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.greenText }}>اختر حيوانًا من قطيعك لملء البيانات تلقائيًا</span>
            <span style={{ fontSize: 12, color: C.muted }}>{herdOpen ? '▲' : '▼'}</span>
          </button>
        )}

        {/* Dropdown */}
        {herdOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
              <input
                autoFocus
                value={herdQuery}
                onChange={e => setHerdQuery(e.target.value)}
                placeholder="ابحث بالسلالة أو رقم الأذن…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {herdLoading && <div style={{ padding: '14px 16px', color: C.muted, fontSize: 13 }}>جارٍ التحميل…</div>}
              {!herdLoading && herdResults.length === 0 && <div style={{ padding: '14px 16px', color: C.muted, fontSize: 13 }}>لا نتائج</div>}
              {!herdLoading && herdResults.map(a => (
                <button key={a._id} type="button" onClick={() => fillFromAnimal(a)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_EMOJI[a.type] || '🐾'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{a.breed || a.type}{a.tagId ? ` — 🏷 ${a.tagId}` : ''}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {a.currentWeight ? `⚖️ ${a.currentWeight} كجم` : ''}{a.dob ? ` · 📅 ${Math.floor((Date.now() - new Date(a.dob).getTime()) / (30.44*24*3600*1000))} شهر` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Animal type — context-aware based on farm category */}
      <div>
        <Lbl req>{t('addListing.step1.type')}</Lbl>

        {/* Poultry farm → show expanded poultry sub-types */}
        {activeFarm?.type === 'poultry' ? (
          <div>
            {(() => {
              // Map farm animalTypes (chicken_X → X; others unchanged) to a Set for fast lookup
              const farmSubIds = new Set(
                (activeFarm?.animalTypes || []).map(t => t.startsWith('chicken_') ? t.slice(8) : t)
              );
              const visibleSubtypes = farmSubIds.size > 0
                ? POULTRY_SUBTYPES.filter(s => farmSubIds.has(s.id))
                : POULTRY_SUBTYPES;
              const cols = visibleSubtypes.length === 1 ? 'repeat(1, 1fr)' : visibleSubtypes.length === 2 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px' }}>
                    {visibleSubtypes.map(sub => {
                      const active = form.poultryType === sub.id;
                      return (
                        <button key={sub.id} type="button"
                          onClick={() => setFs({ type: 'poultry', breed: sub.label, poultryType: sub.id })}
                          style={{ padding: '16px 8px', borderRadius: '14px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', boxShadow: active ? `0 0 0 3px ${C.green}22` : 'none' }}>
                          <img src={animalImg(sub.id, sub.emoji)} alt={sub.label} onError={imgFallback(sub.emoji)} style={{ width: '40px', height: '40px', marginBottom: '6px', objectFit: 'contain', borderRadius: '8px' }} />
                          <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{sub.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Breed chips for selected poultry sub-type — filtered by farm preferences */}
                  {form.poultryType && POULTRY_BREEDS_CHIPS[form.poultryType]?.length > 0 && (
                    <div style={{ marginTop: '14px', padding: '14px', background: C.greenBg, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: C.greenText, marginBottom: '9px' }}>
                        {POULTRY_SUBTYPES.find(s => s.id === form.poultryType)?.emoji} سلالة {POULTRY_SUBTYPES.find(s => s.id === form.poultryType)?.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                        {resolveBreeds(activeFarm?._id, form.poultryType, POULTRY_BREEDS_CHIPS[form.poultryType] || []).map(breed => {
                          const active = form.breed === breed;
                          return (
                            <button key={breed} type="button"
                              onClick={() => set('breed', active ? POULTRY_SUBTYPES.find(s => s.id === form.poultryType)?.label || '' : breed)}
                              style={{ padding: '6px 14px', borderRadius: '99px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.card : 'transparent', color: active ? C.greenText : C.text, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s', boxShadow: active ? C.shadow : 'none' }}>
                              {breed}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : activeFarm?.type === 'horses' ? (
          /* Horse farm → single card + breed chips below */
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: C.greenBg, borderRadius: '14px', border: `2px solid ${C.green}` }}>
            <img src={animalImg('horse', '🐎')} alt="horse" onError={imgFallback('🐎')} style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: C.greenText }}>خيول</div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>اختر السلالة من الأسفل</div>
            </div>
          </div>
        ) : activeFarm?.type === 'exotic' ? (
          /* Exotic farm → animal grid (filtered to registered types) + breed chips panel */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {(activeFarm.animalTypes?.length > 0
                ? EXOTIC_ANIMALS.filter(a => activeFarm.animalTypes.includes(a.id))
                : EXOTIC_ANIMALS
              ).map(animal => {
                const active = form.type === animal.id;
                return (
                  <button key={animal.id} type="button"
                    onClick={() => setFs({ type: animal.id, breed: '' })}
                    style={{ padding: '16px 8px', borderRadius: '14px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', boxShadow: active ? `0 0 0 3px ${C.green}22` : 'none' }}>
                    <img src={animalImg(animal.id, animal.emoji)} alt={animal.label} onError={imgFallback(animal.emoji)} style={{ width: '40px', height: '40px', marginBottom: '6px', objectFit: 'contain', borderRadius: '8px' }} />
                    <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{animal.label}</div>
                  </button>
                );
              })}
            </div>
            {/* Breed chips for selected exotic animal */}
            {EXOTIC_BREEDS_CHIPS[form.type]?.length > 0 && (
              <div style={{ marginTop: '14px', padding: '14px', background: C.greenBg, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.greenText, marginBottom: '9px' }}>
                  {EXOTIC_ANIMALS.find(a => a.id === form.type)?.emoji} سلالة {EXOTIC_ANIMALS.find(a => a.id === form.type)?.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {EXOTIC_BREEDS_CHIPS[form.type].map(breed => {
                    const active = form.breed === breed;
                    return (
                      <button key={breed} type="button"
                        onClick={() => set('breed', active ? '' : breed)}
                        style={{ padding: '6px 14px', borderRadius: '99px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.card : 'transparent', color: active ? C.greenText : C.text, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s', boxShadow: active ? C.shadow : 'none' }}>
                        {breed}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Livestock / mixed / unknown → 3-category split */
          <div>
            {/* Category tabs if mixed farm */}
            {(!activeFarm || ['mixed', 'other'].includes(activeFarm.type)) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { cat: 'livestock', icon: '🐄', label: 'مواشي', types: LIVESTOCK_TYPES.map(l => l.id) },
                  { cat: 'horses',    icon: '🐎', label: 'خيول',  types: ['horse'] },
                  { cat: 'poultry',   icon: '🐔', label: 'دواجن', types: ['poultry'] },
                ].map(({ cat, icon, label, types }) => {
                  const active = types.includes(form.type) || (cat === 'poultry' && form.type === 'poultry');
                  return (
                    <button key={cat} type="button"
                      onClick={() => setFs({ type: types[0], breed: cat === 'poultry' ? '' : '' })}
                      style={{ flex: 1, padding: '10px 6px', borderRadius: '10px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '3px' }}>{icon}</div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Livestock animals — filtered to farm's registered types when applicable */}
            {form.type !== 'poultry' && form.type !== 'horse' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '4px' }}>
                {(activeFarm?.type === 'livestock' && activeFarm.animalTypes?.length > 0
                  ? LIVESTOCK_TYPES.filter(lt => activeFarm.animalTypes.includes(lt.id))
                  : LIVESTOCK_TYPES
                ).map(lt => {
                  const active = form.type === lt.id;
                  return (
                    <button key={lt.id} type="button" onClick={() => setFs({ type: lt.id, breed: '' })}
                      style={{ padding: '16px 8px', borderRadius: '14px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', boxShadow: active ? `0 0 0 3px ${C.green}22` : 'none' }}>
                      <img src={animalImg(lt.id, lt.emoji)} alt={lt.label} onError={imgFallback(lt.emoji)} style={{ width: '40px', height: '40px', marginBottom: '6px', objectFit: 'contain', borderRadius: '8px' }} />
                      <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{lt.label}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Poultry sub-types (when poultry tab is active in mixed) */}
            {form.type === 'poultry' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '4px' }}>
                {POULTRY_SUBTYPES.map(sub => {
                  const active = form.breed === sub.label;
                  return (
                    <button key={sub.id} type="button" onClick={() => setFs({ type: 'poultry', breed: sub.label })}
                      style={{ padding: '16px 8px', borderRadius: '14px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', boxShadow: active ? `0 0 0 3px ${C.green}22` : 'none' }}>
                      <img src={animalImg(sub.id, sub.emoji)} alt={sub.label} onError={imgFallback(sub.emoji)} style={{ width: '40px', height: '40px', marginBottom: '6px', objectFit: 'contain', borderRadius: '8px' }} />
                      <div style={{ fontSize: '11px', fontWeight: '700', color: active ? C.greenText : C.text }}>{sub.label}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <ErrMsg msg={errors.type} />
      </div>

      {/* Breed — chip selector (hidden for poultry since breed = sub-type above) */}
      {form.type !== 'poultry' && (
        <div>
          <Lbl>{t('addListing.step1.breed')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>{t('common.optional')}</span></Lbl>

          {/* Quick-select chips — filtered by farm breed preferences */}
          {TYPE_BREEDS_CHIPS[form.type]?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '10px' }}>
              {resolveBreeds(activeFarm?._id, form.type, TYPE_BREEDS_CHIPS[form.type] || []).map(breed => {
                const active = form.breed === breed;
                return (
                  <button key={breed} type="button" onClick={() => set('breed', active ? '' : breed)}
                    style={{ padding: '6px 14px', borderRadius: '99px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : 'transparent', color: active ? C.greenText : C.text, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                    {breed}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom input if not in list */}
          <div style={{ position: 'relative' }} ref={breedRef}>
            <FocusInput
              type="text"
              value={TYPE_BREEDS_CHIPS[form.type]?.includes(form.breed) ? '' : form.breed}
              onChange={e => { set('breed', e.target.value); setBreedOpen(true); }}
              onFocus={() => setBreedOpen(true)}
              placeholder={TYPE_BREEDS_CHIPS[form.type]?.includes(form.breed) ? `✓ ${form.breed}` : t('addListing.step1.breedPlaceholder')}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      )}

      {/* Age */}
      <div>
        <Lbl req>{t('addListing.step1.age')}</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <FocusInput type="number" min="0" step="0.5" value={form.ageValue} onChange={e => set('ageValue', e.target.value)} placeholder={t('addListing.step1.agePlaceholder')} />
          </div>
          <UnitPill value={form.ageUnit} onChange={v => set('ageUnit', v)} opts={['months', 'years']} labels={[t('addListing.step1.months'), t('addListing.step1.years')]} />
        </div>
        <ErrMsg msg={errors.ageValue} />
        {form.ageValue && form.ageUnit === 'years' && (
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>= {toMonths(form.ageValue, 'years')} {t('addListing.step1.monthsLabel')}</div>
        )}
      </div>

      {/* Gender */}
      <div>
        <Lbl req>{t('addListing.step1.gender')}</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[{ key: 'male', emoji: '♂', labelKey: 'herd.gender.male' }, { key: 'female', emoji: '♀', labelKey: 'herd.gender.female' }, { key: 'other', emoji: '⚥', labelKey: 'herd.gender.other' }].map(g => {
            const active = form.gender === g.key;
            return (
              <button key={g.key} type="button" onClick={() => set('gender', g.key)}
                style={{ flex: 1, padding: '14px 12px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', marginBottom: '5px', color: active ? C.greenText : C.textMuted }}>{g.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: active ? C.greenText : C.text }}>{t(g.labelKey)}</div>
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
      <SectionTitle>{t('addListing.step2.title')}</SectionTitle>

      {/* Weight */}
      <div>
        <Lbl req>{t('addListing.step2.weight')}</Lbl>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <FocusInput type="number" min="0" step="0.1" value={form.weightValue} onChange={e => set('weightValue', e.target.value)} placeholder={t('addListing.step2.weightPlaceholder')} />
          </div>
          <UnitPill value={form.weightUnit} onChange={v => set('weightUnit', v)} opts={['kg', 'lbs']} labels={[t('common.kg'), t('common.lbs')]} />
        </div>
        <ErrMsg msg={errors.weightValue} />
        {form.weightValue && form.weightUnit === 'lbs' && (
          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>= {toKg(form.weightValue, 'lbs')} {t('common.kg')}</div>
        )}
      </div>

      {/* Color */}
      <div>
        <Lbl>{t('addListing.step2.color')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('common.optional')})</span></Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          {activeColors.map(c => {
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
            ✏️ {t('addListing.step2.colorCustom')}
          </button>
        </div>
        {form.color === 'custom' && (
          <div style={{ marginTop: '9px' }}>
            <FocusInput type="text" value={form.colorCustom} onChange={e => set('colorCustom', e.target.value)} placeholder={t('addListing.step2.colorPlaceholder')} dir={isRTL ? 'rtl' : 'ltr'} />
          </div>
        )}
      </div>

      {/* Health */}
      <div>
        <Lbl req>{t('addListing.step2.health')}</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {HEALTH_OPTS.map(h => {
            const active = form.health === h.key;
            return (
              <button key={h.key} type="button" onClick={() => set('health', h.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'right', width: '100%' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{h.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: active ? C.greenText : C.text }}>{t(h.labelKey)}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '1px' }}>{t(h.subKey)}</div>
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

      {/* Traits */}
      <div>
        <Lbl>{t('addListing.step2.traits')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('addListing.step2.traitsHint')})</span></Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {traitOpts.map(tr => {
            const active = form.traits.includes(tr.key);
            return (
              <button key={tr.key} type="button" onClick={() => toggleTrait(tr.key)}
                style={{ padding: '8px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, color: active ? C.greenText : C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                {active && <span style={{ marginLeft: '4px' }}>✓</span>}{t(tr.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purpose */}
      <div>
        <Lbl>الغرض من البيع</Lbl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { val: 'general',   label: '🐄 عام' },
            { val: 'fattening', label: '📈 للتسمين' },
            { val: 'breeding',  label: '🌱 للتربية' },
            { val: 'newborn',   label: '🐣 مواليد' },
            { val: 'slaughter', label: '🔪 للذبح' },
          ].map(({ val, label }) => {
            const active = form.purpose === val;
            return (
              <button key={val} type="button" onClick={() => set('purpose', val)}
                style={{ padding: '8px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, color: active ? C.greenText : C.text, fontSize: '13px', fontWeight: active ? '700' : '500', cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Step 3 ── Documentation
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle>{t('addListing.step3.title')}</SectionTitle>
      <div style={{ background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.amberText }}>
        💡 {t('addListing.step3.hint')}
      </div>

      {DOC_SLOTS.map(doc => {
        const file = docFiles[doc.key];
        return (
          <div key={doc.key}>
            <Lbl>{doc.emoji} {t(doc.labelKey)} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('common.optional')})</span></Lbl>
            <div style={{ border: `1.5px dashed ${file ? C.green : C.border}`, borderRadius: '12px', padding: '14px 16px', background: file ? C.greenBg : '#FDFAF7', transition: 'all 0.2s' }}>
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📎</span>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: C.greenText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  <button type="button" onClick={() => setDocFiles(p => ({ ...p, [doc.key]: null }))}
                    style={{ background: 'none', border: 'none', color: C.redText, fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                    {t('common.delete')}
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <span style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, fontSize: '13px', fontWeight: '600', color: C.textMuted, whiteSpace: 'nowrap' }}>{t('addListing.step3.chooseFile')}</span>
                  <span style={{ fontSize: '12px', color: C.textMuted }}>{t('addListing.step3.fileTypes')}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden onChange={e => setDocFiles(p => ({ ...p, [doc.key]: e.target.files[0] || null }))} />
                </label>
              )}
            </div>
          </div>
        );
      })}

      {/* Custom docs */}
      <div>
        <Lbl>📎 {t('addListing.step3.extraDocs')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('common.optional')}, {t('addListing.step3.multiUpload')})</span></Lbl>
        <div style={{ border: `1.5px dashed ${C.border}`, borderRadius: '12px', padding: '14px 16px', background: '#FDFAF7' }}>
          {docFiles.extra.length === 0 ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <span style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, fontSize: '13px', fontWeight: '600', color: C.textMuted, whiteSpace: 'nowrap' }}>{t('addListing.step3.chooseFiles')}</span>
              <span style={{ fontSize: '12px', color: C.textMuted }}>{t('addListing.step3.multiHint')}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple hidden onChange={e => setDocFiles(p => ({ ...p, extra: Array.from(e.target.files) }))} />
            </label>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center' }}>
              {docFiles.extra.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: C.greenBg, borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: C.greenText, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button type="button" onClick={() => setDocFiles(p => ({ ...p, extra: p.extra.filter((_, j) => j !== i) }))}
                    style={{ background: 'none', border: 'none', color: C.greenText, cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: C.textMuted }}>
                + {t('addListing.step3.addMore')}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple hidden onChange={e => setDocFiles(p => ({ ...p, extra: [...p.extra, ...Array.from(e.target.files)] }))} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Step 4 ── Photos
  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle>{t('addListing.step4.title')}</SectionTitle>

      <div style={{ background: C.greenBg, border: `1px solid #BBF7D0`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.greenText }}>
        📸 <strong>{t('addListing.step4.tipLabel')}:</strong> {t('addListing.step4.tip')}
      </div>

      {/* منطقة الرفع */}
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={e => addPhotos(Array.from(e.target.files))} />

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addPhotos(Array.from(e.dataTransfer.files)); }}
        style={{ border: `2px dashed ${dragOver ? C.green : C.border}`, borderRadius: '16px', background: dragOver ? '#F0FDF4' : '#FDFAF7', transition: 'all 0.2s', minHeight: photoFiles.length === 0 ? '200px' : 'auto', display: 'flex', flexDirection: 'column', alignItems: photoFiles.length === 0 ? 'center' : 'stretch', justifyContent: photoFiles.length === 0 ? 'center' : 'flex-start', padding: '20px', cursor: photoFiles.length === 0 ? 'pointer' : 'default' }}
        onClick={() => photoFiles.length === 0 && photoInputRef.current?.click()}
      >
        {photoFiles.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>📷</div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: C.text, marginBottom: '6px' }}>{t('addListing.step4.dragDrop')}</div>
            <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '6px' }}>{t('addListing.step4.orBrowse')}</div>
            <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '18px' }}>📸 {t('addListing.step4.photoHint')}</div>
            <div style={{ display: 'inline-block', padding: '9px 22px', background: C.green, color: '#fff', borderRadius: '9px', fontSize: '13px', fontWeight: '700', pointerEvents: 'none' }}>{t('addListing.step4.browse')}</div>
          </div>
        ) : (
          <>
            {/* Primary photo hero */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.greenText, marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ background: C.green, color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>{t('addListing.step4.primary')}</span>
                {t('addListing.step4.primaryNote')}
              </div>
              <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16 / 9', border: `2.5px solid ${C.green}`, maxHeight: '220px' }}>
                <img src={photoPreviews[0]} alt={t('addListing.step4.primary')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '5px' }}>
                  <button type="button" onClick={e => { e.stopPropagation(); removePhoto(0); }}
                    title={t('common.delete')} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: 'rgba(220,38,38,0.88)', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              </div>
            </div>

            {/* Additional photos grid */}
            {(photoPreviews.length > 1 || photoFiles.length < 5) && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.textMuted, marginBottom: '7px' }}>
                  {t('addListing.step4.extraPhotos')} <span style={{ fontWeight: 400 }}>— {t('addListing.step4.reorder')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                  {photoPreviews.slice(1).map((url, j) => {
                    const i = j + 1;
                    return (
                      <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1 / 1', border: `1.5px solid ${C.border}` }}>
                        <img src={url} alt={`${t('addListing.step4.photoAlt')} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', display: 'flex', justifyContent: 'flex-end', gap: '3px' }}>
                          {i > 1 && (
                            <button type="button" onClick={e => { e.stopPropagation(); movePhoto(i, -1); }}
                              title={t('addListing.step4.moveLeft')} style={{ width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.85)', color: C.text, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
                          )}
                          {i < photoFiles.length - 1 && (
                            <button type="button" onClick={e => { e.stopPropagation(); movePhoto(i, 1); }}
                              title={t('addListing.step4.moveRight')} style={{ width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.85)', color: C.text, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
                          )}
                          <button type="button" onClick={e => { e.stopPropagation(); removePhoto(i); }}
                            title={t('common.delete')} style={{ width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: 'rgba(220,38,38,0.88)', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  {/* خانة إضافة صورة */}
                  {photoFiles.length < 5 && (
                    <div onClick={e => { e.stopPropagation(); photoInputRef.current?.click(); }}
                      style={{ borderRadius: '10px', border: `2px dashed ${C.border}`, aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '4px', transition: 'border-color 0.15s, background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = '#F0FDF4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '20px', color: C.textMuted }}>+</span>
                      <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: '600' }}>{t('addListing.step4.addPhoto')}</span>
                      <span style={{ fontSize: '10px', color: C.textMuted }}>{5 - photoFiles.length} {t('addListing.step4.remaining')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '12px', color: C.textMuted, textAlign: 'right' }}>
              {photoFiles.length} / 5 {t('addListing.step4.photosCount')} · {t('addListing.step4.firstIsPrimary')}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Step 5 ── Pricing & Description
  const renderStep5 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionTitle>{t('addListing.step5.title')}</SectionTitle>

      {/* Price per kg */}
      <div>
        <Lbl req>{t('addListing.step5.pricePerKg')}</Lbl>
        <div style={{ position: 'relative' }}>
          <FocusInput type="number" min="0" step="0.01" value={form.pricePerKg} onChange={e => set('pricePerKg', e.target.value)} placeholder={t('addListing.step5.pricePlaceholder')} style={{ paddingRight: '80px' }} />
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>{t('common.egp')} / {t('common.kg')}</span>
        </div>
        <ErrMsg msg={errors.pricePerKg} />

        {/* Market average hint */}
        {marketAvg && (
          <div style={{ marginTop: '6px', padding: '8px 12px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: '#92400E', fontWeight: '600' }}>📊 {t('addListing.step5.marketAvg')}</span>
            <span style={{ fontWeight: '800', color: '#D97706' }}>{Math.round(marketAvg).toLocaleString('ar-EG')} {t('common.egp')} / {t('common.kg')}</span>
          </div>
        )}

        {form.pricePerKg && form.weightValue && (
          <div style={{ marginTop: '8px', padding: '10px 14px', background: C.greenBg, border: '1px solid #BBF7D0', borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: C.greenText }}>{t('addListing.step5.totalPrice')}</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: C.greenText }}>
              {(parseFloat(form.pricePerKg) * toKg(form.weightValue, form.weightUnit)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} {t('common.egp')}
            </span>
          </div>
        )}
      </div>

      {/* Pickup location */}
      <div>
        <Lbl req>{t('addListing.step5.location')}</Lbl>
        <FocusInput type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder={t('addListing.step5.locationPlaceholder')} dir={isRTL ? 'rtl' : 'ltr'} />
        <ErrMsg msg={errors.location} />
      </div>

      {/* Delivery options */}
      <div>
        <Lbl>{t('addListing.step5.delivery')}</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { val: 'none',  labelKey: 'addListing.step5.deliveryNone',  subKey: 'addListing.step5.deliveryNoneSub'  },
            { val: 'farm',  labelKey: 'addListing.step5.deliveryFarm',  subKey: 'addListing.step5.deliveryFarmSub'  },
            { val: 'admin', labelKey: 'addListing.step5.deliveryAdmin', subKey: 'addListing.step5.deliveryAdminSub' },
          ].map(({ val, labelKey, subKey }) => (
            <div key={val}
              onClick={() => set('deliveryType', val)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: `1.5px solid ${form.deliveryType === val ? C.green : C.border}`, borderRadius: '10px', cursor: 'pointer', background: form.deliveryType === val ? C.greenBg : '#fff', transition: 'all 0.15s' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${form.deliveryType === val ? C.green : C.border}`, background: form.deliveryType === val ? C.green : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {form.deliveryType === val && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: C.text }}>{t(labelKey)}</div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>{t(subKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {form.deliveryType === 'farm' && (
        <div style={{ animation: 'slideDown 0.2s ease' }}>
          <Lbl>{t('addListing.step5.deliveryCost')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('addSupply.deliveryCostHint')})</span></Lbl>
          <div style={{ position: 'relative' }}>
            <FocusInput type="number" min="0" step="1" value={form.deliveryCost} onChange={e => set('deliveryCost', e.target.value)} placeholder={t('addListing.step5.deliveryCostPlaceholder')} style={{ paddingRight: '60px' }} />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>{t('common.egp')}</span>
          </div>
        </div>
      )}

      {/* Eid options */}
      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: '#15803D', marginBottom: '12px' }}>🌙 {t('addListing.step5.eidOptions')}</div>

        {/* eidAvailable toggle */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={form.eidAvailable}
            onChange={e => set('eidAvailable', e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('addListing.step5.eidAvailable')}</div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{t('addListing.step5.eidAvailableSub')}</div>
          </div>
        </label>

        {/* slaughterService toggle */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.slaughterService}
            onChange={e => set('slaughterService', e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#15803D', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('addListing.step5.slaughter')}</div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{t('addListing.step5.slaughterSub')}</div>
          </div>
        </label>

        {/* slaughterCost input */}
        {form.slaughterService && (
          <div style={{ marginTop: '12px', animation: 'slideDown 0.2s ease' }}>
            <Lbl>{t('addListing.step5.slaughterCost')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('addSupply.deliveryCostHint')})</span></Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="1" value={form.slaughterCost} onChange={e => set('slaughterCost', e.target.value)} placeholder={t('addListing.step5.slaughterCostPlaceholder')} style={{ paddingRight: '60px' }} />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>{t('common.egp')}</span>
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
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('addListing.step5.deposit')}</div>
              <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{t('addListing.step5.depositSub')}</div>
            </div>
          </label>
          {form.depositRequired && (
            <div style={{ marginTop: '10px' }}>
              <Lbl req>{t('addListing.step5.depositPct')}</Lbl>
              <div style={{ position: 'relative', maxWidth: '180px' }}>
                <FocusInput
                  type="number" min="1" max="100" step="1"
                  value={form.depositPercentage}
                  onChange={e => set('depositPercentage', e.target.value)}
                  placeholder={t('addListing.step5.depositPlaceholder')}
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>%</span>
              </div>
            </div>
          )}
        </div>

        {/* Qurbani shares toggle */}
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
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('addListing.step5.qurbani')}</div>
                <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{t('addListing.step5.qurbaniSub')}</div>
              </div>
            </label>

            {form.qurbaniEnabled && (
              <div style={{ animation: 'slideDown 0.2s ease', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'seventh', labelKey: 'addListing.step5.qurbaniSeventh', hintKey: 'addListing.step5.qurbaniSeventhHint' },
                  { key: 'quarter', labelKey: 'addListing.step5.qurbaniQuarter', hintKey: '' },
                  { key: 'half',    labelKey: 'addListing.step5.qurbaniHalf',    hintKey: '' },
                ].map(({ key, labelKey, hintKey }) => {
                  const share = form.qurbaniShares[key];
                  const setShare = (field, val) => set('qurbaniShares', { ...form.qurbaniShares, [key]: { ...share, [field]: val } });
                  return (
                    <div key={key} style={{ background: share.enabled ? '#fff' : '#F0FDF4', border: `1px solid ${share.enabled ? '#86EFAC' : '#BBF7D0'}`, borderRadius: '10px', padding: '10px 12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: share.enabled ? '10px' : '0' }}>
                        <input type="checkbox" checked={share.enabled} onChange={e => setShare('enabled', e.target.checked)}
                          style={{ accentColor: '#15803D', width: '14px', height: '14px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#15803D' }}>{t(labelKey)}</span>
                        {hintKey && <span style={{ fontSize: '11px', color: C.textMuted }}>{t(hintKey)}</span>}
                      </label>
                      {share.enabled && (
                        <div style={{ display: 'flex', gap: '10px', animation: 'slideDown 0.15s ease' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textMuted, marginBottom: '4px' }}>{t('addListing.step5.sharePrice')} *</div>
                            <div style={{ position: 'relative' }}>
                              <FocusInput type="number" min="0" step="1" value={share.pricePerShare} onChange={e => setShare('pricePerShare', e.target.value)} placeholder={t('addListing.step5.sharePricePlaceholder')} style={{ paddingRight: '48px' }} />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>{t('common.egp')}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textMuted, marginBottom: '4px' }}>{t('addListing.step5.totalShares')} *</div>
                            <FocusInput type="number" min="1" step="1" value={share.totalShares} onChange={e => setShare('totalShares', e.target.value)} placeholder={t('addListing.step5.totalSharesPlaceholder')} />
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

      {/* Description */}
      <div>
        <Lbl>{t('addListing.step5.description')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: '12px' }}>({t('common.optional')})</span></Lbl>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder={t('addListing.step5.descPlaceholder')}
          rows={6}
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '14px', color: C.text, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8, transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = C.green}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '12px', color: C.textMuted }}>{t('addListing.step5.descHint')}</span>
          <span aria-hidden="true" style={{ fontSize: '12px', color: form.description.length > 20 ? C.greenText : C.textMuted }}>{form.description.length} {t('addListing.step5.chars')}</span>
        </div>
      </div>

      {/* Description tips */}
      <div style={{ background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 16px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: C.amberText, marginBottom: '9px' }}>💡 {t('addListing.step5.tips')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TIPS_KEYS.map((tipKey, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: C.amberText, direction: isRTL ? 'rtl' : 'ltr' }}>
              <span style={{ flexShrink: 0 }}>•</span>
              <span>{t(tipKey)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* خطأ الإرسال */}
      {submitErr && (
        <div role="alert" style={{ background: C.redBg, border: `1px solid #FECACA`, borderRadius: '10px', padding: '11px 14px', color: C.redText, fontSize: '14px' }}>
          {submitErr}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5][step - 1];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #2C1810 0%, #5C3317 55%, #7C4A1E 100%)', padding: '22px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -8, top: -16, fontSize: '110px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🐾</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>{pageTitle}</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{t('addListing.step')} {step} {t('addListing.of')} 5</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setShowPreview(true)}
              style={{ padding: '8px 15px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              👁 {t('addListing.preview')}
            </button>
            <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
              style={{ padding: '8px 15px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: submitting ? 'rgba(58,125,68,0.5)' : 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? '...' : `💾 ${t('addListing.saveDraft')}`}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px 48px', maxWidth: '620px', margin: '0 auto' }}>

        {/* Draft restore banner */}
        {draftBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: C.amberBg, border: '1px solid #FDE68A', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: C.amberText }}>
            <span>📋 <strong>{t('addListing.draftRestored')}</strong> {t('addListing.draftRestoredSub')}</span>
            <button type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraftBanner(false); resetAll(); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.amberText, cursor: 'pointer', fontSize: '12px', fontWeight: '700', textDecoration: 'underline' }}>
              {t('addListing.draftDiscard')}
            </button>
          </div>
        )}

        {/* ── Progress stepper ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '30px' }}>
          {STEPS.map((s, i) => {
            const done   = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? '1 1 auto' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: `2px solid ${done || active ? C.green : C.border}`, background: done ? C.green : active ? C.greenBg : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? '16px' : '16px', color: done ? '#fff' : active ? C.greenText : C.textMuted, transition: 'all 0.3s', fontWeight: '700' }}>
                    {done ? '✓' : s.icon}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: done || active ? C.green : C.textMuted, whiteSpace: 'nowrap', textAlign: 'center' }}>{t(s.labelKey)}</span>
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
            {t('common.back')} →
          </button>

          <div style={{ flex: 1 }} />

          {step < 5 ? (
            <button type="button" onClick={goNext}
              style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.greenDark}
              onMouseLeave={e => e.currentTarget.style.background = C.green}
            >
              ← {t('addListing.next')}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
                style={{ padding: '12px 20px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                💾 حفظ كمسودة
              </button>
              <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
                style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: submitting ? '#6AAF74' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                {submitting ? t('addListing.submitting') : `🚀 ${t('addListing.publish')}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Preview modal ── */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowPreview(false)}>
          <div style={{ background: C.bg, borderRadius: '20px', padding: '24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideDown 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>{t('addListing.previewTitle')}</h3>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ background: C.card, borderRadius: '16px', border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              {/* Hero image */}
              <div style={{ height: '200px', background: previewImg ? undefined : C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {previewImg
                  ? <img src={previewImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '72px' }}>{previewEmoji}</span>
                }
                {form.health && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: C.greenBg, color: C.greenText, border: `1px solid #BBF7D0`, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '12px' }}>
                    {t(HEALTH_OPTS.find(h => h.key === form.health)?.labelKey || '') || form.health}
                  </div>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '17px', color: C.text }}>{t(TYPE_KEY[form.type]) || '—'}</div>
                    <div style={{ fontSize: '13px', color: C.textMuted }}>{form.breed || t('addListing.previewNoBreed')}</div>
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: C.green }}>
                    {form.pricePerKg ? `${form.pricePerKg} ${t('common.egp')}/${t('common.kg')}` : t('addListing.previewNoPrice')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {form.ageValue && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted }}>{form.ageValue} {form.ageUnit}</span>}
                  {form.weightValue && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted }}>{form.weightValue} {form.weightUnit}</span>}
                  {form.gender && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: '#F5F0EA', color: C.textMuted, textTransform: 'capitalize' }}>{form.gender}</span>}
                  {form.deliveryType !== 'none' && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: C.greenBg, color: C.greenText }}>🚛 {form.deliveryType === 'farm' ? t('addListing.step5.deliveryFarm') : t('addListing.step5.deliveryAdmin')}</span>}
                </div>
                {form.location && <div style={{ marginTop: '8px', fontSize: '12px', color: C.textMuted }}>📍 {form.location}</div>}
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.textMuted, textAlign: 'center' }}>{t('addListing.previewNote')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAddListing;
