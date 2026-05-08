import { useState, useRef } from 'react';
import { useFarm } from '../../context/FarmContext';
import { createFarm, updateFarm, deleteFarm } from '../../services/farmService';
import { C } from '../../tokens';
import { saveBreedPrefs, getFarmBreedPrefs } from '../../utils/breedPrefs';

// Breed lists shown in the breed-config panel (mirrors SellerAddListing data)
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
const LIVESTOCK_BREEDS = {
  cattle:  ['فريزيان', 'هولشتاين', 'براهمان', 'سيمنتال', 'ليموزين', 'واجو', 'أنغوس', 'بلدي'],
  buffalo: ['بلدي مصري', 'مري', 'نيلي رافي'],
  sheep:   ['نجدي', 'عواسي', 'بربرة', 'نعيمي', 'ميرينو', 'سفولك', 'بلدي'],
  goat:    ['نوبي', 'بور', 'شامي', 'بلدي', 'سانن', 'ألباين'],
  camel:   ['دروميدار', 'مجاهيم', 'حُمُر', 'وضحاء'],
  horse:   ['عربي أصيل', 'ثوروبرد', 'كوارتر هورس', 'أندلسي', 'فريزيان', 'خيل عمل'],
};

const ANIMAL_TYPES = [
  { id: 'cattle',     label: 'أبقار'    },
  { id: 'buffalo',    label: 'جاموس'    },
  { id: 'sheep',      label: 'أغنام'    },
  { id: 'goat',       label: 'ماعز'     },
  { id: 'camel',      label: 'إبل'      },
  { id: 'horse',      label: 'خيول'     },
  { id: 'poultry',    label: 'دواجن'    },
  { id: 'rabbit',     label: 'أرانب'    },
  // poultry sub-types
  { id: 'chicken_baladi',  label: 'فراخ بلدي'  },
  { id: 'chicken_broiler', label: 'فراخ تسمين' },
  { id: 'chicken_layers',  label: 'فراخ بياضة' },
  { id: 'duck',            label: 'بط'          },
  { id: 'turkey',          label: 'ديك رومي'   },
  { id: 'pigeon',          label: 'حمام'        },
  { id: 'quail',           label: 'سمان'        },
  { id: 'goose',           label: 'إوز'         },
  { id: 'guinea',          label: 'دراج'        },
  { id: 'peacock',         label: 'طاووس'       },
  // exotic
  { id: 'ostrich',         label: 'نعام'        },
  { id: 'gazelle',         label: 'غزلان'       },
  { id: 'oryx',            label: 'مها'         },
  { id: 'deer',            label: 'أيل'         },
  { id: 'llama',           label: 'لاما'        },
  { id: 'alpaca',          label: 'ألبكا'       },
  { id: 'donkey',          label: 'حمير'        },
  { id: 'mule',            label: 'بغال'        },
];
// Returns array of { id, label, breeds } for all configurable subtypes in animalTypes
const buildBreedSections = (animalTypes = []) => {
  const sections = [];
  animalTypes.forEach(t => {
    if (t.startsWith('chicken_')) {
      const sub = t.slice(8);
      if (POULTRY_BREEDS[sub]) sections.push({ id: sub, label: ANIMAL_TYPES.find(a => a.id === t)?.label || sub, breeds: POULTRY_BREEDS[sub] });
    } else if (POULTRY_BREEDS[t]) {
      sections.push({ id: t, label: ANIMAL_TYPES.find(a => a.id === t)?.label || t, breeds: POULTRY_BREEDS[t] });
    } else if (LIVESTOCK_BREEDS[t]) {
      sections.push({ id: t, label: ANIMAL_TYPES.find(a => a.id === t)?.label || t, breeds: LIVESTOCK_BREEDS[t] });
    }
  });
  return sections;
};

const FARM_TYPES   = [
  { value: 'livestock', label: 'مواشي'      },
  { value: 'horses',    label: 'خيل'         },
  { value: 'poultry',   label: 'دواجن'       },
  { value: 'dairy',     label: 'ألبان'       },
  { value: 'exotic',    label: 'نعام ونادر' },
  { value: 'mixed',     label: 'متنوع'       },
  { value: 'other',     label: 'أخرى'        },
];
const GOVS = [
  'القاهرة','الجيزة','الإسكندرية','المنوفية','الشرقية','الدقهلية','الغربية','كفر الشيخ',
  'البحيرة','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان',
  'البحر الأحمر','شمال سيناء','جنوب سيناء','مطروح','الوادي الجديد','بورسعيد','الإسماعيلية','السويس',
];

const emptyForm = () => ({
  name: '', type: 'livestock', governorate: '', farmPhone: '',
  personalPhone: '', experience: '', animalTypes: [], bio: '',
  farmDescription: '', banner: null,
});

const SellerFarms = () => {
  const { farms, activeFarm, switchFarm, addFarm, updateFarmInList, removeFarm } = useFarm();
  const [modal, setModal]           = useState(null); // null | 'create' | { farm }
  const [form, setForm]             = useState(emptyForm());
  const [localBreedPrefs, setLocalBreedPrefs] = useState({}); // { subtypeId: string[] }
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [confirm, setConfirm]       = useState(null); // farm to delete
  const fileRef = useRef(null);

  const openCreate = () => { setForm(emptyForm()); setLocalBreedPrefs({}); setError(''); setModal('create'); };
  const openEdit   = (farm) => {
    setForm({
      name:          farm.name          || '',
      type:          farm.type          || 'livestock',
      governorate:   farm.governorate   || '',
      farmPhone:     farm.farmPhone     || '',
      personalPhone: farm.personalPhone || '',
      experience:    farm.experience    || '',
      animalTypes:   farm.animalTypes   || [],
      bio:           farm.bio           || '',
      farmDescription: farm.farmDescription || '',
      banner: null,
    });
    setLocalBreedPrefs(getFarmBreedPrefs(farm._id));
    setError('');
    setModal({ farm });
  };
  const closeModal = () => { setModal(null); setError(''); };

  const toggleBreed = (subtypeId, breed) => {
    setLocalBreedPrefs(prev => {
      const cur = prev[subtypeId] || [];
      const next = cur.includes(breed) ? cur.filter(b => b !== breed) : [...cur, breed];
      return { ...prev, [subtypeId]: next };
    });
  };

  const toggleAnimalType = (t) =>
    setForm(p => ({ ...p, animalTypes: p.animalTypes.includes(t) ? p.animalTypes.filter(x => x !== t) : [...p.animalTypes, t] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('اسم المزرعة مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'banner') { if (v) fd.append('farmBanner', v); }
        else if (k === 'animalTypes') fd.append('animalTypes', JSON.stringify(v));
        else fd.append(k, v);
      });

      if (modal === 'create') {
        const { data } = await createFarm(fd);
        addFarm(data);
        switchFarm(data);
        // Save breed prefs for the new farm
        Object.entries(localBreedPrefs).forEach(([sub, breeds]) => {
          if (breeds.length > 0) saveBreedPrefs(data._id, sub, breeds);
        });
      } else {
        const { data } = await updateFarm(modal.farm._id, fd);
        updateFarmInList(data);
        // Persist breed prefs (empty array = show all defaults)
        buildBreedSections(form.animalTypes).forEach(({ id: sub }) => {
          saveBreedPrefs(modal.farm._id, sub, localBreedPrefs[sub] || []);
        });
      }
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteFarm(confirm._id);
      removeFarm(confirm._id);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حذف المزرعة');
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '900px', margin: '0 auto', color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: C.text }}>مزارعي</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>إدارة مزارعك المسجلة على المنصة</p>
        </div>
        <button type="button" onClick={openCreate}
          style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
          ＋ مزرعة جديدة
        </button>
      </div>

      {/* Farm cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {farms.map(farm => {
          const isActive = farm._id === activeFarm?._id;
          return (
            <div key={farm._id} style={{
              background: C.card, border: `2px solid ${isActive ? C.green : C.border}`,
              borderRadius: '14px', overflow: 'hidden', boxShadow: isActive ? `0 0 0 3px ${C.green}22` : C.shadow,
              transition: 'all 0.15s',
            }}>
              {/* Banner */}
              <div style={{ height: '90px', background: isActive ? 'rgba(58,125,68,0.08)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {farm.farmBanner
                  ? <img src={farm.farmBanner} alt="farm banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '32px' }}>🏡</span>
                }
                {isActive && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: C.green, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>
                    نشطة
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '3px' }}>{farm.name}</div>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>
                  {FARM_TYPES.find(f => f.value === farm.type)?.label || farm.type}
                  {farm.governorate && ` · ${farm.governorate}`}
                </div>

                {farm.animalTypes?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {farm.animalTypes.slice(0, 4).map(t => {
                      const label = ANIMAL_TYPES.find(a => a.id === t)?.label || t;
                      return <span key={t} style={{ fontSize: '10px', fontWeight: '600', color: C.green, background: `${C.green}15`, padding: '2px 7px', borderRadius: '99px', border: `1px solid ${C.green}30` }}>{label}</span>;
                    })}
                    {farm.animalTypes.length > 4 && (
                      <span style={{ fontSize: '10px', color: C.muted, padding: '2px 6px' }}>+{farm.animalTypes.length - 4}</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isActive && (
                    <button type="button" onClick={() => switchFarm(farm)}
                      style={{ flex: 1, padding: '7px', border: `1px solid ${C.green}`, borderRadius: '8px', background: 'transparent', color: C.green, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                      تفعيل
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(farm)}
                    style={{ flex: 1, padding: '7px', border: `1px solid ${C.border}`, borderRadius: '8px', background: 'transparent', color: C.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    تعديل
                  </button>
                  {farms.length > 1 && (
                    <button type="button" onClick={() => setConfirm(farm)}
                      style={{ padding: '7px 10px', border: '1px solid #FCA5A5', borderRadius: '8px', background: 'transparent', color: '#DC2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div style={{ background: C.card, borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: C.text }}>
                {modal === 'create' ? 'إضافة مزرعة جديدة' : `تعديل: ${modal.farm.name}`}
              </h2>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.muted, lineHeight: 1 }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>اسم المزرعة *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: مزرعة النيل"
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              {/* Type + Governorate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>نوع المزرعة</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, fontFamily: 'inherit' }}>
                    {FARM_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>المحافظة</label>
                  <select value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, fontFamily: 'inherit' }}>
                    <option value="">اختر...</option>
                    {GOVS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Phones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>تليفون المزرعة</label>
                  <input value={form.farmPhone} onChange={e => setForm(p => ({ ...p, farmPhone: e.target.value }))} placeholder="01xxxxxxxxx"
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>تليفون شخصي</label>
                  <input value={form.personalPhone} onChange={e => setForm(p => ({ ...p, personalPhone: e.target.value }))} placeholder="01xxxxxxxxx"
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Animal types */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '7px' }}>أنواع الحيوانات</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ANIMAL_TYPES.map(at => {
                    const sel = form.animalTypes.includes(at.id);
                    return (
                      <button key={at.id} type="button" onClick={() => toggleAnimalType(at.id)}
                        style={{ padding: '5px 12px', borderRadius: '99px', border: `1px solid ${sel ? C.green : C.border}`, background: sel ? `${C.green}15` : 'transparent', color: sel ? C.green : C.muted, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                        {at.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Breed preferences — per selected animal subtype */}
              {(() => {
                const sections = buildBreedSections(form.animalTypes);
                if (!sections.length) return null;
                return (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '7px' }}>
                      السلالات المعروضة <span style={{ fontWeight: '400' }}>(اختر السلالات اللي تظهر في الإعلانات — اتركها فاضية لتظهر كلها)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sections.map(({ id: sub, label, breeds }) => {
                        const selected = localBreedPrefs[sub] || [];
                        return (
                          <div key={sub} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>{label}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {breeds.map(breed => {
                                const on = selected.includes(breed);
                                return (
                                  <button key={breed} type="button" onClick={() => toggleBreed(sub, breed)}
                                    style={{ padding: '4px 11px', borderRadius: '99px', border: `1px solid ${on ? C.green : C.border}`, background: on ? `${C.green}18` : 'transparent', color: on ? C.green : C.muted, fontSize: '11px', fontWeight: on ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                                    {breed}
                                  </button>
                                );
                              })}
                            </div>
                            {selected.length > 0 && (
                              <button type="button" onClick={() => setLocalBreedPrefs(p => ({ ...p, [sub]: [] }))}
                                style={{ marginTop: '6px', fontSize: '11px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                                مسح الاختيار (تظهر كل السلالات)
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Bio */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '5px' }}>نبذة عن المزرعة</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="وصف مختصر..."
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', color: C.text, background: C.bg, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              {/* Banner upload */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: C.muted, display: 'block', marginBottom: '7px' }}>صورة المزرعة</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setForm(p => ({ ...p, banner: e.target.files[0] || null }))} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: '8px 16px', border: `1px dashed ${C.border}`, borderRadius: '8px', background: 'transparent', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {form.banner ? `✓ ${form.banner.name}` : '⬆ رفع صورة'}
                </button>
              </div>

              {error && <div style={{ color: '#DC2626', fontSize: '13px', fontWeight: '600' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '11px', background: saving ? C.muted : C.green, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'جاري الحفظ...' : (modal === 'create' ? 'إضافة المزرعة' : 'حفظ التعديلات')}
                </button>
                <button type="button" onClick={closeModal}
                  style={{ padding: '11px 20px', border: `1px solid ${C.border}`, borderRadius: '9px', background: 'transparent', color: C.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.card, borderRadius: '14px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800', color: C.text }}>حذف المزرعة؟</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.muted }}>هل تريد حذف «{confirm.name}»؟ لن تُحذف بياناتها من الإعلانات والحيوانات.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleDelete}
                style={{ flex: 1, padding: '10px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                نعم، احذف
              </button>
              <button type="button" onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: '10px', border: `1px solid ${C.border}`, borderRadius: '8px', background: 'transparent', color: C.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerFarms;
