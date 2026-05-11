import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupplies } from '../../services/supplyService';
import { useLang } from '../../context/LangContext';
import { C } from '../../tokens';

const CAT_META = {
  feed:       { emoji: '🌾', label: 'أعلاف' },
  veterinary: { emoji: '💊', label: 'بيطرية' },
  equipment:  { emoji: '🔧', label: 'معدات' },
  seeds:      { emoji: '🌱', label: 'بذور' },
  other:      { emoji: '📦', label: 'أخرى' },
};

const AVATAR_COLORS = ['#16A34A','#D97706','#0284C7','#7C3AED','#DC2626','#0891B2','#CA8A04','#9333EA'];
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '؟';

const SK = {
  background: 'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

const FarmCard = ({ farmData, onClick }) => {
  const seller = farmData.seller || {};
  const name   = seller.farmName || seller.name || 'مزرعة';
  const cats   = [...farmData.categories].slice(0, 3);

  return (
    <div
      onClick={onClick}
      style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: '22px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: C.shadow, display: 'flex', flexDirection: 'column', gap: 14 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Top: avatar + name + location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
          {initials(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          {seller.governorate && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>📍 {seller.governorate}</div>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {cats.map(cat => (
          <span key={cat} style={{ background: C.greenBg, color: C.greenText, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
            {CAT_META[cat]?.emoji} {CAT_META[cat]?.label}
          </span>
        ))}
      </div>

      {/* Footer: supply count + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <div style={{ fontSize: 13, color: C.muted }}>
          <strong style={{ color: C.green, fontSize: 15 }}>{farmData.count}</strong> منتج متاح
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          تصفح ←
        </button>
      </div>
    </div>
  );
};

const SellerMarketplace = () => {
  const navigate      = useNavigate();
  const { isRTL }     = useLang();
  const [farms,   setFarms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    getSupplies({ browse: '1' })
      .then(r => {
        // Group supplies by seller
        const map = {};
        (r.data || []).forEach(s => {
          const id = s.seller?._id || s.seller;
          if (!id) return;
          if (!map[id]) map[id] = { seller: s.seller, count: 0, categories: new Set() };
          map[id].count++;
          if (s.category) map[id].categories.add(s.category);
        });
        setFarms(Object.values(map));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = farms.filter(f => {
    if (!search.trim()) return true;
    const q    = search.trim().toLowerCase();
    const name = (f.seller?.farmName || f.seller?.name || '').toLowerCase();
    const gov  = (f.seller?.governorate || '').toLowerCase();
    return name.includes(q) || gov.includes(q);
  });

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #D97706 0%, #B45309 100%)`, borderRadius: 16, padding: '20px 24px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', right: -10, top: -20, fontSize: 100, opacity: 0.08, lineHeight: 1, pointerEvents: 'none' }}>🛍️</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#fff' }}>سوق المستلزمات 🛍️</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          {loading ? 'جاري التحميل…' : `${filtered.length} مزرعة تبيع مستلزمات`}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم المزرعة أو المحافظة…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px 12px 40px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = '#D97706'}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', ...SK }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 18, width: '60%', ...SK, marginBottom: 8 }} />
                  <div style={{ height: 12, width: '40%', ...SK }} />
                </div>
              </div>
              <div style={{ height: 28, width: '80%', ...SK, borderRadius: 8 }} />
              <div style={{ height: 14, width: '50%', ...SK }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>
            {search ? 'مفيش نتائج' : 'مفيش مزارع تبيع مستلزمات دلوقتي'}
          </h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>لما يضيف بائعين مستلزمات هتظهر هنا</p>
        </div>
      )}

      {/* Farm grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(f => {
            const id = f.seller?._id || f.seller;
            return (
              <FarmCard
                key={id}
                farmData={f}
                onClick={() => navigate(`/seller/marketplace/farm/${id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerMarketplace;
