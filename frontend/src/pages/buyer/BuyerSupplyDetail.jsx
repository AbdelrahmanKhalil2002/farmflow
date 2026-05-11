import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupplyById } from '../../services/supplyService';
import { checkWholesaleAccess, enterWholesaleCode, requestWholesaleAccess } from '../../services/wholesaleService';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import SupplyOrderModal from './SupplyOrderModal';

import { C } from '../../tokens';

const CAT_KEY   = { feed: 'supplies.cat.feed', veterinary: 'supplies.cat.veterinary', equipment: 'supplies.cat.equipment', seeds: 'supplies.cat.seeds', other: 'supplies.cat.other' };
const CAT_EMOJI = { feed: '🌾', veterinary: '💊', equipment: '🔧', seeds: '🌱', other: '📦' };

const SK = { background: 'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: 8 };

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const BuyerSupplyDetail = () => {
  const { t, isRTL } = useLang();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [supply,      setSupply]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [photoIndex,  setPhotoIndex]  = useState(0);
  const [showOrder,   setShowOrder]   = useState(false);
  const [ordered,     setOrdered]     = useState(false);

  // Wholesale state
  const [wholesaleStatus,  setWholesaleStatus]  = useState(null); // null | 'none' | 'pending' | 'approved' | 'rejected'
  const [wholesaleCode,    setWholesaleCode]    = useState('');
  const [wholesaleLoading, setWholesaleLoading] = useState(false);
  const [wholesaleErr,     setWholesaleErr]     = useState('');

  useEffect(() => {
    getSupplyById(id)
      .then(r => setSupply(r.data))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!supply?.wholesalePrice || !user || user.role !== 'buyer') return;
    checkWholesaleAccess(supply.seller?._id)
      .then(r => setWholesaleStatus(r.data.status))
      .catch(() => setWholesaleStatus('none'));
  }, [supply, user]);

  const handleEnterCode = async () => {
    setWholesaleErr('');
    if (!wholesaleCode.trim()) { setWholesaleErr('أدخل الكود'); return; }
    setWholesaleLoading(true);
    try {
      await enterWholesaleCode(wholesaleCode.trim());
      setWholesaleStatus('approved');
      setWholesaleCode('');
    } catch (err) {
      setWholesaleErr(err?.response?.data?.message || 'الكود غير صحيح');
    }
    setWholesaleLoading(false);
  };

  const handleRequestAccess = async () => {
    setWholesaleErr('');
    setWholesaleLoading(true);
    try {
      await requestWholesaleAccess(supply.seller?._id);
      setWholesaleStatus('pending');
    } catch (err) {
      setWholesaleErr(err?.response?.data?.message || 'حدث خطأ');
    }
    setWholesaleLoading(false);
  };

  if (loading) return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", maxWidth: 720, margin: '0 auto' }} dir={isRTL ? 'rtl' : 'ltr'}>
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
  const catLabel = t(CAT_KEY[supply.category] || 'supplies.cat.other');



  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", maxWidth: 720, margin: '0 auto' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Back */}
      <button type="button" onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontFamily: 'inherit' }}>
        ← {t('supply.detail.back')}
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
              <span style={{ fontSize: 13, color: C.muted }}>{t('lst.noImages')}</span>
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
                🚚 {t('supply.detail.deliveryAvailable')}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{supply.name}</h1>

          {/* Price block */}
          <div style={{ background: C.greenLt, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>
              {supply.pricePerUnit?.toLocaleString('ar-EG')} {t('common.egp')}
              <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>/{supply.unit}</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              {t('supply.detail.availableQty')}: <strong style={{ color: C.text }}>{supply.quantity} {supply.unit}</strong>
              {supply.minOrderQty > 1 && <> · {t('supply.detail.minOrder')}: <strong style={{ color: C.text }}>{supply.minOrderQty} {supply.unit}</strong></>}
            </div>
          </div>

          {/* Delivery details */}
          {supply.deliveryAvailable && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
              <strong style={{ color: '#1D4ED8' }}>🚚 {t('supply.detail.deliveryTitle')}</strong>
              {supply.deliveryCost
                ? <span style={{ color: '#1E40AF' }}> · {t('supply.detail.deliveryCost')}: {supply.deliveryCost} {t('common.egp')}</span>
                : <span style={{ color: '#3B82F6' }}> · {t('supply.detail.deliveryNegotiable')}</span>
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
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('orders.seller')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.greenText, flexShrink: 0 }}>
                {(seller.name?.[0] || seller.farmName?.[0] || '؟').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{seller.farmName || seller.name || t('orders.seller')}</div>
                {seller.governorate && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {seller.governorate}</div>}
              </div>
            </div>
            {seller.averageRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ color: '#F59E0B', letterSpacing: 1 }}>{'★'.repeat(Math.round(seller.averageRating))}{'☆'.repeat(5 - Math.round(seller.averageRating))}</span>
                <span style={{ fontSize: 12, color: C.muted }}>({seller.reviewCount} {t('buyer.fav.reviews')})</span>
              </div>
            )}
          </div>

          {/* CTA */}
          {ordered ? (
            <div style={{ padding: 14, borderRadius: 12, background: C.greenBg, border: `1.5px solid #BBF7D0`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.greenText }}>تم إرسال الطلب</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>سيتواصل معك البائع لتأكيد التفاصيل.</div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowOrder(true)}
              style={{ padding: '14px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.background = C.greenDk}
              onMouseLeave={e => e.currentTarget.style.background = C.green}>
              🛒 اطلب الآن
            </button>
          )}

          {seller.phone && (
            <a href={`tel:${seller.phone}`}
              style={{ textAlign: 'center', padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, color: C.green, fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
              📞 {seller.phone}
            </a>
          )}

          {/* Wholesale pricing widget */}
          {supply.wholesalePrice > 0 && user?.role === 'buyer' && (
            <div style={{ background: '#FFF8EC', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>🏭</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>أسعار الجملة</span>
              </div>
              <div style={{ fontSize: 13, color: '#B45309', marginBottom: 10, lineHeight: 1.6 }}>
                سعر الجملة: <strong>{supply.wholesalePrice?.toLocaleString('ar-EG')} ج.م/{supply.unit}</strong>
                {supply.minWholesaleQty > 1 && <span> · للطلبات ≥ {supply.minWholesaleQty} {supply.unit}</span>}
              </div>

              {wholesaleStatus === 'approved' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DCFCE7', borderRadius: 9, padding: '8px 12px', fontSize: 13, color: '#166534', fontWeight: 700 }}>
                  ✅ أنت معتمد كتاجر جملة — السعر يطبق تلقائياً عند الطلب
                </div>
              )}

              {wholesaleStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEF9C3', borderRadius: 9, padding: '8px 12px', fontSize: 13, color: '#92400E', fontWeight: 700 }}>
                  🕐 طلبك قيد المراجعة — سينبهك البائع عند الموافقة
                </div>
              )}

              {wholesaleStatus === 'rejected' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: '#FEE2E2', borderRadius: 9, padding: '8px 12px', fontSize: 13, color: '#DC2626', fontWeight: 700 }}>
                    ❌ تم رفض طلبك السابق
                  </div>
                  <button type="button" onClick={handleRequestAccess} disabled={wholesaleLoading}
                    style={{ padding: '8px', borderRadius: 9, border: '1px solid #FDE68A', background: '#FFF8EC', color: '#92400E', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    إعادة الطلب
                  </button>
                </div>
              )}

              {(wholesaleStatus === 'none' || wholesaleStatus === null) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={wholesaleCode} onChange={e => setWholesaleCode(e.target.value)}
                      placeholder="أدخل كود الجملة" dir="ltr"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1.5px solid #FDE68A', background: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                      onKeyDown={e => e.key === 'Enter' && handleEnterCode()} />
                    <button type="button" onClick={handleEnterCode} disabled={wholesaleLoading}
                      style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#D97706', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {wholesaleLoading ? '…' : 'تفعيل'}
                    </button>
                  </div>
                  <button type="button" onClick={handleRequestAccess} disabled={wholesaleLoading}
                    style={{ padding: '8px', borderRadius: 9, border: '1px solid #FDE68A', background: '#FFF8EC', color: '#92400E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    أو اطلب وصول من البائع
                  </button>
                  {wholesaleErr && <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{wholesaleErr}</p>}
                </div>
              )}
            </div>
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

      {/* Supply Order Modal */}
      {showOrder && (
        <SupplyOrderModal
          supply={supply}
          wholesaleApproved={wholesaleStatus === 'approved'}
          onClose={() => setShowOrder(false)}
          onSuccess={() => { setShowOrder(false); setOrdered(true); }}
        />
      )}
    </div>
  );
};

export default BuyerSupplyDetail;
