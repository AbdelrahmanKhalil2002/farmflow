import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getListingById, getAvailableListings } from '../../services/listingService';
import { getMarketPrices } from '../../services/marketPricesService';
import { fmt, getImageUrl } from '../../utils/format';
import OrderModal from './OrderModal';
import { useLang } from '../../context/LangContext';
import { getOrCreate, sendOffer } from '../../services/messageService';

import { C } from '../../tokens';

const TYPE_META = {
  cattle: { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', typeKey: 'herd.type.cattle' },
  sheep:  { emoji: '🐑', color: '#0369A1', bg: '#DBEAFE', typeKey: 'herd.type.sheep'  },
  goat:   { emoji: '🐐', color: '#166534', bg: '#DCFCE7', typeKey: 'herd.type.goat'   },
  camel:  { emoji: '🐪', color: '#9A3412', bg: '#FFEDD5', typeKey: 'herd.type.camel'  },
  horse:  { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', typeKey: 'herd.type.horse'  },
  other:  { emoji: '🐾', color: '#374151', bg: '#F3F4F6', typeKey: 'herd.type.other'  },
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const seed = (id = '') => parseInt(id.slice(-2) || '00', 16);

// Vaccine sets — keyed into translation strings
const VACCINE_SETS = {
  cattle: ['lst.vaccine.fmd', 'lst.vaccine.brucella', 'lst.vaccine.anthrax', 'lst.vaccine.lsd'],
  sheep:  ['lst.vaccine.fmd', 'lst.vaccine.ppe', 'lst.vaccine.enterotox', 'lst.vaccine.brucella'],
  goat:   ['lst.vaccine.ppr', 'lst.vaccine.fmd', 'lst.vaccine.pox', 'lst.vaccine.enterotox'],
  camel:  ['lst.vaccine.mers', 'lst.vaccine.brucella', 'lst.vaccine.fmd'],
  horse:  ['lst.vaccine.encephalitis', 'lst.vaccine.tetanus', 'lst.vaccine.flu', 'lst.vaccine.anemia'],
  other:  ['lst.vaccine.fmd', 'lst.vaccine.brucella', 'lst.vaccine.antiparasitic'],
};

// Color sets — keyed into translation strings
const COLOR_SETS = {
  cattle: ['lst.color.blackWhite', 'lst.color.brown', 'lst.color.red', 'lst.color.black', 'lst.color.white'],
  sheep:  ['lst.color.white', 'lst.color.black', 'lst.color.brownWhite', 'lst.color.gray', 'lst.color.spotted'],
  goat:   ['lst.color.black', 'lst.color.brown', 'lst.color.whiteBrown', 'lst.color.gray', 'lst.color.blackWhite'],
  camel:  ['lst.color.sand', 'lst.color.brown', 'lst.color.darkBrown', 'lst.color.cream', 'lst.color.beige'],
  horse:  ['lst.color.chestnut', 'lst.color.gray2', 'lst.color.black', 'lst.color.gray', 'lst.color.piebald'],
  other:  ['lst.color.mixed', 'lst.color.brown', 'lst.color.black', 'lst.color.white', 'lst.color.gray'],
};

// Origins — keyed
const ORIGIN_KEYS = [
  'lst.origin.cairo', 'lst.origin.giza', 'lst.origin.alexandria', 'lst.origin.daqahlia',
  'lst.origin.sharqia', 'lst.origin.monufia', 'lst.origin.buhaira', 'lst.origin.asyut',
  'lst.origin.sohag', 'lst.origin.qena',
];

// Fertility options — keyed
const FERTILITY_KEYS = [
  'lst.fertility.breedingMale', 'lst.fertility.breedingFemale',
  'lst.fertility.castratedMale', 'lst.fertility.pregnantFemale', 'lst.fertility.young',
];

const HEALTH_META = {
  Excellent: { color: '#166534', bg: '#DCFCE7', icon: '💚', labelKey: 'lst.health.excellent', subKey: 'lst.health.excellentSub' },
  Good:      { color: '#0369A1', bg: '#DBEAFE', icon: '💙', labelKey: 'lst.health.good',      subKey: 'lst.health.goodSub'      },
  Fair:      { color: '#92400E', bg: '#FEF3C7', icon: '💛', labelKey: 'lst.health.fair',      subKey: 'lst.health.fairSub'      },
};

// Cert pool — keyed
const CERTS_POOL = [
  'lst.cert.vetHealth', 'lst.cert.movePermit', 'lst.cert.origin', 'lst.cert.export',
];

// Review pool — mock data, kept in Arabic as it simulates user-generated content
const REVIEW_POOL = [
  { name: 'أحمد محمد الغامدي', city: 'القاهرة',      rating: 5, ago: 'منذ أسبوعين',  text: 'حيوان ممتاز تمامًا كما هو موصوف. البائع شفاف وقدم جميع الأوراق في الوقت المناسب.' },
  { name: 'فاطمة الزهراني',    city: 'الإسكندرية',   rating: 5, ago: 'منذ شهر',       text: 'صحة ممتازة وتغذية جيدة. وثائق البيطري كانت سليمة والسلالة تطابق الإعلان تمامًا.' },
  { name: 'محمد القحطاني',     city: 'الجيزة',       rating: 4, ago: 'منذ 3 أسابيع',  text: 'جودة جيدة. التعامل كان سلسًا والبائع تواصل بشكل واضح طوال الوقت.' },
  { name: 'نورا الحارثي',      city: 'الدقهلية',     rating: 5, ago: 'منذ 5 أيام',    text: 'وصل بحالة ممتازة. جميع الأوراق اللازمة قُدِّمت دون أي مشاكل. أنصح بشدة.' },
  { name: 'خالد الدوسري',      city: 'الشرقية',      rating: 4, ago: 'منذ شهرين',     text: 'شراء جيد. السلالة والعمر تطابقا الإعلان. تواصل البائع ممتاز.' },
  { name: 'سارة المطيري',      city: 'أسيوط',        rating: 5, ago: 'منذ أسبوع',     text: 'جودة استثنائية. شهادات الصحة حقيقية والحيوان في حالة مثالية.' },
];

const RATINGS_POOL = [4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];
const SOLD_POOL    = [12, 18, 23, 31, 44, 57, 67, 82];

// Parse delivery cost from description notes
const parseDeliveryCost = (desc = '') => {
  const m = desc.match(/Delivery.*?\((\d+)\s*(?:SAR|ج\.م)\)/u);
  return m ? Number(m[1]) : null;
};

const Stars = ({ rating, size = 14 }) => (
  <span aria-hidden="true" style={{ fontSize: `${size}px`, letterSpacing: '1px', lineHeight: 1 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#E5E7EB' }}>★</span>
    ))}
  </span>
);

// ─── Component ────────────────────────────────────────────────────────────────
const BuyerListingDetail = () => {
  const { t, isRTL } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [related, setRelated]       = useState([]);
  const [imgIdx, setImgIdx]         = useState(0);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 960);
  const [showModal, setShowModal]       = useState(false);
  const [ordered, setOrdered]           = useState(false);
  const [marketAvg, setMarketAvg]       = useState(null);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerPrice, setOfferPrice]     = useState('');
  const [offerSent, setOfferSent]       = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerError, setOfferError]     = useState('');

  useEffect(() => {
    setLoading(true); setImgIdx(0);
    getListingById(id)
      .then(({ data }) => setListing(data))
      .catch(() => setFetchError(t('lst.notFound')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    getAvailableListings()
      .then(({ data }) => setRelated(data.filter(l => l.type === listing.type && l._id !== listing._id).slice(0, 4)))
      .catch(() => {});
    if (listing.pricePerKg) {
      getMarketPrices()
        .then(({ data }) => {
          const entry = data.find(e => e.type === listing.type);
          if (entry?.avgPricePerKg) setMarketAvg(entry.avgPricePerKg);
        })
        .catch(() => {});
    }
  }, [listing]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!ordered) return;
    const timer = setTimeout(() => navigate('/buyer/orders'), 2200);
    return () => clearTimeout(timer);
  }, [ordered, navigate]);

  const handleSendOffer = async () => {
    const amt = Number(offerPrice);
    if (!amt || amt <= 0) { setOfferError('أدخل مبلغاً صحيحاً'); return; }
    setSendingOffer(true); setOfferError('');
    try {
      const { data: conv } = await getOrCreate({
        recipientId: listing.seller._id,
        contextType: 'listing',
        contextRefId: listing._id,
        contextLabel: listing.title || listing.type,
      });
      await sendOffer(conv._id, amt);
      setOfferSent(true);
      setTimeout(() => navigate('/buyer/messages'), 1500);
    } catch {
      setOfferError('تعذّر إرسال العرض، حاول مجدداً');
    } finally {
      setSendingOffer(false);
    }
  };

  useEffect(() => {
    if (!listing) return;
    const len = listing.images?.length ?? 0;
    if (len < 2) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setImgIdx(p => (p === 0 ? len - 1 : p - 1));
      if (e.key === 'ArrowRight') setImgIdx(p => (p + 1) % len);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listing]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px', background: C.bg, margin: '-24px', padding: '48px' }}>
      <span style={{ fontSize: '52px' }}>🐄</span>
      <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>{t('common.loading')}</p>
    </div>
  );

  if (fetchError) return (
    <div style={{ margin: '-24px', padding: '48px 24px', background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', background: C.white, borderRadius: '20px', padding: '48px 32px', boxShadow: C.shadow, maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: '#B91C1C', fontSize: '16px', margin: '0 0 20px' }}>{fetchError}</p>
        <Link to="/buyer" style={{ padding: '10px 24px', background: C.green, color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
          ← {t('lst.backToBrowse')}
        </Link>
      </div>
    </div>
  );

  if (!listing) return null;

  // ── Derived data ─────────────────────────────────────────────────────────────
  const images        = listing.images?.length > 0 ? listing.images : [];
  const meta          = TYPE_META[listing.type] || TYPE_META.other;
  const seller        = listing.seller || {};
  const s             = seed(listing._id);

  // Strip the auto-generated [Health: ... | Gender: ... | Color: ...] header from description
  const cleanDesc = (listing.description || '').replace(/^\[.*?\]\s*\n*/s, '').trim();
  const mockHealth    = ['Excellent', 'Good', 'Fair'][s % 3];
  const hMeta         = HEALTH_META[mockHealth];
  const mockVaccineKeys = (VACCINE_SETS[listing.type] || VACCINE_SETS.other).slice(0, 3 + (s % 2));
  const mockColorKey  = (COLOR_SETS[listing.type] || COLOR_SETS.other)[s % 5];
  const mockFertilityKey = FERTILITY_KEYS[s % 5];
  const mockOriginKey = ORIGIN_KEYS[s % ORIGIN_KEYS.length];
  const mockRating    = RATINGS_POOL[s % 8];
  const mockSold      = SOLD_POOL[s % 8];
  const mockCertKeys  = CERTS_POOL.slice(0, 2 + (s % 2));
  const mockVetDate   = `${2024 - (s % 2)}-${String((s % 12) + 1).padStart(2, '0')}-${String((s % 25) + 1).padStart(2, '0')}`;
  const mockReviews   = [REVIEW_POOL[s % 6], REVIEW_POOL[(s + 2) % 6], REVIEW_POOL[(s + 4) % 6]];
  const deliveryCost  = parseDeliveryCost(listing.description || '');
  const hasDelivery   = deliveryCost !== null;

  // ── Divider helper ────────────────────────────────────────────────────────────
  const Divider = () => <div style={{ height: '1px', background: C.border, margin: '18px 0' }} />;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ margin: '-24px', padding: 0, background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", paddingBottom: isMobile ? '90px' : 0 }}>

      {/* ── Breadcrumb ── */}
      <div style={{ padding: '13px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', borderBottom: `1px solid ${C.border}`, background: C.white, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(44,24,16,0.06)' }}>
        <Link to="/buyer" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>← {t('lst.browse')}</Link>
        <span style={{ color: C.border }}>›</span>
        <span style={{ background: meta.bg, color: meta.color, padding: '3px 9px', borderRadius: '8px', fontWeight: '700', fontSize: '12px' }}>
          {meta.emoji} {t(meta.typeKey)}
        </span>
        <span style={{ color: C.border }}>›</span>
        <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
          {listing.breed || t(meta.typeKey)}
        </span>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', gap: '24px', alignItems: 'flex-start' }}>

          {/* ════════════════ LEFT — Gallery ════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Hero image */}
            <div style={{ background: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ position: 'relative', height: isMobile ? '280px' : '520px', background: meta.bg, overflow: 'hidden' }}>
                {images.length > 0 ? (
                  <img
                    src={getImageUrl(images[imgIdx])}
                    alt={listing.breed || t(meta.typeKey)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
                    <span style={{ fontSize: '90px' }}>{meta.emoji}</span>
                    <span style={{ fontSize: '14px', color: meta.color, fontWeight: '600' }}>{t('lst.noImages')}</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button type="button" aria-label={t('lst.prevImage')}
                      onClick={() => setImgIdx(p => p === 0 ? images.length - 1 : p - 1)}
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ‹
                    </button>
                    <button type="button" aria-label={t('lst.nextImage')}
                      onClick={() => setImgIdx(p => (p + 1) % images.length)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ›
                    </button>
                    <div style={{ position: 'absolute', bottom: '14px', right: '14px', background: 'rgba(0,0,0,0.52)', color: '#fff', fontSize: '12px', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                      {imgIdx + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Top badges */}
                <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ background: meta.bg, color: meta.color, fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
                    {meta.emoji} {t(meta.typeKey)}
                  </span>
                  <span style={{ background: hMeta.bg, color: hMeta.color, fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
                    {hMeta.icon} {t(hMeta.labelKey)}
                  </span>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {images.map((src, i) => (
                    <button key={i} type="button" onClick={() => setImgIdx(i)}
                      style={{ width: '76px', height: '58px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: `2.5px solid ${i === imgIdx ? C.green : C.border}`, flexShrink: 0, padding: 0, background: 'none', transition: 'border-color 0.15s' }}>
                      <img src={getImageUrl(src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {cleanDesc && (
              <div style={{ background: C.white, borderRadius: '16px', padding: '20px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                  {t('lst.aboutAnimal')}
                </div>
                <p style={{ color: C.muted, fontSize: '15px', lineHeight: 1.8, margin: 0 }}>{cleanDesc}</p>
              </div>
            )}

            {/* Full specs table */}
            <div style={{ background: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '18px 20px 4px', fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {t('lst.fullSpecs')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['🐾', t('lst.spec.type'),        t(meta.typeKey)],
                    ['🏷',  t('lst.spec.breed'),       listing.breed || t('lst.unknown')],
                    ['📅', t('lst.spec.age'),          `${listing.age} ${t('common.month')} (${(listing.age / 12).toFixed(1)} ${t('common.year')})`],
                    ['⚖️', t('lst.spec.weight'),       `${listing.weight} ${t('common.kg')}`],
                    ['🎨', t('lst.spec.color'),        t(mockColorKey)],
                    ['🧬', t('lst.spec.fertility'),    t(mockFertilityKey)],
                    ['📍', t('lst.spec.origin'),       t(mockOriginKey)],
                    ['🗺', t('lst.spec.location'),     listing.location || t('lst.unknown')],
                    [hMeta.icon, t('lst.spec.health'), t(hMeta.subKey)],
                    ['📋', t('lst.spec.addedOn'),      new Date(listing.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })],
                  ].map(([icon, label, value], i) => (
                    <tr key={label} style={{ background: i % 2 === 0 ? '#FDFAF7' : C.white }}>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: C.muted, fontWeight: '600', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, width: '42%' }}>
                        {icon} {label}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: C.text, fontWeight: '600', borderBottom: `1px solid ${C.border}` }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Buyer Reviews */}
            <div style={{ background: C.white, borderRadius: '16px', padding: '20px', boxShadow: C.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {t('lst.buyerReviews')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stars rating={mockRating} size={14} />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: C.text }}>{mockRating.toFixed(1)}</span>
                  <span style={{ fontSize: '12px', color: C.muted }}>· {mockSold} {t('lst.sales')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockReviews.map((r, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: '#FDFAF7', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor(r.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                        {initials(r.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: C.text }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>📍 {r.city} · {r.ago}</div>
                      </div>
                      <Stars rating={r.rating} size={12} />
                    </div>
                    <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ════ END LEFT ════ */}

          {/* ════════════════ RIGHT — Info + Order ════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: isMobile ? 'static' : 'sticky', top: '68px', alignSelf: 'flex-start' }}>

            {ordered ? (
              /* ── Success state ── */
              <div style={{ background: C.greenLt, border: `2px solid ${C.green}`, borderRadius: '20px', padding: '36px 24px', textAlign: 'center', boxShadow: C.shadow }}>
                <div style={{ fontSize: '56px', marginBottom: '14px' }}>✅</div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: C.greenDk, margin: '0 0 8px' }}>{t('lst.orderSent')}</h3>
                <p style={{ color: C.green, fontSize: '14px', margin: '0 0 18px', lineHeight: 1.7 }}>
                  {t('lst.orderProcessing')}<br />{t('lst.redirecting')}
                </p>
                {[
                  ['📞', t('lst.sellerContact24h')],
                  ['🛡', t('lst.platformProtection')],
                ].map(([icon, text]) => (
                  <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: C.white, borderRadius: '12px', border: `1px solid ${C.green}30`, marginBottom: '8px', textAlign: 'left' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
                    <div style={{ fontSize: '12px', color: C.greenDk, lineHeight: 1.55 }}>{text}</div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Main info panel ── */
              <div style={{ background: C.white, borderRadius: '20px', padding: '22px', boxShadow: C.shadow }}>

                {/* ① Animal title */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: meta.bg, color: meta.color, fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>
                      {meta.emoji} {t(meta.typeKey)}
                    </span>
                    {listing.location && (
                      <span style={{ background: '#F3F4F6', color: C.muted, fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                        📍 {listing.location}
                      </span>
                    )}
                  </div>
                  <h1 style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', textTransform: 'capitalize', lineHeight: 1.2 }}>
                    {listing.breed || t(meta.typeKey)}
                  </h1>
                  <div style={{ fontSize: '13px', color: C.muted }}>{listing.age} {t('common.month')} · {listing.weight} {t('common.kg')} · {t(mockOriginKey)}</div>
                </div>

                <Divider />

                {/* ② Price + delivery */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    {t('lst.price')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '38px', fontWeight: '800', color: C.text, letterSpacing: '-1.5px', lineHeight: 1 }}>{fmt(listing.price)}</span>
                    <span style={{ fontSize: '17px', color: C.muted, fontWeight: '600' }}>{t('common.egp')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#F9F5F0', borderRadius: '10px', fontSize: '13px' }}>
                    <span style={{ color: C.muted, fontWeight: '600' }}>🚚 {t('lst.deliveryFee')}</span>
                    <span style={{ fontWeight: '800', color: hasDelivery ? C.text : C.green }}>
                      {hasDelivery ? `${fmt(deliveryCost)} ${t('common.egp')}` : t('lst.negotiable')}
                    </span>
                  </div>

                  {/* Market price benchmark */}
                  {marketAvg && listing.pricePerKg && (() => {
                    const ratio = listing.pricePerKg / marketAvg;
                    const isBelow = ratio < 0.93;
                    const isAbove = ratio > 1.10;
                    const labelKey = isBelow ? 'lst.mkt.below' : isAbove ? 'lst.mkt.above' : 'lst.mkt.fair';
                    const bg       = isBelow ? '#DCFCE7' : isAbove ? '#FEF2F2' : '#FEF3C7';
                    const color    = isBelow ? '#166534' : isAbove ? '#991B1B' : '#92400E';
                    const icon     = isBelow ? '📉' : isAbove ? '📈' : '✓';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: bg, borderRadius: '10px', fontSize: '13px', marginTop: '6px' }}>
                        <span style={{ color, fontWeight: '600' }}>{t('lst.mkt.compare')}</span>
                        <span style={{ fontWeight: '800', color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {icon} {t(labelKey)}
                          <span style={{ fontSize: '11px', fontWeight: '400', opacity: 0.8 }}>({fmt(marketAvg)} {t('common.egp')}/{t('common.kg')} {t('lst.mkt.avg')})</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Qurbani shares — if available */}
                {listing.qurbaniShares?.length > 0 && (() => {
                  const SHARE_LABEL = {
                    seventh: t('buyer.share.seventh'),
                    quarter: t('buyer.share.quarter'),
                    half:    t('buyer.share.half'),
                  };
                  return (
                    <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ fontWeight: '800', fontSize: '13px', color: '#92400E', marginBottom: '10px' }}>🌙 {t('lst.qurbaniShares')}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {listing.qurbaniShares.map((sh) => {
                          const available = sh.totalShares - (sh.bookedShares || 0);
                          const pct = sh.totalShares > 0 ? Math.round(((sh.bookedShares || 0) / sh.totalShares) * 100) : 0;
                          const isFull = available <= 0;
                          return (
                            <div key={sh.shareType} style={{ background: isFull ? '#F9FAFB' : '#fff', border: `1px solid ${isFull ? '#E5E7EB' : '#FED7AA'}`, borderRadius: '9px', padding: '10px 12px', opacity: isFull ? 0.6 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>{SHARE_LABEL[sh.shareType] || sh.shareType}</span>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: isFull ? '#6B7280' : '#D97706' }}>{sh.pricePerShare.toLocaleString('ar-EG')} {t('common.egp')}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#FDE68A', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isFull ? '#9CA3AF' : '#D97706', borderRadius: '3px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: '#92400E', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {isFull ? t('lst.shareFull') : `${available} ${t('lst.shareRemaining')}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#92400E', marginTop: '8px' }}>{t('lst.shareContactSeller')}</div>
                    </div>
                  );
                })()}

                {/* ③ CTA */}
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  style={{ width: '100%', padding: '17px', background: C.green, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', letterSpacing: '-0.3px', marginBottom: '10px', transition: 'background 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.greenDk}
                  onMouseLeave={e => e.currentTarget.style.background = C.green}
                >
                  {t('lst.orderNow')} →
                </button>

                {/* ③b Make an offer */}
                {offerSent ? (
                  <div style={{ textAlign: 'center', padding: '12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', marginBottom: '10px', fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                    ✅ تم إرسال عرضك! جارٍ الانتقال للمحادثة…
                  </div>
                ) : showOfferInput ? (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', marginBottom: '10px' }}>💰 عرض سعر للبائع</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={offerPrice}
                        onChange={e => { setOfferPrice(e.target.value); setOfferError(''); }}
                        placeholder="أدخل مبلغ العرض (ج.م)"
                        style={{ flex: 1, padding: '10px 12px', border: `1px solid ${offerError ? '#EF4444' : '#FCD34D'}`, borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                        onKeyDown={e => e.key === 'Enter' && handleSendOffer()}
                      />
                      <button
                        type="button"
                        onClick={handleSendOffer}
                        disabled={sendingOffer}
                        style={{ padding: '10px 16px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: sendingOffer ? 'not-allowed' : 'pointer', opacity: sendingOffer ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        {sendingOffer ? '…' : 'إرسال'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowOfferInput(false); setOfferPrice(''); setOfferError(''); }}
                        style={{ padding: '10px 12px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#6B7280', fontFamily: 'inherit' }}
                      >
                        ✕
                      </button>
                    </div>
                    {offerError && <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', fontWeight: '600' }}>{offerError}</div>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowOfferInput(true)}
                    style={{ width: '100%', padding: '13px', background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px', fontFamily: 'inherit', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
                  >
                    💰 عرض سعر
                  </button>
                )}

                {/* Trust badges */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {[
                    ['🔒', t('lst.trust.secure')],
                    ['✅', t('lst.trust.verifiedSeller')],
                    ['📞', t('lst.trust.directContact')],
                    ['🛡', t('lst.trust.protected')],
                  ].map(([icon, label]) => (
                    <span key={label} style={{ fontSize: '11px', color: C.green, fontWeight: '700', background: C.greenLt, padding: '3px 9px', borderRadius: '20px', border: `1px solid ${C.green}30` }}>
                      {icon} {label}
                    </span>
                  ))}
                </div>

                <Divider />

                {/* ④ Key specs */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    {t('lst.keySpecs')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      ['📅', t('lst.spec.age'),       `${listing.age} ${t('common.month')}`],
                      ['⚖️', t('lst.spec.weight'),    `${listing.weight} ${t('common.kg')}`],
                      ['🎨', t('lst.spec.color'),     t(mockColorKey)],
                      ['🧬', t('lst.spec.fertility'), t(mockFertilityKey)],
                    ].map(([icon, label, val]) => (
                      <div key={label} style={{ background: '#F9F5F0', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>{icon} {label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* ⑤ Health status */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    {t('lst.healthStatus')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: hMeta.bg, borderRadius: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{hMeta.icon}</span>
                    <div>
                      <div style={{ fontWeight: '800', color: hMeta.color, fontSize: '15px' }}>{t(hMeta.subKey)}</div>
                      <div style={{ fontSize: '11px', color: hMeta.color, opacity: 0.8, marginTop: '2px' }}>
                        {t('lst.lastVetCheck')}: {mockVetDate}
                      </div>
                    </div>
                  </div>

                  {/* Vaccines */}
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>
                    💉 {t('lst.vaccines')}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {mockVaccineKeys.map(vk => (
                      <span key={vk} style={{ background: C.greenLt, color: C.green, border: `1px solid ${C.green}30`, fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                        ✓ {t(vk)}
                      </span>
                    ))}
                  </div>

                  {/* Certificates */}
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>
                    📜 {t('lst.certs')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mockCertKeys.map(ck => (
                      <div key={ck} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#F9F5F0', borderRadius: '10px' }}>
                        <span style={{ width: '20px', height: '20px', background: C.greenLt, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '12px', color: C.text, fontWeight: '600' }}>{t(ck)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* ⑥ Seller */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    {t('orders.seller')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                      {initials(seller.name || '')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: C.text, marginBottom: '3px' }}>
                        {seller.name || t('lst.unknownSeller')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Stars rating={mockRating} size={12} />
                        <span style={{ fontSize: '12px', color: C.muted, fontWeight: '600' }}>{mockRating.toFixed(1)}</span>
                        <span style={{ fontSize: '11px', color: C.muted }}>· {mockSold} {t('lst.sales')}</span>
                      </div>
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', flexShrink: 0 }}>
                      ✓ {t('buyer.browse.verified').replace(' ✓', '')}
                    </span>
                  </div>

                  {/* Seller stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {[
                      [mockSold,             t('lst.sellerStat.sold')],
                      ['5+',                 t('lst.sellerStat.years')],
                      [mockRating.toFixed(1),t('lst.sellerStat.rating')],
                    ].map(([val, label]) => (
                      <div key={label} style={{ background: '#F9F5F0', borderRadius: '9px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: C.text, lineHeight: 1.2 }}>{val}</div>
                        <div style={{ fontSize: '10px', color: C.muted, fontWeight: '600', marginTop: '2px' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {seller.phone ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={`tel:${seller.phone}`}
                        style={{ flex: 1, padding: '10px', background: C.greenLt, color: C.green, textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: `1.5px solid ${C.green}40` }}>
                        📞 {t('orders.call')}
                      </a>
                      <a href={`https://wa.me/${seller.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        style={{ flex: 1, padding: '10px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: '1.5px solid #16653440' }}>
                        💬 {t('orders.whatsapp')}
                      </a>
                    </div>
                  ) : (
                    <div style={{ padding: '10px', background: '#F9F5F0', color: C.muted, borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                      {t('lst.noContactInfo')}
                    </div>
                  )}
                </div>

                {/* Platform guarantee */}
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>🛡</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.greenDk, marginBottom: '2px' }}>{t('lst.platformGuaranteeTitle')}</div>
                    <div style={{ fontSize: '11px', color: C.green, lineHeight: 1.55 }}>
                      {t('lst.platformGuaranteeBody')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Related listings ── */}
            {related.length > 0 && (
              <div style={{ background: C.white, borderRadius: '16px', padding: '18px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  {t('lst.similar')} {t(meta.typeKey)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {related.map(r => {
                    const rm = TYPE_META[r.type] || TYPE_META.other;
                    return (
                      <Link key={r._id} to={`/buyer/listings/${r._id}`}
                        style={{ textDecoration: 'none', display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', borderRadius: '12px', border: `1px solid ${C.border}`, transition: 'background 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.greenLt; e.currentTarget.style.borderColor = C.green + '40'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}>
                        <div style={{ width: '56px', height: '46px', borderRadius: '8px', background: rm.bg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                          {r.images?.length > 0
                            ? <img src={getImageUrl(r.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : rm.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.breed || t(rm.typeKey)}
                          </div>
                          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                            {r.age} {t('common.month')} · {r.weight} {t('common.kg')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: C.text }}>{fmt(r.price)}</div>
                          <div style={{ fontSize: '10px', color: C.muted }}>{t('common.egp')}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* ════ END RIGHT ════ */}
        </div>
      </div>

      {/* ── Mobile sticky footer ── */}
      {isMobile && !ordered && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', gap: '14px', alignItems: 'center', zIndex: 100, boxShadow: '0 -4px 16px rgba(44,24,16,0.10)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('lst.price')}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {fmt(listing.price)} <span style={{ fontSize: '13px', fontWeight: '400', color: C.muted }}>{t('common.egp')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ padding: '13px 28px', background: C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
          >
            {t('lst.orderNow')} →
          </button>
        </div>
      )}

      {showModal && (
        <OrderModal
          listing={listing}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setOrdered(true); }}
        />
      )}
    </div>
  );
};

export default BuyerListingDetail;
