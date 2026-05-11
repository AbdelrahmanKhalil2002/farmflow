import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, verifyNationalId } from '../services/authService';
import { validateEgyptianId } from '../utils/egyptianId';
import { useLang, LangToggle } from '../context/LangContext';
import { C as _C } from '../tokens';
import { animalImg, imgFallback } from '../utils/animalImg';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ..._C,
  buyerPanel:  'linear-gradient(155deg, #0E2E1A 0%, #1A5C30 50%, #2D7A42 100%)',
  sellerPanel: 'linear-gradient(155deg, #1C0E05 0%, #4A2208 48%, #6B3518 100%)',
  amberLt:     '#FFFBEB',
};

// ─── Bilingual data arrays ────────────────────────────────────────────────────
const GOVERNORATES = [
  { ar: 'القاهرة',       en: 'Cairo'          },
  { ar: 'الجيزة',        en: 'Giza'           },
  { ar: 'الإسكندرية',    en: 'Alexandria'     },
  { ar: 'الشرقية',       en: 'Sharqia'        },
  { ar: 'الدقهلية',      en: 'Dakahlia'       },
  { ar: 'البحيرة',       en: 'Beheira'        },
  { ar: 'الغربية',       en: 'Gharbia'        },
  { ar: 'المنوفية',      en: 'Monufia'        },
  { ar: 'القليوبية',     en: 'Qalyubia'       },
  { ar: 'كفر الشيخ',     en: 'Kafr El-Sheikh' },
  { ar: 'دمياط',         en: 'Damietta'       },
  { ar: 'الإسماعيلية',   en: 'Ismailia'       },
  { ar: 'بورسعيد',       en: 'Port Said'      },
  { ar: 'السويس',        en: 'Suez'           },
  { ar: 'المنيا',        en: 'Minya'          },
  { ar: 'بني سويف',      en: 'Beni Suef'      },
  { ar: 'الفيوم',        en: 'Fayoum'         },
  { ar: 'أسيوط',         en: 'Asyut'          },
  { ar: 'سوهاج',         en: 'Sohag'          },
  { ar: 'قنا',           en: 'Qena'           },
  { ar: 'الأقصر',        en: 'Luxor'          },
  { ar: 'أسوان',         en: 'Aswan'          },
  { ar: 'مطروح',         en: 'Matrouh'        },
  { ar: 'شمال سيناء',    en: 'North Sinai'    },
  { ar: 'جنوب سيناء',    en: 'South Sinai'    },
  { ar: 'الوادي الجديد', en: 'New Valley'     },
  { ar: 'البحر الأحمر',  en: 'Red Sea'        },
];

// ── Context-aware animal options per farm type ────────────────────────────────
const FARM_ANIMAL_OPTIONS = {
  livestock: [
    { id: 'cattle',  emoji: '🐄', ar: 'أبقار', en: 'Cattle'  },
    { id: 'buffalo', emoji: '🐃', ar: 'جاموس', en: 'Buffalo' },
    { id: 'sheep',   emoji: '🐑', ar: 'أغنام', en: 'Sheep'   },
    { id: 'goat',    emoji: '🐐', ar: 'ماعز',  en: 'Goats'   },
    { id: 'camel',   emoji: '🐪', ar: 'إبل',   en: 'Camels'  },
  ],
  horses: [
    { id: 'horse', emoji: '🐎', ar: 'خيول', en: 'Horses' },
  ],
  poultry: [
    { id: 'chicken_baladi',  emoji: '🐓', ar: 'فراخ بلدي',  en: 'Local Chicken' },
    { id: 'chicken_broiler', emoji: '🐔', ar: 'فراخ تسمين', en: 'Broiler'       },
    { id: 'chicken_layers',  emoji: '🥚', ar: 'فراخ بياضة', en: 'Layers'        },
    { id: 'duck',            emoji: '🦆', ar: 'بط',         en: 'Duck'          },
    { id: 'turkey',          emoji: '🦃', ar: 'ديك رومي',  en: 'Turkey'        },
    { id: 'pigeon',          emoji: '🕊️', ar: 'حمام',       en: 'Pigeon'        },
    { id: 'quail',           emoji: '🐦', ar: 'سمان',       en: 'Quail'         },
    { id: 'goose',           emoji: '🦢', ar: 'إوز',        en: 'Goose'         },
    { id: 'guinea',          emoji: '🦜', ar: 'دراج',       en: 'Guinea Fowl'   },
    { id: 'peacock',         emoji: '🦚', ar: 'طاووس',      en: 'Peacock'       },
  ],
  dairy: [
    { id: 'cattle',  emoji: '🐄', ar: 'أبقار', en: 'Cattle'  },
    { id: 'buffalo', emoji: '🐃', ar: 'جاموس', en: 'Buffalo' },
    { id: 'goat',    emoji: '🐐', ar: 'ماعز',  en: 'Goats'   },
    { id: 'sheep',   emoji: '🐑', ar: 'أغنام', en: 'Sheep'   },
  ],
  exotic: [
    { id: 'ostrich',   emoji: '🦢', ar: 'نعام',    en: 'Ostrich'   },
    { id: 'gazelle',   emoji: '🦌', ar: 'غزلان',   en: 'Gazelles'  },
    { id: 'oryx',      emoji: '🦬', ar: 'مها',     en: 'Oryx'      },
    { id: 'deer',      emoji: '🦌', ar: 'أيل',     en: 'Deer'      },
    { id: 'llama',     emoji: '🦙', ar: 'لاما',    en: 'Llama'     },
    { id: 'alpaca',    emoji: '🦙', ar: 'ألبكا',   en: 'Alpaca'    },
    { id: 'donkey',    emoji: '🐴', ar: 'حمير',    en: 'Donkeys'   },
    { id: 'mule',      emoji: '🐴', ar: 'بغال',    en: 'Mules'     },
  ],
};
// mixed shows a broad set
FARM_ANIMAL_OPTIONS.mixed = [
  ...FARM_ANIMAL_OPTIONS.livestock,
  ...FARM_ANIMAL_OPTIONS.horses,
  { id: 'chicken_baladi', emoji: '🐓', ar: 'فراخ بلدي',  en: 'Local Chicken' },
  { id: 'duck',           emoji: '🦆', ar: 'بط',         en: 'Duck'          },
  { id: 'turkey',         emoji: '🦃', ar: 'ديك رومي',  en: 'Turkey'        },
];
FARM_ANIMAL_OPTIONS.other = FARM_ANIMAL_OPTIONS.mixed;

// ── Breed chips per animal type ───────────────────────────────────────────────
const ANIMAL_BREEDS_REG = {
  cattle:          ['فريزيان', 'هولشتاين', 'براهمان', 'سيمنتال', 'ليموزين', 'واجو', 'أنغوس', 'بلدي'],
  buffalo:         ['بلدي مصري', 'مري', 'نيلي رافي'],
  sheep:           ['نجدي', 'عواسي', 'بربرة', 'نعيمي', 'ميرينو', 'سفولك', 'بلدي'],
  goat:            ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين'],
  camel:           ['دروميدار', 'مجاهيم', 'حُمُر', 'وضحاء'],
  horse:           ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان', 'خيل عمل'],
  // poultry sub-types
  chicken_baladi:  ['فيومي', 'دمياطي', 'سيناوي', 'بلدي مصري', 'عسيل', 'دجاج الصخرة', 'حساني'],
  chicken_broiler: ['روس 308', 'كوب 500', 'هبارد', 'أريبياكلس', 'راس', 'مارشال'],
  chicken_layers:  ['هاي لاين', 'لومان براون', 'نوفوجن', 'إيزا براون', 'شيفر', 'باب كوك'],
  duck:            ['بكين', 'مسكوفي', 'كايوغا', 'رووين', 'إيندير رانر'],
  turkey:          ['برونز الكبير', 'ذهبي', 'أبيض عريض الصدر', 'نيكولاس 300', 'بيوتي'],
  pigeon:          ['زاجل', 'مموه', 'مروب', 'تيلر', 'جيكوبان', 'رومان', 'الملك', 'قاصر'],
  quail:           ['ياباني', 'أمريكي', 'فرنسي', 'بوب وايت', 'كوتورنيكس'],
  goose:           ['إمبدن', 'تولوز', 'أفريكان', 'بيلجريم', 'أوروبي'],
  guinea:          ['بيرل', 'أبيض', 'لافندر', 'كورنيش'],
  peacock:         ['هندي أزرق', 'أبيض', 'شابو', 'بياض العين'],
  // exotic animals
  ostrich:         ['أفريقي الرقبة الحمراء', 'أفريقي الرقبة الزرقاء', 'أسترالي', 'أمريكي', 'صومالي'],
  gazelle:         ['غزال الريم', 'غزال الدوركاس', 'غزال السبلة', 'غزال الجبلي', 'غزال عفري'],
  oryx:            ['مها عربي أبيض', 'مها عربي أسمر'],
  deer:            ['أيل أحمر', 'أيل الأكسيس', 'أيل الدام'],
  llama:           ['كلاسيكية', 'بنية', 'بيضاء'],
  alpaca:          ['هواكايا', 'سوري'],
  donkey:          ['مصري بلدي', 'صومالي', 'نوبي', 'إيطالي', 'أمريكي'],
  mule:            ['بغل عمل', 'بغل رياضي'],
};

const BUYER_PERKS = [
  { ar: 'أكثر من ١٢٠٠ إعلان معتمد',   en: '1,200+ verified listings'        },
  { ar: 'تواصل مباشر مع البائعين',      en: 'Direct contact with sellers'     },
  { ar: 'تتبع طلباتك بسهولة',           en: 'Easy order tracking'             },
  { ar: 'حماية المعاملات من FarmFlow',  en: 'FarmFlow transaction protection'  },
];

const SELLER_PERKS = [
  { ar: 'تواصل مع أكثر من ٥٠٠ مشترٍ',  en: 'Reach 500+ active buyers'     },
  { ar: 'إنشاء إعلانات مجانية',          en: 'Free listing creation'         },
  { ar: 'إدارة المصاريف والدخل',         en: 'Expense & income tracker'      },
  { ar: 'لوحة تحكم متكاملة للطلبات',    en: 'Full order management panel'   },
];

const TRUST_STATS = [
  { value: '١٢٠٠+', ar: 'إعلان معتمد',  en: 'Verified Listings' },
  { value: '٣',      ar: 'سنوات تشغيل', en: 'Years Operating'   },
  { value: '٦٠٠+',  ar: 'صفقة ناجحة',  en: 'Successful Sales'  },
];

// Map Arabic validation error strings → translation keys
const ID_ERR_KEYS = {
  'يجب أن يتكون من 14 رقمًا بالضبط':       'reg.idErr.notFourteen',
  'الرقم الأول يجب أن يكون 2 أو 3':         'reg.idErr.badCentury',
  'شهر الميلاد غير صحيح':                   'reg.idErr.badMonth',
  'يوم الميلاد غير صحيح':                   'reg.idErr.badDay',
  'تاريخ الميلاد في المستقبل':               'reg.idErr.futureDate',
  'يجب أن يكون العمر 16 عامًا على الأقل':   'reg.idErr.tooYoung',
  'كود المحافظة غير صحيح':                   'reg.idErr.badGov',
};

const parseError = (err, t) => {
  const data = err.response?.data;
  if (!data) return t('common.networkErr');
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || t('common.unknownErr');
};

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, optLabel, name, type = 'text', placeholder, value, onChange,
                 autoFocus, required = true, children }) => {
  const { isRTL, t } = useLang();
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={name} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{label}</span>
        {optLabel && <span style={{ fontSize: '11px', color: C.muted, fontWeight: '400' }}>{optLabel}</span>}
        {!required && !optLabel && <span style={{ fontSize: '11px', color: C.muted, marginInlineStart: 'auto' }}>({t('common.optional').replace(/[()]/g,'')})</span>}
      </label>
      {children ? children({ focused, setFocused }) : (
        <input
          id={name} name={name} type={type} value={value} onChange={onChange}
          placeholder={placeholder} required={required} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            border: `1.5px solid ${focused ? C.green : C.border}`,
            borderRadius: '10px', background: C.white, fontSize: '15px',
            color: C.text, transition: 'border-color 0.15s', fontFamily: 'inherit', outline: 'none',
          }}
        />
      )}
    </div>
  );
};

// ─── PhoneField ───────────────────────────────────────────────────────────────
const PhoneField = ({ label, name, value, onChange, required = true, autoFocus = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={name} style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>
        {label}
      </label>
      <div
        style={{ display: 'flex', direction: 'ltr', border: `1.5px solid ${focused ? C.green : C.border}`, borderRadius: '10px', overflow: 'hidden', background: C.white, transition: 'border-color 0.15s' }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
      >
        <div style={{ padding: '0 14px', background: '#F3F7F3', borderInlineEnd: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: C.text, flexShrink: 0, whiteSpace: 'nowrap' }}>
          🇪🇬 +20
        </div>
        <input id={name} name={name} type="tel" value={value} onChange={onChange}
          placeholder="1X XXXX XXXX" required={required} autoFocus={autoFocus}
          maxLength={11} inputMode="numeric"
          style={{ flex: 1, border: 'none', padding: '12px 14px', fontSize: '15px', color: C.text, fontFamily: 'inherit', outline: 'none', background: 'transparent', minWidth: 0, direction: 'ltr' }} />
      </div>
    </div>
  );
};

// ─── PwdField ─────────────────────────────────────────────────────────────────
const PwdField = ({ id, name, value, onChange, placeholder = '••••••••', required = true, minLength }) => {
  const { t } = useLang();
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id} name={name} type={show ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder={placeholder} required={required} minLength={minLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          paddingTop: '12px', paddingBottom: '12px',
          paddingInlineStart: '14px', paddingInlineEnd: '44px',
          boxSizing: 'border-box',
          border: `1.5px solid ${focused ? C.green : C.border}`,
          borderRadius: '10px', background: C.white, fontSize: '15px',
          color: C.text, fontFamily: 'inherit', outline: 'none', direction: 'ltr',
        }}
      />
      <button type="button" onClick={() => setShow(p => !p)} aria-label={show ? t('auth.hidePwd') : t('auth.showPwd')}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '17px', padding: '4px', lineHeight: 1 }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
};

// ─── NationalIdField ──────────────────────────────────────────────────────────
const NationalIdField = ({ value, onChange, onStatusChange }) => {
  const { t, isRTL } = useLang();
  const [focused,  setFocused]  = useState(false);
  const [checking, setChecking] = useState(false);
  const [idInfo,   setIdInfo]   = useState(null);
  const [idError,  setIdError]  = useState('');
  const timerRef  = useRef(null);
  const statusRef = useRef('idle');
  const cbRef     = useRef(onStatusChange);
  useEffect(() => { cbRef.current = onStatusChange; });

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
    onChange({ target: { name: 'nationalId', value: digits } });
  };

  const xlateErr = (msg) => {
    const key = ID_ERR_KEYS[msg];
    return key ? t(key) : msg;
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const notify = (s) => {
      if (statusRef.current !== s) { statusRef.current = s; cbRef.current(s); }
    };

    if (!value) { setChecking(false); setIdInfo(null); setIdError(''); notify('idle'); return; }
    if (value.length < 14) { setChecking(false); setIdInfo(null); setIdError(''); notify('idle'); return; }

    const clientResult = validateEgyptianId(value);
    if (!clientResult.valid) {
      setChecking(false); setIdInfo(null);
      setIdError(xlateErr(clientResult.error || t('reg.idInvalid')));
      notify('invalid'); return;
    }

    setChecking(true); setIdInfo(null); setIdError('');
    notify('checking');

    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await verifyNationalId(value);
        if (data.verified) {
          setChecking(false); setIdInfo(data.info || clientResult.info); notify('valid');
        } else {
          setChecking(false);
          setIdError(data.message || t('reg.idAlreadyReg'));
          notify('invalid');
        }
      } catch {
        setChecking(false); setIdInfo(clientResult.info); notify('valid');
      }
    }, 700);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const borderClr = () => {
    if (idInfo)  return C.green;
    if (idError) return C.errorBorder;
    if (focused) return C.green;
    return C.border;
  };

  return (
    <div>
      <label htmlFor="nationalId" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('reg.nationalId')}</span>
        <span style={{ fontSize: '11px', color: C.muted }}>{t('reg.nationalIdSub')}</span>
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id="nationalId" name="nationalId" type="text" inputMode="numeric"
          value={value} onChange={handleChange}
          placeholder={isRTL ? '٢٩XXXXXXXXXXXXXX' : '2XXXXXXXXXXXXXX'}
          maxLength={14} required
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '12px 44px 12px 14px', boxSizing: 'border-box',
            border: `1.5px solid ${borderClr()}`,
            borderRadius: '10px', background: C.white, fontSize: '16px', letterSpacing: '2px',
            color: C.text, transition: 'border-color 0.15s', fontFamily: 'monospace', outline: 'none',
            direction: 'ltr',
          }}
        />
        <span aria-hidden="true" style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', lineHeight: 1, pointerEvents: 'none' }}>
          {checking           && '⏳'}
          {!checking && idInfo  && '✅'}
          {!checking && idError && '❌'}
        </span>
      </div>

      {!idInfo && !idError && value.length > 0 && value.length < 14 && (
        <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{value.length}/14</div>
      )}
      {idError && (
        <div style={{ fontSize: '11px', color: C.errorText, marginTop: '4px' }}>{idError}</div>
      )}
      {idInfo && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          {idInfo.birthYear && (
            <span style={{ fontSize: '11px', background: C.greenLt, border: '1px solid #BBE0C3', color: C.greenDk, padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
              📅 {idInfo.birthDay}/{idInfo.birthMonth}/{idInfo.birthYear}
            </span>
          )}
          {idInfo.age !== undefined && (
            <span style={{ fontSize: '11px', background: C.greenLt, border: '1px solid #BBE0C3', color: C.greenDk, padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
              🎂 {idInfo.age} {t('reg.idYears')}
            </span>
          )}
          {idInfo.governorateName && (
            <span style={{ fontSize: '11px', background: C.greenLt, border: '1px solid #BBE0C3', color: C.greenDk, padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
              📍 {idInfo.governorateName}
            </span>
          )}
          {idInfo.gender && (
            <span style={{ fontSize: '11px', background: C.greenLt, border: '1px solid #BBE0C3', color: C.greenDk, padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
              {idInfo.gender === 'male' ? `👨 ${t('reg.idGenderMale')}` : `👩 ${t('reg.idGenderFemale')}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── ProgressDots ─────────────────────────────────────────────────────────────
const ProgressDots = ({ step, total }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ height: '4px', width: step >= i + 1 ? '20px' : '8px', borderRadius: '2px', background: step >= i + 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.22)', transition: 'all 0.3s' }} />
    ))}
  </div>
);

// ─── Register ─────────────────────────────────────────────────────────────────
const Register = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const { user, login } = useAuth();
  const { t, isRTL, lang } = useLang();

  const roleFromUrl = searchParams.get('role');

  const [step,       setStep]     = useState(roleFromUrl ? 1 : 0);
  const [error,      setError]    = useState('');
  const [submitting, setSubmit]   = useState(false);
  const [isMobile,   setMobile]   = useState(window.innerWidth < 768);
  const [idStatus,   setIdStatus] = useState('idle');

  const defaultFarm = () => ({ name: '', type: 'livestock', governorate: '', farmPhone: '', animalTypes: [], typicalPrices: {}, breeds: {}, dairyProducts: false });

  const [form, setForm] = useState({
    name: '', password: '', confirm: '', agreed: false,
    role: roleFromUrl || 'buyer', nationalId: '',
    // buyer
    email: '', phone: '', governorate: '',
    // seller step 1
    personalPhone: '',
    // seller step 2 — multi-farm
    farms: [defaultFarm()],
  });

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const isBuyer    = form.role === 'buyer';
  const totalSteps = isBuyer ? 1 : 2;
  const dir        = isRTL ? 'rtl' : 'ltr';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const pickRole = (role) => { setForm(p => ({ ...p, role })); setIdStatus('idle'); setStep(1); };

  // ── Farm helpers ─────────────────────────────────────────────────────────────
  const setFarmCount = (n) => {
    setForm(p => {
      const cur = p.farms;
      if (n > cur.length) return { ...p, farms: [...cur, ...Array(n - cur.length).fill(null).map(defaultFarm)] };
      return { ...p, farms: cur.slice(0, n) };
    });
  };

  const updateFarm = (idx, patch) =>
    setForm(p => ({ ...p, farms: p.farms.map((f, i) => i === idx ? { ...f, ...patch } : f) }));

  const toggleFarmAnimal = (idx, animalId) =>
    setForm(p => ({
      ...p,
      farms: p.farms.map((f, i) => {
        if (i !== idx) return f;
        const has = f.animalTypes.includes(animalId);
        const animalTypes = has ? f.animalTypes.filter(x => x !== animalId) : [...f.animalTypes, animalId];
        const typicalPrices = has ? Object.fromEntries(Object.entries(f.typicalPrices).filter(([k]) => k !== animalId)) : f.typicalPrices;
        return { ...f, animalTypes, typicalPrices };
      }),
    }));

  const setAnimalPrice = (idx, animalId, price) =>
    setForm(p => ({
      ...p,
      farms: p.farms.map((f, i) => i !== idx ? f : { ...f, typicalPrices: { ...f.typicalPrices, [animalId]: price } }),
    }));

  const toggleAnimalBreed = (farmIdx, animalId, breed) =>
    setForm(p => ({
      ...p,
      farms: p.farms.map((f, i) => {
        if (i !== farmIdx) return f;
        const cur = f.breeds[animalId] || [];
        return { ...f, breeds: { ...f.breeds, [animalId]: cur.includes(breed) ? cur.filter(b => b !== breed) : [...cur, breed] } };
      }),
    }));

  const validateStep1 = () => {
    if (!form.name.trim())                                    { setError(t('reg.err.name'));         return false; }
    if (isBuyer && !form.email.includes('@'))                 { setError(t('reg.err.email'));        return false; }
    if (!isBuyer && form.email && !form.email.includes('@'))  { setError(t('reg.err.emailFmt'));     return false; }
    if (isBuyer && !form.phone.trim())                        { setError(t('reg.err.phone'));        return false; }
    if (!isBuyer && !form.personalPhone.trim())               { setError(t('reg.err.personalPhone')); return false; }
    if (!form.nationalId || idStatus !== 'valid')             { setError(t('reg.err.nationalId'));   return false; }
    if (form.password.length < 8)                             { setError(t('reg.err.pwdLen'));       return false; }
    if (form.password !== form.confirm)                       { setError(t('reg.err.pwdMatch'));     return false; }
    if (isBuyer && !form.governorate)                         { setError(t('reg.err.gov'));          return false; }
    if (!form.agreed)                                         { setError(t('reg.err.terms'));        return false; }
    setError(''); return true;
  };

  const validateStep2 = () => {
    const ORDINALS = ['الأولى','الثانية','الثالثة','الرابعة'];
    for (let i = 0; i < form.farms.length; i++) {
      const f = form.farms[i];
      if (!f.name.trim())      { setError(`أدخل اسم المزرعة ${ORDINALS[i] || i+1}`);     return false; }
      if (!f.farmPhone.trim()) { setError(`أدخل تليفون المزرعة ${ORDINALS[i] || i+1}`); return false; }
    }
    setError(''); return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1 && !isBuyer) { if (validateStep1()) setStep(2); return; }
    if (step === 1 && isBuyer  && !validateStep1()) return;
    if (step === 2             && !validateStep2()) return;

    setError(''); setSubmit(true);
    try {
      const payload = { name: form.name.trim(), password: form.password, role: form.role, nationalId: form.nationalId };
      if (isBuyer) {
        payload.email = form.email; payload.phone = form.phone; payload.governorate = form.governorate;
      } else {
        payload.personalPhone = form.personalPhone;
        if (form.email) payload.email = form.email;
        // backward-compat scalar fields (used by login-by-farmPhone etc.)
        payload.farmName  = form.farms[0]?.name?.trim() || '';
        payload.farmPhone = form.farms[0]?.farmPhone   || '';
        if (form.farms[0]?.governorate) payload.governorate = form.farms[0].governorate;
        payload.animalTypes = [...new Set(form.farms.flatMap(f => f.animalTypes))];
        // new multi-farm payload
        payload.farms = form.farms.map(f => ({
          name:          f.name.trim(),
          type:          f.dairyProducts ? 'dairy' : f.type,
          governorate:   f.governorate,
          farmPhone:     f.farmPhone,
          animalTypes:   f.animalTypes,
          typicalPrices: Object.entries(f.typicalPrices)
            .filter(([, v]) => v !== '' && Number(v) > 0)
            .map(([animalType, price]) => ({ animalType, price: Number(price) })),
          tradedBreeds:  Object.entries(f.breeds)
            .flatMap(([animalType, breeds]) => breeds.map(breed => ({ animalType, breed }))),
        }));
      }
      const { data } = await registerUser(payload);
      login(data.user, data.token);
    } catch (err) {
      setError(parseError(err, t));
    } finally {
      setSubmit(false);
    }
  };

  // ── Shared select style ──────────────────────────────────────────────────
  const selStyle = (hasVal) => ({
    width: '100%', padding: '12px 14px', boxSizing: 'border-box',
    border: `1.5px solid ${C.border}`, borderRadius: '10px', background: C.white,
    fontSize: '14px', color: hasVal ? C.text : C.muted, fontFamily: 'inherit', cursor: 'pointer',
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 0 — Role picker
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 0) {
    return (
      <div dir={dir} style={{ minHeight: '100vh', background: C.bg, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <style>{`*:focus-visible{outline:2px solid #3A7D44;outline-offset:2px;border-radius:4px} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Hero */}
        <div style={{ background: C.sellerPanel, padding: isMobile ? '36px 24px 48px' : '48px 40px 64px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '20px', insetInlineStart: '20px', zIndex: 2 }}>
            <LangToggle />
          </div>
          <div>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌾</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>{t('reg.title')}</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>FarmFlow</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6 }}>
              {t('reg.marketplace')}
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>

          {/* Trust stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '12px' : '24px', padding: '20px 0', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
            {TRUST_STATS.map(s => (
              <div key={s.en} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: C.green }}>{s.value}</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginTop: '2px' }}>{lang === 'ar' ? s.ar : s.en}</div>
              </div>
            ))}
          </div>

          {/* Role cards */}
          <div style={{ padding: '28px 0 8px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '17px', fontWeight: '700', color: C.text, margin: '0 0 20px' }}>{t('reg.chooseRole')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', animation: 'fadeUp 0.4s ease' }}>

              {/* Buyer */}
              <RoleCard
                emoji="🛒" title={t('reg.isBuyer')}
                desc={t('reg.buyerCardDesc')}
                perks={BUYER_PERKS} lang={lang} accentColor={C.green}
                btnLabel={t('reg.startBuyer')}
                btnStyle={{ background: C.green, color: '#fff' }}
                onPick={() => pickRole('buyer')}
              />

              {/* Seller */}
              <RoleCard
                emoji="🐄" title={t('reg.isSeller')}
                desc={t('reg.sellerCardDesc')}
                perks={SELLER_PERKS} lang={lang} accentColor={C.tan}
                btnLabel={t('reg.startSeller')}
                btnStyle={{ background: C.sellerPanel, color: '#fff' }}
                onPick={() => pickRole('seller')}
              />
            </div>
          </div>

          {/* Trust strip */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '20px 0' }}>
            {[
              ['🔒', t('reg.secure')],
              ['✅', t('reg.verifiedSellers')],
              ['🛡', t('reg.txProtection')],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: C.muted }}>
                <span>{icon}</span>{label}
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', paddingBottom: '32px', fontSize: '13px', color: C.muted }}>
            {t('reg.haveAccount')}{' '}
            <Link to="/login" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEPS 1 & 2
  // ════════════════════════════════════════════════════════════════════════════
  const panelBg  = isBuyer ? C.buyerPanel : C.sellerPanel;
  const pwMatch  = form.password.length > 0 && form.confirm.length > 0;
  const pwOk     = form.password === form.confirm && form.password.length >= 8;

  return (
    <div dir={dir} style={{ display: 'flex', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`*:focus-visible{outline:2px solid #3A7D44;outline-offset:2px;border-radius:4px} ::placeholder{color:#C4A898} select{appearance:auto} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Left panel ── */}
      {!isMobile && (
        <div style={{ width: '38%', background: panelBg, padding: '44px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#fff', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: -70, right: -70, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <button type="button" onClick={() => setStep(0)}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                ← {t('reg.changeRole')}
              </button>
              <LangToggle />
            </div>

            <div style={{ fontSize: '48px', marginBottom: '14px' }}>
              {isBuyer ? '🛒' : (step === 2 ? '🏡' : '🐄')}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 2px', lineHeight: 1.3 }}>
              {step === 2
                ? (form.farms.length === 1 ? 'إعداد مزرعتك' : `إعداد ${form.farms.length} مزارع`)
                : (isBuyer ? t('reg.welcomeBuyer') : t('reg.welcomeSeller'))}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '0 0 18px', fontStyle: 'italic' }}>
              {step === 2
                ? 'حدد النوع والحيوانات وأسعارك التقريبية'
                : (isBuyer ? t('reg.buyerPanelDesc') : t('reg.sellerPanelDesc'))}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(isBuyer ? BUYER_PERKS : SELLER_PERKS).map(p => (
                <div key={p.en} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, fontWeight: '800' }}>✓</div>
                  <span>{lang === 'ar' ? p.ar : p.en}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {!isBuyer && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {t('reg.step')} {step} {t('reg.of')} {totalSteps}
                </div>
                <ProgressDots step={step} total={totalSteps} />
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>📈</span>
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{t('reg.newMembers')}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{t('reg.newMembersDesc')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Right: Form ── */}
      <div style={{ flex: 1, background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '28px 20px 40px' : '44px 40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '440px', animation: 'fadeUp 0.3s ease' }}>

          {/* Mobile header */}
          {isMobile && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <button type="button" onClick={() => { setStep(step > 1 ? step - 1 : 0); setError(''); }}
                  style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', fontSize: '13px', fontWeight: '700', padding: 0, fontFamily: 'inherit' }}>
                  ← {step === 2 ? t('reg.back') : t('reg.changeRole')}
                </button>
                <LangToggle dark={false} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🌾</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>FarmFlow</span>
              </div>
            </div>
          )}

          {/* Step heading */}
          <div style={{ marginBottom: '22px' }}>
            {!isBuyer && !isMobile && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: step >= i + 1 ? C.green : C.border, transition: 'background 0.3s' }} />
                ))}
              </div>
            )}
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              {step === 1 ? t('reg.createAccount') : t('reg.farmInfo')}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ color: C.muted, margin: 0, fontSize: '13px' }}>
                {step === 1 ? t('reg.step1') : t('reg.step2')}
              </p>
              {step === 1 && (
                <span style={{ fontSize: '11px', color: isBuyer ? C.green : C.tan, fontWeight: '700', background: isBuyer ? C.greenLt : C.amberLt, padding: '2px 8px', borderRadius: '8px', flexShrink: 0 }}>
                  {isBuyer ? t('reg.buyerTag') : t('reg.sellerTag')}
                </span>
              )}
            </div>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Name */}
              <Field label={t('reg.name')} name="name">
                {({ focused, setFocused }) => (
                  <input id="name" name="name" type="text" value={form.name} onChange={handleChange}
                    placeholder={t('reg.namePlaceholder')} required autoFocus
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: `1.5px solid ${focused ? C.green : C.border}`, borderRadius: '10px', background: C.white, fontSize: '15px', color: C.text, fontFamily: 'inherit', outline: 'none' }} />
                )}
              </Field>

              {/* Email */}
              <Field label={t('reg.email')} optLabel={!isBuyer ? `(${t('common.optional').replace(/[()]/g,'')})` : undefined} name="email" required={isBuyer}>
                {({ focused, setFocused }) => (
                  <input id="email" name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="example@email.com" required={isBuyer}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: `1.5px solid ${focused ? C.green : C.border}`, borderRadius: '10px', background: C.white, fontSize: '15px', color: C.text, fontFamily: 'inherit', outline: 'none', direction: 'ltr' }} />
                )}
              </Field>

              {/* Phone (buyer) / Personal phone (seller) */}
              {isBuyer
                ? <PhoneField label={t('reg.phone')}         name="phone"         value={form.phone}         onChange={handleChange} />
                : <PhoneField label={t('reg.personalPhone')} name="personalPhone" value={form.personalPhone} onChange={handleChange} />
              }

              {/* National ID */}
              <NationalIdField value={form.nationalId} onChange={handleChange} onStatusChange={setIdStatus} />

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('reg.pwdLabel')}</span>
                  <span style={{ fontSize: '11px', color: C.muted }}>{t('reg.pwdHint')}</span>
                </label>
                <PwdField id="password" name="password" value={form.password} onChange={handleChange} minLength={8} />
                {form.password.length > 0 && form.password.length < 8 && (
                  <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px' }}>{t('reg.pwdMin')}</div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label htmlFor="confirm" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t('auth.confirm')}</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input id="confirm" name="confirm"
                    type="password"
                    value={form.confirm} onChange={handleChange} placeholder="••••••••" required
                    style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: `1.5px solid ${pwMatch ? (pwOk ? C.green : C.errorBorder) : C.border}`, borderRadius: '10px', background: C.white, fontSize: '15px', color: C.text, fontFamily: 'inherit', outline: 'none', direction: 'ltr' }}
                    onFocus={e => { if (!pwMatch) e.target.style.borderColor = C.green; }}
                    onBlur={e => { if (!pwMatch) e.target.style.borderColor = C.border; }} />
                </div>
                {pwMatch && (
                  <div style={{ fontSize: '11px', marginTop: '4px', color: pwOk ? C.green : C.errorText }}>
                    {pwOk ? t('reg.pwdMatch') : t('reg.pwdNoMatch')}
                  </div>
                )}
              </div>

              {/* Governorate (buyer only in step 1) */}
              {isBuyer && (
                <div>
                  <label htmlFor="governorate" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>
                    {t('reg.governorate')}
                  </label>
                  <select id="governorate" name="governorate" value={form.governorate} onChange={handleChange} required
                    style={selStyle(!!form.governorate)}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.border}>
                    <option value="">{t('reg.govSelect')}</option>
                    {GOVERNORATES.map(g => (
                      <option key={g.en} value={g.en}>{lang === 'ar' ? g.ar : g.en}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Terms */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>
                <input type="checkbox" name="agreed" checked={form.agreed} onChange={handleChange}
                  style={{ width: '17px', height: '17px', accentColor: C.green, cursor: 'pointer', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
                  {t('reg.termsAgree')}{' '}
                  <a href="/terms"   target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>{t('reg.termsService')}</a>
                  {' '}{t('reg.termsAnd')}{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>{t('reg.privacyPolicy')}</a>
                </span>
              </label>

              {error && <ErrorBox msg={error} />}

              <button type="submit" disabled={submitting}
                style={{ padding: '14px', background: submitting ? '#6AAF74' : C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '-0.2px', marginTop: '4px' }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.greenDk; }}
                onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.green; }}>
                {submitting ? t('reg.creating') : (isBuyer ? t('reg.submit.buyer') + ' →' : t('reg.nextFarm') + ' →')}
              </button>
            </form>
          )}

          {/* ── STEP 2 — Multi-farm setup ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Farm count selector */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: C.text, marginBottom: '10px' }}>
                  كم عدد مزارعك؟
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1,2,3,4].map(n => (
                    <button key={n} type="button"
                      onClick={() => setFarmCount(n)}
                      style={{
                        flex: 1, padding: '10px 4px',
                        border: `2px solid ${form.farms.length === n ? C.green : C.border}`,
                        borderRadius: '10px',
                        background: form.farms.length === n ? C.greenLt : C.white,
                        color: form.farms.length === n ? C.green : C.text,
                        fontSize: '15px', fontWeight: '800',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: C.muted }}>يمكنك إضافة مزارع إضافية لاحقًا من لوحة التحكم</p>
              </div>

              {/* Farm cards */}
              {form.farms.map((farm, idx) => {
                const ORDINALS = ['الأولى','الثانية','الثالثة','الرابعة'];
                const FARM_TYPES = [
                  { value: 'livestock', label: '🐄 مواشي'  },
                  { value: 'horses',    label: '🐎 خيول'    },
                  { value: 'poultry',   label: '🐓 دواجن'   },
                  { value: 'dairy',     label: '🥛 ألبان'   },
                  { value: 'mixed',     label: '🌾 متنوع'   },
                ];
                return (
                  <div key={idx} style={{
                    border: `1.5px solid ${C.border}`, borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    {/* Card header */}
                    <div style={{ background: C.greenLt, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '18px' }}>🏡</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: C.green }}>
                        المزرعة {ORDINALS[idx] || idx + 1}
                      </span>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Name */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: C.text, display: 'block', marginBottom: '5px' }}>
                          اسم المزرعة <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input value={farm.name} autoFocus={idx === 0}
                          onChange={e => updateFarm(idx, { name: e.target.value })}
                          placeholder="مثال: مزرعة النيل للمواشي"
                          style={{ width: '100%', padding: '10px 13px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: '9px', background: C.white, fontSize: '14px', color: C.text, fontFamily: 'inherit', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = C.green}
                          onBlur={e => e.target.style.borderColor = C.border} />
                      </div>

                      {/* Farm category — 4 main choices */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>نوع المزرعة</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { value: 'livestock', emoji: '🐄', label: 'مواشي'      },
                            { value: 'horses',    emoji: '🐎', label: 'خيول'        },
                            { value: 'poultry',   emoji: '🐔', label: 'دواجن'       },
                            { value: 'exotic',    emoji: '🦢', label: 'نعام ونادر' },
                          ].map(ft => {
                            const active = farm.type === ft.value;
                            return (
                              <button key={ft.value} type="button"
                                onClick={() => updateFarm(idx, { type: ft.value, animalTypes: [], typicalPrices: {}, breeds: {} })}
                                style={{ padding: '12px 6px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.white, color: active ? C.green : C.text, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s', textAlign: 'center' }}>
                                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{ft.emoji}</div>
                                {ft.label}
                              </button>
                            );
                          })}
                        </div>
                        {/* Dairy products toggle — shown when livestock is selected */}
                        {farm.type === 'livestock' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', padding: '8px 12px', background: farm.dairyProducts ? `${C.green}10` : C.bg, borderRadius: '8px', border: `1px solid ${farm.dairyProducts ? C.green : C.border}`, transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={!!farm.dairyProducts} onChange={e => updateFarm(idx, { dairyProducts: e.target.checked })}
                              style={{ width: '16px', height: '16px', accentColor: C.green, cursor: 'pointer' }} />
                            <span style={{ fontSize: '13px', fontWeight: '700', color: farm.dairyProducts ? C.green : C.text }}>🥛 تشمل منتجات الألبان</span>
                          </label>
                        )}
                      </div>

                      {/* Governorate + Phone */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: C.text, display: 'block', marginBottom: '5px' }}>المحافظة</label>
                          <select value={farm.governorate} onChange={e => updateFarm(idx, { governorate: e.target.value })}
                            style={{ width: '100%', padding: '10px 11px', border: `1.5px solid ${C.border}`, borderRadius: '9px', background: C.white, fontSize: '13px', color: farm.governorate ? C.text : C.muted, fontFamily: 'inherit', cursor: 'pointer' }}
                            onFocus={e => e.target.style.borderColor = C.green}
                            onBlur={e => e.target.style.borderColor = C.border}>
                            <option value="">اختر المحافظة</option>
                            {GOVERNORATES.map(g => (
                              <option key={g.en} value={g.ar}>{lang === 'ar' ? g.ar : g.en}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: C.text, display: 'block', marginBottom: '5px' }}>
                            تليفون المزرعة <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <input value={farm.farmPhone} onChange={e => updateFarm(idx, { farmPhone: e.target.value })}
                            placeholder="01xxxxxxxxx" type="tel" inputMode="numeric" maxLength={11}
                            style={{ width: '100%', padding: '10px 13px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: '9px', background: C.white, fontSize: '14px', color: C.text, fontFamily: 'inherit', outline: 'none' }}
                            onFocus={e => e.target.style.borderColor = C.green}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>

                      {/* Context-aware animal types */}
                      {(() => {
                        const animalOptions = FARM_ANIMAL_OPTIONS[farm.type] || FARM_ANIMAL_OPTIONS.livestock;
                        const cols = farm.type === 'poultry' ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)';
                        return (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>
                              {farm.type === 'poultry' ? 'أنواع الدواجن' : farm.type === 'horses' ? 'نوع الخيول' : 'الحيوانات'}
                              <span style={{ fontSize: '11px', color: C.muted, fontWeight: '400', marginInlineStart: '6px' }}>اختياري</span>
                            </div>
                            <p style={{ margin: '0 0 10px', fontSize: '11px', color: C.muted }}>اختر الأنواع التي تتعامل بها</p>

                            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '7px', marginBottom: '12px' }}>
                              {animalOptions.map(({ id, emoji, ar, en }) => {
                                const active = farm.animalTypes.includes(id);
                                return (
                                  <div key={id} role="checkbox" aria-checked={active} tabIndex={0}
                                    onClick={() => toggleFarmAnimal(idx, id)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFarmAnimal(idx, id); } }}
                                    style={{ border: `2px solid ${active ? C.green : C.border}`, borderRadius: '12px', padding: '12px 6px 8px', textAlign: 'center', cursor: 'pointer', background: active ? C.greenLt : C.white, transition: 'all 0.15s', boxShadow: active ? `0 0 0 3px ${C.green}22` : 'none' }}>
                                    <img src={animalImg(id, emoji)} alt={ar} onError={imgFallback(emoji)} style={{ width: '40px', height: '40px', objectFit: 'contain', display: 'block', margin: '0 auto 8px', borderRadius: '8px' }} />
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: active ? C.green : C.text, lineHeight: 1.3 }}>{lang === 'ar' ? ar : en}</div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Breed chips per selected animal */}
                            {farm.animalTypes.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: C.bg, borderRadius: '10px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: C.green }}>السلالات التي تتعامل بها</div>
                                {farm.animalTypes.map(animalId => {
                                  const animal = animalOptions.find(a => a.id === animalId);
                                  const breedList = ANIMAL_BREEDS_REG[animalId] || [];
                                  if (!animal || !breedList.length) return null;
                                  const selectedBreeds = farm.breeds[animalId] || [];
                                  return (
                                    <div key={animalId}>
                                      <div style={{ fontSize: '11px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>
                                        {animal.emoji} {lang === 'ar' ? animal.ar : animal.en}
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {breedList.map(breed => {
                                          const sel = selectedBreeds.includes(breed);
                                          return (
                                            <button key={breed} type="button" onClick={() => toggleAnimalBreed(idx, animalId, breed)}
                                              style={{ padding: '4px 11px', borderRadius: '99px', border: `1px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLt : 'transparent', color: sel ? C.green : C.muted, fontSize: '11px', fontWeight: sel ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                                              {breed}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Price inputs for selected animals */}
                            {farm.animalTypes.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: C.bg, borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: C.green, marginBottom: '2px' }}>متوسط سعر الرأس (جنيه مصري)</div>
                                {farm.animalTypes.map(animalId => {
                                  const animal = animalOptions.find(a => a.id === animalId);
                                  if (!animal) return null;
                                  return (
                                    <div key={animalId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '16px', width: '22px', textAlign: 'center', flexShrink: 0 }}>{animal.emoji}</span>
                                      <span style={{ fontSize: '12px', fontWeight: '600', color: C.text, minWidth: '60px' }}>{lang === 'ar' ? animal.ar : animal.en}</span>
                                      <input value={farm.typicalPrices[animalId] || ''} onChange={e => setAnimalPrice(idx, animalId, e.target.value)}
                                        placeholder="مثال: 8000" type="number" min="0" inputMode="numeric"
                                        style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', color: C.text, background: C.white, fontFamily: 'inherit', outline: 'none' }}
                                        onFocus={e => e.target.style.borderColor = C.green}
                                        onBlur={e => e.target.style.borderColor = C.border} />
                                      <span style={{ fontSize: '11px', color: C.muted, flexShrink: 0 }}>جنيه</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })}

              {error && <ErrorBox msg={error} />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  style={{ flex: 1, padding: '13px', background: '#F3EDE5', color: C.text, border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← {t('reg.back')}
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 2, padding: '13px', background: submitting ? '#6AAF74' : C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '-0.2px' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.greenDk; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.green; }}>
                  {submitting ? t('reg.creating') : `إنشاء ${form.farms.length > 1 ? form.farms.length + ' مزارع' : 'المزرعة'} →`}
                </button>
              </div>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: C.muted }}>
            {t('reg.haveAccount')}{' '}
            <Link to="/login" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── RoleCard ─────────────────────────────────────────────────────────────────
const RoleCard = ({ emoji, title, desc, perks, lang, accentColor, btnLabel, btnStyle, onPick }) => (
  <div
    role="button" tabIndex={0}
    onClick={onPick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}
    style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(28,14,5,0.06)' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(58,125,68,0.12)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(28,14,5,0.06)'; }}
  >
    <div style={{ fontSize: '40px', marginBottom: '12px' }}>{emoji}</div>
    <h3 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 6px' }}>{title}</h3>
    <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 18px', lineHeight: 1.65 }}>{desc}</p>
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {perks.map(p => (
        <li key={p.en} style={{ fontSize: '13px', color: C.text, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ color: accentColor, fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>✓</span>
          <span>{lang === 'ar' ? p.ar : p.en}</span>
        </li>
      ))}
    </ul>
    <button type="button" style={{ width: '100%', padding: '13px', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', letterSpacing: '-0.2px', ...btnStyle }}>
      {btnLabel}
    </button>
  </div>
);

// ─── ErrorBox ─────────────────────────────────────────────────────────────────
const ErrorBox = ({ msg }) => (
  <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '11px 14px', color: C.errorText, fontSize: '13px', lineHeight: 1.5 }}>
    ⚠️ {msg}
  </div>
);

export default Register;
