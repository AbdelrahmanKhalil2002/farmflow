import { useEffect, useState, useMemo } from 'react';
import { getPlatformAnalytics } from '../../services/adminService';

import { C } from '../../tokens';

const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtEGP = (n) => `${Number(n ?? 0).toLocaleString()} ج.م`;

const PERIOD_OPTIONS = [
  { value: 4,  label: '٤ أسابيع'  },
  { value: 8,  label: '٨ أسابيع'  },
  { value: 12, label: '١٢ أسبوع' },
  { value: 24, label: '٢٤ أسبوع' },
];

// ─── MiniBar — reusable horizontal bar chart ─────────────────────────────────
const MiniBar = ({ data, valueKey, color, labelKey = 'week', maxOverride }) => {
  const max = maxOverride ?? Math.max(1, ...data.map(d => d[valueKey] ?? 0));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {data.map((d, i) => {
        const pct = Math.round(((d[valueKey] ?? 0) / max) * 100);
        const label = d[labelKey]?.slice(5) ?? ''; // MM-DD
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', fontSize: '10px', color: C.textMid, textAlign: 'left', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: '14px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.5s ease', minWidth: pct > 0 ? '3px' : 0 }} />
            </div>
            <div style={{ width: '32px', fontSize: '10px', fontWeight: '700', color, textAlign: 'right', flexShrink: 0 }}>{fmt(d[valueKey] ?? 0)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ─── ChartCard ────────────────────────────────────────────────────────────────
const ChartCard = ({ title, icon, color, colorDim, total, totalLabel, children }) => (
  <div style={{ background: C.card, borderRadius: '14px', boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{title}</div>
        <div style={{ fontSize: '12px', color: C.textMid, marginTop: '1px' }}>
          {totalLabel}: <span style={{ fontWeight: '700', color }}>{total}</span>
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 20px' }}>
      {children}
    </div>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SK = 'linear-gradient(90deg,#E5E7EB 0%,#F3F4F6 50%,#E5E7EB 100%)';
const sk = (w, h, r = 6) => ({ width: w, height: h, borderRadius: r, background: SK, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite', flexShrink: 0 });
const SkCard = () => (
  <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px' }}>
    <style>{`@keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div style={sk('60%', 16)} />
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[1,2,3,4,5,6].map(i => <div key={i} style={sk('100%', 14)} />)}
    </div>
  </div>
);

// ─── AdminAnalytics ───────────────────────────────────────────────────────────
const AdminAnalytics = () => {
  const [data,    setData]    = useState([]);
  const [weeks,   setWeeks]   = useState(12);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getPlatformAnalytics(weeks)
      .then(({ data: d }) => setData(d))
      .catch(() => setError('تعذّر تحميل البيانات. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, [weeks]);

  const totals = useMemo(() => ({
    buyers:   data.reduce((s, d) => s + d.buyers, 0),
    sellers:  data.reduce((s, d) => s + d.sellers, 0),
    listings: data.reduce((s, d) => s + d.listings, 0),
    orders:   data.reduce((s, d) => s + d.orders, 0),
    gmv:      data.reduce((s, d) => s + d.gmv, 0),
  }), [data]);

  return (
    <div className="adm-page" style={{ padding: '28px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>
            📈 تحليلات المنصة
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMid }}>
            اتجاهات أسبوعية — التسجيل · الإعلانات · الطلبات · الإيرادات
          </p>
        </div>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setWeeks(value)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${weeks === value ? C.green : C.border}`, background: weeks === value ? C.green : C.card, color: weeks === value ? '#fff' : C.textMid, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {[
            { icon: '🛒', label: 'مشترون جدد',   val: fmt(totals.buyers),          color: C.blue   },
            { icon: '🌾', label: 'بائعون جدد',    val: fmt(totals.sellers),         color: C.green  },
            { icon: '📋', label: 'إعلانات جديدة', val: fmt(totals.listings),        color: C.amber  },
            { icon: '📦', label: 'طلبات',          val: fmt(totals.orders),          color: C.purple },
            { icon: '💰', label: 'إجمالي الإيرادات', val: fmtEGP(totals.gmv),      color: C.green  },
          ].map(({ icon, label, val, color }) => (
            <div key={label} style={{ background: C.card, borderRadius: '12px', padding: '14px 16px', boxShadow: C.shadow, border: `1px solid ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: '11px', color: C.textMid, fontWeight: '600', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#B91C1C', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => <SkCard key={i} />)
        ) : (
          <>
            {/* Registrations — buyers */}
            <ChartCard
              title="تسجيل المشترين"
              icon="🛒"
              color={C.blue}
              colorDim={C.blueDim}
              total={fmt(totals.buyers)}
              totalLabel="الإجمالي في الفترة">
              <MiniBar data={data} valueKey="buyers" color={C.blue} />
            </ChartCard>

            {/* Registrations — sellers */}
            <ChartCard
              title="تسجيل البائعين"
              icon="🌾"
              color={C.green}
              colorDim={C.greenDim}
              total={fmt(totals.sellers)}
              totalLabel="الإجمالي في الفترة">
              <MiniBar data={data} valueKey="sellers" color={C.green} />
            </ChartCard>

            {/* Listings */}
            <ChartCard
              title="الإعلانات المُضافة"
              icon="📋"
              color={C.amber}
              colorDim={C.amberDim}
              total={fmt(totals.listings)}
              totalLabel="الإجمالي في الفترة">
              <MiniBar data={data} valueKey="listings" color={C.amber} />
            </ChartCard>

            {/* Orders */}
            <ChartCard
              title="الطلبات المُسجَّلة"
              icon="📦"
              color={C.purple}
              colorDim={C.purpleDim}
              total={fmt(totals.orders)}
              totalLabel="الإجمالي في الفترة">
              <MiniBar data={data} valueKey="orders" color={C.purple} />
            </ChartCard>

            {/* GMV — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <ChartCard
                title="الإيرادات المكتملة (GMV)"
                icon="💰"
                color={C.green}
                colorDim={C.greenDim}
                total={fmtEGP(totals.gmv)}
                totalLabel="إجمالي الإيرادات">
                <MiniBar data={data} valueKey="gmv" color={C.green} />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
