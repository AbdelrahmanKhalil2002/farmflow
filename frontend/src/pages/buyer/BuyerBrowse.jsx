import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSellers } from '../../services/dairyService';
import { getFavorites, addFavorite, removeFavorite } from '../../services/favoritesService';
import { getEidListings } from '../../services/eidService';
import { getSupplies } from '../../services/supplyService';

const C = {
  bg:       '#F8F4EE',
  white:    '#FFFFFF',
  green:    '#3A7D44',
  greenDk:  '#2D6235',
  greenLt:  '#F0F7F1',
  greenBg:  '#DCFCE7',
  greenText:'#166534',
  tan:      '#C49A6C',
  border:   '#E8D5C0',
  text:     '#2C1810',
  muted:    '#8B6B5A',
  shadow:   '0 2px 10px rgba(44,24,16,0.08)',
  shadowHv: '0 10px 28px rgba(44,24,16,0.16)',
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const TYPE_EMOJI = { cattle: '🐄', buffalo: '🐃', sheep: '🐑', goat: '🐐', camel: '🐪', horse: '🐎', poultry: '🐔', rabbit: '🐇', other: '🐾' };
const TYPE_AR    = { cattle: 'ماشية', buffalo: 'جاموس', sheep: 'أغنام', goat: 'ماعز', camel: 'إبل', horse: 'خيول', poultry: 'دواجن', rabbit: 'أرانب', other: 'أخرى' };
const DAIRY_EMOJI = { milk: '🥛', cheese: '🧀', yogurt: '🫙', butter: '🧈', cream: '🍦', ghee: '🫕', other: '📦' };

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const SK_STYLE = { background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite', borderRadius: 8 };

const SkeletonFarmCard = () => (
  <div style={{ background: C.white, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
    <style>{`@keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div style={{ height: '8px', ...SK_STYLE, borderRadius: 0, marginBottom: 0 }} />
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', ...SK_STYLE }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: 18, width: '60%', ...SK_STYLE }} />
          <div style={{ height: 13, width: '40%', ...SK_STYLE }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[50, 60, 50].map((w, i) => <div key={i} style={{ height: 26, width: w, ...SK_STYLE, borderRadius: 20 }} />)}
      </div>
      <div style={{ height: 38, ...SK_STYLE, borderRadius: 10 }} />
    </div>
  </div>
);

// ─── FarmCard ─────────────────────────────────────────────────────────────────
const FarmCard = ({ farm, isFav, onToggleFav }) => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const liveTypes   = farm.listingTypes || [];
  const dairyTypes  = farm.dairyTypes   || [];
  const displayName = farm.farmName || farm.name || 'مزرعة';
  const accentColor = avatarColor(displayName);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.white, borderRadius: '16px', overflow: 'hidden',
        boxShadow: hovered ? C.shadowHv : C.shadow,
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Accent bar */}
      <div style={{ height: '6px', background: accentColor, position: 'relative' }}>
        {isNewToday(farm) && (
          <span style={{ position: 'absolute', top: 6, right: 10, background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '0 0 6px 6px', letterSpacing: '0.3px', zIndex: 1 }}>
            جديد اليوم ✦
          </span>
        )}
      </div>

      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Farm identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {farm.governorate && <><span>📍</span><span>{farm.governorate}</span></>}
            </div>
            {farm.reviewCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <span style={{ color: '#F59E0B', fontSize: '12px', letterSpacing: 1 }}>{'★'.repeat(Math.round(farm.averageRating))}{'☆'.repeat(5 - Math.round(farm.averageRating))}</span>
                <span style={{ fontSize: '11px', color: C.muted }}>({farm.reviewCount})</span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            {farm.averageRating >= 4.5 ? (
              <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', flexShrink: 0 }}>موثوق ✓</span>
            ) : (
              <span style={{ background: C.greenBg, color: C.greenText, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', flexShrink: 0 }}>✓ موثّق</span>
            )}
            {onToggleFav && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onToggleFav(farm._id, isFav); }}
                title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, lineHeight:1, padding:'2px 0', color: isFav ? '#DC2626' : '#CBD5E1', transition:'color 0.15s' }}>
                {isFav ? '❤️' : '🤍'}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {farm.listingCount > 0 && (
            <div style={{ background: '#F5EFE6', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: C.text }}>{farm.listingCount}</div>
              <div style={{ fontSize: '11px', color: C.muted }}>رأس ماشية</div>
            </div>
          )}
          {farm.dairyCount > 0 && (
            <div style={{ background: '#CFFAFE', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#0C4A6E' }}>{farm.dairyCount}</div>
              <div style={{ fontSize: '11px', color: '#0E7490' }}>منتج ألبان</div>
            </div>
          )}
        </div>

        {/* Animal type chips */}
        {(liveTypes.length > 0 || dairyTypes.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {liveTypes.map(t => (
              <span key={t} style={{ fontSize: '12px', padding: '3px 9px', borderRadius: '14px', background: '#FEF3C7', color: '#92400E', fontWeight: '600' }}>
                {TYPE_EMOJI[t] || '🐾'} {TYPE_AR[t] || t}
              </span>
            ))}
            {dairyTypes.map(t => (
              <span key={'d'+t} style={{ fontSize: '12px', padding: '3px 9px', borderRadius: '14px', background: '#CFFAFE', color: '#0C4A6E', fontWeight: '600' }}>
                {DAIRY_EMOJI[t] || '📦'}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(`/buyer/farms/${farm._id}`)}
          style={{
            marginTop: 'auto', padding: '11px', borderRadius: '10px', border: 'none',
            background: hovered ? C.greenDk : C.green, color: '#fff',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            transition: 'background 0.15s', width: '100%',
          }}
        >
          زيارة المزرعة ←
        </button>
      </div>
    </div>
  );
};

// ─── EidListingCard ───────────────────────────────────────────────────────────
const EidListingCard = ({ listing }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const typeName = TYPE_AR[listing.type] || listing.type;
  const typeEmoji = TYPE_EMOJI[listing.type] || '🐾';
  const sellerName = listing.seller?.name || 'بائع';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.white, borderRadius: '16px', overflow: 'hidden',
        boxShadow: hovered ? C.shadowHv : C.shadow,
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
        border: '1px solid #BBF7D0',
      }}
    >
      {/* Green eid accent bar */}
      <div style={{ height: '6px', background: 'linear-gradient(90deg, #15803D, #22C55E)' }} />

      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Badges row */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ background: '#F0FDF4', color: '#15803D', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '8px' }}>
            🌙 عرض العيد
          </span>
          {listing.slaughterService && (
            <span style={{ background: '#FEF9C3', color: '#92400E', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '8px' }}>
              🔪 خدمة الذبح
            </span>
          )}
        </div>

        {/* Animal info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {typeEmoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>
              {typeName}{listing.breed ? ` — ${listing.breed}` : ''}
            </div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
              {listing.weight ? `${listing.weight} كجم` : ''}{listing.age ? ` · ${listing.age} شهر` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'left', flexShrink: 0 }}>
            {listing.pricePerKg && (
              <div style={{ fontWeight: '800', fontSize: '15px', color: '#15803D' }}>
                {listing.pricePerKg} ج.م/كجم
              </div>
            )}
            {listing.price && (
              <div style={{ fontSize: '11px', color: C.muted }}>
                إجمالي: {listing.price.toLocaleString('ar-EG')} ج.م
              </div>
            )}
          </div>
        </div>

        {/* Seller + location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.muted }}>
          <span>👤 {sellerName}</span>
          {listing.location && <><span>·</span><span>📍 {listing.location}</span></>}
        </div>

        {/* Slaughter cost */}
        {listing.slaughterService && listing.slaughterCost && (
          <div style={{ fontSize: '12px', color: '#92400E', background: '#FEF9C3', padding: '5px 10px', borderRadius: '7px' }}>
            تكلفة الذبح: {listing.slaughterCost} ج.م
          </div>
        )}

        {/* Qurbani share chips */}
        {listing.qurbaniShares?.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {listing.qurbaniShares.map(s => {
              const available = s.totalShares - (s.bookedShares || 0);
              const SHARE_LABEL = { seventh: 'سُبع', quarter: 'ربع', half: 'نصف' };
              const isFull = available <= 0;
              return (
                <span key={s.shareType} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '8px', background: isFull ? '#F3F4F6' : '#FFFBEB', color: isFull ? '#6B7280' : '#92400E', border: `1px solid ${isFull ? '#E5E7EB' : '#FDE68A'}` }}>
                  {isFull ? '🔒' : '🌙'} {SHARE_LABEL[s.shareType]} — {s.pricePerShare.toLocaleString('ar-EG')} ج.م
                </span>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(`/buyer/listings/${listing._id}`)}
          style={{
            marginTop: 'auto', padding: '10px', borderRadius: '10px', border: 'none',
            background: hovered ? '#15803D' : '#16A34A', color: '#fff',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            transition: 'background 0.15s', width: '100%',
          }}
        >
          عرض التفاصيل ←
        </button>
      </div>
    </div>
  );
};

const CAT_AR    = { feed:'علف', veterinary:'مستلزمات بيطرية', equipment:'معدات ومستلزمات', seeds:'بذور ونباتات', other:'أخرى' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };
const SUPPLY_CATS = ['', 'feed', 'veterinary', 'equipment', 'seeds', 'other'];
const SUPPLY_CAT_LABELS = { '': 'الكل', feed: 'علف 🌾', veterinary: 'بيطري 💊', equipment: 'معدات 🔧', seeds: 'بذور 🌱', other: 'أخرى 📦' };

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ─── SupplyCard ───────────────────────────────────────────────────────────────
const SupplyCard = ({ supply }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const seller = supply.seller || {};

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.white, borderRadius: 16, overflow: 'hidden',
        boxShadow: hovered ? C.shadowHv : C.shadow,
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Thumbnail or emoji */}
      <div style={{ height: 120, background: '#F0F7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {supply.images?.[0]
          ? <img src={`${BASE_URL}${supply.images[0]}`} alt={supply.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 52 }}>{CAT_EMOJI[supply.category] || '📦'}</span>
        }
        {supply.deliveryAvailable && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: '#EFF6FF', color: '#1D4ED8', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
            🚚 توصيل
          </span>
        )}
      </div>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Category chip */}
        <span style={{ background: '#F0F7F1', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, alignSelf: 'flex-start' }}>
          {CAT_EMOJI[supply.category]} {CAT_AR[supply.category]}
        </span>

        {/* Name */}
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {supply.name}
        </div>

        {/* Quantity */}
        <div style={{ fontSize: 12, color: C.muted }}>
          {supply.quantity} {supply.unit} متاحة
          {supply.location && <> · 📍 {supply.location}</>}
        </div>

        {/* Price */}
        <div style={{ fontWeight: 800, fontSize: 17, color: C.green, marginTop: 'auto' }}>
          {supply.pricePerUnit?.toLocaleString('ar-EG')} ج.م
          <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>/{supply.unit}</span>
        </div>

        {/* Seller */}
        {seller.name && (
          <div style={{ fontSize: 11, color: C.muted }}>👤 {seller.farmName || seller.name}</div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(`/buyer/supplies/${supply._id}`)}
          style={{
            marginTop: 6, padding: '9px', borderRadius: 9, border: 'none',
            background: hovered ? '#2D6235' : '#3A7D44', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.15s', width: '100%',
          }}>
          عرض التفاصيل ←
        </button>
      </div>
    </div>
  );
};

const GOVERNORATES = [
  'القاهرة','الجيزة','الإسكندرية','الشرقية','الدقهلية','البحيرة','المنوفية',
  'الغربية','القليوبية','كفر الشيخ','الإسماعيلية','بورسعيد','السويس','دمياط',
  'شمال سيناء','جنوب سيناء','الفيوم','بني سويف','المنيا','أسيوط','سوهاج',
  'قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح',
];

const SORT_OPTIONS = [
  { val: 'newest',   label: 'الأحدث'       },
  { val: 'rating',   label: 'الأعلى تقييمًا' },
  { val: 'listings', label: 'أكثر مواشي'   },
];

const NOW = Date.now();
const isNewToday = (farm) => farm.newestListingAt && (NOW - new Date(farm.newestListingAt).getTime()) < 24 * 3600 * 1000;

// ─── BuyerBrowse ──────────────────────────────────────────────────────────────
const BuyerBrowse = () => {
  const [searchParams] = useSearchParams();
  const [farms,        setFarms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [favIds,       setFavIds]       = useState(new Set());
  const [govFilter,    setGovFilter]    = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [priceMin,     setPriceMin]     = useState('');
  const [priceMax,     setPriceMax]     = useState('');
  const [sortBy,       setSortBy]       = useState('newest');
  const [showFilters,  setShowFilters]  = useState(false);
  const [activeTab,       setActiveTab]       = useState(() => {
    if (searchParams.get('eid') === '1') return 'eid';
    if (searchParams.get('supplies') === '1') return 'supplies';
    return 'farms';
  });
  const [eidListings,     setEidListings]     = useState([]);
  const [eidLoading,      setEidLoading]      = useState(false);
  const [supplyList,      setSupplyList]      = useState([]);
  const [supplyLoading,   setSupplyLoading]   = useState(false);
  const [supplyCatFilter, setSupplyCatFilter] = useState('');
  const [supplySearch,    setSupplySearch]    = useState('');

  useEffect(() => {
    Promise.all([
      getSellers(),
      getFavorites().catch(() => ({ data: [] })),
    ]).then(([farmRes, favRes]) => {
      setFarms(farmRes.data);
      setFavIds(new Set(favRes.data.map(f => f._id)));
    }).catch(() => setError('فشل تحميل المزارع. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'eid' || eidListings.length > 0) return;
    setEidLoading(true);
    getEidListings()
      .then(r => setEidListings(r.data))
      .catch(() => {})
      .finally(() => setEidLoading(false));
  }, [activeTab, eidListings.length]);

  useEffect(() => {
    if (activeTab !== 'supplies' || supplyList.length > 0) return;
    setSupplyLoading(true);
    getSupplies()
      .then(r => setSupplyList(r.data))
      .catch(() => {})
      .finally(() => setSupplyLoading(false));
  }, [activeTab, supplyList.length]);

  const handleToggleFav = useCallback(async (sellerId, currentlyFav) => {
    try {
      if (currentlyFav) {
        await removeFavorite(sellerId);
        setFavIds(s => { const next = new Set(s); next.delete(sellerId); return next; });
      } else {
        await addFavorite(sellerId);
        setFavIds(s => new Set([...s, sellerId]));
      }
    } catch {}
  }, []);

  const activeFilterCount = [govFilter, typeFilter, priceMin, priceMax].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = [...farms];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.farmName?.toLowerCase().includes(q) ||
        f.governorate?.toLowerCase().includes(q)
      );
    }
    if (govFilter)  list = list.filter(f => f.governorate === govFilter);
    if (typeFilter) list = list.filter(f => f.listingTypes?.includes(typeFilter) || f.dairyTypes?.includes(typeFilter));
    if (priceMin)   list = list.filter(f => f.maxPricePerKg == null || f.maxPricePerKg >= Number(priceMin));
    if (priceMax)   list = list.filter(f => f.minPricePerKg == null || f.minPricePerKg <= Number(priceMax));

    if (sortBy === 'rating')   list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    else if (sortBy === 'listings') list.sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0));
    // 'newest' = default server order (no sort change)

    return list;
  }, [farms, search, govFilter, typeFilter, sortBy]);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: C.white, borderRadius: '20px' }}>
      <div style={{ fontSize: '44px', marginBottom: '12px' }}>⚠️</div>
      <p style={{ color: '#B91C1C', fontSize: '16px', margin: '0 0 16px' }}>{error}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
        إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div style={{ margin: '-24px', padding: '24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 3px' }}>استعرض المزارع 🌾</h1>
        <p style={{ color: C.muted, margin: 0, fontSize: '13px' }}>
          {loading ? 'جاري التحميل…' : `${farms.length} مزرعة موثّقة · اختر مزرعة لاستعراض ماشيتها ومنتجاتها`}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: C.white, borderRadius: '12px', padding: '4px', boxShadow: C.shadow, width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('farms')}
          style={{
            padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
            background: activeTab === 'farms' ? C.green : 'transparent',
            color: activeTab === 'farms' ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}>
          🌾 المزارع
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('eid')}
          style={{
            padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
            background: activeTab === 'eid' ? '#15803D' : 'transparent',
            color: activeTab === 'eid' ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}>
          🌙 عروض العيد
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('supplies')}
          style={{
            padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '700',
            background: activeTab === 'supplies' ? C.green : 'transparent',
            color: activeTab === 'supplies' ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}>
          🛒 المستلزمات
        </button>
      </div>

      {/* ── Eid tab content ── */}
      {activeTab === 'eid' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #14532D 0%, #166534 45%, #15803D 100%)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: -20, fontSize: 100, opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🌙</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '6px' }}>موسم عيد الأضحى 🌙</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              إعلانات مواشي العيد من مزارع موثّقة — يمكنك الطلب بسهولة مع خيار الذبح
            </div>
          </div>

          {eidLoading && (
            <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonFarmCard key={i} />)}
            </div>
          )}

          {!eidLoading && eidListings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: C.white, borderRadius: '20px', boxShadow: C.shadow }}>
              <div style={{ fontSize: '56px', marginBottom: '14px' }}>🌙</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>لا توجد عروض عيد حتى الآن</h3>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>تابعنا قريباً — ستُضاف عروض العيد قبل الموسم</p>
            </div>
          )}

          {!eidLoading && eidListings.length > 0 && (
            <>
              <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 12px' }}>
                <strong style={{ color: C.text }}>{eidListings.length}</strong> إعلان عيد متاح
              </p>
              <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {eidListings.map(l => <EidListingCard key={l._id} listing={l} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Supplies tab content ── */}
      {activeTab === 'supplies' && (
        <div>
          {/* Search + category filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="ابحث في المستلزمات…"
                value={supplySearch}
                onChange={e => setSupplySearch(e.target.value)}
                style={{ width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 12, background: C.white, fontSize: 14, color: C.text, boxShadow: C.shadow, outline: 'none', fontFamily: 'inherit' }}
              />
              {supplySearch && (
                <button type="button" onClick={() => setSupplySearch('')}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 20, lineHeight: 1 }}>×</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUPPLY_CATS.map(v => (
                <button key={v} type="button" onClick={() => setSupplyCatFilter(v)}
                  style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${supplyCatFilter === v ? C.green : C.border}`, background: supplyCatFilter === v ? C.green : C.white, color: supplyCatFilter === v ? '#fff' : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  {SUPPLY_CAT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {supplyLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonFarmCard key={i} />)}
            </div>
          )}

          {!supplyLoading && (() => {
            const q = supplySearch.trim().toLowerCase();
            const vis = supplyList.filter(s =>
              (!supplyCatFilter || s.category === supplyCatFilter) &&
              (!q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
            );
            if (vis.length === 0) return (
              <div style={{ textAlign: 'center', padding: '64px 24px', background: C.white, borderRadius: 20, boxShadow: C.shadow }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🛒</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>
                  {supplyList.length === 0 ? 'لا توجد مستلزمات متاحة حالياً' : 'لا نتائج مطابقة'}
                </h3>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>جرّب فئة أو كلمة بحث مختلفة</p>
              </div>
            );
            return (
              <>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>
                  <strong style={{ color: C.text }}>{vis.length}</strong> منتج متاح
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {vis.map(s => <SupplyCard key={s._id} supply={s} />)}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Farms tab content ── */}
      {activeTab === 'farms' && <>

      {/* Search + filter bar */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '480px' }}>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="ابحث باسم المزرعة أو المنطقة…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: '12px', background: C.white, fontSize: '14px', color: C.text, boxShadow: C.shadow, outline: 'none' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '20px', lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '11px 16px', borderRadius: '12px',
            border: `1.5px solid ${showFilters || activeFilterCount > 0 ? C.green : C.border}`,
            background: showFilters || activeFilterCount > 0 ? C.greenLt : C.white,
            color: showFilters || activeFilterCount > 0 ? C.green : C.muted,
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          🔧 فلاتر
          {activeFilterCount > 0 && (
            <span style={{ background: C.green, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{activeFilterCount}</span>
          )}
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '11px 14px', borderRadius: '12px', border: `1.5px solid ${C.border}`, background: C.white, fontSize: '13px', color: C.text, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
          {SORT_OPTIONS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Governorate */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>المحافظة</label>
            <select
              value={govFilter}
              onChange={e => setGovFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: `1.5px solid ${govFilter ? C.green : C.border}`, background: C.white, fontSize: '13px', color: C.text, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">كل المحافظات</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Animal type chips */}
          <div style={{ flex: 2, minWidth: 260 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>نوع الحيوان</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[['', 'الكل'], ...Object.entries(TYPE_AR)].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeFilter(val)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px',
                    border: `1.5px solid ${typeFilter === val ? C.green : C.border}`,
                    background: typeFilter === val ? C.green : C.white,
                    color: typeFilter === val ? '#fff' : C.muted,
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.12s',
                  }}>
                  {val ? `${TYPE_EMOJI[val] || '🐾'} ${label}` : label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>السعر (ج.م/كجم)</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min="0" step="1"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="من"
                style={{ flex: 1, padding: '9px 10px', borderRadius: '9px', border: `1.5px solid ${priceMin ? C.green : C.border}`, background: C.white, fontSize: '13px', color: C.text, outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
              />
              <span style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>—</span>
              <input
                type="number" min="0" step="1"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="إلى"
                style={{ flex: 1, padding: '9px 10px', borderRadius: '9px', border: `1.5px solid ${priceMax ? C.green : C.border}`, background: C.white, fontSize: '13px', color: C.text, outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
              />
            </div>
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => { setGovFilter(''); setTypeFilter(''); setPriceMin(''); setPriceMax(''); }}
              style={{ alignSelf: 'flex-end', padding: '9px 16px', borderRadius: '9px', border: `1px solid #FECACA`, background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonFarmCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: C.white, borderRadius: '20px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '56px', marginBottom: '14px' }}>🌾</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>
            {farms.length === 0 ? 'لا توجد مزارع بعد' : 'لا نتائج مطابقة'}
          </h3>
          <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>
            {farms.length === 0
              ? 'لا توجد مزارع موثّقة حتى الآن. تابعنا قريباً.'
              : 'جرّب كلمة بحث مختلفة.'}
          </p>
          {search && (
            <button onClick={() => setSearch('')}
              style={{ marginTop: '16px', padding: '10px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
              مسح البحث
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <>
          {search && (
            <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 12px' }}>
              عرض <strong style={{ color: C.text }}>{filtered.length}</strong> من <strong style={{ color: C.text }}>{farms.length}</strong> مزرعة
            </p>
          )}
          <div className="ff-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {filtered.map(f => <FarmCard key={f._id} farm={f} isFav={favIds.has(f._id)} onToggleFav={handleToggleFav} />)}
          </div>
        </>
      )}

      </>}
    </div>
  );
};

export default BuyerBrowse;
