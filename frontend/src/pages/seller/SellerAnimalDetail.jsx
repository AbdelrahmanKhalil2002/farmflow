import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAnimalById, updateAnimal, deleteAnimal,
  addWeightEntry, deleteWeightEntry,
  addVaccinationEntry, deleteVaccinationEntry,
  getMedicalRecords, addMedicalRecord, deleteMedicalRecord,
} from '../../services/animalService';

const C = {
  bg:       '#F7FBF7',
  card:     '#FFFFFF',
  green:    '#3A7D44',
  greenDk:  '#2D6235',
  greenLt:  '#F0F7F1',
  greenBg:  '#DCFCE7',
  greenText:'#166534',
  border:   '#D4E8D6',
  text:     '#1A2E1C',
  muted:    '#4B6B4E',
  textMuted:'#6B8F71',
  shadow:   '0 2px 8px rgba(26,46,28,0.08)',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amber:    '#D97706',
  amberBg:  '#FEF9C3',
  amberText:'#92400E',
};

const TYPE_AR    = { cattle:'بقر', buffalo:'جاموس', sheep:'أغنام', goat:'ماعز', camel:'إبل', horse:'خيول', poultry:'دواجن', rabbit:'أرانب', other:'أخرى' };
const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🪘', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
const HEALTH_AR  = { healthy:'بصحة جيدة', sick:'مريض', quarantine:'حجر صحي', deceased:'متوفي' };
const HEALTH_COLOR = { healthy: C.green, sick: C.red, quarantine: C.amber, deceased: '#94A3B8' };
const GENDER_AR    = { male:'ذكر', female:'أنثى', unknown:'—' };
const STATUS_AR    = { active:'نشط', sold:'مُباع', deceased:'متوفي' };
const PREGNANCY_AR = { none:'غير حامل', pregnant:'حامل 🤰', recently_gave_birth:'وضعت مؤخرًا 🐣' };

const PREGNANCY_OPTIONS = [
  { val: 'none',                label: 'غير حامل',      color: '#6B7280' },
  { val: 'pregnant',            label: '🤰 حامل',        color: '#D97706' },
  { val: 'recently_gave_birth', label: '🐣 وضعت مؤخرًا', color: '#16A34A' },
];

const ageLabel = (dob) => {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 24 * 3600 * 1000));
  return months < 24 ? `${months} شهر` : `${Math.floor(months / 12)} سنة`;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });

// ── Mini SVG Weight Chart ─────────────────────────────────────────────────────
const WeightChart = ({ entries }) => {
  if (entries.length < 2) return (
    <div style={{ textAlign: 'center', padding: '24px', color: C.textMuted, fontSize: 13 }}>
      سجّل قياسين أو أكثر لعرض مخطط النمو
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
            <text x={px(i)} y={py(e.weightKg) - 10} textAnchor="middle" fontSize={10} fontWeight="700" fill={C.green}>{e.weightKg} كجم</text>
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
const WeightGoalEditor = ({ animal, animalId, onSaved }) => {
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
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>🎯 أهداف النمو والوزن</div>
        <button type="button" onClick={() => setOpen(p => !p)}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
          {open ? 'إغلاق' : 'تعديل'}
        </button>
      </div>

      {/* Current goals display */}
      {!open && (animal?.targetWeight || animal?.nextWeighingDate) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {animal?.targetWeight && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>الوزن المستهدف</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{animal.targetWeight} كجم</div>
              {pct !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: C.green, borderRadius: 3, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{pct}% من الهدف</div>
                </div>
              )}
            </div>
          )}
          {animal?.nextWeighingDate && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>موعد الوزن القادم</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmtDate(animal.nextWeighingDate)}</div>
              {(() => {
                const d = Math.ceil((new Date(animal.nextWeighingDate) - Date.now()) / (24 * 3600 * 1000));
                return <div style={{ fontSize: 11, color: d <= 0 ? C.red : d <= 3 ? C.amber : C.muted, marginTop: 3 }}>{d <= 0 ? 'متأخر!' : `خلال ${d} يوم`}</div>;
              })()}
            </div>
          )}
        </div>
      )}

      {!open && !animal?.targetWeight && !animal?.nextWeighingDate && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: C.muted }}>لم يُحدد وزن مستهدف أو موعد وزن بعد.</p>
      )}

      {open && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الوزن المستهدف (كجم)</label>
            <input type="number" min="0" step="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="مثال: 120"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>موعد الوزن القادم</label>
            <input type="date" value={nextDt} onChange={e => setNextDt(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: saving ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '…' : 'حفظ'}
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

  // Status edit
  const [statusEdit, setStatusEdit] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Pregnancy edit
  const [pregnancyEdit, setPregnancyEdit] = useState(false);
  const [pregnancyForm, setPregnancyForm] = useState({ pregnancyStatus: 'none', pregnancyDate: '', expectedBirthDate: '', birthCount: '' });
  const [savingPregnancy, setSavingPregnancy] = useState(false);
  const pregnancyInitialized = useRef(false);

  useEffect(() => {
    getAnimalById(id)
      .then(r => setAnimal(r.data))
      .catch(() => setLoadErr('الحيوان غير موجود أو ليس لديك صلاحية عرضه.'))
      .finally(() => setLoading(false));
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
    if (!medForm.diagnosis.trim()) { setMedErr('أدخل التشخيص'); return; }
    setMedErr(''); setSavingMed(true);
    try {
      const payload = { ...medForm };
      if (!payload.cost) delete payload.cost;
      if (!payload.followUpDate) delete payload.followUpDate;
      await addMedicalRecord(id, payload);
      const r = await getMedicalRecords(id);
      setMedRecords(r.data);
      setMedForm({ date: new Date().toISOString().slice(0,10), diagnosis: '', treatment: '', medication: '', vet: '', cost: '', followUpDate: '', notes: '' });
    } catch (err) { setMedErr(err?.response?.data?.message || 'خطأ'); }
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
    if (!weightForm.weightKg || Number(weightForm.weightKg) <= 0) { setWeightErr('أدخل وزنًا صحيحًا'); return; }
    setWeightErr(''); setSavingWeight(true);
    try {
      await addWeightEntry(id, weightForm);
      const r = await getAnimalById(id);
      setAnimal(r.data);
      setWeightForm({ weightKg: '', date: new Date().toISOString().slice(0,10), notes: '' });
    } catch (err) { setWeightErr(err?.response?.data?.message || 'خطأ'); }
    finally { setSavingWeight(false); }
  };

  const handleDeleteWeight = async (entryId) => {
    try {
      await deleteWeightEntry(id, entryId);
      setAnimal(p => ({ ...p, weightLog: p.weightLog.filter(e => e._id !== entryId) }));
    } catch {}
  };

  const handleAddVaccination = async () => {
    if (!vacForm.vaccine.trim()) { setVacErr('أدخل اسم اللقاح'); return; }
    setVacErr(''); setSavingVac(true);
    try {
      await addVaccinationEntry(id, vacForm);
      const r = await getAnimalById(id);
      setAnimal(r.data);
      setVacForm({ vaccine: '', date: new Date().toISOString().slice(0,10), nextDueDate: '', vet: '', notes: '' });
    } catch (err) { setVacErr(err?.response?.data?.message || 'خطأ'); }
    finally { setSavingVac(false); }
  };

  const handleDeleteVaccination = async (entryId) => {
    try {
      await deleteVaccinationEntry(id, entryId);
      setAnimal(p => ({ ...p, vaccinationLog: p.vaccinationLog.filter(e => e._id !== entryId) }));
    } catch {}
  };

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      const fd = new FormData(); fd.append('status', newStatus);
      await updateAnimal(id, fd);
      setAnimal(p => ({ ...p, status: newStatus }));
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
    if (!window.confirm('هل أنت متأكد من حذف هذا الحيوان نهائيًا؟')) return;
    try { await deleteAnimal(id); navigate('/seller/herd'); } catch {}
  };

  // Navigate to SellerAddListing with pre-filled query params
  const handleListForSale = () => {
    if (!animal) return;
    const params = new URLSearchParams({
      type:   animal.type  || '',
      breed:  animal.breed || '',
      weight: animal.currentWeight || '',
      fromAnimal: animal._id,
    });
    navigate(`/seller/add-listing?${params.toString()}`);
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>جاري التحميل…</div>
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
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", maxWidth: 760 }} dir="rtl">

      {/* Header card */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ height: 6, background: animal.status === 'active' ? C.green : animal.status === 'sold' ? C.amber : '#94A3B8' }} />
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: 64, height: 64, borderRadius: 16, background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
              {TYPE_EMOJI[animal.type] || '🐾'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
                  {TYPE_AR[animal.type] || animal.type}
                  {animal.breed && ` — ${animal.breed}`}
                </h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: `${healthColor}18`, color: healthColor }}>
                  {HEALTH_AR[animal.healthStatus]}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: C.greenLt, color: C.greenText }}>
                  {STATUS_AR[animal.status] || animal.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: C.muted }}>
                {animal.tagId && <span>🏷 {animal.tagId}</span>}
                {animal.gender !== 'unknown' && <span>{animal.gender === 'male' ? '♂' : '♀'} {GENDER_AR[animal.gender]}</span>}
                {ageLabel(animal.dob) && <span>📅 {ageLabel(animal.dob)}</span>}
                {animal.currentWeight && <span>⚖️ {animal.currentWeight} كجم</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
              {animal.status === 'active' && (
                <button type="button" onClick={handleListForSale}
                  style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  عرض للبيع ←
                </button>
              )}
              <button type="button" onClick={() => setStatusEdit(p => !p)}
                style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                تغيير الحالة
              </button>
              {animal.gender === 'female' && (
                <button type="button" onClick={() => setPregnancyEdit(p => !p)}
                  style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid #FED7AA`, background: '#FFF7ED', color: '#92400E', fontSize: 13, cursor: 'pointer' }}>
                  🤰 تحديث الحمل
                </button>
              )}
              <button type="button" onClick={handleDelete}
                style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid #FECACA', background: C.redBg, color: C.red, fontSize: 13, cursor: 'pointer' }}>
                حذف
              </button>
            </div>
          </div>

          {/* Status picker */}
          {statusEdit && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, animation: 'slideDown 0.2s ease' }}>
              {[['active','نشط','#3A7D44'],['sold','مُباع','#D97706'],['deceased','متوفي','#94A3B8']].map(([v, l, color]) => (
                <button key={v} type="button" onClick={() => handleStatusChange(v)} disabled={savingStatus || animal.status === v}
                  style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${animal.status === v ? color : C.border}`, background: animal.status === v ? `${color}18` : C.card, color: animal.status === v ? color : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Pregnancy editor */}
          {pregnancyEdit && animal.gender === 'female' && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, animation: 'slideDown 0.2s ease' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>تحديث حالة الحمل</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {PREGNANCY_OPTIONS.map(p => {
                  const active = pregnancyForm.pregnancyStatus === p.val;
                  return (
                    <button key={p.val} type="button" onClick={() => setPregnancyForm(f => ({ ...f, pregnancyStatus: p.val }))}
                      style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${active ? p.color : '#FED7AA'}`, background: active ? `${p.color}18` : '#fff', color: active ? p.color : '#92400E', fontSize: 12, fontWeight: active ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {pregnancyForm.pregnancyStatus === 'pregnant' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>تاريخ بداية الحمل</label>
                    <input type="date" value={pregnancyForm.pregnancyDate} onChange={e => setPregnancyForm(f => ({ ...f, pregnancyDate: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>الموعد المتوقع للولادة</label>
                    <input type="date" value={pregnancyForm.expectedBirthDate} onChange={e => setPregnancyForm(f => ({ ...f, expectedBirthDate: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
              )}

              {pregnancyForm.pregnancyStatus === 'recently_gave_birth' && (
                <div style={{ marginBottom: 12, maxWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>عدد المواليد</label>
                  <input type="number" min="0" step="1" value={pregnancyForm.birthCount} onChange={e => setPregnancyForm(f => ({ ...f, birthCount: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #FED7AA', background: '#fff', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              )}

              <button type="button" onClick={handlePregnancyUpdate} disabled={savingPregnancy}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: savingPregnancy ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingPregnancy ? 'not-allowed' : 'pointer' }}>
                {savingPregnancy ? '…' : 'حفظ'}
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
            <div style={{ fontWeight: 800, fontSize: 13, color: C.amberText }}>تطعيم قادم</div>
            {upcomingVacs.slice(0, 2).map(v => {
              const days = Math.ceil((new Date(v.nextDueDate) - Date.now()) / (24 * 3600 * 1000));
              return (
                <div key={v._id} style={{ fontSize: 12, color: C.amberText, marginTop: 2 }}>
                  {v.vaccine} — {fmtDate(v.nextDueDate)} ({days} يوم)
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
            <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E' }}>هذا الحيوان حامل</div>
            {animal.pregnancyDate && (
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                بداية الحمل: {fmtDate(animal.pregnancyDate)}
              </div>
            )}
            {animal.expectedBirthDate && (() => {
              const days = Math.ceil((new Date(animal.expectedBirthDate) - Date.now()) / (24 * 3600 * 1000));
              return (
                <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                  الموعد المتوقع للولادة: {fmtDate(animal.expectedBirthDate)}
                  {days > 0 ? ` (خلال ${days} يوم)` : ' (موعد متجاوز)'}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {[['weight','📈 النمو والوزن'],['vaccination','💉 التطعيمات'],['medical','🏥 السجل الطبي'],['info','📋 معلومات']].map(([tab, label]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: activeTab === tab ? C.green : 'transparent', color: activeTab === tab ? '#fff' : C.muted, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Weight tab ── */}
      {activeTab === 'weight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chart */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>📈 مخطط النمو</div>
            <WeightChart entries={weightLog} />
          </div>

          {/* Weight goals */}
          <WeightGoalEditor animal={animal} animalId={id} onSaved={setAnimal} />

          {/* Add weight form */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px', boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ تسجيل قياس وزن جديد</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الوزن (كجم) *</label>
                <input type="number" min="0" step="0.1" value={weightForm.weightKg} onChange={e => setWeightForm(p => ({ ...p, weightKg: e.target.value }))} placeholder="مثال: 48"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>التاريخ</label>
                <input type="date" value={weightForm.date} onChange={e => setWeightForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>ملاحظة</label>
                <input value={weightForm.notes} onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <button type="button" onClick={handleAddWeight} disabled={savingWeight}
                style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: savingWeight ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingWeight ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                {savingWeight ? '…' : 'تسجيل'}
              </button>
            </div>
            {weightErr && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>{weightErr}</p>}
          </div>

          {/* Weight log table */}
          {weightLog.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>سجل القياسات ({weightLog.length})</div>
              {[...weightLog].reverse().map((e, i) => (
                <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < weightLog.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{e.weightKg} كجم</span>
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
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ تسجيل تطعيم جديد</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>اسم اللقاح *</label>
                  <input value={vacForm.vaccine} onChange={e => setVacForm(p => ({ ...p, vaccine: e.target.value }))} placeholder="مثال: لقاح الجمرة الخبيثة"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>تاريخ التطعيم</label>
                  <input type="date" value={vacForm.date} onChange={e => setVacForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الجرعة القادمة</label>
                  <input type="date" value={vacForm.nextDueDate} onChange={e => setVacForm(p => ({ ...p, nextDueDate: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الطبيب البيطري</label>
                  <input value={vacForm.vet} onChange={e => setVacForm(p => ({ ...p, vet: e.target.value }))} placeholder="اختياري"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>ملاحظات</label>
                  <input value={vacForm.notes} onChange={e => setVacForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <button type="button" onClick={handleAddVaccination} disabled={savingVac}
                  style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: savingVac ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingVac ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {savingVac ? '…' : 'تسجيل'}
                </button>
              </div>
            </div>
            {vacErr && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>{vacErr}</p>}
          </div>

          {/* Vaccination log */}
          {vacLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>
              لا توجد تطعيمات مسجّلة بعد
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>سجل التطعيمات ({vacLog.length})</div>
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
                          {v.vet && ` · د. ${v.vet}`}
                          {v.notes && ` · ${v.notes}`}
                        </div>
                        {v.nextDueDate && (
                          <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: isDue ? C.red : daysToNext <= 14 ? C.amber : C.green }}>
                            {isDue ? `⚠ متأخر — كان موعده ${fmtDate(v.nextDueDate)}` : `الجرعة القادمة: ${fmtDate(v.nextDueDate)} (${daysToNext} يوم)`}
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
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>+ تسجيل حادثة طبية</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Row 1: diagnosis + date */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 3, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>التشخيص *</label>
                  <input value={medForm.diagnosis} onChange={e => setMedForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="مثال: إسهال حاد"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>تاريخ الحادثة</label>
                  <input type="date" value={medForm.date} onChange={e => setMedForm(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 2: treatment + medication */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>العلاج</label>
                  <input value={medForm.treatment} onChange={e => setMedForm(p => ({ ...p, treatment: e.target.value }))} placeholder="مثال: محاليل وريدية"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الأدوية</label>
                  <input value={medForm.medication} onChange={e => setMedForm(p => ({ ...p, medication: e.target.value }))} placeholder="مثال: أموكسيسيلين"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 3: vet + cost + followUpDate */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>الطبيب البيطري</label>
                  <input value={medForm.vet} onChange={e => setMedForm(p => ({ ...p, vet: e.target.value }))} placeholder="اختياري"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>التكلفة (ج.م)</label>
                  <input type="number" min="0" step="1" value={medForm.cost} onChange={e => setMedForm(p => ({ ...p, cost: e.target.value }))} placeholder="0"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>موعد المتابعة</label>
                  <input type="date" value={medForm.followUpDate} onChange={e => setMedForm(p => ({ ...p, followUpDate: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Row 4: notes + submit */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5 }}>ملاحظات إضافية</label>
                  <input value={medForm.notes} onChange={e => setMedForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <button type="button" onClick={handleAddMedical} disabled={savingMed}
                  style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: savingMed ? '#A7C4AD' : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingMed ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {savingMed ? '…' : 'حفظ'}
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
              لا توجد سجلات طبية بعد
            </div>
          )}

          {!medLoading && medRecords.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 14, color: C.text }}>
                السجل الطبي ({medRecords.length})
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
                          {rec.resolved && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenLt, padding: '2px 7px', borderRadius: 6 }}>تعافى</span>}
                        </div>

                        <div style={{ fontSize: 12, color: C.muted, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 4 }}>
                          <span>📅 {fmtDate(rec.date)}</span>
                          {rec.vet     && <span>👨‍⚕️ د. {rec.vet}</span>}
                          {rec.cost > 0 && <span>💰 {rec.cost.toLocaleString('ar-EG')} ج.م</span>}
                        </div>

                        {rec.treatment && <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}><strong>العلاج:</strong> {rec.treatment}</div>}
                        {rec.medication && <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}><strong>الأدوية:</strong> {rec.medication}</div>}
                        {rec.notes     && <div style={{ fontSize: 12, color: C.muted }}>{rec.notes}</div>}

                        {hasFollowUp && (
                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: followDays <= 3 ? C.red : C.amber }}>
                            ⏰ متابعة: {fmtDate(rec.followUpDate)} ({followDays} يوم)
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
                        {isConfirmingDelete ? (
                          <>
                            <button type="button" onClick={() => handleDeleteMedical(rec._id)}
                              style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              تأكيد
                            </button>
                            <button type="button" onClick={() => setMedDeleting(null)}
                              style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 12, cursor: 'pointer' }}>
                              إلغاء
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
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 16 }}>📋 معلومات الحيوان</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
            {[
              ['النوع',           TYPE_AR[animal.type] || animal.type],
              ['السلالة',         animal.breed || '—'],
              ['رقم الأذن',       animal.tagId || '—'],
              ['الجنس',           GENDER_AR[animal.gender] || '—'],
              ['تاريخ الميلاد',   animal.dob ? fmtDate(animal.dob) : '—'],
              ['العمر',           ageLabel(animal.dob) || '—'],
              ['الوزن الحالي',    animal.currentWeight ? `${animal.currentWeight} كجم` : '—'],
              ['اللون',           animal.color || '—'],
              ['الحالة الصحية',   HEALTH_AR[animal.healthStatus]],
              ['الحالة',          STATUS_AR[animal.status]],
              ['تسجيل قياسات',   `${(animal.weightLog || []).length} قياس`],
              ['التطعيمات',       `${(animal.vaccinationLog || []).length} تطعيم`],
              ...(animal.gender === 'female' ? [
                ['حالة الحمل', PREGNANCY_AR[animal.pregnancyStatus] || '—'],
                ...(animal.pregnancyStatus === 'pregnant' && animal.expectedBirthDate ? [['موعد الولادة المتوقع', fmtDate(animal.expectedBirthDate)]] : []),
                ...(animal.pregnancyStatus === 'recently_gave_birth' && animal.birthCount ? [['عدد المواليد', String(animal.birthCount)]] : []),
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
              <strong style={{ color: C.text }}>ملاحظات: </strong>{animal.notes}
            </div>
          )}
          {/* Images */}
          {animal.images?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase' }}>الصور</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {animal.images.map((src, i) => (
                  <img key={i} src={`http://localhost:5000${src}`} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.border}` }} />
                ))}
              </div>
            </div>
          )}

          {/* QR Code — 30.2 */}
          {(() => {
            const qrUrl = `${window.location.origin}/buyer/farm/${animal.seller}/listing/${animal._id}`;
            const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}&bgcolor=ffffff&color=2C1810&margin=6`;
            return (
              <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <img
                  src={qrImgSrc}
                  alt="QR code للحيوان"
                  style={{ width: 120, height: 120, borderRadius: 10, border: `2px solid ${C.border}`, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>📲 رمز QR للمشاركة</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>امسح رمز الـ QR للوصول لصفحة هذا الحيوان أو مشاركته مع المشترين</div>
                  <a
                    href={qrImgSrc}
                    download={`animal-qr-${animal._id}.png`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.greenBg, color: C.greenText, borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none', border: `1px solid ${C.green}40` }}
                  >
                    ⬇️ تحميل QR
                  </a>
                </div>
              </div>
            );
          })()}
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
