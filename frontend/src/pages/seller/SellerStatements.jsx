import { useEffect, useMemo, useState } from 'react';
import { getStatements, getDrillDown } from '../../services/statementsService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FEFAF5', card: '#FFFFFF', green: '#3A7D44', greenDk: '#2D6235',
  greenLt: '#F0F7F1', border: '#E8D5C0', text: '#2C1810', muted: '#8B6B5A',
  shadow: '0 1px 3px rgba(44,24,16,0.08)', amber: '#D97706', amberBg: '#FEF3C7',
  red: '#DC2626', redBg: '#FEF2F2',
};

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const QUARTER_MONTHS = { Q1: [0,1,2], Q2: [3,4,5], Q3: [6,7,8], Q4: [9,10,11] };

const EXP_CATS = [
  { key: 'feed',        label: 'علف'    },
  { key: 'doctor',      label: 'بيطري'  },
  { key: 'transport',   label: 'نقل'    },
  { key: 'electricity', label: 'كهرباء' },
  { key: 'salary',      label: 'رواتب'  },
  { key: 'rent',        label: 'إيجار'  },
  { key: 'water',       label: 'مياه'   },
  { key: 'maintenance', label: 'صيانة'  },
  { key: 'other',       label: 'أخرى'   },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const QUARTERS = [
  { key: null, label: 'كل العام' },
  { key: 'Q1', label: 'ر١' },
  { key: 'Q2', label: 'ر٢' },
  { key: 'Q3', label: 'ر٣' },
  { key: 'Q4', label: 'ر٤' },
];

const fmt = (v) =>
  v ? `${Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م` : '—';

// ─── PDF export (print window) ────────────────────────────────────────────────
const doExportPDF = (year, months, tableData) => {
  const headerCols = ['الفئة', ...months.map(m => `${MONTH_NAMES[m]} ${year}`)];
  const makeRow = (cells, bold = false) =>
    `<tr>${cells.map((c, i) => `<td style="padding:6px 10px;text-align:${i===0?'right':'center'};border:1px solid #ddd;font-weight:${bold?'700':'400'};font-size:11px;">${c ?? '—'}</td>`).join('')}</tr>`;

  const fmtN = v => v ? Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م' : '—';

  const rows = [
    makeRow(headerCols, true),
    makeRow(['💰 دخل المبيعات', ...months.map(m => fmtN(tableData.income[m]))], true),
    `<tr><td colspan="${headerCols.length}" style="padding:4px 10px;font-size:10px;color:#888;font-weight:700;border:1px solid #ddd;">── المصروفات ──</td></tr>`,
    ...EXP_CATS.map(c => makeRow([c.label, ...months.map(m => fmtN(tableData.expenses[c.key]?.[m]))])),
    makeRow(['إجمالي المصروفات', ...months.map(m => fmtN(tableData.totalExp[m]))], true),
    makeRow(['صافي الربح', ...months.map(m => fmtN(tableData.netProfit[m]))], true),
  ];

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>كشف الحسابات ${year}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;direction:rtl}
h2{margin:0 0 4px;font-size:18px}p{margin:0 0 16px;color:#666;font-size:12px}
table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style></head>
<body>
<h2>كشف الحسابات — FarmFlow</h2>
<p>سنة ${year}</p>
<table>${rows.join('')}</table>
<br/><button onclick="window.print()" style="padding:8px 20px;background:#3A7D44;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨 طباعة / حفظ PDF</button>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=650');
  if (w) { w.document.write(html); w.document.close(); }
};

// ─── CSV export ───────────────────────────────────────────────────────────────
const doExportCSV = (year, months, tableData) => {
  const header = ['الفئة', ...months.map(m => `${MONTH_NAMES[m]} ${year}`)];
  const lines = [
    header,
    ['دخل المبيعات', ...months.map(m => tableData.income[m] ?? 0)],
    ['── المصروفات ──', ...months.map(() => '')],
    ...EXP_CATS.map(c => [c.label, ...months.map(m => tableData.expenses[c.key]?.[m] ?? 0)]),
    ['إجمالي المصروفات', ...months.map(m => tableData.totalExp[m] ?? 0)],
    ['صافي الربح', ...months.map(m => tableData.netProfit[m] ?? 0)],
  ];
  const csv = lines
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `farmflow-statements-${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = ({ cols }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '10px 8px' }}>
        <div style={{
          height: 14, borderRadius: 4,
          background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease-in-out infinite',
          width: i === 0 ? 120 : 70,
        }} />
      </td>
    ))}
  </tr>
);

// ─── Drill-down modal ─────────────────────────────────────────────────────────
const CATEGORY_LABEL = Object.fromEntries([
  ['income', '💰 دخل المبيعات'],
  ...EXP_CATS.map(c => [c.key, c.label]),
  ['total', 'إجمالي المصروفات'],
]);

const DrillDownModal = ({ year, month, category, onClose }) => {
  const [records, setRecords] = useState(null);
  const [type,    setType]    = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    getDrillDown(year, month, category)
      .then(res => { setRecords(res.data.records); setType(res.data.type); })
      .catch(() => setError('فشل تحميل التفاصيل'))
      .finally(() => setLoading(false));
  }, [year, month, category]);

  const fmtDate = d => new Date(d).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
  const fmtAmt  = v => `${Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.card, borderRadius:18, width:'100%', maxWidth:580, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 16px 48px rgba(0,0,0,0.25)', animation:'fadeIn 0.2s ease' }}>

        {/* Modal header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ margin:'0 0 2px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>
              {MONTH_NAMES[month]} {year}
            </p>
            <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>
              {CATEGORY_LABEL[category] ?? category}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background:'none', border:`1.5px solid ${C.border}`, borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:16, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div style={{ overflowY:'auto', flex:1, padding:'14px 22px 22px' }}>
          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:8 }}>
              {Array.from({length:5}).map((_,i) => (
                <div key={i} style={{ height:48, borderRadius:8, background:'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <p style={{ textAlign:'center', color:C.red, fontSize:13, paddingTop:16 }}>{error}</p>
          )}

          {!loading && !error && records?.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
              <p style={{ margin:0, color:C.muted, fontSize:14 }}>لا توجد معاملات لهذا الشهر</p>
            </div>
          )}

          {!loading && !error && records?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
              {/* Summary */}
              <div style={{ background: type === 'income' ? C.greenLt : C.amberBg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>{records.length} معاملة</span>
                <span style={{ fontSize:15, fontWeight:800, color: type === 'income' ? C.green : C.amber }}>
                  {fmtAmt(records.reduce((s, r) => s + (r.amount ?? 0), 0))}
                </span>
              </div>

              {/* Records list */}
              {records.map((r, i) => (
                <div key={r._id ?? i} style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:'11px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.source || r.notes || r.description || r.category || (type === 'income' ? 'دخل مبيعات' : 'مصروف')}
                    </p>
                    {r.notes && r.source && (
                      <p style={{ margin:0, fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes}</p>
                    )}
                    <p style={{ margin:'4px 0 0', fontSize:11, color:C.muted }}>{fmtDate(r.date)}</p>
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color: type === 'income' ? C.green : C.amber, whiteSpace:'nowrap', flexShrink:0 }}>
                    {fmtAmt(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const SellerStatements = () => {
  const [year,           setYear]           = useState(CURRENT_YEAR);
  const [quarter,        setQuarter]        = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [rawData,        setRawData]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [drillDown,      setDrillDown]      = useState(null); // { year, month, category } | null

  useEffect(() => {
    setLoading(true);
    setError('');
    getStatements(year)
      .then(res => setRawData(res.data))
      .catch(() => setError('فشل تحميل البيانات. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, [year]);

  const months = useMemo(() =>
    quarter ? QUARTER_MONTHS[quarter] : [0,1,2,3,4,5,6,7,8,9,10,11],
  [quarter]);

  const tableData = useMemo(() => {
    const income    = {};
    const expenses  = Object.fromEntries(EXP_CATS.map(c => [c.key, {}]));
    const totalExp  = {};
    const netProfit = {};

    if (Array.isArray(rawData)) {
      rawData.forEach(record => {
        const m = record.month;
        income[m] = record.income ?? 0;
        let expSum = 0;
        EXP_CATS.forEach(cat => {
          const v = record.expenses?.[cat.key] ?? 0;
          expenses[cat.key][m] = v;
          expSum += v;
        });
        totalExp[m]  = expSum;
        netProfit[m] = (record.income ?? 0) - expSum;
      });
    }
    return { income, expenses, totalExp, netProfit };
  }, [rawData]);

  const kpis = useMemo(() => {
    if (!rawData) return null;
    let totalIncome = 0, totalExpenses = 0, bestNet = -Infinity, bestMonth = null;
    months.forEach(m => {
      totalIncome   += tableData.income[m]   ?? 0;
      totalExpenses += tableData.totalExp[m] ?? 0;
      const net = tableData.netProfit[m] ?? 0;
      if (net > bestNet) { bestNet = net; bestMonth = m; }
    });
    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, bestMonth };
  }, [rawData, months, tableData]);

  const hasData  = rawData && Array.isArray(rawData) && rawData.some(r => r.income > 0 || Object.values(r.expenses || {}).some(v => v > 0));
  const totalCols = 1 + months.length;

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .stmt-row:hover td { background:#FDF7F0 !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#2C1810 0%,#5C3317 55%,#7C4A1E 100%)',
        padding: '24px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{ position:'absolute', left:-8, top:-20, fontSize:120, opacity:0.06, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>📊</div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>كشف الحسابات</h1>
        <p style={{ margin:'3px 0 0', fontSize:13, color:'rgba(255,255,255,0.5)' }}>ملخص مالي شهري</p>
      </div>

      {drillDown && (
        <DrillDownModal
          year={drillDown.year}
          month={drillDown.month}
          category={drillDown.category}
          onClose={() => setDrillDown(null)}
        />
      )}

      <div style={{ padding:'24px 32px 56px', maxWidth:1200, margin:'0 auto' }}>

        {/* Error */}
        {error && (
          <div role="alert" style={{ background:C.redBg, border:`1px solid #FECACA`, borderRadius:10, padding:'11px 16px', color:C.red, fontSize:14, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {error}
            <button type="button" onClick={() => setError('')} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:24 }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding:'9px 14px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:14, color:C.text, fontFamily:'inherit', cursor:'pointer' }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div style={{ display:'flex', gap:6 }}>
            {QUARTERS.map(q => (
              <button
                key={String(q.key)}
                type="button"
                onClick={() => setQuarter(q.key)}
                style={{
                  padding:'9px 14px', borderRadius:9,
                  border:`1.5px solid ${quarter === q.key ? C.green : C.border}`,
                  background: quarter === q.key ? C.green : C.card,
                  color: quarter === q.key ? '#fff' : C.muted,
                  fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit',
                }}>
                {q.label}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ padding:'9px 14px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:14, color:C.text, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="">كل الفئات</option>
            {EXP_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <div style={{ flex:1 }} />

          <div style={{ display:'flex', gap:8 }}>
            <button
              type="button"
              disabled={!hasData}
              onClick={() => doExportPDF(year, months, tableData)}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 16px', borderRadius:9,
                border:`1.5px solid ${C.border}`, background:C.card, color:C.text,
                fontSize:13, fontWeight:600,
                cursor: hasData ? 'pointer' : 'not-allowed',
                opacity: hasData ? 1 : 0.5, fontFamily:'inherit',
              }}>
              🖨 PDF
            </button>
            <button
              type="button"
              disabled={!hasData}
              onClick={() => doExportCSV(year, months, tableData)}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 16px', borderRadius:9,
                border:`1.5px solid ${C.border}`, background:C.card, color:C.text,
                fontSize:13, fontWeight:600,
                cursor: hasData ? 'pointer' : 'not-allowed',
                opacity: hasData ? 1 : 0.5, fontFamily:'inherit',
              }}>
              ⬇ CSV
            </button>
          </div>
        </div>

        {/* KPI strip */}
        {!loading && kpis && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:24, animation:'fadeIn 0.25s ease' }}>
            {[
              { label:'إجمالي الدخل',       value: fmt(kpis.totalIncome),   color:C.green,  bg:C.greenLt },
              { label:'إجمالي المصروفات',   value: fmt(kpis.totalExpenses), color:C.amber,  bg:C.amberBg },
              { label:'صافي الربح',          value: fmt(kpis.netProfit),     color: kpis.netProfit >= 0 ? C.green : C.red, bg: kpis.netProfit >= 0 ? C.greenLt : C.redBg },
              { label:'أفضل شهر',            value: kpis.bestMonth !== null ? MONTH_NAMES[kpis.bestMonth] : '—', color:C.text, bg:C.card },
            ].map(k => (
              <div key={k.label} style={{ background:k.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', boxShadow:C.shadow }}>
                <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>{k.label}</p>
                <p style={{ margin:0, fontSize:20, fontWeight:800, color:k.color, letterSpacing:'-0.3px' }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Overall summary card */}
        {!loading && kpis && hasData && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 20px', marginBottom:20, boxShadow:C.shadow, animation:'fadeIn 0.25s ease' }}>
            <p style={{ margin:'0 0 12px', fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>ملخص إجمالي</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'center' }}>
              <div>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>إجمالي الدخل: </span>
                <span style={{ fontSize:14, fontWeight:800, color:C.green }}>{fmt(kpis.totalIncome)}</span>
              </div>
              <span style={{ color:C.border }}>|</span>
              <div>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>إجمالي المصروفات: </span>
                <span style={{ fontSize:14, fontWeight:800, color:C.amber }}>{fmt(kpis.totalExpenses)}</span>
              </div>
              <span style={{ color:C.border }}>|</span>
              <div>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>صافي الربح: </span>
                <span style={{ fontSize:14, fontWeight:800, color: kpis.netProfit >= 0 ? C.green : C.red }}>{fmt(kpis.netProfit)}</span>
              </div>
              <span style={{ color:C.border }}>|</span>
              <div>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>هامش الربح: </span>
                <span style={{ fontSize:14, fontWeight:800, color: kpis.netProfit >= 0 ? C.green : C.red }}>
                  {kpis.totalIncome > 0 ? `${((kpis.netProfit / kpis.totalIncome) * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background:C.card, borderRadius:16, boxShadow:C.shadow, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <table style={{ borderCollapse:'collapse', minWidth: 180 + months.length * 100, width:'100%' }}>

              <thead>
                <tr style={{ background:C.text }}>
                  <th style={{ width:180, minWidth:180, padding:'12px 16px', textAlign:'right', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', position:'sticky', right:0, background:C.text, zIndex:2, whiteSpace:'nowrap', boxShadow:'-2px 0 4px rgba(0,0,0,0.15)' }}>
                    الفئة
                  </th>
                  {months.map(m => (
                    <th key={m} style={{ width:100, minWidth:100, padding:'10px 8px', fontSize:11, fontWeight:700, color:'#fff', textAlign:'center', whiteSpace:'pre-line', lineHeight:1.4 }}>
                      {`${MONTH_NAMES[m]}\n${year}`}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Skeleton */}
                {loading && Array.from({length:7}).map((_,i) => <SkeletonRow key={i} cols={totalCols} />)}

                {/* Empty */}
                {!loading && !hasData && (
                  <tr>
                    <td colSpan={totalCols} style={{ padding:'56px 24px', textAlign:'center' }}>
                      <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                      <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:C.text }}>لا توجد بيانات مالية لهذه الفترة</p>
                      <p style={{ margin:0, fontSize:13, color:C.muted }}>جرّب تغيير السنة أو الربع</p>
                    </td>
                  </tr>
                )}

                {/* Data */}
                {!loading && hasData && (() => {
                  const rows = [];

                  // Income
                  rows.push(
                    <tr key="income" className="stmt-row" style={{ background:C.greenLt }}>
                      <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:C.green, position:'sticky', right:0, background:C.greenLt, zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)', whiteSpace:'nowrap' }}>
                        💰 دخل المبيعات
                      </td>
                      {months.map(m => (
                        <td
                          key={m}
                          title="انقر لعرض التفاصيل"
                          onClick={() => tableData.income[m] > 0 && setDrillDown({ year, month: m, category: 'income' })}
                          style={{ padding:'11px 8px', fontSize:13, color:C.green, fontWeight:600, textAlign:'center', cursor: tableData.income[m] > 0 ? 'pointer' : 'default' }}>
                          {fmt(tableData.income[m])}
                        </td>
                      ))}
                    </tr>
                  );

                  // Expenses header
                  rows.push(
                    <tr key="sep-exp" style={{ background:'#F5EDE5' }}>
                      <td colSpan={totalCols} style={{ padding:'7px 16px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.8px', textAlign:'right' }}>
                        ── المصروفات ──
                      </td>
                    </tr>
                  );

                  // Each expense category (filtered by filterCategory if set)
                  const visibleCats = filterCategory
                    ? EXP_CATS.filter(c => c.key === filterCategory)
                    : EXP_CATS;
                  visibleCats.forEach((cat, idx) => {
                    rows.push(
                      <tr key={cat.key} className="stmt-row" style={{ background: idx % 2 === 0 ? '#FFFDF9' : C.card }}>
                        <td style={{ padding:'10px 16px', fontSize:13, color:C.text, position:'sticky', right:0, background: idx % 2 === 0 ? '#FFFDF9' : C.card, zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.04)', whiteSpace:'nowrap' }}>
                          {cat.label}
                        </td>
                        {months.map(m => {
                          const v = tableData.expenses[cat.key]?.[m] ?? 0;
                          return (
                            <td
                              key={m}
                              title="انقر لعرض التفاصيل"
                              onClick={() => v > 0 && setDrillDown({ year, month: m, category: cat.key })}
                              style={{ padding:'10px 8px', fontSize:13, color:C.text, textAlign:'center', cursor: v > 0 ? 'pointer' : 'default' }}>
                              {fmt(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });

                  // Total expenses
                  rows.push(
                    <tr key="total-exp" style={{ background:C.amberBg, borderTop:`2px solid ${C.border}` }}>
                      <td style={{ padding:'11px 16px', fontSize:13, fontWeight:800, color:C.amber, position:'sticky', right:0, background:C.amberBg, zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)', whiteSpace:'nowrap' }}>
                        إجمالي المصروفات
                      </td>
                      {months.map(m => (
                        <td
                          key={m}
                          title="انقر لعرض إجمالي المصروفات"
                          onClick={() => tableData.totalExp[m] > 0 && setDrillDown({ year, month: m, category: 'total' })}
                          style={{ padding:'11px 8px', fontSize:13, color:C.amber, fontWeight:700, textAlign:'center', cursor: tableData.totalExp[m] > 0 ? 'pointer' : 'default' }}>
                          {fmt(tableData.totalExp[m])}
                        </td>
                      ))}
                    </tr>
                  );

                  // Net profit with trend arrows
                  rows.push(
                    <tr key="net-profit" style={{ borderTop:`2px solid ${C.border}` }}>
                      <td style={{ padding:'13px 16px', fontSize:14, fontWeight:800, color:C.text, position:'sticky', right:0, background:C.card, zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)', whiteSpace:'nowrap' }}>
                        صافي الربح
                      </td>
                      {months.map((m, idx) => {
                        const net  = tableData.netProfit[m] ?? 0;
                        const pos  = net >= 0;
                        const prev = idx > 0 ? (tableData.netProfit[months[idx - 1]] ?? 0) : null;
                        const trend = prev === null ? null : net > prev ? '↑' : net < prev ? '↓' : null;
                        return (
                          <td key={m} style={{
                            padding:'13px 8px', fontSize:13, fontWeight:800, textAlign:'center',
                            color: pos ? C.green : C.red,
                            background: pos ? C.greenLt : C.redBg,
                          }}>
                            {fmt(net)}
                            {trend && (
                              <span style={{ fontSize:11, marginRight:4, color: trend === '↑' ? C.green : C.red }}>{trend}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );

                  // Profit margin % row
                  rows.push(
                    <tr key="profit-margin" style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:'10px 16px', fontSize:13, fontWeight:700, color:C.muted, position:'sticky', right:0, background:C.card, zIndex:1, boxShadow:'-2px 0 4px rgba(0,0,0,0.04)', whiteSpace:'nowrap' }}>
                        هامش الربح %
                      </td>
                      {months.map(m => {
                        const inc = tableData.income[m] ?? 0;
                        const net = tableData.netProfit[m] ?? 0;
                        const margin = inc > 0 ? ((net / inc) * 100).toFixed(1) : null;
                        const pos = net >= 0;
                        return (
                          <td key={m} style={{ padding:'10px 8px', fontSize:12, fontWeight:700, textAlign:'center', color: margin === null ? C.muted : pos ? C.green : C.red }}>
                            {margin !== null ? `${margin}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* 22.3 — Expense breakdown by category (visual bars) */}
        {!loading && hasData && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginTop: 20, boxShadow: C.shadow, animation: 'fadeIn 0.25s ease' }}>
            <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>توزيع المصروفات حسب الفئة</p>
            {(() => {
              const periodTotals = EXP_CATS.map(cat => ({
                ...cat,
                total: months.reduce((s, m) => s + (tableData.expenses[cat.key]?.[m] ?? 0), 0),
              })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
              const grandTotal = periodTotals.reduce((s, c) => s + c.total, 0) || 1;
              if (periodTotals.length === 0) return <p style={{ margin: 0, fontSize: 13, color: C.muted }}>لا توجد مصروفات في هذه الفترة</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {periodTotals.map(cat => {
                    const pct = Math.round((cat.total / grandTotal) * 100);
                    return (
                      <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: C.text, flexShrink: 0 }}>{cat.label}</div>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.amber}, #FBBF24)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                        </div>
                        <div style={{ width: 120, display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>{fmt(cat.total)}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerStatements;
