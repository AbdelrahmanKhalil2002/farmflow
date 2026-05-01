import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';

const C = {
  bg: '#F8FAFC', card: '#FFFFFF', header: '#F9FAFB',
  border: '#E5E7EB', text: '#111827', dim: '#6B7280', dimMid: '#9CA3AF',
  green: '#16A34A', greenBg: '#F0FDF4',
  red: '#DC2626', redBg: '#FEF2F2',
  amber: '#D97706', amberBg: '#FFFBEB',
  blue: '#2563EB', blueBg: '#EFF6FF',
};

const SK = {
  background: 'linear-gradient(90deg,#F3F4F6 0%,#E9EAEC 50%,#F3F4F6 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

const Stars = ({ rating }) => (
  <span style={{ display: 'inline-flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ fontSize: 14, color: i <= rating ? '#F59E0B' : '#E5E7EB' }}>★</span>
    ))}
  </span>
);

const SkeletonRow = () => (
  <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 80, height: 14, ...SK }} />
      <div style={{ width: 120, height: 14, ...SK }} />
      <div style={{ marginRight: 'auto', width: 60, height: 12, ...SK }} />
      <div style={{ width: 24, height: 24, borderRadius: 6, ...SK }} />
    </div>
    <div style={{ height: 13, width: '70%', ...SK }} />
  </div>
);

const ReviewRow = ({ review, onDelete }) => {
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const buyerName  = review.buyer?.name  || 'مشتري';
  const sellerName = review.seller?.farmName || review.seller?.name || 'بائع';
  const comment    = review.comment || '';
  const isLong     = comment.length > 120;

  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: comment ? 8 : 0 }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{buyerName}</span>
        <span style={{ fontSize: 12, color: C.dimMid }}>←</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>{sellerName}</span>
        <span style={{ marginRight: 'auto', fontSize: 11, color: C.dimMid }}>{fmtDate(review.createdAt)}</span>
        {review.flagged && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: C.redBg, color: C.red }}>⚑ مُبلَّغ عنه</span>
        )}
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)}
            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.dimMid, fontSize: 13, cursor: 'pointer' }}>
            🗑
          </button>
        ) : (
          <button type="button" onClick={() => onDelete(review._id)}
            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid #FECACA`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            تأكيد الحذف
          </button>
        )}
      </div>
      {comment && (
        <p style={{ margin: 0, fontSize: 13, color: C.dim, lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden',
        }}>
          "{comment}"
          {isLong && !expanded && (
            <button type="button" onClick={() => setExpanded(true)}
              style={{ marginRight: 6, background: 'none', border: 'none', color: C.blue, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              عرض المزيد
            </button>
          )}
        </p>
      )}
    </div>
  );
};

const AdminReviews = () => {
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('all');   // all | high | low
  const [sortBy,   setSortBy]   = useState('newest'); // newest | rating_desc | rating_asc

  useEffect(() => {
    api.get('/reviews/admin/all')
      .then(r => setReviews(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(p => p.filter(r => r._id !== id));
    } catch {}
  };

  const displayed = useMemo(() => {
    let list = [...reviews];

    // Tab filter
    if (tab === 'high') list = list.filter(r => r.rating >= 4);
    else if (tab === 'low') list = list.filter(r => r.rating < 3);

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.buyer?.name?.toLowerCase().includes(q) ||
        r.seller?.farmName?.toLowerCase().includes(q) ||
        r.seller?.name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'rating_desc') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'rating_asc') list.sort((a, b) => a.rating - b.rating);
    // newest: default (already sorted by createdAt desc from server)

    return list;
  }, [reviews, tab, search, sortBy]);

  const highCount = reviews.filter(r => r.rating >= 4).length;
  const lowCount  = reviews.filter(r => r.rating < 3).length;

  const tabStyle = (t) => ({
    padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
    background: tab === t ? C.green : 'transparent',
    color: tab === t ? '#fff' : C.dim,
  });

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: C.text }}>إدارة التقييمات ⭐</h1>
        <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
          {loading ? 'جاري التحميل…' : `${reviews.length} تقييم إجمالي`}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        <button type="button" style={tabStyle('all')} onClick={() => setTab('all')}>
          الكل ({reviews.length})
        </button>
        <button type="button" style={tabStyle('high')} onClick={() => setTab('high')}>
          ⭐ عالية ({highCount})
        </button>
        <button type="button" style={tabStyle('low')} onClick={() => setTab('low')}>
          ⚠ منخفضة ({lowCount})
        </button>
      </div>

      {/* Search + sort bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المزرعة أو التعليق…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 38px 10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
          <option value="newest">الأحدث أولاً</option>
          <option value="rating_desc">أعلى تقييم</option>
          <option value="rating_asc">أدنى تقييم</option>
        </select>
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⭐</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
            {reviews.length === 0 ? 'لا توجد تقييمات بعد' : 'لا نتائج مطابقة'}
          </h3>
          <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>
            {reviews.length === 0 ? 'ستظهر تقييمات المشترين هنا بعد اكتمال الطلبات' : 'جرّب كلمة بحث مختلفة'}
          </p>
        </div>
      )}

      {/* Review list */}
      {!loading && displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(r => (
            <ReviewRow key={r._id} review={r} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
