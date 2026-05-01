import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getGovAnalytics } from '../../services/adminService';
import { getEidConfig, updateEidConfig } from '../../services/eidService';
import { getMarketPrices } from '../../services/marketPricesService';

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg:       '#F4F6F4',
  card:     '#FFFFFF',
  card2:    '#F9FAFB',
  border:   '#E5E7EB',
  border2:  '#F3F4F6',
  green:    '#16A34A',
  greenDim: '#F0FDF4',
  amber:    '#D97706',
  amberDim: '#FFFBEB',
  red:      '#DC2626',
  redDim:   '#FEF2F2',
  blue:     '#2563EB',
  blueDim:  '#EFF6FF',
  purple:   '#7C3AED',
  purpleDim:'#F5F3FF',
  slate:    '#64748B',
  text:     '#111827',
  textMid:  '#6B7280',
  textDim:  '#9CA3AF',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = (n)   => Number(n ?? 0).toLocaleString();
const fmtSAR = (n)   => `${Number(n ?? 0).toLocaleString()} ج.م`;

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Fill gaps in ordersByDay → 30 or 90 days with zero-padding
const buildDailyData = (raw, days) => {
  const map = {};
  raw.forEach(r => { map[r._id] = r; });
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: map[key]?.count ?? 0, revenue: map[key]?.revenue ?? 0 };
  });
};

// Aggregate daily → weekly or monthly bins for the bar chart
const buildBarData = (daily90, period) => {
  if (period === '7d') {
    return daily90.slice(-7).map(d => ({ label: d.date.slice(5), value: d.revenue, count: d.count }));
  }
  if (period === '30d') {
    // 4 week buckets (most recent first, then reversed)
    return [3, 2, 1, 0].map(w => {
      const slice = daily90.slice(-(30 - w * 7), daily90.length - w * 7 || undefined);
      const bucket = slice.slice(-7);
      const value = bucket.reduce((s, d) => s + d.revenue, 0);
      const count = bucket.reduce((s, d) => s + d.count, 0);
      const end = bucket[bucket.length - 1]?.date ?? '';
      return { label: end.slice(5), value, count };
    });
  }
  // 90d → 3 monthly buckets
  return [2, 1, 0].map(m => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const bucket = daily90.filter(d => {
      const dt = new Date(d.date);
      return dt >= ms && dt < me;
    });
    const value = bucket.reduce((s, d) => s + d.revenue, 0);
    const count = bucket.reduce((s, d) => s + d.count, 0);
    return {
      label: ms.toLocaleDateString('en', { month: 'short' }),
      value, count,
    };
  });
};

// ─── Activity metadata ────────────────────────────────────────────────────────
const AKIND = {
  user:            { icon: '👤', label: 'New User',        accentBg: C.blueDim,   accentText: C.blue   },
  listing_pending: { icon: '⏳', label: 'Pending Listing', accentBg: C.amberDim,  accentText: C.amber  },
  listing:         { icon: '📋', label: 'Listing Update',  accentBg: '#F3F4F6',   accentText: C.slate  },
  order:           { icon: '📦', label: 'New Order',       accentBg: C.purpleDim, accentText: C.purple },
};

// ─── SVG Line Chart ────────────────────────────────────────────────────────────
const LineChart = ({ data, color, unit = 'orders' }) => {
  const gId = useId();
  const [tip, setTip] = useState(null);

  const W = 560, H = 160;
  const PAD = { top: 14, right: 16, bottom: 32, left: 38 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  const maxV = Math.max(...data.map(d => d.count), 1);
  const pts  = data.map((d, i) => ({
    ...d,
    x: PAD.left + (i / (data.length - 1)) * cW,
    y: PAD.top  + cH - (d.count / maxV) * cH,
  }));

  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${PAD.left},${PAD.top + cH} ` + polyline + ` ${(PAD.left + cW).toFixed(1)},${PAD.top + cH}`;

  const gridVals = [0, 0.25, 0.5, 0.75, 1];
  // Show x-labels every ~5 data points
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${gId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines + y-labels */}
        {gridVals.map((t, i) => {
          const y = PAD.top + cH * (1 - t);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                stroke="#E5E7EB" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize="9" fill={C.textDim} fontFamily="system-ui">
                {Math.round(maxV * t)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPath} fill={`url(#${gId}-fill)`} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={color}
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* X-axis labels */}
        {pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle"
            fontSize="9" fill={C.textDim} fontFamily="system-ui">
            {p.date.slice(5)}
          </text>
        ))}

        {/* Invisible hit zones + highlight dots */}
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setTip(p)}
            onMouseLeave={() => setTip(null)}
            style={{ cursor: 'crosshair' }}>
            <rect x={p.x - (cW / data.length / 2)} y={PAD.top}
              width={cW / data.length} height={cH}
              fill="transparent" />
            <circle cx={p.x} cy={p.y} r={tip?.date === p.date ? 5 : 2.5}
              fill={tip?.date === p.date ? '#fff' : color}
              stroke={tip?.date === p.date ? color : 'none'}
              strokeWidth="2"
              style={{ transition: 'r 0.1s' }} />
          </g>
        ))}

        {/* Tooltip rendered inside SVG */}
        {tip && (() => {
          const tx = Math.min(Math.max(tip.x, 40), W - 40);
          const ty = tip.y - 14;
          const label = unit === 'revenue' ? fmtSAR(tip.revenue) : `${tip.count} orders`;
          return (
            <g pointerEvents="none">
              <rect x={tx - 42} y={ty - 26} width={84} height={30} rx={6}
                fill="#1F2937" stroke="#374151" strokeWidth="1" />
              <text x={tx} y={ty - 14} textAnchor="middle"
                fontSize="9" fill={C.textMid} fontFamily="system-ui">{tip.date.slice(5)}</text>
              <text x={tx} y={ty - 3} textAnchor="middle"
                fontSize="11" fontWeight="700" fill={color} fontFamily="system-ui">{label}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, d) => s + d.count, 0);
  const R = 38, SW = 15, CX = 50, CY = 50;
  const CIRC = 2 * Math.PI * R;
  const [hovered, setHovered] = useState(null);

  let offset = 0;
  const arcs = segments.map(seg => {
    const arc    = total > 0 ? (seg.count / total) * CIRC : 0;
    const result = { ...seg, arc, offset };
    offset += arc;
    return result;
  });

  const active = hovered !== null ? segments[hovered] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      {/* SVG */}
      <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {/* Track */}
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke="#E5E7EB" strokeWidth={SW} />
            {/* Arcs */}
            {arcs.map((a, i) => a.arc > 0 && (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={a.color}
                strokeWidth={hovered === i ? SW + 3 : SW}
                strokeDasharray={`${a.arc} ${CIRC}`}
                strokeDashoffset={-a.offset}
                style={{ transition: 'stroke-width 0.15s', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)} />
            ))}
          </g>
        </svg>
        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: active ? '13px' : '18px', fontWeight: '800', color: active?.color ?? C.text, lineHeight: 1, transition: 'all 0.15s' }}>
            {active ? active.count : total}
          </div>
          <div style={{ fontSize: '9px', color: C.textDim, marginTop: '2px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {active ? active.label : 'Total'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '120px' }}>
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
          return (
            <div key={i}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default', opacity: hovered !== null && hovered !== i ? 0.4 : 1, transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: C.textMid, flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: seg.color }}>{seg.count}</span>
              <span style={{ fontSize: '11px', color: C.textDim, width: '30px', textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
const BarChart = ({ data, color }) => {
  const [tip, setTip] = useState(null);
  const maxV = Math.max(...data.map(d => d.value), 1);

  const W = 460, H = 160;
  const PAD = { top: 14, right: 12, bottom: 30, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  const barW = Math.floor((cW / data.length) * 0.6);
  const gap   = cW / data.length;

  const gridVals = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {/* Grid + y-labels */}
      {gridVals.map((t, i) => {
        const y = PAD.top + cH * (1 - t);
        const val = maxV * t;
        const label = val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val).toString();
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
              stroke="#E5E7EB" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fontSize="9" fill={C.textDim} fontFamily="system-ui">{label}</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxV) * cH;
        const x    = PAD.left + gap * i + (gap - barW) / 2;
        const y    = PAD.top + cH - barH;
        const isHovered = tip === i;
        return (
          <g key={i}
            onMouseEnter={() => setTip(i)}
            onMouseLeave={() => setTip(null)}
            style={{ cursor: 'default' }}>
            {/* Hit zone */}
            <rect x={x - 4} y={PAD.top} width={barW + 8} height={cH} fill="transparent" />
            {/* Bar */}
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)}
              rx={3} fill={isHovered ? '#fff' : color}
              style={{ transition: 'fill 0.1s' }} />
            {/* X label */}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle"
              fontSize="9" fill={C.textDim} fontFamily="system-ui">{d.label}</text>
            {/* Tooltip */}
            {isHovered && (
              <g>
                <rect x={x + barW / 2 - 38} y={y - 30} width={76} height={26} rx={5}
                  fill="#1F2937" stroke="#374151" strokeWidth="1" />
                <text x={x + barW / 2} y={y - 19} textAnchor="middle"
                  fontSize="9" fill={C.textMid} fontFamily="system-ui">{d.count} orders</text>
                <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                  fontSize="10" fontWeight="700" fill={color} fontFamily="system-ui">
                  {fmtSAR(d.value)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH}
        stroke="#D1D5DB" strokeWidth="1" />
    </svg>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ icon, label, value, subValue, subLabel, color, colorDim, trend, alert, onClick }) => {
  const [hov, setHov] = useState(false);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card, borderRadius: '14px', padding: '20px 22px',
        border: `1px solid ${hov && onClick ? color + '33' : C.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        boxShadow: hov && onClick ? `0 0 0 1px ${color}33, 0 4px 16px rgba(0,0,0,0.08)` : '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative', overflow: 'hidden',
        textAlign: 'left', width: onClick ? '100%' : undefined,
        fontFamily: onClick ? 'inherit' : undefined,
      }}>
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: '16px', bottom: '16px', width: '3px', borderRadius: '0 2px 2px 0', background: color }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {icon}
        </div>
        {alert && (
          <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: C.amber, background: C.amberDim, border: `1px solid rgba(245,158,11,0.2)`, padding: '2px 8px', borderRadius: '6px' }}>
            Action needed
          </div>
        )}
      </div>

      <div style={{ fontSize: '30px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '7px', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(value)}
      </div>

      <div style={{ fontSize: '12px', fontWeight: '600', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </div>

      {subValue !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
          {trend === 'up'   && <span style={{ fontSize: '11px', color: C.green }}>▲</span>}
          {trend === 'down' && <span style={{ fontSize: '11px', color: C.red }}>▼</span>}
          {trend === 'warn' && <span style={{ fontSize: '11px', color: C.amber }}>⚠</span>}
          <span style={{ fontSize: '12px', fontWeight: '600', color: trend === 'up' ? C.green : trend === 'warn' ? C.amber : C.textMid }}>
            {subValue}
          </span>
          <span style={{ fontSize: '11px', color: C.textDim }}>{subLabel}</span>
        </div>
      )}

      {onClick && (
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '20px', right: '20px', fontSize: '13px', color: hov ? color : C.textDim, transition: 'color 0.15s' }}>→</div>
      )}
    </Tag>
  );
};

// ─── Activity item ────────────────────────────────────────────────────────────
const ActivityItem = ({ item }) => {
  const meta = AKIND[item.kind] ?? AKIND.listing;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '10px 0', borderBottom: `1px solid ${C.border2}` }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: meta.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.text}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: meta.accentText, background: meta.accentBg, padding: '1px 7px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {meta.label}
          </span>
          {item.meta && (
            <span style={{ fontSize: '11px', color: C.textDim, textTransform: 'capitalize' }}>{item.meta}</span>
          )}
          <span style={{ fontSize: '11px', color: C.textDim, marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Quick action card ────────────────────────────────────────────────────────
const QAction = ({ icon, title, sub, color, colorDim, onClick, badge }) => {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '12px',
        border: `1px solid ${hov ? color + '30' : C.border}`,
        background: hov ? colorDim : C.card2,
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: hov ? `0 4px 14px rgba(0,0,0,0.08)` : 'none',
        textAlign: 'left', width: '100%', fontFamily: 'inherit',
      }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, transition: 'background 0.15s' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: hov ? color : C.text, transition: 'color 0.15s' }}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span style={{ fontSize: '10px', fontWeight: '800', color: C.amber, background: C.amberDim, padding: '1px 7px', borderRadius: '10px' }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: C.textDim, marginTop: '1px' }}>{sub}</div>
      </div>
      <span aria-hidden="true" style={{ fontSize: '16px', color: hov ? color : C.textDim, transition: 'color 0.15s, transform 0.15s', transform: hov ? 'translateX(3px)' : 'none' }}>→</span>
    </button>
  );
};

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
const Skeleton = ({ h = '28px', w = '100%', r = '8px' }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
);

// ─── Period toggle ────────────────────────────────────────────────────────────
const PeriodToggle = ({ value, onChange }) => (
  <div role="group" aria-label="Revenue period" style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
    {['7d', '30d', '90d'].map(p => (
      <button key={p} type="button" onClick={() => onChange(p)}
        aria-pressed={value === p}
        style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.15s', background: value === p ? C.green : 'transparent', color: value === p ? '#fff' : C.textDim, fontFamily: 'inherit' }}>
        {p}
      </button>
    ))}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SH = ({ title, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</h2>
    {right}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [barPeriod,  setBarPeriod]  = useState('30d');
  const [chartTab,   setChartTab]   = useState('orders'); // 'orders' | 'revenue'
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh,setLastRefresh]= useState(null);
  const isMobile = window.innerWidth < 900;

  const [eidConfig,    setEidConfig]    = useState({ eidMode: false, eidDate: '' });
  const [eidSaving,    setEidSaving]    = useState(false);
  const [eidSaved,     setEidSaved]     = useState(false);
  const [marketPrices,    setMarketPrices]    = useState([]);
  const [govAnalytics,    setGovAnalytics]    = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await getStats();
      setStats(data);
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load dashboard data. Retrying…');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getEidConfig().then(r => setEidConfig({ eidMode: r.data.eidMode, eidDate: r.data.eidDate ? r.data.eidDate.slice(0, 10) : '' })).catch(() => {});
  }, []);

  useEffect(() => {
    getMarketPrices().then(r => setMarketPrices(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    getGovAnalytics().then(r => setGovAnalytics(r.data || [])).catch(() => {});
  }, []);

  const saveEidConfig = async () => {
    setEidSaving(true);
    try {
      await updateEidConfig({ eidMode: eidConfig.eidMode, eidDate: eidConfig.eidDate || null });
      setEidSaved(true);
      setTimeout(() => setEidSaved(false), 2000);
    } catch {}
    finally { setEidSaving(false); }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const daily30  = stats ? buildDailyData(stats.ordersByDay, 30)  : [];
  const daily90  = stats ? buildDailyData(stats.ordersByDay, 90)  : [];
  const barData  = stats ? buildBarData(daily90, barPeriod) : [];

  const donutSegments = stats ? [
    { label: 'Pending',  count: stats.pendingListings,  color: C.amber  },
    { label: 'Approved', count: stats.activeListings,   color: C.green  },
    { label: 'Rejected', count: stats.rejectedListings, color: C.red    },
    { label: 'Sold',     count: stats.soldListings,     color: C.slate  },
  ] : [];

  const totalListings = stats
    ? stats.pendingListings + stats.activeListings + stats.rejectedListings + stats.soldListings
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: '1200px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: C.text }}>
      <style>{`
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>
            System Overview
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: C.textDim }}>
            {lastRefresh
              ? `Last updated ${timeAgo(lastRefresh)}`
              : 'Loading platform metrics…'}
          </p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing || loading}
          aria-busy={refreshing || undefined}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: refreshing ? C.textDim : C.textMid, fontSize: '13px', fontWeight: '600', cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = C.green + '44'; e.currentTarget.style.color = C.green; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ background: C.redDim, border: `1px solid #FECACA`, borderRadius: '10px', padding: '11px 16px', color: C.red, fontSize: '13px', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span aria-hidden="true">⚠</span>{error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: '14px', padding: '20px 22px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton h="38px" w="38px" r="10px" />
              <Skeleton h="36px" w="70%" />
              <Skeleton h="14px" w="50%" />
            </div>
          ))
        ) : stats ? (
          <>
            <KPICard
              icon="👥" label="Total Users" value={stats.totalUsers}
              subValue={`+${stats.newUsersThisWeek}`} subLabel="this week"
              color={C.blue} colorDim={C.blueDim}
              trend={stats.newUsersThisWeek > 0 ? 'up' : undefined}
              onClick={() => navigate('/admin/users')}
            />
            <KPICard
              icon="⏳" label="Pending Listings" value={stats.pendingListings}
              subValue={stats.pendingListings > 0 ? 'Needs review' : 'All clear'}
              color={stats.pendingListings > 0 ? C.amber : C.green}
              colorDim={stats.pendingListings > 0 ? C.amberDim : C.greenDim}
              trend={stats.pendingListings > 5 ? 'warn' : undefined}
              alert={stats.pendingListings > 0}
              onClick={() => navigate('/admin/listings')}
            />
            <KPICard
              icon="✅" label="Active Listings" value={stats.activeListings}
              subValue={`${totalListings} total`} subLabel="incl. all statuses"
              color={C.green} colorDim={C.greenDim}
              onClick={() => navigate('/admin/listings')}
            />
            <KPICard
              icon="📦" label="Total Orders" value={stats.totalOrders}
              subValue={`${stats.completedOrders}`} subLabel="completed"
              color={C.purple} colorDim={C.purpleDim}
              trend={stats.completedOrders > 0 ? 'up' : undefined}
              onClick={() => navigate('/admin/orders')}
            />
          </>
        ) : null}
      </div>

      {/* ── Revenue summary strip ── */}
      {stats && !loading && (
        <div style={{ background: `linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)`, border: `1px solid #BBF7D0`, borderRadius: '14px', padding: '18px 24px', marginBottom: '28px', display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center', animation: 'fadeUp 0.4s ease' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Platform Revenue</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: C.green, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{fmtSAR(stats.totalRevenue)}</div>
            <div style={{ fontSize: '12px', color: C.textDim, marginTop: '2px' }}>All non-cancelled orders</div>
          </div>
          <div style={{ width: '1px', height: '44px', background: C.border, flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {[
              { label: 'Sellers',     value: stats.sellerCount,   color: C.blue   },
              { label: 'Buyers',      value: stats.buyerCount,    color: C.purple },
              { label: 'Pending ORD', value: stats.pendingOrders, color: C.amber  },
              { label: 'Completed',   value: stats.completedOrders, color: C.green },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders Trend Chart ── */}
      <div style={{ background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SH
          title="Orders Trend — last 30 days"
          right={
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
              {[
                { key: 'orders',  label: 'Count', color: C.blue   },
                { key: 'revenue', label: 'Revenue', color: C.purple },
              ].map(t => (
                <button key={t.key} type="button" onClick={() => setChartTab(t.key)}
                  aria-pressed={chartTab === t.key}
                  style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.15s', background: chartTab === t.key ? t.color : 'transparent', color: chartTab === t.key ? '#fff' : C.textDim, fontFamily: 'inherit' }}>
                  {t.label}
                </button>
              ))}
            </div>
          }
        />
        {loading ? (
          <Skeleton h="160px" r="8px" />
        ) : (
          <LineChart
            data={daily30}
            color={chartTab === 'orders' ? C.blue : C.purple}
            unit={chartTab}
          />
        )}
        {!loading && stats && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border2}` }}>
            {[
              { label: 'Avg / day', value: daily30.length ? (daily30.reduce((s, d) => s + d.count, 0) / 30).toFixed(1) : '0', unit: 'orders' },
              { label: 'Peak',      value: Math.max(...daily30.map(d => d.count), 0),    unit: 'orders' },
              { label: '30-day total', value: fmt(daily30.reduce((s, d) => s + d.count, 0)), unit: 'orders' },
              { label: '30-day revenue', value: fmtSAR(daily30.reduce((s, d) => s + d.revenue, 0)), unit: '' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '10px', color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginTop: '2px' }}>{s.value} <span style={{ fontSize: '11px', fontWeight: '400', color: C.textDim }}>{s.unit}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Two-column charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Listings Donut */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SH title="Listings by Status" />
          {loading ? (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Skeleton h="100px" w="100px" r="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4].map(i => <Skeleton key={i} h="14px" />)}
              </div>
            </div>
          ) : (
            <DonutChart segments={donutSegments} />
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SH title="Revenue by Period" right={<PeriodToggle value={barPeriod} onChange={setBarPeriod} />} />
          {loading ? (
            <Skeleton h="160px" r="8px" />
          ) : barData.every(d => d.value === 0) ? (
            <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textDim }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '13px' }}>No revenue data for this period</div>
            </div>
          ) : (
            <BarChart data={barData} color={C.purple} />
          )}
        </div>
      </div>

      {/* ── Market Price Trends ── */}
      {marketPrices.length > 0 && (() => {
        const TYPE_AR = { cattle:'بقر', buffalo:'جاموس', sheep:'أغنام', goat:'ماعز', camel:'إبل', horse:'خيول', poultry:'دواجن', rabbit:'أرانب', other:'أخرى' };
        const TYPE_EMOJI = { cattle:'🐄', buffalo:'🐃', sheep:'🐑', goat:'🐐', camel:'🪘', horse:'🎠', poultry:'🐔', rabbit:'🐇', other:'🐾' };
        const maxAvg = Math.max(...marketPrices.map(p => p.avgPricePerKg || 0)) || 1;
        return (
          <div style={{ marginBottom: '20px', background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>📊 متوسط أسعار السوق</div>
                <div style={{ fontSize: '12px', color: C.textDim, marginTop: '2px' }}>متوسط سعر الكيلوجرام لكل نوع — آخر 90 يوماً</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...marketPrices].sort((a, b) => (b.avgPricePerKg || 0) - (a.avgPricePerKg || 0)).map(p => {
                const pct = Math.round(((p.avgPricePerKg || 0) / maxAvg) * 100);
                return (
                  <div key={p.type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 80, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{ fontSize: 16 }}>{TYPE_EMOJI[p.type] || '🐾'}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{TYPE_AR[p.type] || p.type}</span>
                    </div>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, #22C55E)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ width: 110, display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>{(p.avgPricePerKg || 0).toFixed(0)} ج.م</span>
                      <span style={{ fontSize: 11, color: C.textDim }}>
                        ({(p.minPricePerKg || 0).toFixed(0)}–{(p.maxPricePerKg || 0).toFixed(0)})
                      </span>
                    </div>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: C.textDim, background: C.border2, borderRadius: 5, padding: '2px 6px' }}>{p.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: C.textDim, display: 'flex', gap: '16px' }}>
              <span>⬛ متوسط السعر</span>
              <span style={{ color: C.textDim }}>(نطاق: الحد الأدنى–الحد الأقصى)</span>
              <span>العدد = عدد الإعلانات</span>
            </div>
          </div>
        );
      })()}

      {/* ── 30.3 Revenue by Governorate ── */}
      {govAnalytics.length > 0 && (() => {
        const maxRev = Math.max(...govAnalytics.map(g => g.revenue || 0)) || 1;
        return (
          <div style={{ marginBottom: '20px', background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>🗺️ الإيرادات حسب المحافظة</div>
                <div style={{ fontSize: '12px', color: C.textDim, marginTop: '2px' }}>الطلبات المكتملة — أعلى 12 محافظة</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {govAnalytics.map(g => {
                const pct = Math.round((g.revenue / maxRev) * 100);
                return (
                  <div key={g.governorate} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 90, fontSize: 12, fontWeight: 700, color: C.text, flexShrink: 0 }}>{g.governorate}</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.blue}, #60A5FA)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ width: 130, display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>{fmtSAR(g.revenue)}</span>
                      <span style={{ fontSize: 11, color: C.textDim }}>({g.orderCount} طلب)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Bottom row: activity + quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '20px' }}>

        {/* Activity feed */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SH title="Recent Activity" />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Skeleton h="30px" w="30px" r="8px" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <Skeleton h="13px" />
                    <Skeleton h="11px" w="60%" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentActivity?.length > 0 ? (
            <div>
              {stats.recentActivity.map((item, i) => (
                <ActivityItem key={i} item={item} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.textDim }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🕐</div>
              <div style={{ fontSize: '13px' }}>No recent activity</div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SH title="Quick Actions" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <QAction
              icon="⏳" title="Pending Listings"
              sub="Review and approve submissions"
              color={C.amber} colorDim={C.amberDim}
              badge={stats?.pendingListings}
              onClick={() => navigate('/admin/listings')}
            />
            <QAction
              icon="👥" title="Manage Users"
              sub="View accounts, toggle status"
              color={C.blue} colorDim={C.blueDim}
              onClick={() => navigate('/admin/users')}
            />
            <QAction
              icon="📦" title="View All Orders"
              sub="Track orders across all users"
              color={C.purple} colorDim={C.purpleDim}
              onClick={() => navigate('/admin/orders')}
            />
            {stats?.pendingListings > 0 && (
              <div style={{ marginTop: '4px', padding: '10px 14px', background: C.amberDim, border: `1px solid #FDE68A`, borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.amber, marginBottom: '2px' }}>
                    {stats.pendingListings} listing{stats.pendingListings !== 1 ? 's' : ''} awaiting approval
                  </div>
                  <div style={{ fontSize: '11px', color: C.textDim }}>
                    Sellers are waiting. Review them now to keep the marketplace active.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform health */}
          {stats && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border2}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Platform Health</div>
              {[
                {
                  label: 'Approval rate',
                  value: totalListings > 0 ? Math.round((stats.activeListings / totalListings) * 100) : 0,
                  color: C.green, suffix: '%',
                },
                {
                  label: 'Order completion',
                  value: stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0,
                  color: C.blue, suffix: '%',
                },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: C.textMid }}>{m.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: m.color }}>{m.value}{m.suffix}</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '3px', background: '#E5E7EB', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Eid Al-Adha Settings ── */}
      <div style={{ marginTop: '28px', background: C.card, border: `1px solid rgba(34,197,94,0.2)`, borderRadius: '16px', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ fontSize: '20px' }}>🌙</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>إعدادات عيد الأضحى</div>
            <div style={{ fontSize: '12px', color: C.textDim, marginTop: '2px' }}>تحكّم في بانر العيد وتاريخه للمشترين</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
          {/* eidMode toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div
              onClick={() => setEidConfig(p => ({ ...p, eidMode: !p.eidMode }))}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: eidConfig.eidMode ? C.green : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: eidConfig.eidMode ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>تفعيل بانر العيد</div>
              <div style={{ fontSize: '11px', color: C.textDim }}>يظهر البانر للمشترين بغض النظر عن التاريخ</div>
            </div>
          </label>

          {/* eidDate input */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textDim, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>تاريخ العيد</div>
            <input
              type="date"
              value={eidConfig.eidDate}
              onChange={e => setEidConfig(p => ({ ...p, eidDate: e.target.value }))}
              style={{
                padding: '9px 12px', borderRadius: '9px',
                border: `1px solid ${C.border}`,
                background: C.card2, color: C.text,
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                colorScheme: 'light',
              }}
            />
            <div style={{ fontSize: '11px', color: C.textDim, marginTop: '4px' }}>البانر يظهر تلقائياً خلال 30 يوم من التاريخ</div>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={saveEidConfig}
            disabled={eidSaving}
            style={{
              padding: '10px 22px', borderRadius: '9px', border: 'none',
              background: eidSaved ? C.greenDim : C.green,
              color: eidSaved ? C.green : '#fff',
              fontSize: '13px', fontWeight: '700', cursor: eidSaving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
            {eidSaving ? '…' : eidSaved ? '✓ تم الحفظ' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
