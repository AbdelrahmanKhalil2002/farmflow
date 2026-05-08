import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAnimal } from '../../services/animalService';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';

import { C } from '../../tokens';
import { animalImg, imgFallback } from '../../utils/animalImg';

const LIVESTOCK_TYPES = [
  { val: 'cattle',  typeKey: 'herd.type.cattle',  emoji: '🐄' },
  { val: 'buffalo', typeKey: 'herd.type.buffalo',  emoji: '🐃' },
  { val: 'sheep',   typeKey: 'herd.type.sheep',    emoji: '🐑' },
  { val: 'goat',    typeKey: 'herd.type.goat',     emoji: '🐐' },
  { val: 'camel',   typeKey: 'herd.type.camel',    emoji: '🐪' },
];

const POULTRY_SUBTYPES = [
  { val: 'poultry', breed: 'فراخ بلدي',  typeKey: 'herd.type.poultry', emoji: '🐓', subId: 'baladi'  },
  { val: 'poultry', breed: 'فراخ تسمين', typeKey: 'herd.type.poultry', emoji: '🐔', subId: 'broiler' },
  { val: 'poultry', breed: 'فراخ بياضة', typeKey: 'herd.type.poultry', emoji: '🥚', subId: 'layers'  },
  { val: 'poultry', breed: 'بط',         typeKey: 'herd.type.poultry', emoji: '🦆', subId: 'duck'    },
  { val: 'poultry', breed: 'ديك رومي',  typeKey: 'herd.type.poultry', emoji: '🦃', subId: 'turkey'  },
  { val: 'poultry', breed: 'حمام',       typeKey: 'herd.type.poultry', emoji: '🕊️', subId: 'pigeon'  },
  { val: 'poultry', breed: 'سمان',       typeKey: 'herd.type.poultry', emoji: '🐦', subId: 'quail'   },
  { val: 'poultry', breed: 'إوز',        typeKey: 'herd.type.poultry', emoji: '🦢', subId: 'goose'   },
  { val: 'poultry', breed: 'دراج',       typeKey: 'herd.type.poultry', emoji: '🦜', subId: 'guinea'  },
  { val: 'poultry', breed: 'طاووس',      typeKey: 'herd.type.poultry', emoji: '🦚', subId: 'peacock' },
];

const EXOTIC_ANIMALS = [
  { val: 'ostrich', typeKey: 'herd.type.ostrich', emoji: '🦢' },
  { val: 'gazelle', typeKey: 'herd.type.gazelle', emoji: '🦌' },
  { val: 'oryx',    typeKey: 'herd.type.oryx',    emoji: '🦬' },
  { val: 'deer',    typeKey: 'herd.type.deer',     emoji: '🦌' },
  { val: 'llama',   typeKey: 'herd.type.llama',    emoji: '🦙' },
  { val: 'alpaca',  typeKey: 'herd.type.alpaca',   emoji: '🦙' },
  { val: 'donkey',  typeKey: 'herd.type.donkey',   emoji: '🐴' },
  { val: 'mule',    typeKey: 'herd.type.mule',     emoji: '🐴' },
];

const POULTRY_BREEDS = {
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

const TYPE_BREEDS = {
  cattle:     ['فريزيان', 'هولشتاين', 'براهمان', 'سيمنتال', 'ليموزين', 'واجو', 'أنغوس', 'بلدي'],
  buffalo:    ['بلدي مصري', 'مري', 'نيلي رافي'],
  sheep:      ['نجدي', 'عواسي', 'بربرة', 'نعيمي', 'ميرينو', 'سفولك', 'بلدي'],
  goat:       ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين'],
  camel:      ['دروميدار', 'مجاهيم', 'حُمُر', 'وضحاء'],
  horse:      ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان', 'خيل عمل'],
  ostrich:    ['أفريقي الرقبة الحمراء', 'أفريقي الرقبة الزرقاء', 'أسترالي', 'أمريكي', 'صومالي'],
  gazelle:    ['غزال الريم', 'غزال الدوركاس', 'غزال السبلة', 'غزال الجبلي'],
  oryx:       ['مها عربي أبيض', 'مها عربي أسمر'],
  deer:       ['أيل أحمر', 'أيل الأكسيس', 'أيل الدام'],
  llama:      ['كلاسيكية', 'بنية', 'بيضاء'],
  alpaca:     ['هواكايا', 'سوري'],
  donkey:     ['مصري بلدي', 'صومالي', 'نوبي', 'إيطالي', 'أمريكي'],
  mule:       ['بغل عمل', 'بغل رياضي'],
};

const HEALTH_OPTIONS = [
  { val: 'healthy',    labelKey: 'addAnimal.health.healthy',    color: '#16A34A' },
  { val: 'sick',       labelKey: 'addAnimal.health.sick',       color: '#DC2626' },
  { val: 'quarantine', labelKey: 'addAnimal.health.quarantine', color: '#D97706' },
];

const PREGNANCY_OPTIONS = [
  { val: 'none',                labelKey: 'addAnimal.pregnancy.none',    color: '#6B7280' },
  { val: 'pregnant',            labelKey: 'addAnimal.pregnancy.pregnant',color: '#D97706' },
  { val: 'recently_gave_birth', labelKey: 'addAnimal.pregnancy.recent',  color: '#16A34A' },
];

const Lbl = ({ children, req }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
    {children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}
  </label>
);

const FocusInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${focused ? C.green : C.border}`, background: '#fff', fontSize: 14, color: C.text, outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit', ...style }}
    />
  );
};

const ErrMsg = ({ msg }) => msg ? <p style={{ color: C.red, fontSize: 12, margin: '4px 0 0' }}>{msg}</p> : null;

const SellerAddAnimal = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLang();
  const { activeFarm } = useFarm();
  const photoInputRef = useRef(null);

  const [form, setForm] = useState({
    type: 'sheep', breed: '', poultrySubId: '', gender: 'unknown',
    tagId: '', dob: '', color: '',
    currentWeight: '', healthStatus: 'healthy',
    notes: '',
    pregnancyStatus: 'none', pregnancyDate: '', expectedBirthDate: '', birthCount: '',
  });
  const [photoFiles,    setPhotoFiles]    = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [dragOver,      setDragOver]      = useState(false);
  const [errors,        setErrors]        = useState({});
  const [submitErr,     setSubmitErr]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.type) e.type = t('addAnimal.type');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhotos = (files) => {
    const valid = [...files].filter(f => f.type.startsWith('image/')).slice(0, 4 - photoFiles.length);
    setPhotoFiles(p => [...p, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPhotoPreviews(p => [...p, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setPhotoFiles(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      photoFiles.forEach(f => fd.append('images', f));
      await createAnimal(fd);
      navigate('/seller/herd');
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || t('common.unknownErr'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", maxWidth: 680, margin: '0 auto' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDk} 100%)`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: -20, fontSize: 110, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🐾</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('addAnimal.title')} 🐾</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t('herd.title')}</p>
          </div>
          <button type="button" onClick={() => navigate('/seller/herd')}
            style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ← {t('addAnimal.cancel')}
          </button>
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Type picker — farm-aware */}
        <div>
          <Lbl req>{t('addAnimal.type')}</Lbl>

          {activeFarm?.type === 'poultry' ? (
            /* Poultry farm → sub-type grid */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {(activeFarm.animalTypes?.length > 0
                  ? POULTRY_SUBTYPES.filter(s => activeFarm.animalTypes.includes(s.subId))
                  : POULTRY_SUBTYPES
                ).map(sub => {
                  const active = form.poultrySubId === sub.subId;
                  return (
                    <button key={sub.subId} type="button"
                      onClick={() => setForm(p => ({ ...p, type: 'poultry', breed: sub.breed, poultrySubId: sub.subId }))}
                      style={{ padding: '12px 4px', borderRadius: 12, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                      <img src={animalImg(sub.subId, sub.emoji)} alt={sub.breed} onError={imgFallback(sub.emoji)} style={{ width: '36px', height: '36px', marginBottom: 3, objectFit: 'contain', borderRadius: '6px' }} />
                      <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.green : C.muted }}>{sub.breed}</div>
                    </button>
                  );
                })}
              </div>
              {/* Breed chips for selected poultry sub-type */}
              {form.poultrySubId && POULTRY_BREEDS[form.poultrySubId]?.length > 0 && (
                <div style={{ marginTop: 10, padding: 12, background: C.greenLt, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 7 }}>السلالة</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {POULTRY_BREEDS[form.poultrySubId].map(breed => {
                      const active = form.breed === breed;
                      return (
                        <button key={breed} type="button"
                          onClick={() => set('breed', active ? POULTRY_SUBTYPES.find(s => s.subId === form.poultrySubId)?.breed || '' : breed)}
                          style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : 'transparent', color: active ? C.green : C.muted, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                          {breed}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          ) : activeFarm?.type === 'horses' ? (
            /* Horse farm → auto-selected */
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.greenLt, borderRadius: 12, border: `2px solid ${C.green}` }}>
              <img src={animalImg('horse', '🐎')} alt="horse" onError={imgFallback('🐎')} style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{t('herd.type.horse')}</span>
            </div>

          ) : activeFarm?.type === 'exotic' ? (
            /* Exotic farm → exotic animals grid */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(activeFarm.animalTypes?.length > 0
                  ? EXOTIC_ANIMALS.filter(a => activeFarm.animalTypes.includes(a.val))
                  : EXOTIC_ANIMALS
                ).map(animal => {
                  const active = form.type === animal.val;
                  return (
                    <button key={animal.val} type="button"
                      onClick={() => setForm(p => ({ ...p, type: animal.val, breed: '' }))}
                      style={{ padding: '12px 4px', borderRadius: 12, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                      <img src={animalImg(animal.val, animal.emoji)} alt={t(animal.typeKey)} onError={imgFallback(animal.emoji)} style={{ width: '36px', height: '36px', marginBottom: 3, objectFit: 'contain', borderRadius: '6px' }} />
                      <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.green : C.muted }}>{t(animal.typeKey)}</div>
                    </button>
                  );
                })}
              </div>
              {TYPE_BREEDS[form.type]?.length > 0 && (
                <div style={{ marginTop: 10, padding: 12, background: C.greenLt, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 7 }}>السلالة</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TYPE_BREEDS[form.type].map(breed => {
                      const active = form.breed === breed;
                      return (
                        <button key={breed} type="button" onClick={() => set('breed', active ? '' : breed)}
                          style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : 'transparent', color: active ? C.green : C.muted, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                          {breed}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* Livestock / mixed / no farm */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {(activeFarm?.type === 'livestock' && activeFarm.animalTypes?.length > 0
                  ? LIVESTOCK_TYPES.filter(lt => activeFarm.animalTypes.includes(lt.val))
                  : LIVESTOCK_TYPES
                ).map(lt => {
                  const active = form.type === lt.val;
                  return (
                    <button key={lt.val} type="button"
                      onClick={() => setForm(p => ({ ...p, type: lt.val, breed: '' }))}
                      style={{ padding: '12px 4px', borderRadius: 12, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                      <img src={animalImg(lt.val, lt.emoji)} alt={t(lt.typeKey)} onError={imgFallback(lt.emoji)} style={{ width: '36px', height: '36px', marginBottom: 3, objectFit: 'contain', borderRadius: '6px' }} />
                      <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.green : C.muted }}>{t(lt.typeKey)}</div>
                    </button>
                  );
                })}
              </div>
              {/* Breed chips for selected livestock type */}
              {TYPE_BREEDS[form.type]?.length > 0 && (
                <div style={{ marginTop: 10, padding: 12, background: C.greenLt, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 7 }}>السلالة</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TYPE_BREEDS[form.type].map(breed => {
                      const active = form.breed === breed;
                      return (
                        <button key={breed} type="button" onClick={() => set('breed', active ? '' : breed)}
                          style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : 'transparent', color: active ? C.green : C.muted, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                          {breed}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <ErrMsg msg={errors.type} />
        </div>

        {/* Breed + Tag row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>{t('addAnimal.breed')}</Lbl>
            <FocusInput value={form.breed} onChange={e => set('breed', e.target.value)} placeholder="…" />
          </div>
          <div>
            <Lbl>{t('addAnimal.tagId')}</Lbl>
            <FocusInput value={form.tagId} onChange={e => set('tagId', e.target.value)} placeholder="A-001" />
          </div>
        </div>

        {/* Gender + DOB row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>{t('addAnimal.gender')}</Lbl>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['male','♂','addAnimal.male'],['female','♀','addAnimal.female'],['unknown','','addAnimal.unknown']].map(([v, sym, lk]) => (
                <button key={v} type="button" onClick={() => set('gender', v)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `1.5px solid ${form.gender === v ? C.green : C.border}`, background: form.gender === v ? C.greenLt : C.card, fontSize: 12, fontWeight: form.gender === v ? 700 : 500, color: form.gender === v ? C.green : C.muted, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {sym} {t(lk)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>{t('addAnimal.dob')}</Lbl>
            <FocusInput type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
          </div>
        </div>

        {/* Weight + Color row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>{t('addAnimal.weight')}</Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="0.1" value={form.currentWeight} onChange={e => set('currentWeight', e.target.value)} placeholder="45" style={{ paddingLeft: 60 }} />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: C.textMuted, pointerEvents: 'none' }}>{t('common.kg')}</span>
            </div>
          </div>
          <div>
            <Lbl>{t('addAnimal.color')}</Lbl>
            <FocusInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="…" />
          </div>
        </div>

        {/* Health status */}
        <div>
          <Lbl>{t('addAnimal.health')}</Lbl>
          <div style={{ display: 'flex', gap: 10 }}>
            {HEALTH_OPTIONS.map(h => (
              <button key={h.val} type="button" onClick={() => set('healthStatus', h.val)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.healthStatus === h.val ? h.color : C.border}`, background: form.healthStatus === h.val ? `${h.color}15` : C.card, color: form.healthStatus === h.val ? h.color : C.muted, fontSize: 13, fontWeight: form.healthStatus === h.val ? 800 : 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {t(h.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Pregnancy (females only) */}
        {form.gender === 'female' && (
          <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 12, padding: '16px 18px' }}>
            <Lbl>{t('addAnimal.pregnancy')}</Lbl>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PREGNANCY_OPTIONS.map(p => {
                const active = form.pregnancyStatus === p.val;
                return (
                  <button key={p.val} type="button" onClick={() => set('pregnancyStatus', p.val)}
                    style={{ padding: '9px 16px', borderRadius: 10, border: `2px solid ${active ? p.color : '#FED7AA'}`, background: active ? `${p.color}18` : '#fff', color: active ? p.color : '#92400E', fontSize: 13, fontWeight: active ? 800 : 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {t(p.labelKey)}
                  </button>
                );
              })}
            </div>

            {form.pregnancyStatus === 'pregnant' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <Lbl>{t('animal.pregnancyStart')}</Lbl>
                  <FocusInput type="date" value={form.pregnancyDate} onChange={e => set('pregnancyDate', e.target.value)} />
                </div>
                <div>
                  <Lbl>{t('animal.expectedBirth')}</Lbl>
                  <FocusInput type="date" value={form.expectedBirthDate} onChange={e => set('expectedBirthDate', e.target.value)} />
                </div>
              </div>
            )}

            {form.pregnancyStatus === 'recently_gave_birth' && (
              <div style={{ marginTop: 12, maxWidth: 200 }}>
                <Lbl>{t('animal.infoBirthCount')}</Lbl>
                <FocusInput type="number" min="0" step="1" value={form.birthCount} onChange={e => set('birthCount', e.target.value)} placeholder="1" />
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Lbl>{t('addAnimal.notes')}</Lbl>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="…"
            rows={3}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, color: C.text, resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.green}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Photo upload */}
        <div>
          <Lbl>{t('animal.photos')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>{t('common.optional')}</span></Lbl>
          <div
            onClick={() => photoInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handlePhotos(e.dataTransfer.files); }}
            style={{ border: `2px dashed ${dragOver ? C.green : C.border}`, borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? C.greenLt : '#FAFAFA', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 13, color: C.muted }}>اسحب الصور هنا أو <span style={{ color: C.green, fontWeight: 700 }}>اختر من الجهاز</span></div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />

          {photoPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {photoPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.border}` }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: '50%', background: C.red, border: '2px solid #fff', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {submitErr && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13 }}>
            {submitErr}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button type="button" onClick={() => navigate('/seller/herd')}
            style={{ padding: '12px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {t('addAnimal.cancel')}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: submitting ? '#A7C4AD' : C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {submitting ? t('common.saving') : `${t('addAnimal.submit')} ✓`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerAddAnimal;
