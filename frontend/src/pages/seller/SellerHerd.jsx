import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnimals, getAnimalSummary, deleteAnimal, getFollowUpsDue } from '../../services/animalService';

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
  shadow:   '0 2px 8px rgba(26,46,28,0.08)',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amber:    '#D97706',
  amberBg:  '#FEF9C3',
  amberText:'#92400E',
};

const TYPE_AR    = { cattle:'بقر', buffalo:'جاموس', sheep:'أغنام', goat:'ماعز', camel:'إبل', horse:'خيول', poultry:'دواجن', rabbit:'أرانب', other:'أخرى' };
const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🐪', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
const GENDER_AR  = { male:'ذكر', female:'أنثى', unknown:'غير محدد' };
const HEALTH_AR  = { healthy:'بصحة جيدة', sick:'مريض', quarantine:'حجر صحي', deceased:'متوفي' };
const HEALTH_COLOR = { healthy: C.green, sick: C.red, quarantine: C.amber, deceased: '#94A3B8' };
const STATUS_AR  = { active:'نشط', sold:'مُباع', deceased:'متوفي' };

const SK = { background:'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite', borderRadius:8 };

const ageLabel = (dob) => {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 24 * 3600 * 1000));
  if (months < 24) return `${months} شهر`;
  return `${Math.floor(months / 12)} سنة`;
};

// ─── AnimalCard ───────────────────────────────────────────────────────────────
const AnimalCard = ({ animal, onDelete, hasFollowUp }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const age = ageLabel(animal.dob);
  const healthColor = HEALTH_COLOR[animal.healthStatus] || C.muted;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        boxShadow: hovered ? '0 8px 24px rgba(26,46,28,0.12)' : C.shadow,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s', overflow: 'hidden',
      }}
    >
      {/* Status stripe */}
      <div style={{ height: 4, background: animal.status === 'active' ? C.green : animal.status === 'sold' ? C.amber : '#94A3B8' }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            {TYPE_EMOJI[animal.type] || '🐾'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_AR[animal.type] || animal.type}
              {animal.breed && <span style={{ fontWeight: 500, fontSize: 12, color: C.muted }}>— {animal.breed}</span>}
            </div>
            {animal.tagId && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>🏷 {animal.tagId}</div>
            )}
          </div>
          {/* Health badge */}
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: `${healthColor}18`, color: healthColor, flexShrink: 0 }}>
            {HEALTH_AR[animal.healthStatus] || animal.healthStatus}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {age && <Chip icon="📅" label={age} />}
          {animal.currentWeight && <Chip icon="⚖️" label={`${animal.currentWeight} كجم`} />}
          {animal.gender !== 'unknown' && <Chip icon={animal.gender === 'male' ? '♂' : '♀'} label={GENDER_AR[animal.gender]} />}
          {animal.weightLog?.length > 1 && <Chip icon="📈" label={`${animal.weightLog.length} قياس وزن`} />}
          {animal.vaccinationLog?.length > 0 && <Chip icon="💉" label={`${animal.vaccinationLog.length} تطعيم`} />}
          {animal.pregnancyStatus === 'pregnant' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 14, background: '#FFFBEB', color: '#92400E', fontWeight: 700, border: '1px solid #FDE68A' }}>
              🤰 حامل
            </span>
          )}
          {animal.pregnancyStatus === 'recently_gave_birth' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 14, background: '#F0FDF4', color: '#166534', fontWeight: 700, border: '1px solid #BBF7D0' }}>
              🐣 وضعت مؤخرًا
            </span>
          )}
          {hasFollowUp && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 14, background: '#FFF1F2', color: '#BE123C', fontWeight: 700, border: '1px solid #FECDD3' }}>
              🏥 متابعة طبية
            </span>
          )}
        </div>

        {/* Upcoming vaccination alert */}
        {upcomingVaccination(animal) && (
          <div style={{ background: C.amberBg, border: `1px solid #FDE68A`, borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 11, color: C.amberText, fontWeight: 600 }}>
            💉 تطعيم قادم: {upcomingVaccination(animal)}
          </div>
        )}

        {/* CTA row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(`/seller/herd/${animal._id}`)}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: hovered ? C.greenDk : C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}>
            عرض التفاصيل ←
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
              🗑
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(animal._id)}
              style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid #FECACA`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              تأكيد الحذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Chip = ({ icon, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 14, background: C.greenLt, color: C.greenText, fontWeight: 600 }}>
    <span>{icon}</span><span>{label}</span>
  </span>
);

const upcomingVaccination = (animal) => {
  const upcoming = (animal.vaccinationLog || [])
    .filter(v => v.nextDueDate && new Date(v.nextDueDate) > new Date())
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  if (!upcoming.length) return null;
  const v = upcoming[0];
  const days = Math.ceil((new Date(v.nextDueDate) - Date.now()) / (24 * 3600 * 1000));
  return `${v.vaccine} — خلال ${days} يوم`;
};

// ─── SellerHerd ───────────────────────────────────────────────────────────────
const SellerHerd = () => {
  const navigate = useNavigate();
  const [animals,  setAnimals]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [followUpIds, setFollowUpIds] = useState(new Set());

  useEffect(() => {
    Promise.all([getAnimals(), getAnimalSummary()])
      .then(([aRes, sRes]) => {
        setAnimals(aRes.data);
        setSummary(sRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load animals with pending medical follow-ups
    getFollowUpsDue()
      .then(r => {
        const ids = new Set(r.data.map(rec => rec.animal?._id).filter(Boolean));
        setFollowUpIds(ids);
      })
      .catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteAnimal(id);
      setAnimals(p => p.filter(a => a._id !== id));
    } catch {}
  };

  const filtered = useMemo(() => {
    let list = [...animals];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(a =>
      a.tagId?.toLowerCase().includes(q) ||
      a.breed?.toLowerCase().includes(q) ||
      TYPE_AR[a.type]?.includes(q)
    );
    if (typeFilter)   list = list.filter(a => a.type === typeFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    return list;
  }, [animals, search, typeFilter, statusFilter]);

  const types = [...new Set(animals.map(a => a.type))];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: C.text }}>إدارة القطيع 🐄</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {loading ? 'جاري التحميل…' : `${animals.length} حيوان مسجّل`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/seller/herd/add')}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + إضافة حيوان
        </button>
      </div>

      {/* Summary strip */}
      {!loading && summary && summary.total > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <SummaryCard label="إجمالي القطيع" value={summary.total} icon="🐾" />
          {summary.avgAgeMonths && <SummaryCard label="متوسط العمر" value={summary.avgAgeMonths < 24 ? `${summary.avgAgeMonths} شهر` : `${Math.floor(summary.avgAgeMonths/12)} سنة`} icon="📅" />}
          {summary.avgWeightKg && <SummaryCard label="متوسط الوزن" value={`${summary.avgWeightKg} كجم`} icon="⚖️" />}
          {Object.entries(summary.byType || {}).map(([t, n]) => (
            <SummaryCard key={t} label={TYPE_AR[t] || t} value={n} icon={TYPE_EMOJI[t] || '🐾'} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث برقم الأذن أو السلالة…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 38px 10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, color: C.text, outline: 'none' }}
          />
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
          <option value="">كل الأنواع</option>
          {types.map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {TYPE_AR[t] || t}</option>)}
        </select>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['active','نشط'],['sold','مُباع'],['deceased','متوفي'],['','الكل']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setStatusFilter(v)}
              style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${statusFilter === v ? C.green : C.border}`, background: statusFilter === v ? C.green : C.card, color: statusFilter === v ? '#fff' : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, ...SK }} />
                <div style={{ flex: 1 }}><div style={{ height: 18, width: '60%', ...SK, marginBottom: 6 }} /><div style={{ height: 13, width: '40%', ...SK }} /></div>
              </div>
              <div style={{ height: 36, ...SK, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>
            {animals.length === 0 ? 'لا توجد حيوانات مسجّلة بعد' : 'لا نتائج مطابقة'}
          </h3>
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>
            {animals.length === 0 ? 'ابدأ بتسجيل حيوانات قطيعك لمتابعة نموها وصحتها' : 'جرّب كلمة بحث مختلفة'}
          </p>
          {animals.length === 0 && (
            <button type="button" onClick={() => navigate('/seller/herd/add')}
              style={{ padding: '10px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              إضافة أول حيوان
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(a => <AnimalCard key={a._id} animal={a} onDelete={handleDelete} hasFollowUp={followUpIds.has(a._id)} />)}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: C.shadow }}>
    <span style={{ fontSize: 22 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
    </div>
  </div>
);

export default SellerHerd;
