import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyListings, deleteListing, updateListing } from '../../services/listingService';
import { fmt, getImageUrl } from '../../utils/format';
import { useToast } from '../../components/Toast';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';
import { C } from '../../tokens';

const TYPE_META = {
  cattle:  { emoji: '🐄', label: 'أبقار',  bg: '#FEF3C7' },
  buffalo: { emoji: '🐃', label: 'جاموس',  bg: '#E0F2FE' },
  sheep:   { emoji: '🐑', label: 'أغنام',   bg: '#DBEAFE' },
  goat:    { emoji: '🐐', label: 'ماعز',    bg: '#DCFCE7' },
  camel:   { emoji: '🐪', label: 'إبل',     bg: '#FFEDD5' },
  horse:   { emoji: '🐎', label: 'خيل',     bg: '#EDE9FE' },
  poultry: { emoji: '🐔', label: 'دواجن',   bg: '#D1FAE5' },
  rabbit:  { emoji: '🐇', label: 'أرانب',   bg: '#FCE7F3' },
  other:   { emoji: '🐾', label: 'أخرى',    bg: '#F3F4F6' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtAge  = (m) => {
  if (m == null) return '—';
  if (m < 12) return `${m} شهر`;
  const y = Math.floor(m / 12), r = m % 12;
  return r ? `${y}س ${r}ش` : `${y} سنة`;
};

// ─── Thumb ────────────────────────────────────────────────────────────────────
const Thumb = ({ listing, size = 56 }) => {
  const src  = listing.images?.[0] ? getImageUrl(listing.images[0]) : null;
  const meta = TYPE_META[listing.type] || TYPE_META.other;
  return src
    ? <img src={src} alt="" style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, flexShrink: 0 }}>{meta.emoji}</div>;
};

// ─── Action button ────────────────────────────────────────────────────────────
const Btn = ({ onClick, children, danger, primary, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 13px', borderRadius: 8,
      border: `1px solid ${danger ? '#FECACA' : primary ? C.green : C.border}`,
      background: danger ? '#FEF2F2' : primary ? C.green : C.card,
      color: danger ? '#B91C1C' : primary ? '#fff' : C.muted,
      fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, fontFamily: 'inherit', transition: 'opacity 0.12s',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.8'; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
  >{children}</button>
);

// ─── Confirm modal ────────────────────────────────────────────────────────────
const Confirm = ({ msg, onConfirm, onCancel, loading }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 20 }}>
    <div style={{ background: C.card, borderRadius: 16, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>{msg}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Btn danger onClick={onConfirm} disabled={loading}>{loading ? '...' : 'حذف'}</Btn>
        <Btn onClick={onCancel} disabled={loading}>إلغاء</Btn>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const SellerDrafts = () => {
  const navigate       = useNavigate();
  const toast          = useToast();
  const { t, isRTL }   = useLang();
  const { activeFarm } = useFarm();

  const [drafts,     setDrafts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [publishing, setPublishing] = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  const PAGE_SIZE = 100;

  const load = () => {
    setLoading(true);
    getMyListings(activeFarm?._id)
      .then(({ data }) => setDrafts(data.filter(l => l.status === 'draft')))
      .catch(() => toast.error('تعذّر تحميل المسودات'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [activeFarm?._id]);

  const filtered = drafts.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.type?.toLowerCase().includes(q) || l.breed?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q);
  });

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goPage     = (p) => { setPage(Math.max(1, Math.min(totalPages, p))); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handlePublish = async (id) => {
    setPublishing(id);
    try {
      await updateListing(id, { status: 'pending' });
      setDrafts(p => p.filter(l => l._id !== id));
      toast.success('تم إرسال الإعلان للمراجعة ✅');
    } catch {
      toast.error('تعذّر نشر الإعلان');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListing(deleteId);
      setDrafts(p => p.filter(l => l._id !== deleteId));
      toast.success('تم حذف المسودة');
    } catch {
      toast.error('تعذّر الحذف');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}
      style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>💾 مسوداتي</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
            {loading ? '...' : `${drafts.length} مسودة محفوظة`}
          </p>
        </div>
        <button type="button" onClick={() => navigate('/seller/add-listing')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ➕ إعلان جديد
        </button>
      </div>

      {/* Search */}
      {drafts.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 12, fontSize: 15, pointerEvents: 'none', color: C.muted }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالنوع أو السلالة…"
            style={{ width: '100%', padding: '10px 38px 10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontSize: 14 }}>جارٍ التحميل…</div>
      )}

      {/* Empty */}
      {!loading && drafts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📝</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.text }}>لا توجد مسودات</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted }}>أنشئ إعلانًا واحفظه كمسودة لتجده هنا</p>
          <button type="button" onClick={() => navigate('/seller/add-listing')}
            style={{ padding: '11px 24px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            ➕ إنشاء إعلان
          </button>
        </div>
      )}

      {/* No search results */}
      {!loading && drafts.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 14 }}>لا توجد نتائج</div>
      )}

      {/* Draft cards */}
      {!loading && visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(l => {
            const meta = TYPE_META[l.type] || TYPE_META.other;
            return (
              <div key={l._id}
                style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

                <Thumb listing={l} size={56} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{meta.emoji} {meta.label}</span>
                    {l.breed && <span style={{ fontSize: 12, color: C.muted, background: C.bg, padding: '2px 8px', borderRadius: 6 }}>{l.breed}</span>}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A', fontWeight: 700 }}>⬜ مسودة</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
                    {l.age   != null && <span>🗓 {fmtAge(l.age)}</span>}
                    {l.weight != null && <span>⚖️ {l.weight} كجم</span>}
                    {l.price  != null && <span style={{ fontWeight: 700, color: C.greenText }}>💰 {fmt(l.price)} ج.م</span>}
                    {l.location && <span>📍 {l.location}</span>}
                    <span>📅 {fmtDate(l.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Btn primary onClick={() => handlePublish(l._id)} disabled={publishing === l._id}>
                    {publishing === l._id ? '...' : '🚀 نشر الآن'}
                  </Btn>
                  <Btn onClick={() => navigate(`/seller/edit-listing/${l._id}`)}>✏️ تعديل</Btn>
                  <Btn danger onClick={() => setDeleteId(l._id)}>🗑️</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length} مسودة
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => goPage(1)} disabled={page === 1}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: page === 1 ? C.border : C.text, fontSize: 12, fontWeight: 700, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>«</button>
            <button type="button" onClick={() => goPage(page - 1)} disabled={page === 1}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: page === 1 ? C.border : C.text, fontSize: 12, fontWeight: 700, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
              .map((p, idx) =>
                p === '…'
                  ? <span key={`e${idx}`} style={{ padding: '5px 8px', fontSize: 12, color: C.muted }}>…</span>
                  : <button key={p} type="button" onClick={() => goPage(p)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${p === page ? C.green : C.border}`, background: p === page ? C.green : C.card, color: p === page ? '#fff' : C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 32 }}>
                      {p}
                    </button>
              )}
            <button type="button" onClick={() => goPage(page + 1)} disabled={page === totalPages}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: page === totalPages ? C.border : C.text, fontSize: 12, fontWeight: 700, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>›</button>
            <button type="button" onClick={() => goPage(totalPages)} disabled={page === totalPages}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: page === totalPages ? C.border : C.text, fontSize: 12, fontWeight: 700, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>»</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Confirm
          msg="هل تريد حذف هذه المسودة؟ لا يمكن التراجع."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default SellerDrafts;
