import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getListingById, getAvailableListings } from '../../services/listingService';
import { getMarketPrices } from '../../services/marketPricesService';
import { fmt, getImageUrl } from '../../utils/format';
import OrderModal from './OrderModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#F8F4EE',
  white:   '#FFFFFF',
  green:   '#3A7D44',
  greenDk: '#2D6235',
  greenLt: '#F0F7F1',
  tan:     '#C49A6C',
  border:  '#E8D5C0',
  text:    '#2C1810',
  muted:   '#8B6B5A',
  shadow:  '0 2px 10px rgba(44,24,16,0.08)',
};

const TYPE_META = {
  cattle: { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', label: 'Cattle',  ar: 'أبقار'  },
  sheep:  { emoji: '🐑', color: '#0369A1', bg: '#DBEAFE', label: 'Sheep',   ar: 'أغنام'  },
  goat:   { emoji: '🐐', color: '#166534', bg: '#DCFCE7', label: 'Goat',    ar: 'ماعز'   },
  camel:  { emoji: '🐪', color: '#9A3412', bg: '#FFEDD5', label: 'Camel',   ar: 'إبل'    },
  horse:  { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', label: 'Horse',   ar: 'خيول'   },
  other:  { emoji: '🐾', color: '#374151', bg: '#F3F4F6', label: 'Other',   ar: 'أخرى'   },
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const seed = (id = '') => parseInt(id.slice(-2) || '00', 16);

const VACCINE_SETS = {
  cattle: ['تطعيم الحمى القلاعية', 'البروسيلا', 'الجمرة الخبيثة', 'مرض الجلد العقدي'],
  sheep:  ['تطعيم الحمى القلاعية', 'الطاعون الصغير', 'التسمم المعوي', 'البروسيلا'],
  goat:   ['طاعون المجترات', 'تطعيم الحمى القلاعية', 'الجدري', 'التسمم المعوي'],
  camel:  ['التهاب الجمل التنفسي', 'البروسيلا', 'تطعيم الحمى القلاعية'],
  horse:  ['التهاب الدماغ', 'التيتانوس', 'إنفلونزا الخيول', 'الأنيميا'],
  other:  ['تطعيم الحمى القلاعية', 'البروسيلا', 'مضادات الطفيليات'],
};

const COLOR_SETS = {
  cattle: ['أبيض وأسود', 'بني', 'أحمر', 'أسود', 'أبيض'],
  sheep:  ['أبيض', 'أسود', 'بني وأبيض', 'رمادي', 'منقط'],
  goat:   ['أسود', 'بني', 'أبيض وبني', 'رمادي', 'أسود وأبيض'],
  camel:  ['رملي', 'بني', 'بني داكن', 'كريمي', 'بيج فاتح'],
  horse:  ['كستنائي', 'أشهب', 'أسود', 'رمادي', 'أبلق'],
  other:  ['مختلط', 'بني', 'أسود', 'أبيض', 'رمادي'],
};

const ORIGINS = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية',
  'المنوفية', 'البحيرة', 'أسيوط', 'سوهاج', 'قنا',
];

const FERTILITY_OPTS = ['ذكر للتربية', 'أنثى للتربية', 'ذكر مخصي', 'أنثى حامل', 'صغير'];

const HEALTH_META = {
  Excellent: { color: '#166534', bg: '#DCFCE7', icon: '💚', label: 'ممتازة',     sub: 'صحة ممتازة' },
  Good:      { color: '#0369A1', bg: '#DBEAFE', icon: '💙', label: 'جيدة',       sub: 'حالة جيدة'  },
  Fair:      { color: '#92400E', bg: '#FEF3C7', icon: '💛', label: 'مقبولة',     sub: 'حالة مقبولة' },
};

const CERTS_POOL = [
  'شهادة صحة بيطرية', 'تصريح نقل رسمي', 'شهادة المنشأ', 'تصريح تصدير',
];

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
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [related, setRelated]       = useState([]);
  const [imgIdx, setImgIdx]         = useState(0);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 960);
  const [showModal, setShowModal]   = useState(false);
  const [ordered, setOrdered]       = useState(false);
  const [marketAvg, setMarketAvg]   = useState(null);

  useEffect(() => {
    setLoading(true); setImgIdx(0);
    getListingById(id)
      .then(({ data }) => setListing(data))
      .catch(() => setFetchError('الإعلان غير موجود أو غير متاح.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    getAvailableListings()
      .then(({ data }) => setRelated(data.filter(l => l.type === listing.type && l._id !== listing._id).slice(0, 4)))
      .catch(() => {});
    // Load market price benchmark for this animal type
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
    const t = setTimeout(() => navigate('/buyer/orders'), 2200);
    return () => clearTimeout(t);
  }, [ordered, navigate]);

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
      <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>جارٍ التحميل…</p>
    </div>
  );

  if (fetchError) return (
    <div style={{ margin: '-24px', padding: '48px 24px', background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', background: C.white, borderRadius: '20px', padding: '48px 32px', boxShadow: C.shadow, maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: '#B91C1C', fontSize: '16px', margin: '0 0 20px' }}>{fetchError}</p>
        <Link to="/buyer" style={{ padding: '10px 24px', background: C.green, color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
          ← العودة للتصفح
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
  const mockHealth    = ['Excellent', 'Good', 'Fair'][s % 3];
  const hMeta         = HEALTH_META[mockHealth];
  const mockVaccines  = (VACCINE_SETS[listing.type] || VACCINE_SETS.other).slice(0, 3 + (s % 2));
  const mockColor     = (COLOR_SETS[listing.type] || COLOR_SETS.other)[s % 5];
  const mockFertility = FERTILITY_OPTS[s % 5];
  const mockOrigin    = ORIGINS[s % ORIGINS.length];
  const mockRating    = RATINGS_POOL[s % 8];
  const mockSold      = SOLD_POOL[s % 8];
  const mockCerts     = CERTS_POOL.slice(0, 2 + (s % 2));
  const mockVetDate   = `${2024 - (s % 2)}-${String((s % 12) + 1).padStart(2, '0')}-${String((s % 25) + 1).padStart(2, '0')}`;
  const mockReviews   = [REVIEW_POOL[s % 6], REVIEW_POOL[(s + 2) % 6], REVIEW_POOL[(s + 4) % 6]];
  const deliveryCost  = parseDeliveryCost(listing.description || '');
  const hasDelivery   = deliveryCost !== null;

  // ── Divider helper ────────────────────────────────────────────────────────────
  const Divider = () => <div style={{ height: '1px', background: C.border, margin: '18px 0' }} />;

  return (
    <div style={{ margin: '-24px', padding: 0, background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", paddingBottom: isMobile ? '90px' : 0 }}>

      {/* ── Breadcrumb ── */}
      <div style={{ padding: '13px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', borderBottom: `1px solid ${C.border}`, background: C.white, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(44,24,16,0.06)' }}>
        <Link to="/buyer" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>← تصفح</Link>
        <span style={{ color: C.border }}>›</span>
        <span style={{ background: meta.bg, color: meta.color, padding: '3px 9px', borderRadius: '8px', fontWeight: '700', fontSize: '12px' }}>
          {meta.emoji} {meta.ar}
        </span>
        <span style={{ color: C.border }}>›</span>
        <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
          {listing.breed || meta.label}
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
                    alt={listing.breed || meta.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
                    <span style={{ fontSize: '90px' }}>{meta.emoji}</span>
                    <span style={{ fontSize: '14px', color: meta.color, fontWeight: '600' }}>لا توجد صور</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button type="button" aria-label="السابق"
                      onClick={() => setImgIdx(p => p === 0 ? images.length - 1 : p - 1)}
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ‹
                    </button>
                    <button type="button" aria-label="التالي"
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
                    {meta.emoji} {meta.ar}
                  </span>
                  <span style={{ background: hMeta.bg, color: hMeta.color, fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
                    {hMeta.icon} {hMeta.label}
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
            {listing.description && (
              <div style={{ background: C.white, borderRadius: '16px', padding: '20px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                  عن هذا الحيوان
                </div>
                <p style={{ color: C.muted, fontSize: '15px', lineHeight: 1.8, margin: 0 }}>{listing.description}</p>
              </div>
            )}

            {/* Full specs table */}
            <div style={{ background: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '18px 20px 4px', fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                المواصفات الكاملة
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['🐾', 'النوع',              meta.ar],
                    ['🏷',  'السلالة',            listing.breed || 'غير محدد'],
                    ['📅', 'العمر',              `${listing.age} شهر (${(listing.age / 12).toFixed(1)} سنة)`],
                    ['⚖️', 'الوزن',             `${listing.weight} كجم`],
                    ['🎨', 'اللون',              mockColor],
                    ['🧬', 'حالة التكاثر',      mockFertility],
                    ['📍', 'منطقة المنشأ',      mockOrigin],
                    ['🗺', 'موقع الإعلان',      listing.location || 'غير محدد'],
                    [hMeta.icon, 'الحالة الصحية', hMeta.sub],
                    ['📋', 'تاريخ الإضافة',     new Date(listing.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })],
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
                  تقييمات المشترين
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stars rating={mockRating} size={14} />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: C.text }}>{mockRating.toFixed(1)}</span>
                  <span style={{ fontSize: '12px', color: C.muted }}>· {mockSold} عملية بيع</span>
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
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: C.greenDk, margin: '0 0 8px' }}>تم إرسال الطلب!</h3>
                <p style={{ color: C.green, fontSize: '14px', margin: '0 0 18px', lineHeight: 1.7 }}>
                  طلبك قيد المعالجة.<br />جارٍ التوجيه لصفحة طلباتك…
                </p>
                {[
                  ['📞', 'سيتواصل معك البائع خلال 24 ساعة لتأكيد الطلب وترتيب التسليم.'],
                  ['🛡', 'تمت عملية الطلب بأمان. هذه المعاملة مسجلة ومحمية عبر فارم فلو.'],
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
                      {meta.emoji} {meta.ar}
                    </span>
                    {listing.location && (
                      <span style={{ background: '#F3F4F6', color: C.muted, fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
                        📍 {listing.location}
                      </span>
                    )}
                  </div>
                  <h1 style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', textTransform: 'capitalize', lineHeight: 1.2 }}>
                    {listing.breed || meta.label}
                  </h1>
                  <div style={{ fontSize: '13px', color: C.muted }}>{listing.age} شهر · {listing.weight} كجم · {mockOrigin}</div>
                </div>

                <Divider />

                {/* ② Price + delivery */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    السعر
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '38px', fontWeight: '800', color: C.text, letterSpacing: '-1.5px', lineHeight: 1 }}>{fmt(listing.price)}</span>
                    <span style={{ fontSize: '17px', color: C.muted, fontWeight: '600' }}>ج.م</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#F9F5F0', borderRadius: '10px', fontSize: '13px' }}>
                    <span style={{ color: C.muted, fontWeight: '600' }}>🚚 رسوم التسليم</span>
                    <span style={{ fontWeight: '800', color: hasDelivery ? C.text : C.green }}>
                      {hasDelivery ? `${fmt(deliveryCost)} ج.م` : 'قابل للتفاوض'}
                    </span>
                  </div>

                  {/* Market price benchmark */}
                  {marketAvg && listing.pricePerKg && (() => {
                    const ratio = listing.pricePerKg / marketAvg;
                    const isBelow = ratio < 0.93;
                    const isAbove = ratio > 1.10;
                    const label  = isBelow ? 'أقل من السوق' : isAbove ? 'أعلى من السوق' : 'سعر عادل';
                    const bg     = isBelow ? '#DCFCE7' : isAbove ? '#FEF2F2' : '#FEF3C7';
                    const color  = isBelow ? '#166534' : isAbove ? '#991B1B' : '#92400E';
                    const icon   = isBelow ? '📉' : isAbove ? '📈' : '✓';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: bg, borderRadius: '10px', fontSize: '13px', marginTop: '6px' }}>
                        <span style={{ color, fontWeight: '600' }}>السعر مقارنةً بالسوق</span>
                        <span style={{ fontWeight: '800', color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {icon} {label}
                          <span style={{ fontSize: '11px', fontWeight: '400', opacity: 0.8 }}>({fmt(marketAvg)} ج.م/كجم متوسط)</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Qurbani shares — if available */}
                {listing.qurbaniShares?.length > 0 && (() => {
                  const SHARE_LABEL = { seventh: 'سُبع (١/٧)', quarter: 'ربع (١/٤)', half: 'نصف (١/٢)' };
                  return (
                    <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ fontWeight: '800', fontSize: '13px', color: '#92400E', marginBottom: '10px' }}>🌙 أسهم الأضحية المشتركة</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {listing.qurbaniShares.map((s) => {
                          const available = s.totalShares - (s.bookedShares || 0);
                          const pct = s.totalShares > 0 ? Math.round(((s.bookedShares || 0) / s.totalShares) * 100) : 0;
                          const isFull = available <= 0;
                          return (
                            <div key={s.shareType} style={{ background: isFull ? '#F9FAFB' : '#fff', border: `1px solid ${isFull ? '#E5E7EB' : '#FED7AA'}`, borderRadius: '9px', padding: '10px 12px', opacity: isFull ? 0.6 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>{SHARE_LABEL[s.shareType] || s.shareType}</span>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: isFull ? '#6B7280' : '#D97706' }}>{s.pricePerShare.toLocaleString('ar-EG')} ج.م</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#FDE68A', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isFull ? '#9CA3AF' : '#D97706', borderRadius: '3px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: '#92400E', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {isFull ? 'مكتمل' : `${available} متبقية`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#92400E', marginTop: '8px' }}>للحجز تواصل مباشرةً مع البائع</div>
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
                  طلب الآن →
                </button>

                {/* Trust badges */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {[['🔒','آمن'],['✅','بائع موثق'],['📞','تواصل مباشر'],['🛡','محمي']].map(([icon, label]) => (
                    <span key={label} style={{ fontSize: '11px', color: C.green, fontWeight: '700', background: C.greenLt, padding: '3px 9px', borderRadius: '20px', border: `1px solid ${C.green}30` }}>
                      {icon} {label}
                    </span>
                  ))}
                </div>

                <Divider />

                {/* ④ Key specs */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    المعلومات الأساسية
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      ['📅', 'العمر',          `${listing.age} شهر`],
                      ['⚖️', 'الوزن',         `${listing.weight} كجم`],
                      ['🎨', 'اللون',          mockColor],
                      ['🧬', 'التكاثر',        mockFertility],
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
                    الحالة الصحية
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: hMeta.bg, borderRadius: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{hMeta.icon}</span>
                    <div>
                      <div style={{ fontWeight: '800', color: hMeta.color, fontSize: '15px' }}>{hMeta.sub}</div>
                      <div style={{ fontSize: '11px', color: hMeta.color, opacity: 0.8, marginTop: '2px' }}>
                        آخر فحص بيطري: {mockVetDate}
                      </div>
                    </div>
                  </div>

                  {/* Vaccines */}
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>
                    💉 التطعيمات
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {mockVaccines.map(v => (
                      <span key={v} style={{ background: C.greenLt, color: C.green, border: `1px solid ${C.green}30`, fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                        ✓ {v}
                      </span>
                    ))}
                  </div>

                  {/* Certificates */}
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>
                    📜 الشهادات الصحية
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mockCerts.map(cert => (
                      <div key={cert} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#F9F5F0', borderRadius: '10px' }}>
                        <span style={{ width: '20px', height: '20px', background: C.greenLt, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '12px', color: C.text, fontWeight: '600' }}>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* ⑥ Seller */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    البائع
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                      {initials(seller.name || '')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: C.text, marginBottom: '3px' }}>
                        {seller.name || 'بائع مجهول'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Stars rating={mockRating} size={12} />
                        <span style={{ fontSize: '12px', color: C.muted, fontWeight: '600' }}>{mockRating.toFixed(1)}</span>
                        <span style={{ fontSize: '11px', color: C.muted }}>· {mockSold} مبيعات</span>
                      </div>
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', flexShrink: 0 }}>
                      ✓ موثق
                    </span>
                  </div>

                  {/* Seller stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {[
                      [mockSold,             'مبيعة'],
                      ['5+',                 'سنوات'],
                      [mockRating.toFixed(1),'تقييم'],
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
                        📞 اتصال
                      </a>
                      <a href={`https://wa.me/${seller.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        style={{ flex: 1, padding: '10px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: '1.5px solid #16653440' }}>
                        💬 واتساب
                      </a>
                    </div>
                  ) : (
                    <div style={{ padding: '10px', background: '#F9F5F0', color: C.muted, borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                      معلومات التواصل غير متاحة
                    </div>
                  )}
                </div>

                {/* Platform guarantee */}
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>🛡</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.greenDk, marginBottom: '2px' }}>ضمان المنصة</div>
                    <div style={{ fontSize: '11px', color: C.green, lineHeight: 1.55 }}>
                      فارم فلو يوثق جميع الطلبات ويتحقق من جميع الأطراف. في حال النزاع، سيتدخل فريق الدعم لحل المشكلة.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Related listings ── */}
            {related.length > 0 && (
              <div style={{ background: C.white, borderRadius: '16px', padding: '18px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  {meta.ar} مشابهة
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
                            {r.breed || rm.label}
                          </div>
                          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                            {r.age} شهر · {r.weight} كجم
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: C.text }}>{fmt(r.price)}</div>
                          <div style={{ fontSize: '10px', color: C.muted }}>ج.م</div>
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
            <div style={{ fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>السعر</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {fmt(listing.price)} <span style={{ fontSize: '13px', fontWeight: '400', color: C.muted }}>ج.م</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ padding: '13px 28px', background: C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
          >
            طلب الآن →
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
