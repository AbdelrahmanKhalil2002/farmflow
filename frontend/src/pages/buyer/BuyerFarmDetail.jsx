import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFarmById } from '../../services/dairyService';
import { getImageUrl, fmt } from '../../utils/format';
import { getSellerReviews } from '../../services/reviewService';
import OrderModal from './OrderModal';
import StaticMap from '../../components/StaticMap';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const LIVE_META = {
  cattle:  { emoji: '🐄', labelKey: 'herd.type.cattle',  bg: '#FEF3C7', color: '#92400E' },
  buffalo: { emoji: '🐃', labelKey: 'herd.type.buffalo', bg: '#FEF3C7', color: '#92400E' },
  sheep:   { emoji: '🐑', labelKey: 'herd.type.sheep',   bg: '#DBEAFE', color: '#0369A1' },
  goat:    { emoji: '🐐', labelKey: 'herd.type.goat',    bg: '#DCFCE7', color: '#166534' },
  camel:   { emoji: '🐪', labelKey: 'herd.type.camel',   bg: '#FFEDD5', color: '#9A3412' },
  horse:   { emoji: '🐎', labelKey: 'herd.type.horse',   bg: '#EDE9FE', color: '#5B21B6' },
  poultry: { emoji: '🐔', labelKey: 'herd.type.poultry', bg: '#D1FAE5', color: '#065F46' },
  rabbit:  { emoji: '🐇', labelKey: 'herd.type.rabbit',  bg: '#FCE7F3', color: '#9D174D' },
  other:   { emoji: '🐾', labelKey: 'herd.type.other',   bg: '#F3F4F6', color: '#374151' },
};

const DAIRY_META = {
  milk:   { emoji: '🥛', labelKey: 'dairy.type.milk'   },
  cheese: { emoji: '🧀', labelKey: 'dairy.type.cheese' },
  yogurt: { emoji: '🫙', labelKey: 'dairy.type.yogurt' },
  butter: { emoji: '🧈', labelKey: 'dairy.type.butter' },
  cream:  { emoji: '🍦', labelKey: 'dairy.type.cream'  },
  ghee:   { emoji: '🫕', labelKey: 'dairy.type.ghee'   },
  other:  { emoji: '📦', labelKey: 'dairy.type.other'  },
};

const UNIT_KEY = { kg: 'common.kg', liter: 'farm.unit.liter', piece: 'farm.unit.piece', pack: 'farm.unit.pack', dozen: 'farm.unit.dozen' };

const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

// ─── LivestockCard ────────────────────────────────────────────────────────────
const LivestockCard = ({ listing: l, tFn }) => {
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
            {meta.emoji} {tFn(meta.labelKey)}
          </div>
        </div>

        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{l.breed || tFn(meta.labelKey)}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>📅 {l.age} {tFn('common.month')}</span>
            <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⚖️ {l.weight} {tFn('common.kg')}</span>
            {l.pricePerKg && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⚖️ {fmt(l.pricePerKg)} {tFn('common.egp')}/{tFn('common.kg')}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>{fmt(l.price)}</span>
                <span style={{ fontSize: '11px', color: C.muted, marginRight: '3px' }}> {tFn('common.egp')}</span>
              </div>
              {l.depositRequired && (
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {tFn('buyer.browse.deposit')}: {Math.round(l.price * l.depositPercentage / 100).toLocaleString('ar-EG')} {tFn('common.egp')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Link
                to={`/buyer/listings/${l._id}`}
                style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                {tFn('buyer.browse.viewDetails')}
              </Link>
              <button type="button" onClick={() => setOrderOpen(true)}
                style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: C.green, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                {tFn('farm.order')} ←
              </button>
            </div>
          </div>
        </div>
      </div>
      {orderOpen && <OrderModal listing={l} onClose={() => setOrderOpen(false)} onSuccess={() => setOrderOpen(false)} />}
    </>
  );
};

// ─── DairyCard ────────────────────────────────────────────────────────────────
const DairyCard = ({ product: p, tFn }) => {
  const [hovered, setHov] = useState(false);
  const meta = DAIRY_META[p.type] || DAIRY_META.other;
  const unitKey = UNIT_KEY[p.unit] || 'common.kg';

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
          {meta.emoji} {tFn(meta.labelKey)}
        </div>
      </div>

      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{p.name}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ background: '#F5EFE6', color: C.muted, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>📦 {fmt(p.quantity)} {tFn(unitKey)}</span>
          {p.expiryDate && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>⏳ {fmtDate(p.expiryDate)}</span>}
          {p.deliveryAvailable && <span style={{ background: C.greenBg, color: C.greenText, fontSize: '11px', padding: '2px 7px', borderRadius: '6px' }}>🚚 {tFn('buyer.browse.delivery')}</span>}
        </div>
        {p.description && (
          <p style={{ margin: 0, fontSize: '12px', color: C.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {p.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>{fmt(p.pricePerUnit)}</span>
            <span style={{ fontSize: '11px', color: C.muted, marginRight: '3px' }}>{tFn('common.egp')} / {tFn(unitKey)}</span>
          </div>
          <button type="button"
            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {tFn('farm.order')} ←
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BuyerFarmDetail ──────────────────────────────────────────────────────────
const BuyerFarmDetail = () => {
  const { t, isRTL } = useLang();
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
      {t('common.loading')}
    </div>
  );

  if (!data) return null;

  const { seller, listings = [], dairy = [] } = data;
  const displayName = seller?.farmName || seller?.name || t('farm.defaultName');
  const accentColor = avatarColor(displayName);
  const liveTypes   = [...new Set(listings.map(l => l.type))];
  const activeTab   = tab === 'livestock' ? listings : dairy;
  const hasLive     = listings.length > 0;
  const hasDairy    = dairy.length > 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ margin: '-24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Farm header banner */}
      <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`, padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
        {seller?.farmBanner && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${getImageUrl(seller.farmBanner)})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />
        )}
        <div aria-hidden="true" style={{ position: 'absolute', right: -20, top: -40, fontSize: '160px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none' }}>🌾</div>

        <button type="button" onClick={() => navigate('/buyer')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', backdropFilter: 'blur(4px)' }}>
          ← {t('farm.backToFarms')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff' }}>{displayName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              {seller?.governorate && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '3px' }}>📍 {seller.governorate}</span>}
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>✓ {t('buyer.browse.verified').replace(' ✓', '')}</span>
              {seller?.reviewCount > 0 && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#FCD34D', letterSpacing: 1 }}>{'★'.repeat(Math.round(seller.averageRating))}</span>
                  <span>{seller.averageRating?.toFixed(1)} ({seller.reviewCount})</span>
                  {seller.averageRating >= 4.5 && <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>{t('buyer.browse.trusted').replace(' ✓', '')}</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message seller button */}
        <div style={{ marginTop: '14px' }}>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({
                with: seller._id,
                contextType: 'general',
                contextLabel: displayName,
              });
              navigate(`/buyer/messages?${params.toString()}`);
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.45)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              backdropFilter: 'blur(4px)', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            💬 {t('orders.msgSeller')}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          {hasLive && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{liveTypes.map(tp => LIVE_META[tp]?.emoji || '🐾').slice(0, 3).join('')}</span>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{listings.length}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>{t('buyer.browse.livestock')}</div>
              </div>
            </div>
          )}
          {hasDairy && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🥛</span>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{dairy.length}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>{t('buyer.browse.dairyProd')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 32px 56px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Farm description */}
        {(seller?.farmDescription || seller?.bio) && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('farm.aboutFarm')}</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.8 }}>
              {seller.farmDescription || seller.bio}
            </p>
          </div>
        )}

        {/* Farm certificates */}
        {seller?.farmCertificates?.length > 0 && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏅 {t('farm.certifications')}
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
              🕐 {t('farm.workingHours')}
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
                {t('common.from')} {seller.workingHours.from} {t('common.to')} {seller.workingHours.to}
              </div>
            )}
          </div>
        )}

        {/* Farm location map */}
        {seller?.farmLocation?.lat && (
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
              📍 {t('farm.location')}
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
              { key: 'livestock', label: `🐄 ${t('farm.tab.livestock')}`,     count: listings.length },
              { key: 'dairy',     label: `🥛 ${t('farm.tab.dairy')}`,          count: dairy.length },
            ].map(tp => (
              <button key={tp.key} type="button" onClick={() => setTab(tp.key)}
                style={{
                  padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  background: tab === tp.key ? C.green : 'transparent',
                  color: tab === tp.key ? '#fff' : C.muted,
                  fontSize: '13px', fontWeight: '700', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                {tp.label}
                <span style={{ fontSize: '11px', background: tab === tp.key ? 'rgba(255,255,255,0.25)' : '#F5EFE6', padding: '1px 6px', borderRadius: '8px' }}>{tp.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content based on tab or only-type */}
        {(!hasDairy || tab === 'livestock') && hasLive && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>🐄 {t('farm.availableLivestock')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
              {listings.map(l => <LivestockCard key={l._id} listing={l} tFn={t} />)}
            </div>
          </>
        )}

        {(!hasLive || tab === 'dairy') && hasDairy && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>🥛 {t('farm.tab.dairy')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {dairy.map(d => <DairyCard key={d._id} product={d} tFn={t} />)}
            </div>
          </>
        )}

        {!hasLive && !hasDairy && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: C.white, borderRadius: '16px', boxShadow: C.shadow }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🌾</div>
            <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>{t('farm.noProducts')}</p>
          </div>
        )}

        {/* Reviews section */}
        <div style={{ marginTop: 32 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: C.text }}>⭐ {t('farm.customerReviews')}</h2>

          {reviews.length === 0 ? (
            <div style={{ background: C.white, borderRadius: 14, padding: '32px 24px', textAlign: 'center', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                {t('farm.noReviews')}
              </p>
            </div>
          ) : (
            <>
              {/* Rating summary */}
              {(() => {
                const avg = reviews.reduce((sm, r) => sm + r.rating, 0) / reviews.length;
                const counts = [5, 4, 3, 2, 1].map(s => ({ star: s, n: reviews.filter(r => r.rating === s).length }));
                return (
                  <div style={{ background: C.white, borderRadius: 14, padding: '16px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}`, marginBottom: 14, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 40, fontWeight: 900, color: C.text, lineHeight: 1 }}>{avg.toFixed(1)}</div>
                      <div style={{ color: '#F59E0B', fontSize: 18, letterSpacing: 3, margin: '4px 0 2px' }}>
                        {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{reviews.length} {t('buyer.fav.reviews')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {counts.map(({ star, n }) => (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.muted, width: 14, textAlign: 'left', flexShrink: 0 }}>{star}</span>
                          <span style={{ color: '#F59E0B', fontSize: 11, flexShrink: 0 }}>★</span>
                          <div style={{ flex: 1, height: 7, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: '#F59E0B', width: reviews.length ? `${(n / reviews.length) * 100}%` : '0%', transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: C.muted, width: 14, textAlign: 'right', flexShrink: 0 }}>{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Review cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(r => (
                  <div key={r._id} style={{ background: C.white, borderRadius: 12, padding: '14px 18px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.green }}>
                          {(r.buyer?.name?.[0] || '?').toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.buyer?.name || t('farm.buyer')}</span>
                      </div>
                      <span style={{ color: '#F59E0B', fontSize: 14, letterSpacing: 2 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>}
                    {r.reply?.body && (
                      <div style={{ marginTop: 10, background: 'rgba(58,125,68,0.06)', borderRadius: 8, padding: '9px 12px', borderRight: '3px solid rgba(58,125,68,0.3)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>رد البائع: </span>
                        <span style={{ fontSize: 13, color: C.text }}>{r.reply.body}</span>
                      </div>
                    )}
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{new Date(r.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerFarmDetail;
