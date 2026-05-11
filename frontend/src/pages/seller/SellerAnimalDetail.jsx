import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAnimalById, updateAnimal, deleteAnimal,
  addWeightEntry, deleteWeightEntry,
  addVaccinationEntry, deleteVaccinationEntry,
  getMedicalRecords, addMedicalRecord, deleteMedicalRecord,
} from '../../services/animalService';
import { useLang } from '../../context/LangContext';
import { addIncome } from '../../services/financeService';
import { getListedAnimalIds } from '../../services/listingService';
import { getImageUrl } from '../../utils/format';

import { C } from '../../tokens';

const TYPE_KEY   = { cattle:'herd.type.cattle', buffalo:'herd.type.buffalo', sheep:'herd.type.sheep', goat:'herd.type.goat', camel:'herd.type.camel', horse:'herd.type.horse', poultry:'herd.type.poultry', rabbit:'herd.type.rabbit', other:'herd.type.other' };
const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🐪', horse:'🐎', poultry:'🐔', rabbit:'🐇', other:'🐾' };
const HEALTH_KEY = { healthy:'animalDetail.health.healthy', sick:'animalDetail.health.sick', quarantine:'animalDetail.health.quarantine', deceased:'animalDetail.health.deceased' };
const HEALTH_COLOR = { healthy: C.green, sick: C.red, quarantine: C.amber, deceased: '#94A3B8' };
const GENDER_KEY   = { male:'herd.gender.male', female:'herd.gender.female', unknown:'—' };
const STATUS_KEY   = { active:'animalDetail.status.active', sold:'animalDetail.status.sold', deceased:'animalDetail.status.deceased' };
const PREGNANCY_KEY = { none:'animalDetail.pregnancy.none', pregnant:'animalDetail.pregnancy.pregnant', recently_gave_birth:'animalDetail.pregnancy.recentBirth' };

const PREGNANCY_OPTIONS = [
  { val: 'none',                labelKey: 'animalDetail.pregnancy.none',        color: '#6B7280' },
  { val: 'pregnant',            labelKey: 'animalDetail.pregnancy.pregnant',    color: '#D97706' },
  { val: 'recently_gave_birth', labelKey: 'animalDetail.pregnancy.recentBirth', color: '#16A34A' },
];

const ageLabel = (dob, t) => {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 24 * 3600 * 1000));
  return months < 24 ? `${months} ${t('common.month')}` : `${Math.floor(months / 12)} ${t('common.year')}`;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });

// ── Mini SVG Weight Chart ─────────────────────────────────────────────────────
const WeightChart = ({ entries, tFn }) => {
  if (entries.length < 2) return (
    <div style={{ textAlign: 'center', padding: '24px', color: C.textMuted, fontSize: 13 }}>
      {tFn('animalDetail.chartHint')}
    </div>
  );

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const W = 500, H = 160, PAD = { top: 16, right: 20, bottom: 28, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const vals = sorted.map(e => e.weightKg);
  const minV = Math.min(...vals) * 0.95;
  const maxV = Math.max(...vals) * 1.05;
  const range = maxV - minV || 1;

  const px = (i) => PAD.left + (i / (sorted.length - 1)) * cW;
  const py = (v) => PAD.top + cH - ((v - minV) / range) * cH;

  const points = sorted.map((e, i) => `${px(i)},${py(e.weightKg)}`).join(' ');
  const areaPoints = `${px(0)},${PAD.top + cH} ${points} ${px(sorted.length - 1)},${PAD.top + cH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }} aria-label="مخطط النمو">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.green} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.green} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD.top + cH * t;
        const v = Math.round(maxV - t * range);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="rgba(26,46,28,0.07)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill={C.textMuted}>{v}</text>
          </g>
        );
      })}
      {/* Area */}
      <polygon points={areaPoints} fill="url(#wg)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + labels */}
      {sorted.map((e, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(e.weightKg)} r={4} fill={C.green} stroke="#fff" strokeWidth={2} />
          {i === sorted.length - 1 && (
            <text x={px(i)} y={py(e.weightKg) - 10} textAnchor="middle" fontSize={10} fontWeight="700" fill={C.green}>{e.weightKg} {tFn('common.kg')}</text>
          )}
          {sorted.length <= 8 && (
            <text x={px(i)} y={PAD.top + cH + 18} textAnchor="middle" fontSize={8} fill={C.textMuted}>
              {new Date(e.date).toLocaleDateString('ar-EG', { month:'short', day:'numeric' })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ─── Weight goal editor ───────────────────────────────────────────────────────
const WeightGoalEditor = ({ animal, animalId, onSaved, tFn }) => {
  const [open,   setOpen]   = useState(false);
  const [target, setTarget] = useState(animal?.targetWeight    || '');
  const [nextDt, setNextDt] = useState(animal?.nextWeighingDate ? new Date(animal.nextWeighingDate).toISOString().slice(0,10) : '');
  const [saving, setSaving] = useState(false);

  const pct = animal?.targetWeight && animal?.currentWeight
    ? Math.min(100, Math.round((animal.currentWeight / animal.targetWeight) * 100)) : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (target) fd.append('targetWeight', target);
      if (nextDt) fd.append('nextWeighingDate', nextDt);
      const r = await updateAnimal(animalId, fd);
      onSaved(r.data);
      setOpen(false);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 20px', boxShadow: C.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 16 : 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>🎯 {tFn('animalDetail.weightGoals')}</div>
        <button type="button" onClick={() => setOpen(p => !p)}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
          {open ? tFn('common.close') : tFn('common.edit')}
        </button>
      </div>

      {/* Current goals display */}
      {!open && (animal?.targetWeight || animal?.nextWeighingDate) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {animal?.targetWeight && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{tFn('animalDetail.targetWeight')}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{animal.targetWeight} {tFn('common.kg')}</div>
              {pct !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: C.green, borderRadius: 3, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{pct}% {tFn('animalDetail.ofGoal')}</div>
                </div>
              )}
            </div>
          )}
          {animal?.nextWeighingDate && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{tFn('animalDetail.nextWeigh')}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmtDate(animal.nextWeighingDate)}</div>
              {(() => {
                const d = Math.ceil((new Date(animal.nextWeighingDate) - Date.now()) / (24 * 3600 * 1000));
                return <div style={{ fontSize: 11, color: d <= 0 ? C.red : d <= 3 ? C.amber : C.muted, marginTop: 3 }}>{d <= 0 ? tFn('animalDetail.overdue') : `${tFn('animalDetail.inDays')} ${d} ${tFn('animalDetail.day')}`}</div>;
              })()}
            </div>
          )}
        </div>
      )}

      {!open && !animal?.targetWeight && !animal?.nextWeighingDate && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: C.muted }}>{tFn('animalDetail.noGoals')}</p>
      )}

      {open && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{tFn('animalDetail.targetWeightKg')}</label>
            <input type="number" min="0" step="1" value={target} onChange={e => setTarget(e.target.value)} placeholder={tFn('animalDetail.targetWeightPlaceholder')}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{tFn('animalDetail.nextWeigh')}</label>
            <input type="date" value={nextDt} onChange={e => setNextDt(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: saving ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '…' : tFn('common.save')}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── SellerAnimalDetail ───────────────────────────────────────────────────────
const SellerAnimalDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLang();

  const [animal,   setAnimal]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');
  const [activeTab, setActiveTab] = useState('weight'); // 'weight' | 'vaccination' | 'medical' | 'info'

  // Medical records state
  const [medRecords,   setMedRecords]   = useState([]);
  const [medLoading,   setMedLoading]   = useState(false);
  const [medForm, setMedForm] = useState({ date: new Date().toISOString().slice(0,10), diagnosis: '', treatment: '', medication: '', vet: '', cost: '', followUpDate: '', notes: '' });
  const [medErr,       setMedErr]       = useState('');
  const [savingMed,    setSavingMed]    = useState(false);
  const [medDeleting,  setMedDeleting]  = useState(null); // id being confirmed for delete

  // Weight form state
  const [weightForm,  setWeightForm]  = useState({ weightKg: '', date: new Date().toISOString().slice(0,10), notes: '' });
  const [weightErr,   setWeightErr]   = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  // Vaccination form state
  const [vacForm, setVacForm] = useState({ vaccine: '', date: new Date().toISOString().slice(0,10), nextDueDate: '', vet: '', notes: '' });
  const [vacErr,  setVacErr]  = useState('');
  const [savingVac, setSavingVac] = useState(false);

  // Listing state
  const [isListed, setIsListed] = useState(false);

  // Photo upload
  const photoInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarImgErr, setAvatarImgErr] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const r = await updateAnimal(id, fd);
      setAvatarImgErr(false);
      setAnimal(r.data);
    } catch {}
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleRemoveImage = async (idx) => {
    const kept = animal.images.filter((_, i) => i !== idx);
    const fd = new FormData();
    fd.append('keepImages', JSON.stringify(kept));
    try {
      const r = await updateAnimal(id, fd);
      setAnimal(r.data);
    } catch {}
  };

  // Status edit
  const [statusEdit, setStatusEdit] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [soldModal, setSoldModal] = useState(false);
  const [soldForm, setSoldForm] = useState({ price: '', paymentMethod: 'cash', note: '' });
  const [soldError, setSoldError] = useState('');

  // Pregnancy edit
  const [pregnancyEdit, setPregnancyEdit] = useState(false);
  const [pregnancyForm, setPregnancyForm] = useState({ pregnancyStatus: 'none', pregnancyDate: '', expectedBirthDate: '', birthCount: '' });
  const [savingPregnancy, setSavingPregnancy] = useState(false);
  const pregnancyInitialized = useRef(false);

  useEffect(() => {
    getAnimalById(id)
      .then(r => setAnimal(r.data))
      .catch(() => setLoadErr(t('animalDetail.loadErr')))
      .finally(() => setLoading(false));
    getListedAnimalIds()
      .then(r => setIsListed((r.data || []).includes(id)))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (animal && !pregnancyInitialized.current) {
      pregnancyInitialized.current = true;
      setPregnancyForm({
        pregnancyStatus:   animal.pregnancyStatus || 'none',
        pregnancyDate:     animal.pregnancyDate     ? new Date(animal.pregnancyDate).toISOString().slice(0, 10)     : '',
        expectedBirthDate: animal.expectedBirthDate ? new Date(animal.expectedBirthDate).toISOString().slice(0, 10) : '',
        birthCount:        animal.birthCount != null ? animal.birthCount : '',
      });
    }
  }, [animal]);

  // Load medical records when tab opens
  useEffect(() => {
    if (activeTab === 'medical' && animal) {
      setMedLoading(true);
      getMedicalRecords(id)
        .then(r => setMedRecords(r.data))
        .catch(() => {})
        .finally(() => setMedLoading(false));
    }
  }, [activeTab, id, animal]);

  const handleAddMedical = async () => {
    if (!medForm.diagnosis.trim()) { setMedErr(t('animalDetail.errDiagnosis')); return; }
    setMedErr(''); setSavingMed(true);
    try {
      const payload = { ...medForm };
      if (!payload.cost) delete payload.cost;
      if (!payload.followUpDate) delete payload.followUpDate;
      await addMedicalRecord(id, payload);
      const r = await getMedicalRecords(id);
      setMedRecords(r.data);
      setMedForm({ date: new Date().toISOString().slice(0,10), diagnosis: '', treatment: '', medication: '', vet: '', cost: '', followUpDate: '', notes: '' });
    } catch (err) { setMedErr(err?.response?.data?.message || t('common.unknownErr')); }
    finally { setSavingMed(false); }
  };

  const handleDeleteMedical = async (recId) => {
    try {
      await deleteMedicalRecord(id, recId);
      setMedRecords(p => p.filter(r => r._id !== recId));
      setMedDeleting(null);
    } catch {}
  };

  const handleAddWeight = async () => {
    if (!weightForm.weightKg || Number(weightForm.weightKg) <= 0) { setWeightErr(t('animalDetail.errWeight')); return; }
    setWeightErr(''); setSavingWeight(true);
    try {
      await addWeightEntry(id, weightForm);
      const r = await getAnimalById(id);
      setAnimal(r.data);
      setWeightForm({ weightKg: '', date: new Date().toISOString().slice(0,10), notes: '' });
    } catch (err) { setWeightErr(err?.response?.data?.message || t('common.unknownErr')); }
    finally { setSavingWeight(false); }
  };

  const handleDeleteWeight = async (entryId) => {
    try {
      await deleteWeightEntry(id, entryId);
      setAnimal(p => ({ ...p, weightLog: p.weightLog.filter(e => e._id !== entryId) }));
    } catch {}
  };

  const handleAddVaccination = async () => {
    if (!vacForm.vaccine.trim()) { setVacErr(t('animalDetail.errVaccine')); return; }
    setVacErr(''); setSavingVac(true);
    try {
      await addVaccinationEntry(id, vacForm);
      const r = await getAnimalById(id);
      setAnimal(r.data);
      setVacForm({ vaccine: '', date: new Date().toISOString().slice(0,10), nextDueDate: '', vet: '', notes: '' });
    } catch (err) { setVacErr(err?.response?.data?.message || t('common.unknownErr')); }
    finally { setSavingVac(false); }
  };

  const handleDeleteVaccination = async (entryId) => {
    try {
      await deleteVaccinationEntry(id, entryId);
      setAnimal(p => ({ ...p, vaccinationLog: p.vaccinationLog.filter(e => e._id !== entryId) }));
    } catch {}
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'sold') {
      setSoldForm({ price: '', paymentMethod: 'cash', note: '' });
      setSoldError('');
      setSoldModal(true);
      return;
    }
    doStatusChange(newStatus);
  };

  const doStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      const fd = new FormData(); fd.append('status', newStatus);
      await updateAnimal(id, fd);
      setAnimal(p => ({ ...p, status: newStatus }));
      setStatusEdit(false);
    } catch {}
    finally { setSavingStatus(false); }
  };

  const handleConfirmSold = async () => {
    const price = parseFloat(soldForm.price);
    if (!soldForm.price || isNaN(price) || price <= 0) {
      setSoldError('يرجى إدخال سعر البيع');
      return;
    }
    setSavingStatus(true);
    setSoldError('');
    try {
      const fd = new FormData(); fd.append('status', 'sold');
      await updateAnimal(id, fd);
      await addIncome({
        type: 'sale',
        amount: price,
        paymentMethod: soldForm.paymentMethod,
        date: new Date().toISOString(),
        note: soldForm.note || `بيع ${animal.breed || animal.type}${animal.tagId ? ` — ${animal.tagId}` : ''}`,
      });
      setAnimal(p => ({ ...p, status: 'sold' }));
      setSoldModal(false);
      setStatusEdit(false);
    } catch {}
    finally { setSavingStatus(false); }
  };

  const handlePregnancyUpdate = async () => {
    setSavingPregnancy(true);
    try {
      const fd = new FormData();
      fd.append('pregnancyStatus', pregnancyForm.pregnancyStatus);
      if (pregnancyForm.pregnancyDate)     fd.append('pregnancyDate', pregnancyForm.pregnancyDate);
      if (pregnancyForm.expectedBirthDate) fd.append('expectedBirthDate', pregnancyForm.expectedBirthDate);
      if (pregnancyForm.birthCount !== '')  fd.append('birthCount', pregnancyForm.birthCount);
      await updateAnimal(id, fd);
      setAnimal(p => ({
        ...p,
        pregnancyStatus:   pregnancyForm.pregnancyStatus,
        pregnancyDate:     pregnancyForm.pregnancyDate     || null,
        expectedBirthDate: pregnancyForm.expectedBirthDate || null,
        birthCount:        pregnancyForm.birthCount !== '' ? Number(pregnancyForm.birthCount) : p.birthCount,
      }));
      setPregnancyEdit(false);
    } catch {}
    finally { setSavingPregnancy(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('animalDetail.confirmDelete'))) return;
    try { await deleteAnimal(id); navigate('/seller/herd'); } catch {}
  };

  // Navigate to SellerAddListing with all animal data pre-filled
  const handleListForSale = () => {
    if (!animal) return;
    const ageMonths = animal.dob
      ? Math.floor((Date.now() - new Date(animal.dob).getTime()) / (30.44 * 24 * 3600 * 1000))
      : '';
    const params = new URLSearchParams();
    if (animal.type)                              params.set('type',       animal.type);
    if (animal.breed)                             params.set('breed',      animal.breed);
    if (animal.currentWeight)                     params.set('weight',     animal.currentWeight);
    if (ageMonths)                                params.set('ageMonths',  ageMonths);
    if (animal.gender && animal.gender !== 'unknown') params.set('gender', animal.gender);
    if (animal.color)                             params.set('color',      animal.color);
    if ((animal.vaccinationLog || []).length > 0) params.set('vaccinated', 'true');
    params.set('fromAnimal', animal._id);
    navigate(`/seller/add-listing?${params.toString()}`);
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>{t('common.loading')}</div>
  );
  if (loadErr) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: C.redBg, borderRadius: 16, color: C.red }}>{loadErr}</div>
  );

  const weightLog = [...(animal.weightLog || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const vacLog    = [...(animal.vaccinationLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const healthColor = HEALTH_COLOR[animal.healthStatus] || C.muted;

  const upcomingVacs = vacLog.filter(v => v.nextDueDate && new Date(v.nextDueDate) > new Date())
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", maxWidth: 760 }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header card */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ height: 6, background: animal.status === 'active' ? C.green : animal.status === 'sold' ? C.amber : '#94A3B8' }} />
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            {/* Avatar — click to upload/change photo */}
            <div
              onClick={() => photoInputRef.current?.click()}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              title="اضغط لتغيير الصورة"
              style={{ position: 'relative', width: 72, height: 72, borderRadius: 16, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', border: `2px solid ${C.border}` }}
            >
              {animal.images?.[0] && !avatarImgErr ? (
                <img
                  src={getImageUrl(animal.images[0])}
                  alt=""
                  onError={() => setAvatarImgErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {TYPE_EMOJI[animal.type] || '🐾'}
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: avatarHover || uploadingPhoto ? 1 : 0, transition: 'opacity 0.15s' }}>
                {uploadingPhoto
                  ? <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'ff-spin 0.7s linear infinite' }} />
                  : <span style={{ fontSize: 20 }}>📷</span>
                }
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
                  {t(TYPE_KEY[animal.type]) || animal.type}
                  {animal.breed && ` — ${animal.breed}`}
                </h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: `${healthColor}18`, color: healthColor }}>
                  {t(HEALTH_KEY[animal.healthStatus])}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: C.greenLt, color: C.greenText }}>
                  {t(STATUS_KEY[animal.status]) || animal.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: C.muted }}>
                {animal.tagId && <span>🏷 {animal.tagId}</span>}
                {animal.gender !== 'unknown' && <span>{animal.gender === 'male' ? '♂' : '♀'} {t(GENDER_KEY[animal.gender])}</span>}
                {ageLabel(animal.dob, t) && <span>📅 {ageLabel(animal.dob, t)}</span>}
                {animal.currentWeight && <span>⚖️ {animal.currentWeight} {t('common.kg')}</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
              {animal.status === 'active' && (
                isListed
                  ? <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:9, background:'#FFFBEB', border:'1.5px solid #FDE68A', color:'#92400E', fontSize:13, fontWeight:700 }}>
                      🏷 معروض للبيع
                    </span>
                  : <button type="button" onClick={handleListForSale}
                      style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {t('animalDetail.listForSale')} ←
                    </button>
              )}
              <button type="button" onClick={() => setStatusEdit(p => !p)}
                style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                {t('animalDetail.changeStatus')}
              </button>
              {animal.gender === 'female' && (
                <button type="button" onClick={() => setPregnancyEdit(p => !p)}
                  style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid #FED7AA`, background: '#FFF7ED', color: '#92400E', fontSize: 13, cursor: 'pointer' }}>
                  🤰 {t('animalDetail.updatePregnancy')}
                </button>
              )}
              <button type="button" onClick={handleDelete}
                style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid #FECACA', background: C.redBg, color: C.red, fontSize: 13, cursor: 'pointer' }}>
                {t('common.delete')}
              </button>
            </div>
          </div>

          {/* Status picker */}
          {statusEdit && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, animation: 'slideDown 0.2s ease' }}>
              {[['active','animalDetail.status.active','#3A7D44'],['sold','animalDetail.status.sold','#D97706'],['deceased','animalDetail.status.deceased','#94A3B8']].map(([v, lKey, color]) => (
                <button key={v} type="button" onClick={() => handleStatusChange(v)} disabled={savingStatus || animal.status === v}
                  style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${animal.status === v ? color : C.border}`, background: animal.status === v ? `${color}18` : C.card, color: animal.status === v ? color : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t(lKey)}
                </button>
              ))}
            </div>
          )}

          {/* Pregnancy editor */}
          {pregnancyEdit && animal.gender === 'female' && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, animation: 'slideDown 0.2s ease' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>{t('animalDetail.updatePregnancyTitle')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {PREGNANCY_OPTIONS.map(po => {
                  const active = pregnancyForm.pregnancyStatus === po.val;
                  return (
                    <button key={po.val} type="button" onClick={() => setPregnancyForm(f => ({ ...f, pregnancyStatus: po.val }))}
                      style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${active ? po.color : '#FED7AA'}`, background: active ? `${po.color}18` : '#fff', color: active ? po.color : '#92400E', fontSize: 12, fontWeight: active ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t(po.labelKey)}
                    </button>
                  );
                })}
              </div>

              {pregnancyForm.pregnancyStatus === 'pregnant' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>{t('animalDetail.pregnancyStart')}</label>
                    <input type="date" value={pregnancyForm.pregnancyDate} onChange={e => setPregnancyForm(f => ({ ...f, pregnancyDate: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>{t('animalDetail.expectedBirth')}</label>
                    <input type="date" value={pregnancyForm.expectedBirthDate} onChange={e => setPregnancyForm(f => ({ ...f, expectedBirthDate: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
              )}

              {pregnancyForm.pregnancyStatus === 'recently_gave_birth' && (
                <div style={{ marginBottom: 12, maxWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>{t('animalDetail.birthCount')}</label>
                  <input type="number" min="0" step="1" value={pregnancyForm.birthCount} onChange={e => setPregnancyForm(f => ({ ...f, birthCount: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              )}

              <button type="button" onClick={handlePregnancyUpdate} disabled={savingPregnancy}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: savingPregnancy ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingPregnancy ? 'not-allowed' : 'pointer' }}>
                {savingPregnancy ? '…' : t('common.save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming vaccination alert */}
      {upcomingVacs.length > 0 && (
        <div style={{ background: C.amberBg, border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>💉</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.amberText }}>{t('animalDetail.upcomingVac')}</div>
            {upcomingVacs.slice(0, 2).map(v => {
              const days = Math.ceil((new Date(v.nextDueDate) - Date.now()) / (24 * 3600 * 1000));
              return (
                <div key={v._id} style={{ fontSize: 12, color: C.amberText, marginTop: 2 }}>
                  {v.vaccine} — {fmtDate(v.nextDueDate)} ({days} {t('animalDetail.day')})
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pregnancy banner */}
      {animal.gender === 'female' && animal.pregnancyStatus === 'pregnant' && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤰</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E' }}>{t('animalDetail.isPregnant')}</div>
            {animal.pregnancyDate && (
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                {t('animalDetail.pregnancyStart')}: {fmtDate(animal.pregnancyDate)}
              </div>
            )}
            {animal.expectedBirthDate && (() => {
              const days = Math.ceil((new Date(animal.expectedBirthDate) - Date.now()) / (24 * 3600 * 1000));
              return (
                <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                  {t('animalDetail.expectedBirth')}: {fmtDate(animal.expectedBirthDate)}
                  {days > 0 ? ` (${t('animalDetail.inDays')} ${days} ${t('animalDetail.day')})` : ` (${t('animalDetail.overdueBirth')})`}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {[['weight','animalDetail.tab.weight'],['vaccination','animalDetail.tab.vaccination'],['medical','animalDetail.tab.medical'],['info','animalDetail.tab.info']].map(([tab, labelKey]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: activeTab === tab ? C.green : 'transparent', color: activeTab === tab ? '#fff' : C.muted, transition: 'all 0.15s' }}>
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* ── Weight tab ── */}
      {activeTab === 'weight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chart */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>📈 {t('animalDetail.growthChart')}</div>
            <WeightChart entries={weightLog} tFn={t} />
          </div>

          {/* Weight goals */}
          <WeightGoalEditor animal={animal} animalId={id} onSaved={setAnimal} tFn={t} />

          {/* Add weight form */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ {t('animalDetail.addWeight')}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.weightKg')} *</label>
                <input type="number" min="0" step="0.1" value={weightForm.weightKg} onChange={e => setWeightForm(p => ({ ...p, weightKg: e.target.value }))} placeholder={t('animalDetail.weightPlaceholder')}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('common.date')}</label>
                <input type="date" value={weightForm.date} onChange={e => setWeightForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.notes')}</label>
                <input value={weightForm.notes} onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('common.optional')}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <button type="button" onClick={handleAddWeight} disabled={savingWeight}
                style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: savingWeight ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingWeight ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                {savingWeight ? '…' : t('animalDetail.record')}
              </button>
            </div>
            {weightErr && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>{weightErr}</p>}
          </div>

          {/* Weight log table */}
          {weightLog.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>{t('animalDetail.weightLog')} ({weightLog.length})</div>
              {[...weightLog].reverse().map((e, i) => (
                <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < weightLog.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{e.weightKg} {t('common.kg')}</span>
                    {e.notes && <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>{e.notes}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(e.date)}</span>
                  <button type="button" onClick={() => handleDeleteWeight(e._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 16, lineHeight: 1 }}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Vaccination tab ── */}
      {activeTab === 'vaccination' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Add vaccination form */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ {t('animalDetail.addVaccination')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.vaccineName')} *</label>
                  <input value={vacForm.vaccine} onChange={e => setVacForm(p => ({ ...p, vaccine: e.target.value }))} placeholder={t('animalDetail.vaccinePlaceholder')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.vacDate')}</label>
                  <input type="date" value={vacForm.date} onChange={e => setVacForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.nextDose')}</label>
                  <input type="date" value={vacForm.nextDueDate} onChange={e => setVacForm(p => ({ ...p, nextDueDate: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.vet')}</label>
                  <input value={vacForm.vet} onChange={e => setVacForm(p => ({ ...p, vet: e.target.value }))} placeholder={t('common.optional')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.notes')}</label>
                  <input value={vacForm.notes} onChange={e => setVacForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('common.optional')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <button type="button" onClick={handleAddVaccination} disabled={savingVac}
                  style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: savingVac ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingVac ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {savingVac ? '…' : t('animalDetail.record')}
                </button>
              </div>
            </div>
            {vacErr && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>{vacErr}</p>}
          </div>

          {/* Vaccination log */}
          {vacLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>
              {t('animalDetail.noVaccinations')}
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>{t('animalDetail.vacLog')} ({vacLog.length})</div>
              {vacLog.map((v, i) => {
                const isDue = v.nextDueDate && new Date(v.nextDueDate) <= new Date();
                const daysToNext = v.nextDueDate ? Math.ceil((new Date(v.nextDueDate) - Date.now()) / (24 * 3600 * 1000)) : null;
                return (
                  <div key={v._id} style={{ padding: '14px 20px', borderBottom: i < vacLog.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 18, marginTop: 1 }}>💉</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{v.vaccine}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                          {fmtDate(v.date)}
                          {v.vet && ` · ${t('animalDetail.dr')} ${v.vet}`}
                          {v.notes && ` · ${v.notes}`}
                        </div>
                        {v.nextDueDate && (
                          <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: isDue ? C.red : daysToNext <= 14 ? C.amber : C.green }}>
                            {isDue ? `⚠ ${t('animalDetail.overdue')} — ${t('animalDetail.wasScheduled')} ${fmtDate(v.nextDueDate)}` : `${t('animalDetail.nextDose')}: ${fmtDate(v.nextDueDate)} (${daysToNext} ${t('animalDetail.day')})`}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => handleDeleteVaccination(v._id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Medical tab ── */}
      {activeTab === 'medical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Add medical record form */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ {t('animalDetail.addMedical')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Row 1: diagnosis + date */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 3, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.diagnosis')} *</label>
                  <input value={medForm.diagnosis} onChange={e => setMedForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder={t('animalDetail.diagnosisPlaceholder')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.incidentDate')}</label>
                  <input type="date" value={medForm.date} onChange={e => setMedForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 2: treatment + medication */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.treatment')}</label>
                  <input value={medForm.treatment} onChange={e => setMedForm(p => ({ ...p, treatment: e.target.value }))} placeholder={t('animalDetail.treatmentPlaceholder')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.medications')}</label>
                  <input value={medForm.medication} onChange={e => setMedForm(p => ({ ...p, medication: e.target.value }))} placeholder={t('animalDetail.medicationsPlaceholder')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 3: vet + cost + followUpDate */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.vet')}</label>
                  <input value={medForm.vet} onChange={e => setMedForm(p => ({ ...p, vet: e.target.value }))} placeholder={t('common.optional')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.cost')}</label>
                  <input type="number" min="0" step="1" value={medForm.cost} onChange={e => setMedForm(p => ({ ...p, cost: e.target.value }))} placeholder="0"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.followupDate')}</label>
                  <input type="date" value={medForm.followUpDate} onChange={e => setMedForm(p => ({ ...p, followUpDate: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 4: notes + submit */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{t('animalDetail.extraNotes')}</label>
                  <input value={medForm.notes} onChange={e => setMedForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('common.optional')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <button type="button" onClick={handleAddMedical} disabled={savingMed}
                  style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: savingMed ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingMed ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {savingMed ? '…' : t('common.save')}
                </button>
              </div>
            </div>
            {medErr && <p style={{ color: C.red, fontSize: 12, margin: '8px 0 0' }}>{medErr}</p>}
          </div>

          {/* Medical records timeline */}
          {medLoading && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
              {Array.from({length: 3}).map((_, i) => (
                <div key={i} style={{ height: 72, borderRadius: 10, background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', marginBottom: i < 2 ? 12 : 0 }} />
              ))}
            </div>
          )}

          {!medLoading && medRecords.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏥</div>
              {t('animalDetail.noMedical')}
            </div>
          )}

          {!medLoading && medRecords.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>
                {t('animalDetail.medLog')} ({medRecords.length})
              </div>
              {medRecords.map((rec, i) => {
                const hasFollowUp = rec.followUpDate && new Date(rec.followUpDate) > new Date();
                const followDays  = rec.followUpDate ? Math.ceil((new Date(rec.followUpDate) - Date.now()) / (24 * 3600 * 1000)) : null;
                const isConfirmingDelete = medDeleting === rec._id;
                return (
                  <div key={rec._id} style={{ padding: '16px 20px', borderBottom: i < medRecords.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {/* Icon */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: rec.resolved ? C.greenLt : C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {rec.resolved ? '✅' : '🤒'}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{rec.diagnosis}</span>
                          {rec.resolved && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenLt, padding: '2px 7px', borderRadius: 6 }}>{t('animalDetail.recovered')}</span>}
                        </div>

                        <div style={{ fontSize: 12, color: C.muted, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 4 }}>
                          <span>📅 {fmtDate(rec.date)}</span>
                          {rec.vet     && <span>👨‍⚕️ {t('animalDetail.dr')} {rec.vet}</span>}
                          {rec.cost > 0 && <span>💰 {rec.cost.toLocaleString('ar-EG')} {t('common.egp')}</span>}
                        </div>

                        {rec.treatment && <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}><strong>{t('animalDetail.treatment')}:</strong> {rec.treatment}</div>}
                        {rec.medication && <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}><strong>{t('animalDetail.medications')}:</strong> {rec.medication}</div>}
                        {rec.notes     && <div style={{ fontSize: 12, color: C.muted }}>{rec.notes}</div>}

                        {hasFollowUp && (
                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: followDays <= 3 ? C.red : C.amber }}>
                            ⏰ {t('animalDetail.followupDate')}: {fmtDate(rec.followUpDate)} ({followDays} {t('animalDetail.day')})
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
                        {isConfirmingDelete ? (
                          <>
                            <button type="button" onClick={() => handleDeleteMedical(rec._id)}
                              style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              {t('common.confirm')}
                            </button>
                            <button type="button" onClick={() => setMedDeleting(null)}
                              style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 12, cursor: 'pointer' }}>
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setMedDeleting(rec._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 16, lineHeight: 1 }}>🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Info tab ── */}
      {activeTab === 'info' && (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: C.shadow }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 16 }}>📋 {t('animalDetail.info')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
            {[
              [t('animalDetail.infoType'),    t(TYPE_KEY[animal.type]) || animal.type],
              [t('animalDetail.infoBreed'),   animal.breed || '—'],
              [t('animalDetail.infoTagId'),   animal.tagId || '—'],
              [t('animalDetail.infoGender'),  t(GENDER_KEY[animal.gender]) || '—'],
              [t('animalDetail.infoDob'),     animal.dob ? fmtDate(animal.dob) : '—'],
              [t('animalDetail.infoAge'),     ageLabel(animal.dob, t) || '—'],
              [t('animalDetail.infoWeight'),  animal.currentWeight ? `${animal.currentWeight} ${t('common.kg')}` : '—'],
              [t('animalDetail.infoColor'),   animal.color || '—'],
              [t('animalDetail.infoHealth'),  t(HEALTH_KEY[animal.healthStatus])],
              [t('animalDetail.infoStatus'),  t(STATUS_KEY[animal.status])],
              [t('animalDetail.infoWeighings'), `${(animal.weightLog || []).length} ${t('animalDetail.measurements')}`],
              [t('animalDetail.infoVaccinations'), `${(animal.vaccinationLog || []).length} ${t('animalDetail.vacCount')}`],
              ...(animal.gender === 'female' ? [
                [t('animalDetail.infoPregnancy'), t(PREGNANCY_KEY[animal.pregnancyStatus]) || '—'],
                ...(animal.pregnancyStatus === 'pregnant' && animal.expectedBirthDate ? [[t('animalDetail.infoExpectedBirth'), fmtDate(animal.expectedBirthDate)]] : []),
                ...(animal.pregnancyStatus === 'recently_gave_birth' && animal.birthCount ? [[t('animalDetail.infoBirthCount'), String(animal.birthCount)]] : []),
              ] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
          {animal.notes && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: C.greenLt, borderRadius: 10, fontSize: 13, color: C.muted }}>
              <strong style={{ color: C.text }}>{t('animalDetail.notesLabel')}: </strong>{animal.notes}
            </div>
          )}
          {/* Images */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase' }}>{t('animalDetail.photos')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {(animal.images || []).map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: `2px solid ${C.border}`, flexShrink: 0 }}>
                  <img src={getImageUrl(src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    title="حذف الصورة"
                    style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(220,38,38,0.85)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              ))}
              {/* Add more photos button */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: 10, border: `2px dashed ${C.border}`, background: C.greenLt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: C.muted, fontSize: 11, fontWeight: 700 }}>
                <span style={{ fontSize: 20 }}>📷</span>
                {t('animalDetail.addPhoto') || 'إضافة'}
              </button>
            </div>
          </div>

          {/* QR Code */}
          {(() => {
            const qrUrl = `${window.location.origin}/buyer/farm/${animal.seller}/listing/${animal._id}`;
            const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=2C1810&margin=6`;
            return (
              <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <img
                  src={qrImgSrc}
                  alt="QR code"
                  style={{ width: 120, height: 120, borderRadius: 10, border: `2px solid ${C.border}`, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>📲 {t('animalDetail.qrShare')}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>{t('animalDetail.qrHint')}</div>
                  <a
                    href={qrImgSrc}
                    download={`animal-qr-${animal._id}.png`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.greenBg, color: C.greenText, borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', border: `1px solid ${C.green}40` }}
                  >
                    ⬇️ {t('animalDetail.downloadQr')}
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Sold price modal ──────────────────────────────────────────────── */}
      {soldModal && (
        <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) setSoldModal(false); }}>
          <div style={{ background:C.card,borderRadius:18,padding:'28px 24px',width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',direction:'rtl' }}>
            <div style={{ fontSize:18,fontWeight:800,color:C.text,marginBottom:4 }}>💰 تسجيل البيع</div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:20 }}>
              {animal?.breed || animal?.type}{animal?.tagId ? ` — ${animal.tagId}` : ''}
            </div>

            {/* Price */}
            <label style={{ display:'block',fontSize:12,fontWeight:700,color:C.text,marginBottom:6 }}>سعر البيع (جنيه) <span style={{ color:'#DC2626' }}>*</span></label>
            <input
              type="number" min="0" step="any" placeholder="مثال: 15000"
              value={soldForm.price}
              onChange={e => { setSoldForm(f => ({ ...f, price: e.target.value })); setSoldError(''); }}
              style={{ width:'100%',boxSizing:'border-box',padding:'11px 13px',borderRadius:10,border:`1.5px solid ${soldError?'#DC2626':C.border}`,fontSize:15,fontFamily:'inherit',outline:'none',marginBottom: soldError?4:16 }}
              autoFocus
            />
            {soldError && <div style={{ fontSize:12,color:'#DC2626',marginBottom:12 }}>{soldError}</div>}

            {/* Payment method */}
            <label style={{ display:'block',fontSize:12,fontWeight:700,color:C.text,marginBottom:6 }}>طريقة الدفع</label>
            <select value={soldForm.paymentMethod} onChange={e => setSoldForm(f => ({ ...f, paymentMethod: e.target.value }))}
              style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:'inherit',marginBottom:16,outline:'none',background:C.card,color:C.text }}>
              <option value="cash">نقدي</option>
              <option value="transfer">تحويل بنكي</option>
              <option value="instapay">إنستاباي</option>
            </select>

            {/* Note */}
            <label style={{ display:'block',fontSize:12,fontWeight:700,color:C.text,marginBottom:6 }}>ملاحظة (اختياري)</label>
            <input type="text" placeholder="مثال: بيع في سوق المواشي" value={soldForm.note}
              onChange={e => setSoldForm(f => ({ ...f, note: e.target.value }))}
              style={{ width:'100%',boxSizing:'border-box',padding:'10px 13px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:22 }}
            />

            <div style={{ display:'flex',gap:10 }}>
              <button type="button" onClick={handleConfirmSold} disabled={savingStatus}
                style={{ flex:1,padding:'12px',borderRadius:11,border:'none',background:C.green,color:'#fff',fontSize:14,fontWeight:800,cursor:savingStatus?'wait':'pointer',opacity:savingStatus?0.7:1 }}>
                {savingStatus ? 'جارٍ الحفظ…' : 'تأكيد البيع ✓'}
              </button>
              <button type="button" onClick={() => setSoldModal(false)} disabled={savingStatus}
                style={{ padding:'12px 18px',borderRadius:11,border:`1.5px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,cursor:'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
    </div>
  );
};

export default SellerAnimalDetail;
