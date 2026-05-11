import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupplies } from '../../services/supplyService';
import { useLang } from '../../context/LangContext';
import { C } from '../../tokens';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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

const SellerFarmSupplies = () => {
  const { sellerId } = useParams();
  const navigate     = useNavigate();
  const { isRTL }    = useLang();

  const [supplies, setSupplies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [catFilter, setCatFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    getSupplies({ browse: '1', seller: sellerId })
      .then(r => setSupplies(r.data || []))
      .catch(() => navigate('/seller/marketplace'))
      .finally(() => setLoading(false));
  }, [sellerId, navigate]);

  const seller   = supplies[0]?.seller || {};
  const farmName = seller.farmName || seller.name || 'المزرعة';

  const cats = [...new Set(supplies.map(s => s.category).filter(Boolean))];

  const filtered = catFilter ? supplies.filter(s => s.category === catFilter) : supplies;

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Back */}
      <button type="button" onClick={() => navigate('/seller/marketplace')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 18px', fontFamily: 'inherit' }}>
        ← العودة للسوق
      </button>

      {/* Farm header */}
      {!loading && seller._id && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: avatarColor(farmName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initials(farmName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{farmName}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              {seller.governorate && <span>📍 {seller.governorate}</span>}
              {seller.phone && <span style={{ marginRight: 10 }}>📞 {seller.phone}</span>}
              <span style={{ marginRight: 10 }}>
                <strong style={{ color: C.green }}>{supplies.length}</strong> منتج
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      {!loading && cats.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <button type="button" onClick={() => setCatFilter('')}
            style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${!catFilter ? C.green : C.border}`, background: !catFilter ? C.greenLt : C.card, color: !catFilter ? C.green : C.muted, fontSize: 13, fontWeight: !catFilter ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔍 الكل
          </button>
          {cats.map(cat => (
            <button key={cat} type="button" onClick={() => setCatFilter(cat)}
              style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${catFilter === cat ? C.green : C.border}`, background: catFilter === cat ? C.greenLt : C.card, color: catFilter === cat ? C.green : C.muted, fontSize: 13, fontWeight: catFilter === cat ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {CAT_META[cat]?.emoji} {CAT_META[cat]?.label}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ height: 140, ...SK }} />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 16, width: '70%', ...SK }} />
                <div style={{ height: 12, width: '50%', ...SK }} />
                <div style={{ height: 20, width: '40%', ...SK }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: C.card, borderRadius: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>مفيش منتجات في هذه الفئة</p>
        </div>
      )}

      {/* Supply grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map(s => {
            const img = s.images?.[0];
            const cat = CAT_META[s.category] || CAT_META.other;
            return (
              <div
                key={s._id}
                onClick={() => navigate(`/seller/marketplace/${s._id}`)}
                style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: C.shadow }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Image */}
                <div style={{ height: 140, background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {img
                    ? <img src={`${BASE_URL}${img}`} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 52 }}>{cat.emoji}</span>
                  }
                  {s.deliveryAvailable && (
                    <span style={{ position: 'absolute', top: 8, right: 8, background: '#1D4ED8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
                      🚚 توصيل
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px 14px' }}>
                  <span style={{ background: C.greenBg, color: C.greenText, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                    {cat.emoji} {cat.label}
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '6px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                    {s.quantity} {s.unit} متاح
                    {s.location && <> · 📍 {s.location}</>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{s.pricePerUnit?.toLocaleString('ar-EG')}</span>
                      <span style={{ fontSize: 11, color: C.muted }}> ج.م/{s.unit}</span>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); navigate(`/seller/marketplace/${s._id}`); }}
                      style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      اشترِ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerFarmSupplies;
