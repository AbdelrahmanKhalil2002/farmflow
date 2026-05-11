import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnimals, getAnimalSummary, deleteAnimal, getFollowUpsDue } from '../../services/animalService';
import { getListedAnimalIds } from '../../services/listingService';
import { isDesktop } from '../../utils/platform';
import { useToast } from '../../components/Toast';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';
import { C } from '../../tokens';

const PAGE_SIZE = 200;

const TYPE_EMOJI  = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🐪', horse:'🐎', poultry:'🐔', rabbit:'🐇', other:'🐾' };

// Animal types allowed per farm category
const FARM_TYPE_WHITELIST = {
  poultry: ['poultry', 'other'],
  horses:  ['horse',   'other'],
  // cattle / dairy / mixed / undefined → all livestock, no poultry/horses
  default: ['cattle', 'buffalo', 'sheep', 'goat', 'camel'],
};
const getFarmAllowedTypes = (farmType) =>
  FARM_TYPE_WHITELIST[farmType] ?? FARM_TYPE_WHITELIST.default;
const HEALTH_COLOR = { healthy: C.green, sick: C.red, quarantine: C.amber, deceased: '#94A3B8' };
const TYPE_KEY    = { cattle:'herd.type.cattle', buffalo:'herd.type.buffalo', sheep:'herd.type.sheep', goat:'herd.type.goat', camel:'herd.type.camel', horse:'herd.type.horse', poultry:'herd.type.poultry', rabbit:'herd.type.rabbit', other:'herd.type.other' };
const GENDER_KEY  = { male:'herd.gender.male', female:'herd.gender.female', unknown:'herd.gender.unknown' };
const HEALTH_KEY  = { healthy:'herd.health.healthy', sick:'herd.health.sick', quarantine:'herd.health.quarantine', deceased:'herd.health.deceased' };
const STATUS_KEY  = { active:'herd.status.active', sold:'herd.status.sold', deceased:'herd.status.deceased' };

// Arabic type-name aliases for smart search (normalized → type value)
const TYPE_ALIASES = {
  'بقر':'cattle','بقره':'cattle','ابقار':'cattle',
  'جاموس':'buffalo','جاموسه':'buffalo',
  'غنم':'sheep','خروف':'sheep','اغنام':'sheep',
  'ماعز':'goat','عنزه':'goat',
  'ابل':'camel','جمل':'camel','ناقه':'camel',
  'خيل':'horse','حصان':'horse',
  'دجاج':'poultry','دواجن':'poultry',
  'ارنب':'rabbit','ارانب':'rabbit',
};

const SK = { background:'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite', borderRadius:8 };

const normalizeAr = s => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ً-ٟ]/g, '').toLowerCase();

// Converts age-bucket value → { dobBefore, dobAfter } ISO strings
const MO = 30.44 * 24 * 3600 * 1000;
const ageToDob = v => {
  const n = Date.now();
  if (v === 'u6m')  return { dobAfter:  new Date(n - 6*MO).toISOString() };
  if (v === '6t12') return { dobBefore: new Date(n - 6*MO).toISOString(), dobAfter: new Date(n - 12*MO).toISOString() };
  if (v === '1t2y') return { dobBefore: new Date(n - 12*MO).toISOString(), dobAfter: new Date(n - 24*MO).toISOString() };
  if (v === '2t4y') return { dobBefore: new Date(n - 24*MO).toISOString(), dobAfter: new Date(n - 48*MO).toISOString() };
  if (v === '4yp')  return { dobBefore: new Date(n - 48*MO).toISOString() };
  return {};
};

const ageLabel = (dob, tFn) => {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / MO);
  if (months < 24) return `${months} ${tFn('common.month')}`;
  return `${Math.floor(months / 12)} ${tFn('common.year')}`;
};

// ─── PDF export (print-window — handles Arabic natively) ─────────────────────
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const exportHerdPDF = (animals, tFn) => {
  const date = new Date().toLocaleDateString('ar-EG');
  const rows = animals.map(a => `
    <tr>
      <td>${esc(a.tagId || '—')}</td>
      <td>${esc(tFn(TYPE_KEY[a.type] || 'herd.type.other'))}</td>
      <td>${esc(tFn(GENDER_KEY[a.gender] || 'herd.gender.unknown'))}</td>
      <td>${esc(a.breed || '—')}</td>
      <td>${a.dob ? new Date(a.dob).toISOString().slice(0,10) : '—'}</td>
      <td>${esc(tFn(HEALTH_KEY[a.healthStatus] || 'herd.health.healthy'))}</td>
      <td>${esc(tFn(STATUS_KEY[a.status] || 'herd.status.active'))}</td>
      <td>${a.currentWeight ?? '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>FarmFlow — تقرير القطيع</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;direction:rtl;color:#1a2e1c}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  .meta{font-size:12px;color:#64748b;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#3A7D44;color:#fff;padding:9px 11px;text-align:right;font-weight:700;font-size:12px}
  td{padding:8px 11px;border-bottom:1px solid #e2e8f0;text-align:right}
  tr:nth-child(even) td{background:#f0faf1}
  @media print{body{padding:10mm}@page{margin:12mm;size:A4 landscape}}
</style>
</head>
<body>
<h1>🐃 FarmFlow — إدارة القطيع</h1>
<div class="meta">${date} · ${animals.length} حيوان</div>
<table>
  <thead><tr>
    <th>رقم التعريف</th><th>النوع</th><th>الجنس</th><th>السلالة</th>
    <th>تاريخ الميلاد</th><th>الحالة الصحية</th><th>الحالة</th><th>الوزن (كجم)</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload=()=>window.print()<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (win) { win.document.write(html); win.document.close(); }
};

// ─── CSV export ───────────────────────────────────────────────────────────────
const exportHerdCSV = async (animals, toast, tFn) => {
  const filename = `farmflow-herd-${new Date().toISOString().slice(0,10)}.csv`;
  const header = ['Tag ID','Type','Gender','Breed','Date of Birth','Health Status','Status','Latest Weight (kg)'];
  const lines = animals.map(a => [
    a.tagId || '',
    tFn(TYPE_KEY[a.type] || 'herd.type.other'),
    tFn(GENDER_KEY[a.gender] || 'herd.gender.unknown'),
    a.breed || '',
    a.dob ? new Date(a.dob).toISOString().slice(0,10) : '',
    tFn(HEALTH_KEY[a.healthStatus] || 'herd.health.healthy'),
    tFn(STATUS_KEY[a.status] || 'herd.status.active'),
    a.currentWeight ?? '',
  ]);
  const csv = [header,...lines].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  if (isDesktop) {
    const buffer = Array.from(new TextEncoder().encode('﻿'+csv));
    const res = await window.electron.saveFile({ filename, buffer });
    if (res?.success) toast?.success(<span>{tFn('herd.csv.saved')}<button onClick={() => window.electron.openFile(res.filePath)} style={{ marginRight:8,background:'none',border:'none',color:'#3A7D44',cursor:'pointer',fontWeight:700,fontSize:13 }}>{tFn('herd.csv.open')} ←</button></span>);
  } else {
    const url = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};

// ─── AnimalCard ───────────────────────────────────────────────────────────────
const upcomingVaccination = (animal, tFn) => {
  const upcoming = (animal.vaccinationLog||[]).filter(v => v.nextDueDate && new Date(v.nextDueDate) > new Date()).sort((a,b)=>new Date(a.nextDueDate)-new Date(b.nextDueDate));
  if (!upcoming.length) return null;
  const v = upcoming[0];
  const days = Math.ceil((new Date(v.nextDueDate)-Date.now())/(24*3600*1000));
  return `${v.vaccine} — ${tFn('herd.inDays').replace('{n}',days)}`;
};

const AnimalCard = ({ animal, onDelete, hasFollowUp, isListed, t }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const age = ageLabel(animal.dob, t);
  const healthColor = HEALTH_COLOR[animal.healthStatus] || C.muted;

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>{setHovered(false);setConfirmDelete(false);}}
      style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:hovered?'0 8px 24px rgba(26,46,28,0.12)':C.shadow, transform:hovered?'translateY(-2px)':'none', transition:'all 0.2s', overflow:'hidden' }}>
      <div style={{ height:4, background:animal.status==='active'?C.green:animal.status==='sold'?C.amber:'#94A3B8' }} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
          <div style={{ width:48,height:48,borderRadius:12,background:C.greenLt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{TYPE_EMOJI[animal.type]||'🐾'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:15,color:C.text,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
              {t(TYPE_KEY[animal.type]||'herd.type.other')}
              {animal.breed && <span style={{ fontWeight:500,fontSize:12,color:C.muted }}>— {animal.breed}</span>}
            </div>
            {animal.tagId && <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>🏷 {animal.tagId}</div>}
          </div>
          <span style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:8,background:`${healthColor}18`,color:healthColor,flexShrink:0 }}>{t(HEALTH_KEY[animal.healthStatus]||'herd.health.healthy')}</span>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:12 }}>
          {age && <Chip icon="📅" label={age} />}
          {animal.currentWeight && <Chip icon="⚖️" label={`${animal.currentWeight} ${t('common.kg')}`} />}
          {animal.gender!=='unknown' && <Chip icon={animal.gender==='male'?'♂':'♀'} label={t(GENDER_KEY[animal.gender]||'herd.gender.unknown')} />}
          {animal.weightLog?.length>1 && <Chip icon="📈" label={`${animal.weightLog.length} ${t('herd.weightMeasurements')}`} />}
          {animal.vaccinationLog?.length>0 && <Chip icon="💉" label={`${animal.vaccinationLog.length} ${t('herd.vaccinations')}`} />}
          {animal.pregnancyStatus==='pregnant' && <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:14,background:'#FFFBEB',color:'#92400E',fontWeight:700,border:'1px solid #FDE68A' }}>🤰 {t('herd.pregnant')}</span>}
          {animal.pregnancyStatus==='recently_gave_birth' && <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:14,background:'#F0FDF4',color:'#166534',fontWeight:700,border:'1px solid #BBF7D0' }}>🐣 {t('herd.recentBirth')}</span>}
          {hasFollowUp && <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:14,background:'#FFF1F2',color:'#BE123C',fontWeight:700,border:'1px solid #FECDD3' }}>🏥 {t('herd.medicalFollowUp')}</span>}
          {isListed && <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:14,background:'#FFFBEB',color:'#92400E',fontWeight:700,border:'1px solid #FDE68A' }}>🏷 معروض للبيع</span>}
        </div>
        {upcomingVaccination(animal,t) && (
          <div style={{ background:C.amberBg,border:`1px solid #FDE68A`,borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:11,color:C.amberText,fontWeight:600 }}>
            💉 {t('herd.upcomingVaccination')}: {upcomingVaccination(animal,t)}
          </div>
        )}
        <div style={{ display:'flex',gap:8 }}>
          <button type="button" onClick={()=>navigate(`/seller/herd/${animal._id}`)}
            style={{ flex:1,padding:'9px',borderRadius:9,border:'none',background:hovered?C.greenDk:C.green,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',transition:'background 0.15s' }}>
            {t('herd.viewDetails')} ←
          </button>
          {!confirmDelete
            ? <button type="button" onClick={()=>setConfirmDelete(true)} style={{ padding:'9px 14px',borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,cursor:'pointer' }}>🗑</button>
            : <button type="button" onClick={()=>onDelete(animal._id)} style={{ padding:'9px 14px',borderRadius:9,border:'1px solid #FECACA',background:C.redBg,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer' }}>{t('herd.deleteConfirm')}</button>
          }
        </div>
      </div>
    </div>
  );
};

const Chip = ({ icon, label }) => (
  <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:14,background:C.greenLt,color:C.greenText,fontWeight:600 }}>
    <span>{icon}</span><span>{label}</span>
  </span>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, pages, total, pageSize, onPage, isRTL }) => {
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
  const nums = [];
  const delta = 2;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…');
    }
  }

  const btnBase = { padding:'7px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:600, transition:'all 0.15s' };
  const btnActive = { ...btnBase, background:C.green, color:'#fff', border:`1.5px solid ${C.green}` };
  const btnNav = (disabled) => ({ ...btnBase, color: disabled ? C.muted : C.text, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' });

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginTop:24, padding:'14px 16px', background:C.card, borderRadius:12, border:`1px solid ${C.border}` }}>
      <span style={{ fontSize:13, color:C.muted, fontWeight:500 }}>
        {from}–{to} من {total} حيوان
      </span>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        <button type="button" disabled={page===1} onClick={()=>onPage(page-1)} style={btnNav(page===1)}>
          {isRTL ? '←' : '→'} السابق
        </button>
        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} style={{ padding:'0 4px', color:C.muted }}>…</span>
            : <button key={n} type="button" onClick={()=>onPage(n)} style={n===page ? btnActive : btnBase}>{n}</button>
        )}
        <button type="button" disabled={page===pages} onClick={()=>onPage(page+1)} style={btnNav(page===pages)}>
          التالي {isRTL ? '→' : '←'}
        </button>
      </div>
    </div>
  );
};

// ─── FilterSelect ─────────────────────────────────────────────────────────────
const FilterSelect = ({ value, onChange, children }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ padding:'9px 12px', borderRadius:10, border:`1.5px solid ${value?C.green:C.border}`, background:value?`${C.green}10`:C.card, fontSize:13, color:value?C.green:C.text, cursor:'pointer', outline:'none', fontFamily:'inherit', fontWeight:value?700:400 }}>
    {children}
  </select>
);

// ─── SellerHerd ───────────────────────────────────────────────────────────────
const SellerHerd = () => {
  const navigate = useNavigate();
  const toast    = useToast();
  const { t, isRTL } = useLang();
  const { activeFarm } = useFarm();
  const allowedTypes = getFarmAllowedTypes(activeFarm?.type);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [animals,    setAnimals]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [followUpIds,setFollowUpIds]= useState(new Set());
  const [listedIds,  setListedIds]  = useState(new Set());

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [healthFilter, setHealthFilter] = useState('');
  const [ageFilter,    setAgeFilter]    = useState('');
  const [sortBy,       setSortBy]       = useState('');
  const [quickFilter,  setQuickFilter]  = useState('');

  // Debounce search input 350 ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on any filter change
  const prevFilters = useRef({});
  useEffect(() => {
    const cur = { typeFilter, statusFilter, healthFilter, ageFilter, sortBy, quickFilter };
    const prev = prevFilters.current;
    const changed = Object.keys(cur).some(k => cur[k] !== prev[k]);
    if (changed) { setPage(1); prevFilters.current = cur; }
  }, [typeFilter, statusFilter, healthFilter, ageFilter, sortBy, quickFilter]);

  // ── Build query params ────────────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const params = { page, limit: PAGE_SIZE };

    // Smart search: if query matches a type alias, use type filter
    const q = normalizeAr(debouncedQ.trim());
    if (q) {
      const detectedType = TYPE_ALIASES[q];
      if (detectedType && !typeFilter) params.type = detectedType;
      else params.search = q;
    }

    if (typeFilter)   params.type         = typeFilter;
    if (statusFilter) params.status       = statusFilter;
    if (healthFilter) params.healthStatus = healthFilter;
    if (sortBy)       params.sortBy       = sortBy;

    if (ageFilter) Object.assign(params, ageToDob(ageFilter));

    if (quickFilter === 'vaccination-due') params.vaccinationDue = 'true';
    if (quickFilter === 'weighing-due')    params.weighingDue    = 'true';
    if (quickFilter === 'medical')         params.followUpOnly   = 'true';

    if (activeFarm?._id) params.farmId = activeFarm._id;

    return params;
  }, [page, debouncedQ, typeFilter, statusFilter, healthFilter, ageFilter, sortBy, quickFilter, activeFarm?._id]);

  // ── Fetch animals ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    getAnimals(buildParams())
      .then(res => {
        const d = res.data;
        setAnimals(d.items || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildParams]);

  // ── Summary + follow-ups (load once) ─────────────────────────────────────
  useEffect(() => {
    const farmId = activeFarm?._id;
    getAnimalSummary(farmId ? { farmId } : {}).then(r => setSummary(r.data)).catch(() => {});
    getFollowUpsDue().then(r => setFollowUpIds(new Set(r.data.map(rec => rec.animal?._id).filter(Boolean)))).catch(() => {});
    getListedAnimalIds().then(r => setListedIds(new Set(r.data))).catch(() => {});
  }, [activeFarm?._id]);

  const handleDelete = async (id) => {
    try {
      await deleteAnimal(id);
      setAnimals(p => p.filter(a => a._id !== id));
      setTotal(p => p - 1);
    } catch {}
  };

  const [exportLoading, setExportLoading] = useState(false);

  // Fetch ALL pages matching current filters for export
  const fetchAllForExport = async () => {
    const baseParams = buildParams();
    delete baseParams.page;
    const EXPORT_LIMIT = 500;
    let allItems = [];
    let pg = 1;
    while (true) {
      const res = await getAnimals({ ...baseParams, page: pg, limit: EXPORT_LIMIT });
      const d = res.data;
      allItems = allItems.concat(d.items || []);
      if (allItems.length >= (d.total || 0) || !(d.hasMore)) break;
      pg++;
    }
    return allItems;
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const all = await fetchAllForExport();
      exportHerdPDF(all, t);
    } catch {} finally { setExportLoading(false); }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const all = await fetchAllForExport();
      await exportHerdCSV(all, toast, t);
    } catch {} finally { setExportLoading(false); }
  };

  const isFiltered = !!(search || typeFilter || healthFilter || ageFilter || quickFilter || sortBy || statusFilter !== 'active');
  const resetAll = () => { setSearch(''); setTypeFilter(''); setStatusFilter('active'); setHealthFilter(''); setAgeFilter(''); setSortBy(''); setQuickFilter(''); setPage(1); };

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif" }} dir={isRTL?'rtl':'ltr'}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,gap:12,flexWrap:'wrap' }}>
        <div>
          <h1 style={{ margin:'0 0 3px',fontSize:22,fontWeight:800,color:C.text }}>{t('herd.title')} 🐃</h1>
          <p style={{ margin:0,fontSize:13,color:C.muted }}>{total} {t('herd.registeredCount')}</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          {animals.length>0 && (<>
            <button type="button" onClick={handleExportPDF} disabled={exportLoading}
              style={{ padding:'10px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.card,color:'#DC2626',fontSize:13,fontWeight:700,cursor:exportLoading?'wait':'pointer',opacity:exportLoading?0.6:1 }}>
              {exportLoading ? '...' : '⬇ PDF'}
            </button>
            <button type="button" onClick={handleExportCSV} disabled={exportLoading}
              style={{ padding:'10px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,background:C.card,color:C.green,fontSize:13,fontWeight:700,cursor:exportLoading?'wait':'pointer',opacity:exportLoading?0.6:1 }}>
              {exportLoading ? '...' : '⬇ CSV'}
            </button>
          </>)}
          <button type="button" onClick={()=>navigate('/seller/herd/add')}
            style={{ padding:'10px 20px',borderRadius:10,border:'none',background:C.green,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer' }}>
            + {t('herd.addAnimal')}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {summary && summary.total > 0 && (
        <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginBottom:20 }}>
          <SummaryCard label={t('herd.summary.total')} value={summary.total} icon="🐃" />
          {summary.avgAgeMonths && <SummaryCard label={t('herd.summary.avgAge')} value={summary.avgAgeMonths<24?`${summary.avgAgeMonths} ${t('common.month')}`:`${Math.floor(summary.avgAgeMonths/12)} ${t('common.year')}`} icon="📅" />}
          {summary.avgWeightKg && <SummaryCard label={t('herd.summary.avgWeight')} value={`${summary.avgWeightKg} ${t('common.kg')}`} icon="⚖️" />}
          {Object.entries(summary.byType||{}).map(([type,n])=>(
            <SummaryCard key={type} label={t(TYPE_KEY[type]||'herd.type.other')} value={n} icon={TYPE_EMOJI[type]||'🐾'} />
          ))}
          {summary.soldCount > 0 && (
            <SummaryCard label={t('herd.summary.sold')} value={summary.soldCount} icon="🤝" accent="#D97706" />
          )}
          {summary.deceasedCount > 0 && (
            <SummaryCard label={t('herd.summary.deceased')} value={summary.deceasedCount} icon="🪦" accent="#94A3B8" />
          )}
        </div>
      )}

      {/* ── Filter panel ── */}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'14px 16px',marginBottom:16,display:'flex',flexDirection:'column',gap:10 }}>

        {/* Search */}
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute',[isRTL?'right':'left']:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',fontSize:15 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('herd.searchPlaceholder')}
            style={{ width:'100%',boxSizing:'border-box',padding:isRTL?'10px 38px 10px 14px':'10px 14px 10px 38px',borderRadius:10,border:`1.5px solid ${search?C.green:C.border}`,background:'#FAFAFA',fontSize:13,color:C.text,outline:'none',fontFamily:'inherit' }}
          />
          {search && <button type="button" onClick={()=>setSearch('')} style={{ position:'absolute',[isRTL?'left':'right']:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:C.muted,lineHeight:1 }}>×</button>}
        </div>

        {/* Status + dropdowns + clear */}
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <div style={{ display:'flex',gap:4 }}>
            {[['active',t('herd.status.active')],['sold',t('herd.status.sold')],['deceased',t('herd.status.deceased')],['',t('herd.filterAll')]].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setStatusFilter(v)}
                style={{ padding:'7px 13px',borderRadius:8,border:`1.5px solid ${statusFilter===v?C.green:C.border}`,background:statusFilter===v?C.green:C.card,color:statusFilter===v?'#fff':C.muted,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ width:1,height:28,background:C.border,flexShrink:0 }} />
          <FilterSelect value={typeFilter} onChange={setTypeFilter}>
            <option value="">{t('herd.allTypes')}</option>
            {Object.entries(TYPE_KEY).filter(([type]) => allowedTypes.includes(type)).map(([type,key])=>(
              <option key={type} value={type}>{TYPE_EMOJI[type]} {t(key)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={healthFilter} onChange={setHealthFilter}>
            <option value="">{t('herd.allHealth')}</option>
            <option value="healthy">✅ {t('herd.health.healthy')}</option>
            <option value="sick">🤒 {t('herd.health.sick')}</option>
            <option value="quarantine">⚠️ {t('herd.health.quarantine')}</option>
          </FilterSelect>
          <FilterSelect value={ageFilter} onChange={setAgeFilter}>
            <option value="">{t('herd.allAges')}</option>
            <option value="u6m">{t('herd.ageUnder6m')}</option>
            <option value="6t12">{t('herd.age6to12m')}</option>
            <option value="1t2y">{t('herd.age1to2y')}</option>
            <option value="2t4y">{t('herd.age2to4y')}</option>
            <option value="4yp">{t('herd.age4yPlus')}</option>
          </FilterSelect>
          <FilterSelect value={sortBy} onChange={setSortBy}>
            <option value="">⇅ {t('herd.sortBy')}</option>
            <option value="newest">{t('herd.sort.newest')}</option>
            <option value="oldest">{t('herd.sort.oldest')}</option>
            <option value="heaviest">{t('herd.sort.heaviest')}</option>
            <option value="lightest">{t('herd.sort.lightest')}</option>
            <option value="youngest">{t('herd.sort.youngest')}</option>
            <option value="oldest_age">{t('herd.sort.oldest_age')}</option>
          </FilterSelect>
          <button type="button" onClick={resetAll} disabled={!isFiltered}
            style={{ padding:'7px 14px',borderRadius:8,border:`1.5px solid ${isFiltered?C.red:C.border}`,background:isFiltered?'#FFF1F2':'transparent',color:isFiltered?C.red:C.muted,fontSize:12,fontWeight:700,cursor:isFiltered?'pointer':'default',fontFamily:'inherit',transition:'all 0.15s',opacity:isFiltered?1:0.45 }}>
            ✕ مسح الكل
          </button>
        </div>

        {/* Quick filters */}
        <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
          {[['vaccination-due',`💉 ${t('herd.filter.vaccinationDue')}`],['weighing-due',`⚖️ ${t('herd.filter.weighingDue')}`],['medical',`🏥 ${t('herd.filter.medical')}`]].map(([v,l])=>(
            <button key={v} type="button" onClick={()=>setQuickFilter(quickFilter===v?'':v)}
              style={{ padding:'6px 13px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${quickFilter===v?C.green:C.border}`,background:quickFilter===v?`${C.green}15`:'transparent',color:quickFilter===v?C.green:C.muted,transition:'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {!loading && (
        <div style={{ fontSize:12,color:C.muted,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span>
            {isFiltered
              ? `${total} نتيجة من إجمالي ${(summary?.total||0)+(summary?.soldCount||0)+(summary?.deceasedCount||0)||total} حيوان`
              : `${total} ${t('herd.registeredCount')}`}
          </span>
          {pages > 1 && <span>الصفحة {page} من {pages}</span>}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
          {Array.from({length:12}).map((_,i)=>(
            <div key={i} style={{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:18 }}>
              <div style={{ display:'flex',gap:12,marginBottom:12 }}>
                <div style={{ width:48,height:48,borderRadius:12,...SK }} />
                <div style={{ flex:1 }}><div style={{ height:18,width:'60%',...SK,marginBottom:6 }} /><div style={{ height:13,width:'40%',...SK }} /></div>
              </div>
              <div style={{ height:36,...SK,borderRadius:10 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && animals.length===0 && (
        <div style={{ textAlign:'center',padding:'56px 24px',background:C.card,borderRadius:20,border:`1px solid ${C.border}` }}>
          <div style={{ marginBottom:16,display:'flex',justifyContent:'center' }}>
            <div style={{ width:80,height:80,borderRadius:20,background:C.greenLt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:44 }}>
              {activeFarm?.type==='poultry'?'🐔':activeFarm?.type==='horses'?'🐎':activeFarm?.type==='exotic'?'🦢':'🐃'}
            </div>
          </div>
          <h3 style={{ fontSize:18,fontWeight:800,color:C.text,margin:'0 0 8px' }}>{total===0?t('herd.empty'):t('herd.noResults')}</h3>
          <p style={{ color:C.muted,fontSize:13,margin:'0 0 16px' }}>{total===0?t('herd.emptyHint'):t('herd.noResultsHint')}</p>
          {total===0&&<button type="button" onClick={()=>navigate('/seller/herd/add')} style={{ padding:'10px 22px',background:C.green,color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14 }}>{t('herd.addFirstAnimal')}</button>}
        </div>
      )}

      {/* Grid */}
      {!loading && animals.length>0 && (
        <div className="ff-grid-3" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
          {animals.map(a=><AnimalCard key={a._id} animal={a} onDelete={handleDelete} hasFollowUp={followUpIds.has(a._id)} isListed={listedIds.has(a._id)} t={t} />)}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} isRTL={isRTL} />
    </div>
  );
};

const SummaryCard = ({ label, value, icon, accent }) => (
  <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:C.shadow }}>
    <span style={{ fontSize:22 }}>{icon}</span>
    <div>
      <div style={{ fontSize:18,fontWeight:800,color:accent||C.text }}>{value}</div>
      <div style={{ fontSize:11,color:C.muted }}>{label}</div>
    </div>
  </div>
);

export default SellerHerd;
