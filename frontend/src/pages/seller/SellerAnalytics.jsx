import { useEffect, useId, useState, useMemo } from 'react';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';
import { getAnalytics } from '../../services/financeService';
import { fmt } from '../../utils/format';
import { C as _C } from '../../tokens';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = { ..._C, hero: 'linear-gradient(135deg, #1C3A24 0%, #2D6235 55%, #3A7D44 100%)' };

const CAT_META = {
  feed:        { emoji: '🌾', color: '#D97706', labelKey: 'expenses.cat.feed'        },
  doctor:      { emoji: '🏥', color: '#2563EB', labelKey: 'expenses.cat.doctor'      },
  transport:   { emoji: '🚛', color: '#7C3AED', labelKey: 'expenses.cat.transport'   },
  electricity: { emoji: '⚡', color: '#CA8A04', labelKey: 'expenses.cat.electricity' },
  salary:      { emoji: '👷', color: '#0369A1', labelKey: 'expenses.cat.salary'      },
  rent:        { emoji: '🏠', color: '#DC2626', labelKey: 'expenses.cat.rent'        },
  water:       { emoji: '💧', color: '#0284C7', labelKey: 'expenses.cat.water'       },
  maintenance: { emoji: '🔧', color: '#374151', labelKey: 'expenses.cat.maintenance' },
  other:       { emoji: '📦', color: '#64748B', labelKey: 'expenses.cat.other'       },
};

const TYPE_META = {
  cattle:  { emoji: '🐄', color: '#92400E', labelKey: 'herd.type.cattle'   },
  buffalo: { emoji: '🐃', color: '#1E40AF', labelKey: 'herd.type.buffalo'  },
  sheep:   { emoji: '🐑', color: '#0369A1', labelKey: 'herd.type.sheep'    },
  goat:    { emoji: '🐐', color: '#166534', labelKey: 'herd.type.goat'     },
  camel:   { emoji: '🐪', color: '#9A3412', labelKey: 'herd.type.camel'    },
  horse:   { emoji: '🐎', color: '#5B21B6', labelKey: 'herd.type.horse'    },
  poultry: { emoji: '🐔', color: '#B45309', labelKey: 'herd.type.poultry'  },
  rabbit:  { emoji: '🐇', color: '#BE185D', labelKey: 'herd.type.rabbit'   },
  other:   { emoji: '🐾', color: '#374151', labelKey: 'herd.type.other'    },
};

const ORDER_META = {
  pending:   { ar: 'قيد الانتظار', en: 'Pending',   color: '#D97706' },
  confirmed: { ar: 'مؤكد',         en: 'Confirmed', color: '#2563EB' },
  completed: { ar: 'مكتمل',        color: '#3A7D44' },
  cancelled: { ar: 'ملغي',         en: 'Cancelled', color: '#DC2626' },
};

const PERIODS = [
  { key: 3,  ar: 'آخر 3 أشهر',  en: 'Last 3 months'  },
  { key: 6,  ar: 'آخر 6 أشهر',  en: 'Last 6 months'  },
  { key: 12, ar: 'آخر 12 شهر', en: 'Last 12 months' },
];

const MONTH_AR = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtEGP = v => `${fmt(v ?? 0)} ج.م`;

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
const Sk = ({ h = 20, r = 8, w = '100%' }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#EDE0D4,#F5EDE5,#EDE0D4)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
);

// ─── Grouped bar chart (monthly income vs expenses) ───────────────────────────
const MonthlyBars = ({ data, lang }) => {
  const W = 620, H = 170, PL = 6, PR = 6, PT = 20, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;
  const N = data.length;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1);
  const GRP_GAP = Math.max(4, Math.floor(IW / N * 0.25));
  const bw = Math.max(3, Math.floor((IW - GRP_GAP * (N - 1)) / (N * 2 + N * 0.2)));
  const BAR_GAP = Math.max(1, Math.floor(bw * 0.15));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <line key={r} x1={PL} x2={PL + IW} y1={PT + IH * (1 - r)} y2={PT + IH * (1 - r)}
          stroke="#E8D5C0" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}
      <text x={PL} y={PT - 5} fontSize="8" fill={C.muted}>{fmtEGP(maxVal)}</text>

      {data.map((d, i) => {
        const grpW = bw * 2 + BAR_GAP;
        const totalW = N * grpW + (N - 1) * GRP_GAP;
        const startX = PL + (IW - totalW) / 2;
        const gx = startX + i * (grpW + GRP_GAP);
        const incH = Math.max(2, (d.income   / maxVal) * IH);
        const expH = Math.max(2, (d.expenses / maxVal) * IH);
        const [, mo] = d.month.split('-').map(Number);
        const label  = lang === 'ar' ? MONTH_AR[mo - 1] : MONTH_EN[mo - 1];
        const midX   = gx + bw + BAR_GAP / 2;

        return (
          <g key={d.month}>
            <rect x={gx}          y={PT + IH - incH} width={bw} height={incH} rx="3" fill={C.green} opacity="0.85" />
            <rect x={gx + bw + BAR_GAP} y={PT + IH - expH} width={bw} height={expH} rx="3" fill={C.red}   opacity="0.75" />
            {d.income > 0 && (
              <text x={gx + bw / 2} y={PT + IH - incH - 3} fontSize="6.5" fill={C.greenText} textAnchor="middle" fontWeight="700">
                {d.income >= 1000 ? `${Math.round(d.income / 1000)}k` : Math.round(d.income)}
              </text>
            )}
            <text x={midX} y={H - 16} fontSize="8"   fill={C.muted} textAnchor="middle">{label}</text>
            <text x={midX} y={H - 7}  fontSize="7.5" fill={C.muted} textAnchor="middle">{d.month.slice(0, 4)}</text>
          </g>
        );
      })}

      <line x1={PL} x2={PL + IW} y1={PT + IH} y2={PT + IH} stroke={C.border} strokeWidth="1" />
    </svg>
  );
};

// ─── Profit trend line ────────────────────────────────────────────────────────
const ProfitLine = ({ data }) => {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const W = 620, H = 72, PL = 8, PR = 8, PT = 8, PB = 4;
  const IW = W - PL - PR, IH = H - PT - PB;
  const profits = data.map(d => d.profit);
  const minP = Math.min(...profits, 0);
  const maxP = Math.max(...profits, 1);
  const span = maxP - minP || 1;
  const toY = v => PT + IH - ((v - minP) / span) * IH;
  const pts  = data.map((d, i) => ({ x: PL + (i / (data.length - 1 || 1)) * IW, y: toY(d.profit), profit: d.profit }));
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const zeroY    = toY(0);
  const fill     = `${linePath} L${pts.at(-1).x.toFixed(1)},${zeroY} L${pts[0].x.toFixed(1)},${zeroY}Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`pg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.green} stopOpacity="0.2" />
          <stop offset="100%" stopColor={C.green} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <line x1={PL} x2={PL + IW} y1={zeroY} y2={zeroY} stroke={C.border} strokeWidth="1" />
      <path d={fill}     fill={`url(#pg${id})`} />
      <path d={linePath} fill="none" stroke={C.green} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5"
          fill={p.profit >= 0 ? C.green : C.red}
          stroke="#fff" strokeWidth="1.5" />
      ))}
    </svg>
  );
};

// ─── Horizontal bar row ───────────────────────────────────────────────────────
const HBar = ({ emoji, label, value, total, color }) => {
  const pct = total > 0 ? Math.max(2, (value / total) * 100) : 2;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: C.text }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '800', color }}>{fmtEGP(value)}</span>
      </div>
      <div style={{ marginRight: '28px', height: '6px', background: '#F0EBE4', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
};

// ─── Donut ring (SVG) ─────────────────────────────────────────────────────────
const Donut = ({ segments, total }) => {
  const R = 46, CX = 60, CY = 60, SW = 16, CIRC = 2 * Math.PI * R;
  let cumulPct = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F0EBE4" strokeWidth={SW} />
      {segments.map((seg, i) => {
        const pct  = seg.value / (total || 1);
        const dash = pct * CIRC;
        const gap  = CIRC - dash;
        const arc  = (
          <circle key={i} cx={CX} cy={CY} r={R}
            fill="none" stroke={seg.color} strokeWidth={SW}
            strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
            strokeDashoffset={(-cumulPct * CIRC).toFixed(2)}
            transform={`rotate(-90 ${CX} ${CY})`}
            opacity="0.88"
          />
        );
        cumulPct += pct;
        return arc;
      })}
      <text x={CX} y={CY - 7}  textAnchor="middle" fontSize="18" fontWeight="800" fill={C.text}>{total}</text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="9"  fill={C.muted}>طلب</text>
    </svg>
  );
};

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, iconBg, label, value, valueColor, sub, loading }) => (
  <div style={{ background: C.card, borderRadius: '16px', padding: '18px 20px', boxShadow: C.shadow, border: `1.5px solid ${C.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{label}</div>
        {loading
          ? <Sk h={34} r={8} w="120px" />
          : <div style={{ fontSize: '26px', fontWeight: '800', color: valueColor || C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
        }
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{icon}</div>
    </div>
    {!loading && sub && <div style={{ fontSize: '11px', color: C.muted }}>{sub}</div>}
  </div>
);

// ─── Section card wrapper ─────────────────────────────────────────────────────
const Card = ({ title, subtitle, children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: '18px', padding: '22px', boxShadow: C.shadow, border: `1px solid ${C.border}`, ...style }}>
    {title && (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
const SellerAnalytics = ({ embedded = false }) => {
  const { t, lang }    = useLang();
  const { activeFarm } = useFarm();
  const [months,   setMonths]   = useState(12);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setLoading(true); setError('');
    const params = { months };
    if (activeFarm?._id) params.farmId = activeFarm._id;
    getAnalytics(params)
      .then(r => setData(r.data))
      .catch(() => setError(lang === 'ar' ? 'تعذّر تحميل بيانات التحليلات. حاول مرة أخرى.' : 'Failed to load analytics. Please try again.'))
      .finally(() => setLoading(false));
  }, [months, lang, activeFarm?._id]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!data) return { income: 0, expenses: 0, profit: 0, orders: 0 };
    const income   = data.monthly.reduce((s, m) => s + m.income,   0);
    const expenses = data.monthly.reduce((s, m) => s + m.expenses, 0);
    const orders   = Object.values(data.orderStats || {}).reduce((s, v) => s + v, 0);
    return { income, expenses, profit: income - expenses, orders };
  }, [data]);

  const expCats = useMemo(() => {
    if (!data) return [];
    const expTotal = Object.values(data.expenseByCategory).reduce((s, v) => s + v, 0);
    return Object.entries(data.expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, val]) => ({ cat, val, total: expTotal, ...(CAT_META[cat] || CAT_META.other) }));
  }, [data]);

  const orderSegs = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.orderStats || {})
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        label: lang === 'ar' ? (ORDER_META[status]?.ar || status) : (ORDER_META[status]?.en || status),
        value,
        color: ORDER_META[status]?.color || C.muted,
      }));
  }, [data, lang]);

  const margin = totals.income > 0 ? ((totals.profit / totals.income) * 100).toFixed(1) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: embedded ? undefined : '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Hero (standalone mode only) ── */}
      {!embedded && (
        <div style={{ background: C.hero, padding: '32px 32px 36px', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', right: -20, top: -20, fontSize: '180px', opacity: 0.05, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>📊</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px' }}>
                {lang === 'ar' ? 'تحليل الأداء' : 'Performance Analysis'}
              </p>
              <h1 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
                {lang === 'ar' ? 'تحليلات المزرعة' : 'Farm Analytics'}
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                {lang === 'ar' ? 'نظرة شاملة على أداء مزرعتك وإيراداتك' : "A full view of your farm's performance and revenue"}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {PERIODS.map(p => (
                <button key={p.key} type="button" onClick={() => setMonths(p.key)}
                  style={{ padding: '7px 16px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                    background: months === p.key ? '#fff' : 'rgba(255,255,255,0.12)',
                    color:      months === p.key ? C.greenDk : 'rgba(255,255,255,0.85)',
                    transition: 'all 0.15s' }}>
                  {lang === 'ar' ? p.ar : p.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period selector (embedded mode) */}
      {embedded && (
        <div style={{ padding: '4px 28px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIODS.map(p => (
            <button key={p.key} type="button" onClick={() => setMonths(p.key)}
              style={{ padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${months === p.key ? '#3A7D44' : '#E5E7EB'}`,
                background: months === p.key ? '#3A7D44' : '#fff',
                color: months === p.key ? '#fff' : '#374151',
                transition: 'all 0.15s' }}>
              {lang === 'ar' ? p.ar : p.en}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '28px 28px 60px', maxWidth: '1160px', margin: '0 auto', boxSizing: 'border-box' }}>

        {error && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '10px', padding: '11px 16px', color: C.redText, fontSize: '14px', marginBottom: '22px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <KpiCard icon="💰" iconBg={C.greenBg}
            label={lang === 'ar' ? 'إجمالي الدخل' : 'Total Income'}
            value={fmtEGP(totals.income)} valueColor={C.greenText}
            loading={loading} />
          <KpiCard icon="📉" iconBg={C.redBg}
            label={lang === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}
            value={fmtEGP(totals.expenses)} valueColor={C.redText}
            loading={loading} />
          <KpiCard icon={totals.profit >= 0 ? '📈' : '⚠️'}
            iconBg={totals.profit >= 0 ? C.greenBg : C.redBg}
            label={lang === 'ar' ? 'صافي الربح' : 'Net Profit'}
            value={fmtEGP(totals.profit)} valueColor={totals.profit >= 0 ? C.greenText : C.redText}
            sub={margin ? (lang === 'ar' ? `هامش الربح: ${margin}%` : `Profit margin: ${margin}%`) : null}
            loading={loading} />
          <KpiCard icon="📦" iconBg={C.blueBg}
            label={lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
            value={totals.orders} valueColor={C.blueText}
            loading={loading} />
        </div>

        {/* ── Monthly income/expenses bar chart ── */}
        <Card
          title={lang === 'ar' ? 'الدخل والمصروفات الشهرية' : 'Monthly Income & Expenses'}
          subtitle={lang === 'ar' ? 'مقارنة شهرية خلال الفترة المختارة' : 'Month-by-month comparison for the selected period'}
          style={{ marginBottom: '20px' }}
        >
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: C.greenText }}>
              <span style={{ width: '18px', height: '5px', background: C.green, borderRadius: '3px', display: 'inline-block' }} />
              {lang === 'ar' ? 'دخل' : 'Income'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: C.redText }}>
              <span style={{ width: '18px', height: '5px', background: C.red, borderRadius: '3px', display: 'inline-block' }} />
              {lang === 'ar' ? 'مصروفات' : 'Expenses'}
            </span>
          </div>

          {loading
            ? <Sk h={170} r={8} />
            : data?.monthly?.length
              ? <MonthlyBars data={data.monthly} lang={lang} />
              : <div style={{ textAlign: 'center', padding: '48px', color: C.muted, fontSize: '14px' }}>
                  {lang === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}
                </div>
          }

          {/* Profit trend sub-section */}
          {!loading && data?.monthly?.length > 1 && (
            <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.muted, marginBottom: '10px' }}>
                📈 {lang === 'ar' ? 'منحنى صافي الربح الشهري' : 'Monthly Net Profit Trend'}
              </div>
              <ProfitLine data={data.monthly} />
            </div>
          )}
        </Card>

        {/* ── Expense breakdown + Order status ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* Expense breakdown */}
          <Card
            title={lang === 'ar' ? 'توزيع المصروفات' : 'Expense Breakdown'}
            subtitle={lang === 'ar' ? 'المصروفات حسب الفئة' : 'Expenses by category'}
          >
            {loading
              ? [0,1,2,3].map(i => <Sk key={i} h={36} r={6} style={{ marginBottom: 12 }} />)
              : expCats.length === 0
                ? <div style={{ textAlign: 'center', padding: '36px', color: C.muted, fontSize: '13px' }}>
                    {lang === 'ar' ? 'لا توجد مصروفات مسجّلة' : 'No expenses recorded'}
                  </div>
                : expCats.map(({ cat, val, total, emoji, color, labelKey }) => (
                    <HBar key={cat} emoji={emoji} label={t(labelKey)} value={val} total={total} color={color} />
                  ))
            }
          </Card>

          {/* Order status */}
          <Card
            title={lang === 'ar' ? 'حالة الطلبات' : 'Order Status'}
            subtitle={lang === 'ar' ? 'توزيع الطلبات حسب الحالة' : 'Orders by status'}
          >
            {loading
              ? <Sk h={140} r={8} />
              : orderSegs.length === 0
                ? <div style={{ textAlign: 'center', padding: '36px', color: C.muted, fontSize: '13px' }}>
                    {lang === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}
                  </div>
                : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <Donut segments={orderSegs} total={totals.orders} />
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      {orderSegs.map((seg, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < orderSegs.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: C.text }}>{seg.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: seg.color }}>{seg.value}</span>
                            <span style={{ fontSize: '10px', color: C.muted }}>{totals.orders > 0 ? `${Math.round((seg.value / totals.orders) * 100)}%` : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            }
          </Card>
        </div>

        {/* ── Top animal types by revenue ── */}
        {!loading && data?.topAnimalTypes?.length > 0 && (
          <Card
            title={lang === 'ar' ? 'أكثر المواشي ربحية' : 'Most Profitable Livestock'}
            subtitle={lang === 'ar' ? 'الإيرادات حسب نوع الماشية خلال الفترة المختارة' : 'Revenue by livestock type for the selected period'}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0 32px' }}>
              {data.topAnimalTypes.map(({ type, total: val, count }) => {
                const maxVal = data.topAnimalTypes[0]?.total || 1;
                const meta   = TYPE_META[type] || TYPE_META.other;
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {meta.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t(meta.labelKey)}</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: meta.color }}>{fmtEGP(val)}</span>
                      </div>
                      <div style={{ height: '5px', background: '#F0EBE4', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ height: '100%', width: `${Math.max(3, (val / maxVal) * 100)}%`, background: meta.color, borderRadius: '3px' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: C.muted }}>
                        {count} {lang === 'ar' ? (count === 1 ? 'صفقة' : 'صفقات') : (count === 1 ? 'deal' : 'deals')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Empty state — no data at all */}
        {!loading && !error && data?.monthly?.every(m => m.income === 0 && m.expenses === 0) && !data?.topAnimalTypes?.length && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
            <div style={{ fontSize: '56px', marginBottom: '14px' }}>🌱</div>
            <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: C.text }}>
              {lang === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}
            </p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {lang === 'ar' ? 'ابدأ بتسجيل المصروفات والدخل لتظهر التحليلات هنا' : 'Start logging income and expenses to see analytics here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAnalytics;
