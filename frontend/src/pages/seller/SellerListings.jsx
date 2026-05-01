import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyListings, deleteListing } from '../../services/listingService';
import { fmt, getImageUrl } from '../../utils/format';
import { useToast } from '../../components/Toast';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#F8F4EE',
  card:      '#FFFFFF',
  green:     '#3A7D44',
  greenDk:   '#2D6235',
  greenBg:   '#DCFCE7',
  greenText: '#166534',
  amber:     '#D97706',
  amberBg:   '#FEF3C7',
  amberText: '#92400E',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  redText:   '#B91C1C',
  border:    '#E8D5C0',
  text:      '#2C1810',
  muted:     '#8B6B5A',
  shadow:    '0 1px 3px rgba(44,24,16,0.07), 0 4px 12px rgba(44,24,16,0.06)',
  shadowHv:  '0 4px 16px rgba(44,24,16,0.12)',
};

// ─── Status config (with emoji dots as requested) ─────────────────────────────
const STATUS = {
  pending:  { ar: 'معلق الموافقة',  dot: '🟡', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  approved: { ar: 'معتمد ونشط',     dot: '🟢', color: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
  rejected: { ar: 'مرفوض',          dot: '🔴', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  sold:     { ar: 'مباع',           dot: '⚫', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
};

const TYPE_META = {
  cattle:  { emoji: '🐄', ar: 'ماشية',  bg: '#FEF3C7' },
  sheep:   { emoji: '🐑', ar: 'أغنام',  bg: '#DBEAFE' },
  goat:    { emoji: '🐐', ar: 'ماعز',   bg: '#DCFCE7' },
  camel:   { emoji: '🐪', ar: 'إبل',    bg: '#FFEDD5' },
  horse:   { emoji: '🐎', ar: 'خيول',   bg: '#EDE9FE' },
  poultry: { emoji: '🐔', ar: 'دواجن',  bg: '#D1FAE5' },
  other:   { emoji: '🐾', ar: 'أخرى',   bg: '#F3F4F6' },
};

const FILTER_TABS = [
  { key: 'all',      ar: 'الكل'          },
  { key: 'approved', ar: '🟢 معتمد'      },
  { key: 'pending',  ar: '🟡 معلق'       },
  { key: 'rejected', ar: '🔴 مرفوض'      },
  { key: 'sold',     ar: '⚫ مباع'       },
];

const SORT_OPTIONS = [
  { key: 'date_desc',  ar: 'الأحدث أولاً'       },
  { key: 'date_asc',   ar: 'الأقدم أولاً'        },
  { key: 'price_desc', ar: 'السعر: الأعلى أولاً' },
  { key: 'price_asc',  ar: 'السعر: الأقل أولاً'  },
  { key: 'status',     ar: 'حسب الحالة'          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtAge  = (m) => { if (m == null) return '—'; if (m < 12) return `${m} شهر`; const y = Math.floor(m / 12), r = m % 12; return r ? `${y}س ${r}ش` : `${y} سنة`; };
const fmtSAR  = (v) => `${fmt(v)} ج.م`;
const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

// ─── CSV export ───────────────────────────────────────────────────────────────
const exportCSV = (listings) => {
  const header = ['ID', 'النوع', 'السلالة', 'العمر (شهر)', 'الوزن (كجم)', 'السعر (EGP)', 'الحالة', 'الموقع', 'تاريخ الإضافة'];
  const rows = listings.map(l => [l._id, l.type, l.breed || '', l.age ?? '', l.weight ?? '', l.price, l.status, l.location || '', l.createdAt?.slice(0, 10) || '']);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `farmflow-listings-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ─── Thumbnail ────────────────────────────────────────────────────────────────
const Thumb = ({ listing, size = 52 }) => {
  const src   = listing.images?.[0] ? getImageUrl(listing.images[0]) : null;
  const meta  = TYPE_META[listing.type] || TYPE_META.other;
  return src
    ? <img src={src} alt={listing.breed || listing.type} style={{ width: size, height: size, borderRadius: '10px', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.44, flexShrink: 0 }}>{meta.emoji}</div>;
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, reason }) => {
  const [tip, setTip] = useState(false);
  const s = STATUS[status] || STATUS.pending;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', cursor: status === 'rejected' ? 'help' : 'default' }}
        onMouseEnter={() => status === 'rejected' && setTip(true)}
        onMouseLeave={() => setTip(false)}
      >
        {s.dot} {s.ar}
        {status === 'rejected' && <span style={{ fontSize: '11px', opacity: 0.7 }}>ⓘ</span>}
      </span>
      {tip && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1C1917', color: '#fff', fontSize: '12px', lineHeight: 1.5, padding: '8px 12px', borderRadius: '8px', whiteSpace: 'normal', maxWidth: '200px', zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
          <strong style={{ display: 'block', marginBottom: '2px' }}>سبب الرفض:</strong>
          {reason || 'لم يُذكر سبب من قِبل الإدارة.'}
          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1C1917' }} />
        </div>
      )}
    </div>
  );
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────
const CB = ({ checked, indeterminate, onChange }) => {
  const ref = (el) => { if (el) el.indeterminate = !!indeterminate; };
  return <input type="checkbox" ref={ref} checked={checked} onChange={onChange} style={{ width: '15px', height: '15px', accentColor: C.green, cursor: 'pointer', flexShrink: 0 }} />;
};

// ─── Action button ────────────────────────────────────────────────────────────
const ActBtn = ({ onClick, children, danger, primary, disabled, title }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
      borderRadius: '8px', border: `1px solid ${danger ? '#FECACA' : primary ? C.green : C.border}`,
      background: danger ? C.redBg : primary ? C.green : C.card,
      color: danger ? C.redText : primary ? '#fff' : C.muted,
      fontSize: '12px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'all 0.12s', fontFamily: 'inherit',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
  >
    {children}
  </button>
);

// ─── Main component ────────────────────────────────────────────────────────────
const SellerListings = () => {
  const navigate = useNavigate();
  const toast    = useToast();

  const [listings,    setListings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [filterTab,   setFilterTab]   = useState('all');
  const [sortKey,     setSortKey]     = useState('date_desc');
  const [viewMode,    setViewMode]    = useState('table');
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 860);
  const [selected,    setSelected]    = useState(new Set());
  const [deletingId,  setDeletingId]  = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => {
    const onResize = () => { const m = window.innerWidth < 860; setIsMobile(m); if (m) setViewMode('grid'); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = () => {
    setLoading(true); setError('');
    getMyListings()
      .then(({ data }) => setListings(data))
      .catch(() => setError('تعذّر تحميل القوائم.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const visible = useMemo(() => {
    let arr = listings.filter(l => {
      if (filterTab !== 'all' && l.status !== filterTab) return false;
      if (search.trim()) { const q = search.toLowerCase(); if (!l.type?.toLowerCase().includes(q) && !l.breed?.toLowerCase().includes(q)) return false; }
      return true;
    });
    return [...arr].sort((a, b) => {
      if (sortKey === 'date_desc')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortKey === 'date_asc')   return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortKey === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortKey === 'price_asc')  return (a.price || 0) - (b.price || 0);
      if (sortKey === 'status')     return (a.status || '').localeCompare(b.status || '');
      return 0;
    });
  }, [listings, filterTab, search, sortKey]);

  const counts = useMemo(() => {
    const map = { all: listings.length };
    listings.forEach(l => { map[l.status] = (map[l.status] || 0) + 1; });
    return map;
  }, [listings]);

  const visibleIds  = visible.map(l => l._id);
  const allChecked  = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someChecked = visibleIds.some(id => selected.has(id)) && !allChecked;
  const toggleAll   = () => { setSelected(prev => { const n = new Set(prev); allChecked ? visibleIds.forEach(id => n.delete(id)) : visibleIds.forEach(id => n.add(id)); return n; }); setBulkConfirm(false); };
  const toggleOne   = (id) => { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); setBulkConfirm(false); };
  const clearSel    = () => { setSelected(new Set()); setBulkConfirm(false); };

  const confirmDelete = async (id) => {
    setDeleting(true);
    try { await deleteListing(id); setListings(p => p.filter(l => l._id !== id)); setSelected(p => { const n = new Set(p); n.delete(id); return n; }); toast.success('تم حذف الإعلان.'); }
    catch { toast.error('تعذّر الحذف. حاول مرة أخرى.'); }
    finally { setDeleting(false); setDeletingId(null); }
  };

  const confirmBulkDelete = async () => {
    setDeleting(true);
    const ids = [...selected];
    try { await Promise.all(ids.map(id => deleteListing(id))); setListings(p => p.filter(l => !selected.has(l._id))); clearSel(); toast.success(`تم حذف ${ids.length} إعلان.`); }
    catch { toast.error('تعذّر حذف بعض الإعلانات.'); }
    finally { setDeleting(false); setBulkConfirm(false); }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .sl-row:hover td { background: #FDFAF6 !important; }
      `}</style>

      {/* ════ Hero ════ */}
      <div style={{ background: 'linear-gradient(135deg, #1C3A24 0%, #2D6235 55%, #3A7D44 100%)', padding: '26px 32px 30px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', right: -10, top: -18, fontSize: '140px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🐄</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>قوائمي 📋</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
              {loading ? 'جارٍ التحميل…' : `${listings.length} إعلان إجمالي`}
            </p>
          </div>
          <Link to="/seller/add-listing" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: '#fff', color: C.greenDk, borderRadius: '10px', fontSize: '14px', fontWeight: '800' }}>
            ➕ إضافة قائمة جديدة
          </Link>
        </div>
      </div>

      <div style={{ padding: '20px 28px 56px', maxWidth: '1160px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Error */}
        {error && (
          <div role="alert" style={{ background: C.redBg, border: `1px solid #FECACA`, borderRadius: '10px', padding: '11px 16px', color: C.redText, fontSize: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            ⚠️ {error}
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: C.redText, cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* ════ Filters bar ════ */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '13px', pointerEvents: 'none' }}>🔍</span>
              <input type="text" placeholder="بحث بالنوع أو السلالة…" value={search}
                onChange={e => { setSearch(e.target.value); clearSel(); }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 32px 9px 34px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: '#FDFAF7', fontSize: '13px', color: C.text, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              {search && <button type="button" onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px' }}>✕</button>}
            </div>

            {/* Date/sort */}
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: '#FDFAF7', fontSize: '13px', color: C.text, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.ar}</option>)}
            </select>

            {/* View toggle */}
            {!isMobile && (
              <div style={{ display: 'flex', border: `1.5px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                {[['table', '☰', 'جدول'], ['grid', '⊞', 'بطاقات']].map(([mode, icon, label]) => (
                  <button key={mode} type="button" title={label} onClick={() => setViewMode(mode)}
                    style={{ width: '36px', height: '36px', border: 'none', background: viewMode === mode ? C.green : C.card, color: viewMode === mode ? '#fff' : C.muted, cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {/* CSV */}
            <button type="button" onClick={() => exportCSV(visible)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', background: C.card, color: C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
              ↓ CSV
            </button>
          </div>

          {/* Status tabs */}
          <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingTop: '12px', marginTop: '2px', borderTop: `1px solid ${C.border}` }}>
            {FILTER_TABS.map(tab => {
              const active = filterTab === tab.key;
              const cnt    = counts[tab.key] ?? 0;
              return (
                <button key={tab.key} type="button" onClick={() => { setFilterTab(tab.key); clearSel(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.green : C.border}`, background: active ? C.green : 'transparent', color: active ? '#fff' : C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {tab.ar}
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: active ? 'rgba(255,255,255,0.25)' : C.border, color: active ? '#fff' : C.muted }}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ════ Bulk action bar ════ */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', background: '#FFF8F0', border: `1.5px solid #E8C88A`, borderRadius: '12px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>✓ {selected.size} محدد</span>
            {!bulkConfirm
              ? <>
                  <ActBtn danger onClick={() => setBulkConfirm(true)}>🗑 حذف المحددة</ActBtn>
                  <ActBtn onClick={() => exportCSV(listings.filter(l => selected.has(l._id)))}>↓ تصدير CSV</ActBtn>
                </>
              : <>
                  <span style={{ fontSize: '13px', color: C.redText, fontWeight: '700' }}>هل تريد حذف {selected.size} إعلان؟ لا يمكن التراجع.</span>
                  <ActBtn danger onClick={confirmBulkDelete} disabled={deleting}>{deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}</ActBtn>
                  <ActBtn onClick={() => setBulkConfirm(false)}>رجوع</ActBtn>
                </>
            }
            <button type="button" onClick={clearSel} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '16px', marginLeft: 'auto', padding: '2px' }}>✕</button>
          </div>
        )}

        {/* ════ Loading skeleton ════ */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: '68px', borderRadius: '12px', background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* ════ Empty state ════ */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: C.card, borderRadius: '18px', border: `1.5px dashed ${C.border}` }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>{search || filterTab !== 'all' ? '🔍' : '🌾'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: C.text }}>
              {search || filterTab !== 'all' ? 'لا توجد نتائج' : 'لا توجد قوائم بعد'}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: C.muted, lineHeight: 1.7 }}>
              {search || filterTab !== 'all' ? 'جرب تغيير فلتر البحث أو الحالة.' : 'أضف أول قائمة لك لتبدأ البيع.'}
            </p>
            {!search && filterTab === 'all'
              ? <Link to="/seller/add-listing" style={{ display: 'inline-block', padding: '11px 24px', background: C.green, color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '800', textDecoration: 'none' }}>➕ إضافة أول قائمة</Link>
              : <button type="button" onClick={() => { setSearch(''); setFilterTab('all'); }} style={{ padding: '9px 18px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}>مسح الفلاتر</button>
            }
          </div>
        )}

        {/* ════════════════════════════════════════
            TABLE VIEW
        ════════════════════════════════════════ */}
        {!loading && visible.length > 0 && !isMobile && viewMode === 'table' && (
          <div style={{ background: C.card, borderRadius: '18px', boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF5EF', borderBottom: `2px solid ${C.border}` }}>
                  {/* Checkbox */}
                  <th style={{ padding: '13px 14px', width: '36px' }}>
                    <CB checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
                  </th>
                  {[
                    ['الصورة والاسم',  'left',   ''],
                    ['السعر (ج.م)',    'right',  '110px'],
                    ['العمر / الوزن', 'center', '110px'],
                    ['الحالة',         'left',   '160px'],
                    ['المشاهدات',      'center', '84px'],
                    ['الأزرار',        'right',  '150px'],
                  ].map(([label, align, w]) => (
                    <th key={label} style={{ padding: '13px 14px', textAlign: align, fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', width: w || undefined }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const sel    = selected.has(l._id);
                  const delCfm = deletingId === l._id;
                  const meta   = TYPE_META[l.type] || TYPE_META.other;
                  return (
                    <tr key={l._id} className="sl-row"
                      style={{ borderBottom: `1px solid ${C.border}`, background: sel ? '#FFF8F0' : '#fff', transition: 'background 0.1s' }}>

                      {/* Checkbox */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <CB checked={sel} onChange={() => toggleOne(l._id)} />
                      </td>

                      {/* Thumb + name */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <Thumb listing={l} size={52} />
                            {/* Type badge on thumb */}
                            <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '14px', lineHeight: 1, background: '#fff', borderRadius: '50%', padding: '1px' }}>{meta.emoji}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: C.text, textTransform: 'capitalize', lineHeight: 1.2 }}>
                              {l.breed || meta.ar}
                            </div>
                            <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px', textTransform: 'capitalize' }}>{meta.ar}{l.location ? ` · 📍 ${l.location}` : ''}</div>
                            <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{l.createdAt ? fmtDate(l.createdAt) : ''}</div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: C.green }}>{fmtSAR(l.price)}</div>
                      </td>

                      {/* Age / Weight */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{fmtAge(l.age)}</div>
                        <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{l.weight != null ? `${l.weight} كجم` : '—'}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <StatusBadge status={l.status} reason={l.rejectionReason} />
                      </td>

                      {/* Views */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '700', color: C.muted, background: '#F9F5F0', padding: '4px 9px', borderRadius: '20px' }}>
                          👁 <span>{l.views ?? 0}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        {delCfm ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '12px', color: C.redText, fontWeight: '700' }}>حذف؟</span>
                            <ActBtn danger onClick={() => confirmDelete(l._id)} disabled={deleting}>{deleting ? '…' : 'نعم'}</ActBtn>
                            <ActBtn onClick={() => setDeletingId(null)}>لا</ActBtn>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                            <ActBtn onClick={() => navigate(`/seller/edit-listing/${l._id}`)} title="تعديل">✏️ تعديل</ActBtn>
                            <ActBtn onClick={() => navigate(`/buyer/listings/${l._id}`)} title="عرض">👁 عرض</ActBtn>
                            <ActBtn danger onClick={() => setDeletingId(l._id)} title="حذف">🗑</ActBtn>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer */}
            <div style={{ padding: '12px 16px', background: '#FAF5EF', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: C.muted }}>{visible.length} نتيجة</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Status legend */}
                {Object.entries(STATUS).map(([key, s]) => (
                  <span key={key} style={{ fontSize: '11px', color: s.color, fontWeight: '600' }}>{s.dot} {s.ar}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            GRID / CARD VIEW (mobile always, desktop opt-in)
        ════════════════════════════════════════ */}
        {!loading && visible.length > 0 && (isMobile || viewMode === 'grid') && (
          <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {visible.map((l) => {
              const sel    = selected.has(l._id);
              const delCfm = deletingId === l._id;
              const meta   = TYPE_META[l.type] || TYPE_META.other;
              const sm     = STATUS[l.status] || STATUS.pending;
              return (
                <div key={l._id}
                  style={{ background: C.card, borderRadius: '16px', border: `1.5px solid ${sel ? '#C49A6C' : sm.border}`, boxShadow: sel ? C.shadowHv : C.shadow, overflow: 'hidden', transition: 'all 0.15s' }}>

                  {/* ── Card header: thumb + info ── */}
                  <div style={{ display: 'flex', gap: '13px', padding: '16px 16px 12px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Thumb listing={l} size={70} />
                      <div style={{ position: 'absolute', top: 4, left: 4 }}>
                        <CB checked={sel} onChange={() => toggleOne(l._id)} />
                      </div>
                      <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '14px', background: '#fff', borderRadius: '50%', padding: '1px', lineHeight: 1 }}>{meta.emoji}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '5px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: C.text, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.breed || meta.ar}
                          </div>
                          <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>{meta.ar}{l.location ? ` · ${l.location}` : ''}</div>
                        </div>
                        <StatusBadge status={l.status} reason={l.rejectionReason} />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: C.green, letterSpacing: '-0.5px' }}>{fmtSAR(l.price)}</div>
                    </div>
                  </div>

                  {/* ── Stats strip ── */}
                  <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                    {[
                      ['العمر',    fmtAge(l.age)],
                      ['الوزن',    l.weight != null ? `${l.weight} كجم` : '—'],
                      ['المشاهدات', `👁 ${l.views ?? 0}`],
                    ].map(([label, val], i, arr) => (
                      <div key={label} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginTop: '2px' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Date + actions ── */}
                  <div style={{ padding: '5px 14px 3px', fontSize: '10px', color: C.muted }}>
                    {l.createdAt ? `📅 ${fmtDate(l.createdAt)}` : ''}
                  </div>
                  <div style={{ padding: '8px 12px 12px' }}>
                    {delCfm ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: C.redText, fontWeight: '700', flex: 1 }}>هل تريد الحذف؟</span>
                        <ActBtn danger onClick={() => confirmDelete(l._id)} disabled={deleting}>{deleting ? '…' : 'نعم'}</ActBtn>
                        <ActBtn onClick={() => setDeletingId(null)}>لا</ActBtn>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '7px' }}>
                        <ActBtn primary onClick={() => navigate(`/seller/edit-listing/${l._id}`)}>✏️ تعديل</ActBtn>
                        <ActBtn onClick={() => navigate(`/buyer/listings/${l._id}`)}>👁 عرض</ActBtn>
                        <ActBtn danger onClick={() => setDeletingId(l._id)}>🗑 حذف</ActBtn>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && visible.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: C.muted }}>
            <span>عرض {visible.length} من {listings.length} إعلان</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              {Object.entries(STATUS).map(([, s]) => (
                <span key={s.ar}>{s.dot} {s.ar}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerListings;
