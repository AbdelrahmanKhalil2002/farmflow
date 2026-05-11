import { useEffect, useId, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { useLang } from '../../context/LangContext';
import { getSummary, getIncome, getExpenses } from '../../services/financeService';
import { getMyListings } from '../../services/listingService';
import { getMyOrders } from '../../services/orderService';
import { getAnimals, getWeighingDue, getFollowUpsDue } from '../../services/animalService';
import { getSellerReviews, replyToReview } from '../../services/reviewService';
import { fmt } from '../../utils/format';
import { C as _C } from '../../tokens';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = { ..._C, hero: 'linear-gradient(135deg, #1C3A24 0%, #2D6235 55%, #3A7D44 100%)' };

const TYPE_META = {
  cattle:  { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', typeKey: 'herd.type.cattle'   },
  buffalo: { emoji: '🐃', color: '#1E40AF', bg: '#DBEAFE', typeKey: 'herd.type.buffalo'  },
  sheep:   { emoji: '🐑', color: '#0369A1', bg: '#E0F2FE', typeKey: 'herd.type.sheep'    },
  goat:    { emoji: '🐐', color: '#166534', bg: '#DCFCE7', typeKey: 'herd.type.goat'     },
  camel:   { emoji: '🐪', color: '#9A3412', bg: '#FFEDD5', typeKey: 'herd.type.camel'    },
  horse:   { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', typeKey: 'herd.type.horse'    },
  poultry: { emoji: '🐔', color: '#B45309', bg: '#FEF9C3', typeKey: 'herd.type.poultry'  },
  rabbit:  { emoji: '🐇', color: '#BE185D', bg: '#FCE7F3', typeKey: 'herd.type.rabbit'   },
  other:   { emoji: '🐾', color: '#374151', bg: '#F3F4F6', typeKey: 'herd.type.other'    },
};

const CAT = {
  feed:      { bg: '#FEF9C3', color: '#713F12', labelKey: 'expenses.cat.feed',        emoji: '🌾' },
  doctor:    { bg: '#DBEAFE', color: '#1E3A5F', labelKey: 'expenses.cat.doctor',      emoji: '🏥' },
  transport: { bg: '#F3E8FF', color: '#581C87', labelKey: 'expenses.cat.transport',   emoji: '🚛' },
  other:     { bg: '#F3F4F6', color: '#374151', labelKey: 'expenses.cat.other',       emoji: '📦' },
};

const PERIODS = [
  { key: 'month',   labelKey: 'dashboard.period.month'   },
  { key: 'quarter', labelKey: 'dashboard.period.quarter' },
  { key: 'year',    labelKey: 'dashboard.period.year'    },
  { key: 'all',     labelKey: 'common.all'               },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPeriodDates = (period) => {
  const now = new Date(), to = now.toISOString().slice(0, 10);
  if (period === 'month')   { return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to }; }
  if (period === 'quarter') { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().slice(0, 10), to }; }
  if (period === 'year')    { return { from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), to }; }
  return {};
};
const thirtyDaysAgo = () => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); };

const bucketByDay = (entries = []) => {
  const buckets = new Array(30).fill(0), now = new Date();
  entries.forEach(e => {
    const diff = Math.floor((now - new Date(e.date || e.createdAt)) / 86_400_000);
    const idx  = 29 - diff;
    if (idx >= 0 && idx < 30) buckets[idx] += e.amount || 0;
  });
  return buckets;
};

const fmtSAR  = (v) => `${fmt(v ?? 0)} ج.م`;
const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
const Skeleton = ({ h = 20, r = 8, w = '100%' }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
);

// ─── Dual-line chart (income vs expenses, last 30 days) ───────────────────────
const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(Math.round(v));

const LineChart = ({ incomeData, expenseData }) => {
  const id1 = useId().replace(/[^a-z0-9]/gi, '');
  const id2 = useId().replace(/[^a-z0-9]/gi, '');
  const W = 560, H = 130, PAD_L = 44, PAD_R = 12, PAD_T = 10, PAD_B = 22;
  const IW = W - PAD_L - PAD_R, IH = H - PAD_T - PAD_B;

  const max = Math.max(...incomeData, ...expenseData, 1);
  const mkPts = (data) => data.map((v, i) => {
    const x = PAD_L + (i / (data.length - 1)) * IW;
    const y = PAD_T + IH - (v / max) * IH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const incPts = mkPts(incomeData);
  const expPts = mkPts(expenseData);
  const lastX  = PAD_L + IW;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // x-axis labels: every 7 days
  const xLabels = [0, 6, 13, 20, 29].map(i => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return { x: PAD_L + (i / 29) * IW, label: `${d.getDate()}/${d.getMonth() + 1}` };
  });

  // End-point dot positions
  const incEndY = PAD_T + IH - (incomeData[29] / max) * IH;
  const expEndY = PAD_T + IH - (expenseData[29] / max) * IH;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'hidden' }}>
      <defs>
        <linearGradient id={`ig${id1}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.green}   stopOpacity="0.22" />
          <stop offset="100%" stopColor={C.green} stopOpacity="0"    />
        </linearGradient>
        <linearGradient id={`eg${id2}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.red}   stopOpacity="0.12" />
          <stop offset="100%" stopColor={C.red} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Y-axis labels + grid lines */}
      {yTicks.map(r => {
        const y = PAD_T + IH * (1 - r);
        const v = Math.round(max * r);
        return (
          <g key={r}>
            <line x1={PAD_L} x2={PAD_L + IW} y1={y} y2={y} stroke="#E8D5C0" strokeWidth="0.5" strokeDasharray="3 3" />
            {v > 0 && <text x={PAD_L - 4} y={y} fontSize="8" fill={C.muted} textAnchor="end" dominantBaseline="middle">{fmtK(v)}</text>}
          </g>
        );
      })}

      {/* Fill areas */}
      <polygon points={`${incPts} ${lastX},${PAD_T + IH} ${PAD_L},${PAD_T + IH}`} fill={`url(#ig${id1})`} />
      <polygon points={`${expPts} ${lastX},${PAD_T + IH} ${PAD_L},${PAD_T + IH}`} fill={`url(#eg${id2})`} />

      {/* Lines */}
      <polyline points={incPts} fill="none" stroke={C.green} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={expPts} fill="none" stroke={C.red}   strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* End dots with clamped callout labels */}
      {incomeData[29] > 0 && (
        <>
          <circle cx={lastX} cy={incEndY} r="3.5" fill={C.green} stroke="#fff" strokeWidth="1.5" />
          <text
            x={lastX - 6}
            y={Math.max(PAD_T + 9, Math.min(PAD_T + IH - 2, incEndY - 6))}
            fontSize="8.5" fill={C.greenText} fontWeight="700" textAnchor="end"
          >{fmtK(incomeData[29])}</text>
        </>
      )}
      {expenseData[29] > 0 && (
        <>
          <circle cx={lastX} cy={expEndY} r="3.5" fill={C.red} stroke="#fff" strokeWidth="1.5" />
          <text
            x={lastX - 24}
            y={expEndY - 4}
            fontSize="8.5" fill={C.redText} fontWeight="700" textAnchor="end"
          >{fmtK(expenseData[29])}</text>
        </>
      )}

      {/* X-axis labels */}
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 4} fontSize="8" fill={C.muted} textAnchor="middle">{label}</text>
      ))}
    </svg>
  );
};

// ─── Bar chart (livestock by type) ───────────────────────────────────────────
const BarChart = ({ data }) => {
  if (!data.length) return null;
  const W = 340, H = 140, PAD_T = 20, PAD_L = 10, PAD_B = 36, BAR_GAP = 8;
  const max  = Math.max(...data.map(d => d.value), 1);
  const bw   = Math.max(10, Math.floor((W - PAD_L * 2 - BAR_GAP * (data.length - 1)) / data.length));
  const totalW = data.length * bw + (data.length - 1) * BAR_GAP;
  const startX = (W - totalW) / 2;
  const innerH = H - PAD_B - PAD_T;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Baseline */}
      <line x1={0} x2={W} y1={H - PAD_B} y2={H - PAD_B} stroke={C.border} strokeWidth="1" />

      {data.map((d, i) => {
        const bh  = Math.max(2, (d.value / max) * innerH);
        const x   = startX + i * (bw + BAR_GAP);
        const y   = H - PAD_B - bh;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={bw} height={bh} rx="4" fill={d.color} opacity="0.85" />
            {/* Value above bar */}
            <text x={x + bw / 2} y={y - 4} fontSize="10" fill={d.color} fontWeight="800" textAnchor="middle">{d.value}</text>
            {/* Emoji + text label below baseline */}
            <text x={x + bw / 2} y={H - PAD_B + 13} fontSize="12" fill={C.muted} textAnchor="middle">{d.emoji}</text>
            <text x={x + bw / 2} y={H - PAD_B + 26} fontSize="8" fill={C.muted} textAnchor="middle">{d.ar}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, iconBg, label, value, sub, trend, extra, border, loading, children }) => (
  <div style={{ background: C.card, borderRadius: '18px', padding: '20px', boxShadow: C.shadow, border: `1.5px solid ${border || C.border}`, display: 'flex', flexDirection: 'column', gap: '0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>
          {label}
        </div>
        {loading
          ? <Skeleton h={38} r={8} w="130px" />
          : <div style={{ fontSize: '32px', fontWeight: '800', color: value.color || C.text, letterSpacing: '-1px', lineHeight: 1 }}>
              {value.text}
            </div>
        }
      </div>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
        {icon}
      </div>
    </div>

    {!loading && (sub || trend) && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: children ? '12px' : '0' }}>
        {trend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '700', color: trend.dir === 'up' ? C.greenText : trend.dir === 'down' ? C.redText : C.muted, background: trend.dir === 'up' ? C.greenBg : trend.dir === 'down' ? C.redBg : '#F3F4F6', padding: '3px 8px', borderRadius: '20px' }}>
            {trend.dir === 'up' ? '↗' : trend.dir === 'down' ? '↘' : '→'} {trend.text}
          </span>
        )}
        {sub && <span style={{ fontSize: '12px', color: C.muted }}>{sub}</span>}
      </div>
    )}

    {!loading && extra && (
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: children ? '12px' : '0' }}>
        {extra}
      </div>
    )}

    {!loading && children}
  </div>
);

// ─── Activity item ────────────────────────────────────────────────────────────
const ActivityItem = ({ icon, iconBg, title, sub, amount, amtColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 10px', borderRadius: '10px', cursor: 'default', transition: 'background 0.12s' }}
    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{sub}</div>
    </div>
    {amount && <div style={{ fontSize: '13px', fontWeight: '800', color: amtColor || C.text, flexShrink: 0, whiteSpace: 'nowrap' }}>{amount}</div>}
  </div>
);

// ─── Quick action button ──────────────────────────────────────────────────────
const QuickBtn = ({ to, emoji, label, primary }) => (
  <Link to={to} style={{ textDecoration: 'none', flex: 1 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px',
      background: primary ? C.green : C.card,
      color: primary ? '#fff' : C.text,
      border: `1.5px solid ${primary ? C.green : C.border}`,
      borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: C.shadow, fontFamily: 'inherit',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(58,125,68,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = 'none'; }}>
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <span style={{ fontSize: '14px', fontWeight: '700' }}>{label}</span>
    </div>
  </Link>
);

// ─── Main component ────────────────────────────────────────────────────────────
// Farm-type display config
const FARM_META = {
  poultry:   { listingsEmoji: '🐔', herdEmoji: '🐔', herdLabel: 'dashboard.kpi.poultry'   },
  horses:    { listingsEmoji: '🐎', herdEmoji: '🐎', herdLabel: 'dashboard.kpi.horses'    },
  dairy:     { listingsEmoji: '🐄', herdEmoji: '🥛', herdLabel: 'dashboard.kpi.herdDairy' },
  livestock: { listingsEmoji: '🐄', herdEmoji: '🐄', herdLabel: 'dashboard.kpi.herd'      },
  exotic:    { listingsEmoji: '🦌', herdEmoji: '🦌', herdLabel: 'dashboard.kpi.herd'      },
  mixed:     { listingsEmoji: '🐄', herdEmoji: '🐄', herdLabel: 'dashboard.kpi.herd'      },
};

const SellerDashboard = () => {
  const { user } = useAuth();
  const { activeFarm } = useFarm();
  const { t } = useLang();

  const farmMeta = FARM_META[activeFarm?.type] || FARM_META.livestock;

  const [period,   setPeriod]   = useState('month');
  const [summary,  setSummary]  = useState(null);
  const [listings, setListings] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [income30, setIncome30] = useState([]);
  const [exp30,    setExp30]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [dueVaccinations, setDueVaccinations] = useState([]);
  const [dueWeighings,    setDueWeighings]    = useState([]);
  const [dueFollowUps,    setDueFollowUps]    = useState([]);
  const [myReviews,       setMyReviews]       = useState([]);
  const [replyDrafts,     setReplyDrafts]     = useState({});
  const [replySaving,     setReplySaving]     = useState({});

  useEffect(() => {
    const farmParams = activeFarm?._id ? { farmId: activeFarm._id } : {};
    getAnimals(farmParams).then(r => {
      const soon = [];
      r.data.forEach(a => {
        (a.vaccinationLog || []).forEach(v => {
          if (!v.nextDueDate) return;
          const days = Math.ceil((new Date(v.nextDueDate) - Date.now()) / (24 * 3600 * 1000));
          if (days <= 14) soon.push({ animalId: a._id, animalType: a.type, breed: a.breed, tagId: a.tagId, vaccine: v.vaccine, nextDueDate: v.nextDueDate, days });
        });
      });
      soon.sort((a, b) => a.days - b.days);
      setDueVaccinations(soon);
    }).catch(() => {});

    getWeighingDue().then(r => setDueWeighings(r.data)).catch(() => {});
    getFollowUpsDue().then(r => setDueFollowUps(r.data)).catch(() => {});
  }, [activeFarm?._id]);

  useEffect(() => {
    if (!user?._id) return;
    getSellerReviews(user._id).then(r => setMyReviews(r.data)).catch(() => {});
  }, [user?._id]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setLoading(true); setError('');
    const { from, to } = getPeriodDates(period);
    const from30 = thirtyDaysAgo();
    const farmId = activeFarm?._id;
    const fp = farmId ? { farmId } : {};
    Promise.all([
      getSummary({ from, to, ...fp }),
      getMyListings(farmId),
      getMyOrders(),
      getIncome({ from: from30, ...fp }),
      getExpenses({ from: from30, ...fp }),
    ])
      .then(([sumRes, listRes, ordRes, incRes, expRes]) => {
        setSummary(sumRes.data);
        setListings(listRes.data);
        setOrders(ordRes.data);
        setIncome30(incRes.data);
        setExp30(expRes.data);
      })
      .catch(() => setError(t('dashboard.loadErr')))
      .finally(() => setLoading(false));
  }, [period, activeFarm?._id]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const incSpark = useMemo(() => bucketByDay(income30), [income30]);
  const expSpark = useMemo(() => bucketByDay(exp30),    [exp30]);

  const now            = new Date();
  const soMonth        = new Date(now.getFullYear(), now.getMonth(), 1);
  const soLastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const newThisMonth   = listings.filter(l => new Date(l.createdAt) >= soMonth).length;
  const newLastMonth   = listings.filter(l => { const d = new Date(l.createdAt); return d >= soLastMonth && d < soMonth; }).length;
  const listingTrend   = newThisMonth - newLastMonth;

  const byStatus = listings.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
  const byType   = listings.reduce((a, l) => { const k = l.type || 'other'; a[k] = (a[k] || 0) + 1; return a; }, {});

  const barData = Object.entries(byType).map(([type, value]) => {
    const m = TYPE_META[type] || TYPE_META.other;
    return { label: type, value, color: m.color, emoji: m.emoji, ar: t(m.typeKey) };
  });

  const profit       = summary?.netProfit     ?? 0;
  const income       = summary?.totalIncome   ?? 0;
  const expenses     = summary?.totalExpenses ?? 0;
  const margin       = income > 0 ? ((profit / income) * 100).toFixed(1) : null;
  const profitColor  = profit > 0 ? C.greenText : profit < 0 ? C.redText : C.muted;
  const profitBorder = profit > 0 ? '#BBF7D0'   : profit < 0 ? '#FECACA' : C.border;

  // Activity feed: orders + income + expenses, sorted desc
  const activity = useMemo(() => {
    const items = [
      ...orders.slice(0, 10).map(o => {
        const isNew = o.status === 'pending', isDone = o.status === 'completed', isCancelled = o.status === 'cancelled';
        return {
          ts: o.createdAt,
          type: 'order',
          icon:   isDone ? '✅' : isCancelled ? '❌' : '🛒',
          iconBg: isDone ? C.greenBg : isCancelled ? C.redBg : C.amberBg,
          title:  `${t('dashboard.activity.newOrder')} — ${o.listing?.breed || o.listing?.type || t('dashboard.activity.livestock')}`,
          sub:    `${isNew ? `⏳ ${t('dashboard.activity.waiting')}` : isDone ? `✅ ${t('dashboard.activity.completed')}` : isCancelled ? `❌ ${t('dashboard.activity.cancelled')}` : `🔄 ${t('dashboard.activity.confirmed')}`} · ${fmtDate(o.createdAt)}`,
          amount: o.totalAmount ? `+${fmtSAR(o.totalAmount)}` : null,
          amtColor: C.greenText,
        };
      }),
      ...income30.map(e => ({
        ts: e.date || e.createdAt,
        type: 'income',
        icon: '💰', iconBg: C.greenBg,
        title: e.note || (e.type === 'sale' ? t('dashboard.activity.saleIncome') : t('dashboard.activity.deposit')),
        sub:   fmtDate(e.date || e.createdAt),
        amount: `+${fmtSAR(e.amount)}`, amtColor: C.greenText,
      })),
      ...exp30.map(e => ({
        ts: e.date || e.createdAt,
        type: 'expense',
        icon: '📉', iconBg: C.redBg,
        title: e.note || `${t(CAT[e.category]?.labelKey || 'expenses.cat.other')} — ${t('dashboard.activity.expense')}`,
        sub:   fmtDate(e.date || e.createdAt),
        amount: `-${fmtSAR(e.amount)}`, amtColor: C.redText,
      })),
    ]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 10);
    return items;
  }, [orders, income30, exp30]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? t('dashboard.greetMorning') : h < 17 ? t('dashboard.greetEvening') : t('dashboard.greetNight');
  })();

  const periodLabel = t(PERIODS.find(p => p.key === period)?.labelKey ?? '');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ════ Hero ════ */}
      <div style={{ background: C.hero, padding: '32px 32px 36px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', right: -20, top: -20, fontSize: '180px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>{farmMeta.herdEmoji}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px' }}>{greeting} 👋</p>
            <h1 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
              {user?.name ?? 'المزارع'}
            </h1>
            {activeFarm && (
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                {farmMeta.herdEmoji} {activeFarm.name}
              </p>
            )}
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
              {loading ? t('dashboard.loading') : `${listings.length} ${t('dashboard.listingCount')} · ${orders.filter(o => o.status === 'pending').length} ${t('dashboard.pendingCount')}`}
            </p>
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {PERIODS.map(p => (
              <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
                style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  background: period === p.key ? '#fff' : 'rgba(255,255,255,0.12)',
                  color:      period === p.key ? C.greenDk : 'rgba(255,255,255,0.8)',
                  transition: 'all 0.15s' }}>
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 28px 56px', maxWidth: '1140px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Error */}
        {error && (
          <div role="alert" style={{ background: C.redBg, border: `1px solid #FECACA`, borderRadius: '10px', padding: '11px 16px', color: C.redText, fontSize: '14px', marginBottom: '22px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ════ Quick actions ════ */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <QuickBtn to="/seller/add-listing" emoji="➕" label={t('dashboard.qa.addListing')} primary />
          <QuickBtn to="/seller/finance"     emoji="💰" label={t('nav.finance')} />
          <QuickBtn to="/seller/listings"    emoji={farmMeta.listingsEmoji} label={t('nav.listings')} />
        </div>

        {/* ════ KPI Cards ════ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>

          {/* 1 — Total Livestock / Herd */}
          <KpiCard
            icon={farmMeta.herdEmoji} iconBg={C.amberBg}
            label={t(farmMeta.herdLabel) || t('dashboard.kpi.herd')}
            value={{ text: listings.length, color: C.text }}
            trend={newThisMonth > 0 ? {
              dir:  listingTrend >= 0 ? 'up' : 'down',
              text: `${newThisMonth}+ ${t('dashboard.kpi.thisMonth')}`,
            } : null}
            extra={Object.entries(byStatus).map(([st, n]) => (
              <span key={st} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: st === 'approved' ? C.greenBg : st === 'pending' ? C.amberBg : '#F3F4F6', color: st === 'approved' ? C.greenText : st === 'pending' ? C.amberText : '#374151' }}>
                {n} {st === 'approved' ? t('listings.status.active') : st === 'pending' ? t('listings.status.pending') : st}
              </span>
            ))}
            loading={loading}
          />

          {/* 2 — Income */}
          <KpiCard
            icon="💰" iconBg={C.greenBg}
            label={`${t('dashboard.kpi.income')} · ${periodLabel}`}
            value={{ text: fmtSAR(income), color: C.greenText }}
            trend={summary?.incomeByType ? null : null}
            sub={summary?.incomeByType ? Object.entries(summary.incomeByType).map(([k, v]) => `${k}: ${fmtSAR(v)}`).join(' · ') : null}
            loading={loading}
          />

          {/* 3 — Expenses */}
          <KpiCard
            icon="📉" iconBg={C.redBg}
            label={`${t('dashboard.kpi.expenses')} · ${periodLabel}`}
            value={{ text: fmtSAR(expenses), color: C.redText }}
            extra={summary?.expenseByCategory
              ? Object.entries(summary.expenseByCategory).filter(([, v]) => v > 0).map(([cat, amt]) => {
                  const m = CAT[cat] || { bg: '#F3F4F6', color: '#374151', label: cat };
                  return <span key={cat} style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: m.bg, color: m.color }}>{t(m.labelKey || 'expenses.cat.other')} {fmtSAR(amt)}</span>;
                })
              : null}
            loading={loading}
          />

          {/* 4 — Net Profit */}
          <KpiCard
            icon={profit > 0 ? '📈' : profit < 0 ? '⚠️' : '➖'}
            iconBg={profit > 0 ? C.greenBg : profit < 0 ? C.redBg : '#F3F4F6'}
            label={t('dashboard.kpi.profit')}
            value={{ text: fmtSAR(profit), color: profitColor }}
            border={profitBorder}
            loading={loading}
          >
            {!loading && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: profit > 0 ? C.greenBg : profit < 0 ? C.redBg : '#F3F4F6' }}>
                <p style={{ margin: 0, fontSize: '12px', color: profitColor, fontWeight: '600', lineHeight: 1.5 }}>
                  {profit > 0 && margin
                    ? t('dashboard.profitMarginMsg').replace('{margin}', margin)
                    : profit < 0
                    ? t('dashboard.expensesExceedMsg')
                    : t('dashboard.breakEvenMsg')}
                </p>
              </div>
            )}
          </KpiCard>
        </div>

        {/* ════ Charts ════ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '14px', marginBottom: '22px' }}>

          {/* Line chart */}
          <div style={{ background: C.card, borderRadius: '18px', padding: '20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{t('dashboard.trend30days')}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{t('dashboard.incomeVsExpenses')}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: C.greenText }}>
                  <span style={{ width: '20px', height: '2px', background: C.green, borderRadius: '2px', display: 'inline-block' }} /> {t('dashboard.kpi.income')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: C.redText }}>
                  <span style={{ width: '20px', height: '2px', background: C.red, borderRadius: '2px', display: 'inline-block' }} /> {t('dashboard.kpi.expenses')}
                </span>
              </div>
            </div>
            {loading
              ? <Skeleton h={120} r={8} />
              : <LineChart incomeData={incSpark} expenseData={expSpark} />
            }
          </div>

          {/* Bar chart */}
          <div style={{ background: C.card, borderRadius: '18px', padding: '20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{t('dashboard.livestockByCategory')}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{t('dashboard.listingDistribution')}</div>
            </div>
            {loading
              ? <Skeleton h={110} r={8} />
              : barData.length > 0
                ? <BarChart data={barData} />
                : <div style={{ textAlign: 'center', padding: '28px', color: C.muted, fontSize: '13px' }}>{t('dashboard.noListingsYet')}</div>
            }
          </div>
        </div>

        {/* ════ Activity + right panel ════ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: '14px', alignItems: 'flex-start' }}>

          {/* Activity feed */}
          <div style={{ background: C.card, borderRadius: '18px', padding: '20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{t('dashboard.recentActivities')}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{t('dashboard.activitySubtitle')}</div>
              </div>
              <Link to="/seller/orders" style={{ fontSize: '12px', color: C.green, fontWeight: '700', textDecoration: 'none', padding: '5px 12px', background: C.greenBg, borderRadius: '20px', border: `1px solid ${C.green}30` }}>
                {t('dashboard.allOrders')} ›
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[0,1,2,3,4].map(i => <Skeleton key={i} h={52} r={10} />)}
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{ fontSize: '44px', marginBottom: '10px' }}>🌱</div>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: C.muted }}>{t('dashboard.noActivities')}</p>
                <Link to="/seller/add-listing" style={{ display: 'inline-block', padding: '9px 18px', background: C.green, color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                  ➕ {t('dashboard.addFirstListing')}
                </Link>
              </div>
            ) : (
              <>
                {/* Section labels */}
                {['order', 'income', 'expense'].map(type => {
                  const items = activity.filter(a => a.type === type);
                  if (!items.length) return null;
                  const sectionLabel = type === 'order' ? `🛒 ${t('dashboard.section.orders')}` : type === 'income' ? `💰 ${t('dashboard.section.income')}` : `📉 ${t('dashboard.section.expenses')}`;
                  return (
                    <div key={type} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 10px 2px' }}>
                        {sectionLabel}
                      </div>
                      {items.map((item, i) => (
                        <ActivityItem key={i} {...item} />
                      ))}
                    </div>
                  );
                })}
                <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <Link to="/seller/income" style={{ fontSize: '12px', color: C.green, fontWeight: '700', textDecoration: 'none' }}>
                    {t('dashboard.viewDetailedAnalytics')} ›
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Right panel: pending orders + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Pending orders alert */}
            {!loading && orders.filter(o => o.status === 'pending').length > 0 && (
              <div style={{ background: C.amberBg, border: `1.5px solid #FDE68A`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '22px' }}>⏳</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: C.amberText }}>{t('dashboard.pendingOrders')}</div>
                    <div style={{ fontSize: '11px', color: C.amberText, opacity: 0.8 }}>{t('dashboard.needsApproval')}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '24px', fontWeight: '800', color: C.amberText }}>
                    {orders.filter(o => o.status === 'pending').length}
                  </div>
                </div>
                <Link to="/seller/orders" style={{ display: 'block', padding: '9px', background: C.amber, color: '#fff', textDecoration: 'none', borderRadius: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700' }}>
                  {t('dashboard.reviewOrders')}
                </Link>
              </div>
            )}

            {/* Mini stats */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                {t('dashboard.quickSummary')}
              </div>
              {[
                { labelKey: 'dashboard.stats.totalOrders',   val: orders.length,                                    color: C.text     },
                { labelKey: 'dashboard.stats.completed',     val: orders.filter(o => o.status === 'completed').length, color: C.greenText },
                { labelKey: 'dashboard.stats.activeListings',val: byStatus['approved'] || 0,                        color: C.blue     },
                { labelKey: 'dashboard.stats.pendingListings',val: byStatus['pending']  || 0,                       color: C.amberText },
              ].map(({ labelKey, val, color }) => (
                <div key={labelKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '12px', color: C.muted }}>{t(labelKey)}</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
                <span style={{ fontSize: '12px', color: C.muted }}>{t('dashboard.stats.totalRevenue')}</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: C.greenText }}>{fmtSAR(income)}</span>
              </div>
            </div>

            {/* Livestock by type mini card */}
            {!loading && barData.length > 0 && (
              <div style={{ background: C.card, borderRadius: '14px', padding: '16px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  {t('dashboard.livestockByType')}
                </div>
                {barData.map(({ label, value, emoji, ar, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '15px' }}>{emoji}</span>
                    <span style={{ flex: 1, fontSize: '12px', color: C.text }}>{ar}</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming vaccination reminders ── */}
      {dueVaccinations.length > 0 && (
        <div style={{ marginTop: '24px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#92400E' }}>
              💉 {t('dashboard.upcomingVaccinations')} ({dueVaccinations.length})
            </div>
            <Link to="/seller/herd" style={{ fontSize: '12px', color: '#D97706', fontWeight: '700', textDecoration: 'none' }}>
              {t('dashboard.viewAllHerd')} ←
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dueVaccinations.slice(0, 5).map((v, i) => {
              const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🪘', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#fff', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                  <span style={{ fontSize: 18 }}>{TYPE_EMOJI[v.animalType] || '🐾'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400E' }}>
                      {v.vaccine}
                    </div>
                    <div style={{ fontSize: '11px', color: '#D97706' }}>
                      {t(`herd.type.${v.animalType}`) || v.animalType}{v.breed ? ` — ${v.breed}` : ''}{v.tagId ? ` · ${v.tagId}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: v.days <= 0 ? C.red : v.days <= 3 ? '#D97706' : '#92400E' }}>
                      {v.days <= 0 ? t('dashboard.reminder.overdue') : `${v.days} ${t('dashboard.reminder.days')}`}
                    </div>
                    <div style={{ fontSize: '10px', color: '#D97706' }}>
                      {new Date(v.nextDueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Medical follow-up reminders ── */}
      {dueFollowUps.length > 0 && (
        <div style={{ marginTop: '16px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#9F1239' }}>
              🏥 {t('dashboard.upcomingFollowUps')} ({dueFollowUps.length})
            </div>
            <Link to="/seller/herd" style={{ fontSize: '12px', color: '#E11D48', fontWeight: '700', textDecoration: 'none' }}>
              {t('dashboard.viewHerd')} ←
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dueFollowUps.slice(0, 4).map((rec, i) => {
              const TE = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🪘', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
              const days = rec.followUpDate
                ? Math.ceil((new Date(rec.followUpDate) - Date.now()) / (24 * 3600 * 1000))
                : null;
              const a = rec.animal || {};
              return (
                <div key={rec._id ?? i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#fff', borderRadius: '10px', border: '1px solid #FECDD3' }}>
                  <span style={{ fontSize: 18 }}>{TE[a.type] || '🐾'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#9F1239' }}>
                      {rec.diagnosis || t('dashboard.medicalFollowUp')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#E11D48' }}>
                      {a.type ? t(`herd.type.${a.type}`) : ''}{a.breed ? ` — ${a.breed}` : ''}{a.tagId ? ` · ${a.tagId}` : ''}
                    </div>
                  </div>
                  {days !== null && (
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: days <= 0 ? C.red : days <= 3 ? C.amber : '#E11D48' }}>
                        {days <= 0 ? t('dashboard.reminder.overdue') : `${days} ${t('dashboard.reminder.days')}`}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9F1239' }}>
                        {new Date(rec.followUpDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weighing reminders ── */}
      {dueWeighings.length > 0 && (
        <div style={{ marginTop: '16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#1E3A5F' }}>
              ⚖️ {t('dashboard.upcomingWeighings')} ({dueWeighings.length})
            </div>
            <Link to="/seller/herd" style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700', textDecoration: 'none' }}>
              {t('dashboard.viewHerd')} ←
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dueWeighings.slice(0, 4).map((a, i) => {
              const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🪘', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
              const days = a.nextWeighingDate
                ? Math.ceil((new Date(a.nextWeighingDate) - Date.now()) / (24 * 3600 * 1000))
                : null;
              const pct = a.targetWeight && a.currentWeight ? Math.min(100, Math.round((a.currentWeight / a.targetWeight) * 100)) : null;
              return (
                <div key={a._id ?? i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#fff', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <span style={{ fontSize: 18 }}>{TYPE_EMOJI[a.type] || '🐾'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A5F' }}>
                      {t(`herd.type.${a.type}`) || a.type}{a.breed ? ` — ${a.breed}` : ''}{a.tagId ? ` · ${a.tagId}` : ''}
                    </div>
                    {pct !== null && (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: '#DBEAFE', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#2563EB', borderRadius: 2, width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap' }}>{a.currentWeight} / {a.targetWeight} {t('common.kg')}</span>
                      </div>
                    )}
                  </div>
                  {days !== null && (
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: days <= 0 ? C.red : days <= 2 ? C.amber : '#2563EB' }}>
                        {days <= 0 ? t('dashboard.reminder.overdue') : `${days} ${t('dashboard.reminder.days')}`}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>
                        {new Date(a.nextWeighingDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ Reviews ════ */}
      {myReviews.length > 0 && (
        <div style={{ marginTop: '28px', background: C.card, borderRadius: '18px', padding: '22px', boxShadow: C.shadow, border: `1.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: C.text }}>⭐ تقييمات المزرعة</h2>
            <span style={{ fontSize: '12px', color: C.muted }}>{myReviews.length} تقييم</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {myReviews.map(r => (
              <div key={r._id} style={{ background: C.bg, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}` }}>
                {/* Reviewer + stars */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(58,125,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: C.greenText }}>
                      {(r.buyer?.name?.[0] || '?').toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{r.buyer?.name || 'مشتري'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#F59E0B', fontSize: '13px', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span style={{ fontSize: '11px', color: C.muted }}>{new Date(r.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                {r.comment && <p style={{ margin: '0 0 10px', fontSize: '13px', color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>}

                {/* Existing reply */}
                {r.reply?.body && (
                  <div style={{ background: 'rgba(58,125,68,0.06)', borderRadius: '8px', padding: '9px 12px', marginBottom: '8px', borderRight: '3px solid rgba(58,125,68,0.3)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: C.greenText }}>ردّك: </span>
                    <span style={{ fontSize: '13px', color: C.text }}>{r.reply.body}</span>
                  </div>
                )}

                {/* Reply input */}
                {!r.reply?.body && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="رد على التقييم..."
                      maxLength={500}
                      value={replyDrafts[r._id] ?? ''}
                      onChange={e => setReplyDrafts(d => ({ ...d, [r._id]: e.target.value }))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '13px', color: C.text, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button
                      type="button"
                      disabled={!replyDrafts[r._id]?.trim() || replySaving[r._id]}
                      onClick={() => {
                        const body = replyDrafts[r._id]?.trim();
                        if (!body) return;
                        setReplySaving(s => ({ ...s, [r._id]: true }));
                        replyToReview(r._id, body)
                          .then(res => {
                            setMyReviews(prev => prev.map(x => x._id === r._id ? res.data : x));
                            setReplyDrafts(d => { const nd = { ...d }; delete nd[r._id]; return nd; });
                          })
                          .catch(() => {})
                          .finally(() => setReplySaving(s => { const ns = { ...s }; delete ns[r._id]; return ns; }));
                      }}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: C.green, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: !replyDrafts[r._id]?.trim() || replySaving[r._id] ? 0.5 : 1 }}
                    >
                      {replySaving[r._id] ? '...' : 'رد'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
