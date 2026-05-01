import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupplyById } from '../../services/supplyService';

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
  shadowHv: '0 8px 24px rgba(26,46,28,0.14)',
  red:      '#DC2626',
  amber:    '#D97706',
  amberBg:  '#FFFBEB',
};

const CAT_AR    = { feed:'علف', veterinary:'مستلزمات بيطرية', equipment:'معدات ومستلزمات', seeds:'بذور ونباتات', other:'أخرى' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };

const SK = { background: 'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: 8 };

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const BuyerSupplyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supply,      setSupply]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [photoIndex,  setPhotoIndex]  = useState(0);
  const [contacted,   setContacted]   = useState(false);

  useEffect(() => {
    getSupplyById(id)
      .then(r => setSupply(r.data))
      .catch(() => navigate('/buyer', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", maxWidth: 720, margin: '0 auto' }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 48, ...SK, marginBottom: 20, borderRadius: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ height: 300, ...SK, borderRadius: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 50, 120, 60].map((h, i) => <div key={i} style={{ height: h, ...SK }} />)}
        </div>
      </div>
    </div>
  );

  if (!supply) return null;

  const seller   = supply.seller || {};
  const images   = supply.images || [];
  const catEmoji = CAT_EMOJI[supply.category] || '📦';
  const catLabel = CAT_AR[supply.category]    || supply.category;

  const handleContact = () => {
    setContacted(true);
    setTimeout(() => setContacted(false), 3000);
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", maxWidth: 720, margin: '0 auto' }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Back */}
      <button type="button" onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontFamily: 'inherit' }}>
        ← العودة للمستلزمات
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>

        {/* ── Left: images ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {images.length > 0 ? (
            <>
              <img
                src={`${BASE_URL}${images[photoIndex]}`}
                alt={supply.name}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 16, border: `1px solid ${C.border}`, background: C.greenLt }}
              />
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {images.map((src, i) => (
                    <img key={i} src={`${BASE_URL}${src}`} alt="" onClick={() => setPhotoIndex(i)}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: `2px solid ${i === photoIndex ? C.green : C.border}`, transition: 'border-color 0.15s' }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 16, background: C.greenLt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 64 }}>{catEmoji}</span>
              <span style={{ fontSize: 13, color: C.muted }}>لا توجد صور</span>
            </div>
          )}
        </div>

        {/* ── Right: info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Category badge */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ background: C.greenBg, color: C.greenText, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
              {catEmoji} {catLabel}
            </span>
            {supply.deliveryAvailable && (
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                🚚 توصيل متاح
              </span>
            )}
          </div>

          {/* Name */}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{supply.name}</h1>

          {/* Price block */}
          <div style={{ background: C.greenLt, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>
              {supply.pricePerUnit?.toLocaleString('ar-EG')} ج.م
              <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>/{supply.unit}</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              الكمية المتاحة: <strong style={{ color: C.text }}>{supply.quantity} {supply.unit}</strong>
              {supply.minOrderQty > 1 && <> · الحد الأدنى للطلب: <strong style={{ color: C.text }}>{supply.minOrderQty} {supply.unit}</strong></>}
            </div>
          </div>

          {/* Delivery details */}
          {supply.deliveryAvailable && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
              <strong style={{ color: '#1D4ED8' }}>🚚 التوصيل متاح</strong>
              {supply.deliveryCost
                ? <span style={{ color: '#1E40AF' }}> · تكلفة التوصيل: {supply.deliveryCost} ج.م</span>
                : <span style={{ color: '#3B82F6' }}> · تكلفة التوصيل قابلة للتفاوض</span>
              }
            </div>
          )}

          {/* Location */}
          {supply.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
              <span>📍</span>
              <span>{supply.location}</span>
            </div>
          )}

          {/* Seller info card */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>البائع</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.greenText, flexShrink: 0 }}>
                {(seller.name?.[0] || seller.farmName?.[0] || '؟').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{seller.farmName || seller.name || 'بائع'}</div>
                {seller.governorate && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {seller.governorate}</div>}
              </div>
            </div>
            {seller.averageRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ color: '#F59E0B', letterSpacing: 1 }}>{'★'.repeat(Math.round(seller.averageRating))}{'☆'.repeat(5 - Math.round(seller.averageRating))}</span>
                <span style={{ fontSize: 12, color: C.muted }}>({seller.reviewCount} تقييم)</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <button type="button" onClick={handleContact}
            style={{ padding: '14px', borderRadius: 12, border: 'none', background: contacted ? '#16A34A' : C.green, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', width: '100%' }}>
            {contacted ? '✓ تم إرسال الطلب — سيتواصل معك البائع' : 'تواصل مع البائع'}
          </button>

          {seller.phone && (
            <a href={`tel:${seller.phone}`}
              style={{ textAlign: 'center', padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, color: C.green, fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
              📞 {seller.phone}
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {supply.description && (
        <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: C.text }}>الوصف</h3>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{supply.description}</p>
        </div>
      )}
    </div>
  );
};

export default BuyerSupplyDetail;
