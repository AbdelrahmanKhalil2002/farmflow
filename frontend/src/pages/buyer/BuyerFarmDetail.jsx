import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFarmById } from '../../services/dairyService';
import { getImageUrl, fmt } from '../../utils/format';
import { getSellerReviews } from '../../services/reviewService';
import OrderModal from './OrderModal';
import StaticMap from '../../components/StaticMap';

const C = {
  bg:       '#F8F4EE',
  white:    '#FFFFFF',
  green:    '#3A7D44',
  greenDk:  '#2D6235',
  greenLt:  '#F0F7F1',
  greenBg:  '#DCFCE7',
  greenText:'#166534',
  border:   '#E8D5C0',
  text:     '#2C1810',
  muted:    '#8B6B5A',
  shadow:   '0 2px 10px rgba(44,24,16,0.08)',
  shadowHv: '0 8px 24px rgba(44,24,16,0.14)',
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const LIVE_META = {
  cattle:  { emoji: '🐄', label: 'ماشية',  bg: '#FEF3C7', color: '#92400E' },
  buffalo: { emoji: '🐃', label: 'جاموس',  bg: '#FEF3C7', color: '#92400E' },
  sheep:   { emoji: '🐑', label: 'أغنام',  bg: '#DBEAFE', color: '#0369A1' },
  goat:    { emoji: '🐐', label: 'ماعز',   bg: '#DCFCE7', color: '#166534' },
  camel:   { emoji: '🐪', label: 'إبل',    bg: '#FFEDD5', color: '#9A3412' },
  horse:   { emoji: '🐎', label: 'خيول',   bg: '#EDE9FE', color: '#5B21B6' },
  poultry: { emoji: '🐔', label: 'دواجن',  bg: '#D1FAE5', color: '#065F46' },
  rabbit:  { emoji: '🐇', label: 'أرانب',  bg: '#FCE7F3', color: '#9D174D' },
  other:   { emoji: '🐾', label: 'أخرى',   bg: '#F3F4F6', color: '#374151' },
};

const DAIRY_META = {
  milk:   { emoji: '🥛', label: 'لبن'   },
  cheese: { emoji: '🧀', label: 'جبنة'  },
  yogurt: { emoji: '🫙', label: 'زبادي' },
  butter: { emoji: '🧈', label: 'زبدة'  },
  cream:  { emoji: '🍦', label: 'قشطة'  },
  ghee:   { emoji: '🫕', label: 'سمن'   },
  other:  { emoji: '📦', label: 'أخرى'  },
};

const UNIT_LABELS = { kg: 'كجم', liter: 'لتر', piece: 'قطعة', pack: 'عبوة', dozen: 'دزينة' };

const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

// ─── LivestockCard ────────────────────────────────────────────────────────────
const LivestockCard = ({ listing: l }) => {
  const [hovered, setHov] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const meta  = LIVE_META[l.type] || LIVE_META.other;
  const image = l.images?.[0];

  return (
    <>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: C.white, borderRadius: '14px', overflow: 'hidden',
          boxShadow: hovered ? C.shadowHv : C.shadow,
          transform: hovered ? 'translateY(-3px)' : 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Image */}
        <div style={{ height: '180px', background: meta.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {image ? (
            <img src={getImageUrl(image)} alt={l.breed} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px' }}>{meta.emoji}</div>
          )}
          <div style={{ position: 'absolute', top: '8px', left: '8px', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '14px' }}>
            {meta.emoji} {meta.label}
          </div>
        </div>

        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{l.breed || meta.label}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>📅 {l.age} شهر</span>
            <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⚖️ {l.weight} كجم</span>
            {l.pricePerKg && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⚖️ {fmt(l.pricePerKg)} ج.م/كجم</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>{fmt(l.price)}</span>
                <span style={{ fontSize: '11px', color: C.muted, marginRight: '3px' }}> ج.م</span>
              </div>
              {l.depositRequired && (
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  عربون: {Math.round(l.price * l.depositPercentage / 100).toLocaleString('ar-EG')} ج.م
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Link
                to={`/buyer/listings/${l._id}`}
                style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                تفاصيل
              </Link>
              <button type="button" onClick={() => setOrderOpen(true)}
                style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: C.green, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                طلب ←
              </button>
            </div>
          </div>
        </div>
      </div>
      {orderOpen && <OrderModal listing={l} onClose={() => setOrderOpen(false)} />}
    </>
  );
};

// ─── DairyCard ────────────────────────────────────────────────────────────────
const DairyCard = ({ product: p }) => {
  const [hovered, setHov] = useState(false);
  const meta = DAIRY_META[p.type] || DAIRY_META.other;
  const unitLabel = UNIT_LABELS[p.unit] || p.unit;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.white, borderRadius: '14px', overflow: 'hidden',
        boxShadow: hovered ? C.shadowHv : C.shadow,
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image or emoji banner */}
      <div style={{ height: '140px', background: '#CFFAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {p.images?.[0] ? (
          <img src={getImageUrl(p.images[0])} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '60px' }}>{meta.emoji}</span>
        )}
        <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#CFFAFE', color: '#0C4A6E', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '14px' }}>
          {meta.emoji} {meta.label}
        </div>
      </div>

      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{p.name}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>📦 {fmt(p.quantity)} {unitLabel}</span>
          {p.expiryDate && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⏳ {fmtDate(p.expiryDate)}</span>}
          {p.deliveryAvailable && <span style={{ background: C.greenBg, color: C.greenText, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>🚚 توصيل</span>}
        </div>
        {p.description && (
          <p style={{ margin: 0, fontSize: '12px', color: C.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {p.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>{fmt(p.pricePerUnit)}</span>
            <span style={{ fontSize: '11px', color: C.muted, marginRight: '3px' }}>ج.م / {unitLabel}</span>
          </div>
          <button type="button"
            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            طلب ←
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BuyerFarmDetail ──────────────────────────────────────────────────────────
const BuyerFarmDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('livestock'); // 'livestock' | 'dairy'
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    getFarmById(id)
      .then(r => {
        setData(r.data);
        return getSellerReviews(id).catch(() => ({ data: [] }));
      })
      .then(r => setReviews(r.data))
      .catch(() => navigate('/buyer', { replace: true }))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.muted, fontSize: '15px' }}>
      جاري التحميل…
    </div>
  );

  if (!data) return null;

  const { seller, listings = [], dairy = [] } = data;
  const displayName = seller?.farmName || seller?.name || 'مزرعة';
  const accentColor = avatarColor(displayName);
  const liveTypes   = [...new Set(listings.map(l => l.type))];
  const activeTab   = tab === 'livestock' ? listings : dairy;
  const hasLive     = listings.length > 0;
  const hasDairy    = dairy.length > 0;

  return (
    <div style={{ margin: '-24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Farm header banner */}
      <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`, padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
        {seller?.farmBanner && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(http://localhost:5000${seller.farmBanner})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />
        )}
        <div aria-hidden="true" style={{ position: 'absolute', right: -20, top: -40, fontSize: '160px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none' }}>🌾</div>

        <button type="button" onClick={() => navigate('/buyer')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', backdropFilter: 'blur(4px)' }}>
          ← العودة للمزارع
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff' }}>{displayName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              {seller?.governorate && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '3px' }}>📍 {seller.governorate}</span>}
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>✓ موثّق</span>
              {seller?.reviewCount > 0 && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#FCD34D', letterSpacing: 1 }}>{'★'.repeat(Math.round(seller.averageRating))}</span>
                  <span>{seller.averageRating?.toFixed(1)} ({seller.reviewCount})</span>
                  {seller.averageRating >= 4.5 && <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>موثوق</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          {hasLive && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{liveTypes.map(t => LIVE_META[t]?.emoji || '🐾').slice(0, 3).join('')}</span>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{listings.length}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>رأس ماشية</div>
              </div>
            </div>
          )}
          {hasDairy && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🥛</span>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{dairy.length}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>منتج ألبان</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 32px 56px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Farm description */}
        {(seller?.farmDescription || seller?.bio) && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>عن المزرعة</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.8 }}>
              {seller.farmDescription || seller.bio}
            </p>
          </div>
        )}

        {/* Farm certificates */}
        {seller?.farmCertificates?.length > 0 && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏅 شهادات واعتمادات
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {seller.farmCertificates.map(cert => (
                <span key={cert} style={{ background: C.greenBg, color: C.greenText, border: `1px solid #86EFAC`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  ✓ {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Working hours */}
        {seller?.workingHours?.days?.length > 0 && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🕐 أوقات العمل
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {seller.workingHours.days.map(day => (
                <span key={day} style={{ background: C.greenBg, color: C.greenText, border: `1px solid #86EFAC`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
                  {day}
                </span>
              ))}
            </div>
            {(seller.workingHours.from && seller.workingHours.to) && (
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>
                من {seller.workingHours.from} إلى {seller.workingHours.to}
              </div>
            )}
          </div>
        )}

        {/* Farm location map */}
        {seller?.farmLocation?.lat && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
              📍 موقع المزرعة
            </div>
            <StaticMap
              lat={seller.farmLocation.lat}
              lng={seller.farmLocation.lng}
              address={seller.farmLocation.address}
              height={240}
            />
          </div>
        )}

        {/* Tabs */}
        {hasLive && hasDairy && (
          <div style={{ display: 'flex', gap: '4px', background: '#fff', borderRadius: '12px', padding: '4px', boxShadow: C.shadow, marginBottom: '20px', width: 'fit-content' }}>
            {[
              { key: 'livestock', label: '🐄 المواشي',        count: listings.length },
              { key: 'dairy',     label: '🥛 منتجات الألبان', count: dairy.length },
            ].map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                style={{
                  padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  background: tab === t.key ? C.green : 'transparent',
                  color: tab === t.key ? '#fff' : C.muted,
                  fontSize: '13px', fontWeight: '700', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                {t.label}
                <span style={{ fontSize: '11px', background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#F5EFE6', padding: '1px 6px', borderRadius: '8px' }}>{t.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content based on tab or only-type */}
        {(!hasDairy || tab === 'livestock') && hasLive && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>🐄 المواشي المتاحة</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
              {listings.map(l => <LivestockCard key={l._id} listing={l} />)}
            </div>
          </>
        )}

        {(!hasLive || tab === 'dairy') && hasDairy && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>🥛 منتجات الألبان</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {dairy.map(d => <DairyCard key={d._id} product={d} />)}
            </div>
          </>
        )}

        {!hasLive && !hasDairy && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: C.white, borderRadius: '16px', boxShadow: C.shadow }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🌾</div>
            <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>لا توجد منتجات متاحة من هذه المزرعة حالياً.</p>
          </div>
        )}

        {/* Reviews section */}
        {reviews.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>⭐ تقييمات العملاء</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map(r => (
                <div key={r._id} style={{ background: C.white, borderRadius: 12, padding: '14px 18px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.green }}>
                        {(r.buyer?.name?.[0] || '?').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.buyer?.name || 'مشتري'}</span>
                    </div>
                    <span style={{ color: '#F59E0B', fontSize: 14, letterSpacing: 2 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>}
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{new Date(r.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerFarmDetail;
