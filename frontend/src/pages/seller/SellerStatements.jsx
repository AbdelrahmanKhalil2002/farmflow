import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getStatements, getDrillDown } from '../../services/statementsService';
import { addExpense, addIncome } from '../../services/financeService';
import { isDesktop } from '../../utils/platform';
import { useToast } from '../../components/Toast';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

// ─── Category metadata ────────────────────────────────────────────────────────
const CAT_META = {
  feed:        { labelKey: 'expenses.cat.feed',         emoji: '🌾' },
  doctor:      { labelKey: 'expenses.cat.doctor',       emoji: '🏥' },
  transport:   { labelKey: 'expenses.cat.transport',    emoji: '🚛' },
  electricity: { labelKey: 'expenses.cat.electricity',  emoji: '⚡' },
  salary:      { labelKey: 'expenses.cat.salary',       emoji: '👷' },
  rent:        { labelKey: 'expenses.cat.rent',         emoji: '🏠' },
  water:       { labelKey: 'expenses.cat.water',        emoji: '💧' },
  maintenance: { labelKey: 'expenses.cat.maintenance',  emoji: '🔧' },
  other:       { labelKey: 'expenses.cat.other',        emoji: '📦' },
};

const EXP_CATS = Object.entries(CAT_META).map(([key, m]) => ({ key, ...m }));

const MONTH_KEYS = [
  'common.month.jan','common.month.feb','common.month.mar','common.month.apr',
  'common.month.may','common.month.jun','common.month.jul','common.month.aug',
  'common.month.sep','common.month.oct','common.month.nov','common.month.dec',
];

// Arabic month names for the PDF/CSV export template (always Arabic)
const MONTH_NAMES_AR = [
  'يناير','فبراير','مارس','إبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
];

const QUARTER_MONTHS = { Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };
const CURRENT_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS   = [CURRENT_YEAR-2, CURRENT_YEAR-1, CURRENT_YEAR, CURRENT_YEAR+1];
const QUARTERS       = [
  { key: null, labelKey: 'statements.quarter.all' },
  { key: 'Q1', labelKey: 'statements.quarter.q1' },
  { key: 'Q2', labelKey: 'statements.quarter.q2' },
  { key: 'Q3', labelKey: 'statements.quarter.q3' },
  { key: 'Q4', labelKey: 'statements.quarter.q4' },
];

const fmt   = v => v ? `${Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م` : '—';
const today = () => new Date().toISOString().slice(0, 10);

// ─── Build statement HTML ─────────────────────────────────────────────────────
const buildStatementHTML = (year, months, tableData, tFn, kpis) => {
  const headerCols = ['الفئة', ...months.map(m => `${MONTH_NAMES_AR[m]} ${year}`)];
  const makeRow = (cells, bold = false, bg = '') =>
    `<tr style="${bg ? `background:${bg}` : ''}">${cells.map((c,i) => `<td style="padding:6px 10px;text-align:${i===0?'right':'center'};border:1px solid #ddd;font-weight:${bold?'700':'400'};font-size:11px;">${c ?? '—'}</td>`).join('')}</tr>`;
  const fmtN = v => v ? Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م' : '—';
  const catLabel = c => `${c.emoji} ${tFn ? tFn(c.labelKey) : c.labelKey.split('.').pop()}`;
  const rows = [
    makeRow(headerCols, true),
    makeRow(['💰 دخل المبيعات', ...months.map(m => fmtN(tableData.income[m]))], true, '#F0F7F1'),
    `<tr><td colspan="${headerCols.length}" style="padding:4px 10px;font-size:10px;color:#888;font-weight:700;border:1px solid #ddd;">── المصروفات ──</td></tr>`,
    ...EXP_CATS.map(c => makeRow([catLabel(c), ...months.map(m => fmtN(tableData.expenses[c.key]?.[m]))])),
    makeRow(['📊 إجمالي المصروفات', ...months.map(m => fmtN(tableData.totalExp[m]))], true, '#FEF3C7'),
    makeRow(['💹 صافي الربح',        ...months.map(m => fmtN(tableData.netProfit[m]))], true, '#F0F7F1'),
  ];
  const kpiBox = kpis ? `
  <div style="display:flex;gap:14px;margin-bottom:16px">
    ${[
      { label:'إجمالي الدخل',      value: fmtN(kpis.totalIncome),   color:'#3A7D44' },
      { label:'إجمالي المصروفات',  value: fmtN(kpis.totalExpenses), color:'#D97706' },
      { label:'صافي الربح',         value: fmtN(kpis.netProfit),     color: kpis.netProfit >= 0 ? '#3A7D44' : '#DC2626' },
    ].map(k => `<div style="flex:1;border:1px solid #E8D5C0;border-radius:8px;padding:10px 14px;background:#FEFAF5">
      <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#8B6B5A;text-transform:uppercase">${k.label}</p>
      <p style="margin:0;font-size:16px;font-weight:800;color:${k.color}">${k.value}</p>
    </div>`).join('')}
  </div>` : '';
  return `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>كشف الحسابات ${year}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;direction:rtl;color:#2C1810}
h2{margin:0 0 3px;font-size:18px}.sub{margin:0 0 14px;color:#8B6B5A;font-size:12px}
table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style></head>
<body><h2>كشف الحسابات — FarmFlow</h2><p class="sub">سنة ${year}</p>
${kpiBox}
<table>${rows.join('')}</table>
<br/><button onclick="window.print()" style="padding:8px 20px;background:#3A7D44;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖸 طباعة / حفظ PDF</button>
</body></html>`;
};

// ─── Export helpers ───────────────────────────────────────────────────────────
const doExportPDF = async (year, months, tableData, toast, tFn, kpis) => {
  const html = buildStatementHTML(year, months, tableData, tFn, kpis);
  if (isDesktop) {
    const res = await window.electron.savePdf({ html, filename: `farmflow-statements-${year}.pdf` });
    if (res?.success) toast.success(
      <span>{tFn ? tFn('herd.csv.saved') : 'File saved'}
        <button onClick={() => window.electron.openFile(res.filePath)}
          style={{ marginRight:8, background:'none', border:'none', color:'#3A7D44', cursor:'pointer', fontWeight:700, fontSize:13 }}>{tFn ? tFn('herd.csv.open') : 'Open'} ←</button>
      </span>
    );
  } else {
    const w = window.open('', '_blank', 'width=900,height=650');
    if (w) { w.document.write(html); w.document.close(); }
  }
};

const doExportCSV = async (year, months, tableData, toast, tFn) => {
  const header = ['الفئة', ...months.map(m => `${MONTH_NAMES_AR[m]} ${year}`)];
  const lines = [
    header,
    ['دخل المبيعات', ...months.map(m => tableData.income[m] ?? 0)],
    ['── المصروفات ──', ...months.map(() => '')],
    ...EXP_CATS.map(c => [tFn ? tFn(c.labelKey) : c.labelKey, ...months.map(m => tableData.expenses[c.key]?.[m] ?? 0)]),
    ['إجمالي المصروفات', ...months.map(m => tableData.totalExp[m] ?? 0)],
    ['صافي الربح',       ...months.map(m => tableData.netProfit[m] ?? 0)],
  ];
  const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  if (isDesktop) {
    const buffer = Array.from(new TextEncoder().encode('﻿' + csv));
    const res = await window.electron.saveFile({ filename: `farmflow-statements-${year}.csv`, buffer });
    if (res?.success) toast.success(
      <span>{tFn ? tFn('herd.csv.saved') : 'File saved'}
        <button onClick={() => window.electron.openFile(res.filePath)}
          style={{ marginRight:8, background:'none', border:'none', color:'#3A7D44', cursor:'pointer', fontWeight:700, fontSize:13 }}>{tFn ? tFn('herd.csv.open') : 'Open'} ←</button>
      </span>
    );
  } else {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `farmflow-statements-${year}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = ({ cols }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding:'10px 8px' }}>
        <div style={{ height:14, borderRadius:4,
          background:'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)',
          backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite',
          width: i === 0 ? 120 : 70 }} />
      </td>
    ))}
  </tr>
);

// ─── Drill-down modal ─────────────────────────────────────────────────────────
const CATEGORY_LABEL_KEY = Object.fromEntries([
  ['income', { emoji: '💰', labelKey: 'statements.row.income' }],
  ...EXP_CATS.map(c => [c.key, { emoji: c.emoji, labelKey: c.labelKey }]),
  ['total',  { emoji: '📊', labelKey: 'statements.row.totalExp' }],
]);

const DrillDownModal = ({ year, month, category, onClose, t }) => {
  const [records, setRecords] = useState(null);
  const [type,    setType]    = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    getDrillDown(year, month, category)
      .then(res => { setRecords(res.data.records); setType(res.data.type); })
      .catch(() => setError(t('statements.drillDown.loadErr')))
      .finally(() => setLoading(false));
  }, [year, month, category]);

  const fmtDate = d => new Date(d).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
  const fmtAmt  = v => `${Number(v).toLocaleString('ar-EG', { maximumFractionDigits:0 })} ج.م`;

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.card, borderRadius:18, width:'100%', maxWidth:580, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 16px 48px rgba(0,0,0,0.25)', animation:'fadeIn 0.2s ease' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ margin:'0 0 2px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>
              {t(MONTH_KEYS[month])} {year}
            </p>
            <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>
              {CATEGORY_LABEL_KEY[category] ? `${CATEGORY_LABEL_KEY[category].emoji} ${t(CATEGORY_LABEL_KEY[category].labelKey)}` : category}
            </h3>
          </div>
          <button type="button" onClick={onClose}
            style={{ background:'none', border:`1.5px solid ${C.border}`, borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:16, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'14px 22px 22px' }}>
          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:8 }}>
              {Array.from({length:5}).map((_,i) => (
                <div key={i} style={{ height:48, borderRadius:8, background:'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          )}
          {!loading && error && <p style={{ textAlign:'center', color:C.red, fontSize:13, paddingTop:16 }}>{error}</p>}
          {!loading && !error && records?.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
              <p style={{ margin:0, color:C.muted, fontSize:14 }}>{t('statements.drillDown.empty')}</p>
            </div>
          )}
          {!loading && !error && records?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
              <div style={{ background: type==='income' ? C.greenLt : C.amberBg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>{records.length} {t('statements.drillDown.transactions')}</span>
                <span style={{ fontSize:15, fontWeight:800, color: type==='income' ? C.green : C.amber }}>
                  {fmtAmt(records.reduce((s,r) => s + (r.amount ?? 0), 0))}
                </span>
              </div>
              {records.map((r,i) => (
                <div key={r._id ?? i} style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:'11px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.source || r.notes || r.description || r.category || (type==='income' ? t('statements.row.income') : t('statements.row.expense'))}
                    </p>
                    {r.notes && r.source && (
                      <p style={{ margin:0, fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes}</p>
                    )}
                    <p style={{ margin:'4px 0 0', fontSize:11, color:C.muted }}>{fmtDate(r.date)}</p>
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color: type==='income' ? C.green : C.amber, whiteSpace:'nowrap', flexShrink:0 }}>
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

// ─── Add Entry Modal ──────────────────────────────────────────────────────────
const AddEntryModal = ({ onClose, onSaved, toast, t }) => {
  const [mode,   setMode]   = useState('expense');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const [form,   setForm]   = useState({ category:'feed', amount:'', date:today(), note:'', type:'sale' });

  const upd = patch => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async e => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setErr(t('statements.addModal.invalidAmount')); return; }
    setSaving(true); setErr('');
    try {
      const base = { amount, date: form.date, ...(form.note ? { note: form.note } : {}) };
      if (mode === 'expense') {
        await addExpense({ ...base, category: form.category });
        toast.success(`✓ ${t('statements.addModal.expenseAdded')}`);
      } else {
        await addIncome({ ...base, type: form.type });
        toast.success(`✓ ${t('statements.addModal.incomeAdded')}`);
      }
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || t('common.unknownErr'));
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.card, borderRadius:20, width:'100%', maxWidth:480, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.28)', animation:'fadeIn 0.2s ease', overflow:'hidden' }}>

        {/* Tab switcher */}
        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
          {[
            { k:'expense', labelKey:'statements.addModal.tabExpense', ac:C.amber,  ab:C.amberBg },
            { k:'income',  labelKey:'statements.addModal.tabIncome',  ac:C.green,  ab:C.greenLt },
          ].map(tab => (
            <button key={tab.k} type="button" onClick={() => { setMode(tab.k); setErr(''); }}
              style={{ flex:1, padding:'15px 10px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:15, fontWeight:700,
                background: mode===tab.k ? tab.ab : '#F8FAF8',
                color: mode===tab.k ? tab.ac : C.muted,
                borderBottom: `3px solid ${mode===tab.k ? tab.ac : 'transparent'}`,
                transition:'all 0.15s' }}>
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ padding:'18px 20px 22px', overflowY:'auto', flex:1 }}>
          {err && <div style={{ background:C.redBg, color:C.red, borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:14 }}>{err}</div>}

          {/* Expense: 3×3 category grid */}
          {mode === 'expense' && (
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('expenses.form.category')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {EXP_CATS.map(cat => (
                  <button key={cat.key} type="button" onClick={() => upd({ category: cat.key })}
                    style={{ padding:'10px 6px', borderRadius:10,
                      border:`2px solid ${form.category===cat.key ? C.amber : C.border}`,
                      background: form.category===cat.key ? C.amberBg : C.card,
                      cursor:'pointer', fontFamily:'inherit',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all 0.12s' }}>
                    <span style={{ fontSize:20 }}>{cat.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: form.category===cat.key ? C.amber : C.text }}>{t(cat.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Income: type picker */}
          {mode === 'income' && (
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('income.form.source')}</p>
              <div style={{ display:'flex', gap:10 }}>
                {[{ k:'sale', labelKey:'statements.addModal.saleLabel', emoji:'🐄' }, { k:'deposit', labelKey:'statements.addModal.depositLabel', emoji:'💳' }].map(srcTab => (
                  <button key={srcTab.k} type="button" onClick={() => upd({ type: srcTab.k })}
                    style={{ flex:1, padding:'14px 8px', borderRadius:12,
                      border:`2px solid ${form.type===srcTab.k ? C.green : C.border}`,
                      background: form.type===srcTab.k ? C.greenLt : C.card,
                      cursor:'pointer', fontFamily:'inherit',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all 0.12s' }}>
                    <span style={{ fontSize:26 }}>{srcTab.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: form.type===srcTab.k ? C.green : C.text }}>{t(srcTab.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount + Date */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('expenses.form.amount')} (ج.م)</p>
              <input type="number" min="0" step="0.01" required value={form.amount}
                onChange={e => upd({ amount: e.target.value })} placeholder="0.00"
                style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:16, fontFamily:'inherit', boxSizing:'border-box', outline:'none', color:C.text }} />
            </div>
            <div>
              <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('expenses.form.date')}</p>
              <input type="date" required value={form.date} onChange={e => upd({ date: e.target.value })}
                style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', outline:'none', color:C.text }} />
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom:20 }}>
            <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('expenses.form.description')} {t('common.optional')}</p>
            <input type="text" value={form.note} onChange={e => upd({ note: e.target.value })} placeholder={t('expenses.form.descPlaceholder')}
              style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', outline:'none', color:C.text }} />
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'12px', borderRadius:10, border:`1.5px solid ${C.border}`, background:C.card, color:C.muted, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              style={{ flex:2, padding:'12px', borderRadius:10, border:'none',
                background: mode==='expense' ? C.amber : C.green, color:'#fff',
                fontSize:14, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily:'inherit', transition:'opacity 0.1s' }}>
              {saving ? t('common.saving') : mode==='expense' ? `✓ ${t('statements.addModal.saveExpense')}` : `✓ ${t('statements.addModal.saveIncome')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Monthly bar chart ────────────────────────────────────────────────────────
const MonthlyChart = ({ months, tableData, t }) => {
  const data   = months.map(m => ({ m, inc: tableData.income[m] ?? 0, exp: tableData.totalExp[m] ?? 0 }));
  const maxVal = Math.max(...data.flatMap(d => [d.inc, d.exp]), 1);
  const GW = 60, H = 88, BAR = 16, GAP = 3;

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 20px 10px', marginBottom:20, boxShadow:C.shadow, animation:'fadeIn 0.25s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('statements.chart.title')}</p>
        <div style={{ display:'flex', gap:14, fontSize:11, color:C.muted, fontWeight:600 }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:C.green, verticalAlign:'middle' }}/>{t('statements.chart.income')}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:C.amber, verticalAlign:'middle' }}/>{t('statements.chart.expenses')}
          </span>
        </div>
      </div>
      <div style={{ overflowX:'auto', paddingBottom:2 }}>
        <svg width={Math.max(months.length * GW, 1)} height={H + 22} style={{ display:'block', minWidth:'100%' }}>
          <line x1={0} y1={H} x2={months.length * GW} y2={H} stroke={C.border} strokeWidth={1}/>
          {data.map((d, i) => {
            const x    = i * GW;
            const incH = Math.round((d.inc / maxVal) * H);
            const expH = Math.round((d.exp / maxVal) * H);
            return (
              <g key={d.m} transform={`translate(${x},0)`}>
                <rect x={GW/2-BAR-GAP} y={H-incH} width={BAR} height={Math.max(incH,2)} fill={C.green} rx={3} opacity={0.82}/>
                <rect x={GW/2+GAP}     y={H-expH} width={BAR} height={Math.max(expH,2)} fill={C.amber} rx={3} opacity={0.82}/>
                <text x={GW/2} y={H+15} textAnchor="middle" fontSize={9} fill={C.muted} fontFamily="system-ui,sans-serif">
                  {t(MONTH_KEYS[d.m]).slice(0,3)}
                </text>
              </g>
            );
          })}
        </svg>
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
  const [drillDown,      setDrillDown]      = useState(null);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [hideEmpty,      setHideEmpty]      = useState(false);
  const [catsExpanded,   setCatsExpanded]   = useState(true);

  const toast    = useToast();
  const { t, isRTL } = useLang();
  const scrollRef = useRef(null);

  // JS frozen column: translate label cells to stay at the container's right edge.
  // This replaces CSS sticky which fails in RTL overflow contexts across browsers.
  const stickLabelCol = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Chrome RTL: scrollLeft = 0 at right-start, goes negative scrolling left.
    // Applying translateX(scrollLeft) moves the column left by the same amount
    // it naturally drifted right, keeping it pinned to the container's right edge.
    const tx = el.scrollLeft;
    el.querySelectorAll('.sc').forEach(cell => {
      cell.style.transform = `translateX(${tx}px)`;
    });
  }, []);

  // Attach scroll + resize listeners once.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(stickLabelCol);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', stickLabelCol);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', stickLabelCol);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stickLabelCol]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    getStatements(year)
      .then(res => setRawData(res.data))
      .catch(() => setError(t('statements.loadErr')))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const months = useMemo(() =>
    quarter ? QUARTER_MONTHS[quarter] : [0,1,2,3,4,5,6,7,8,9,10,11],
  [quarter]);

  const tableData = useMemo(() => {
    const income    = {};
    const expenses  = Object.fromEntries(EXP_CATS.map(c => [c.key, {}]));
    const totalExp  = {};
    const netProfit = {};
    if (Array.isArray(rawData)) {
      rawData.forEach(rec => {
        const m = rec.month;
        income[m] = rec.income ?? 0;
        let expSum = 0;
        EXP_CATS.forEach(cat => {
          const v = rec.expenses?.[cat.key] ?? 0;
          expenses[cat.key][m] = v;
          expSum += v;
        });
        totalExp[m]  = expSum;
        netProfit[m] = (rec.income ?? 0) - expSum;
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

  const visibleMonths = useMemo(() => {
    if (!hideEmpty || loading) return months;
    const filtered = months.filter(m =>
      (tableData.income[m] ?? 0) > 0 || (tableData.totalExp[m] ?? 0) > 0
    );
    return filtered.length > 0 ? filtered : months;
  }, [months, hideEmpty, loading, tableData]);

  // ── Desktop menu shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electron?.onMenuAction) return;
    return window.electron.onMenuAction(({ type }) => {
      if (type === 'export-csv') doExportCSV(year, visibleMonths, tableData, toast, t);
      if (type === 'export-pdf') doExportPDF(year, visibleMonths, tableData, toast, t, kpis);
    });
  }, [year, visibleMonths, tableData, toast]);

  // Re-pin after every layout change that affects row/column count.
  useLayoutEffect(() => {
    stickLabelCol();
  }, [stickLabelCol, loading, catsExpanded, filterCategory, visibleMonths.length]);

  const hasData   = rawData && Array.isArray(rawData) && rawData.some(r => r.income > 0 || Object.values(r.expenses || {}).some(v => v > 0));
  const totalCols = 1 + visibleMonths.length;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background:C.bg, minHeight:'100vh', fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .stmt-row:hover td { background:#F5F9F5 !important; }
        .add-btn:hover { opacity:0.88 !important; transform:translateY(-1px); }
        .add-btn { transition: opacity 0.15s, transform 0.15s !important; }
        .sc { position: relative; z-index: 10; will-change: transform; border-left: 1.5px solid #E0D0C0; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.greenDk} 0%, ${C.green} 60%, #4A9955 100%)`,
        padding:'20px 28px', display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'relative', overflow:'hidden',
      }}>
        <div aria-hidden="true" style={{ position:'absolute', left:-10, top:-18, fontSize:110, opacity:0.07, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>📊</div>
        <div>
          <h1 style={{ margin:0, fontSize:21, fontWeight:800, color:'#fff', letterSpacing:'-0.2px' }}>{t('statements.title')}</h1>
          <p style={{ margin:'2px 0 0', fontSize:13, color:'rgba(255,255,255,0.65)' }}>{t('statements.subtitle')}</p>
        </div>
        <button
          className="add-btn"
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:12,
            background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.35)',
            color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}>
          ＋ {t('statements.addEntry')}
        </button>
      </div>

      {drillDown && (
        <DrillDownModal year={drillDown.year} month={drillDown.month} category={drillDown.category} onClose={() => setDrillDown(null)} t={t} />
      )}
      {showAddModal && (
        <AddEntryModal onClose={() => setShowAddModal(false)} onSaved={load} toast={toast} t={t} />
      )}

      <div style={{ padding:'22px 28px 56px', maxWidth:1200, margin:'0 auto' }}>

        {/* Error */}
        {error && (
          <div role="alert" style={{ background:C.redBg, border:`1px solid #FECACA`, borderRadius:10, padding:'11px 16px', color:C.red, fontSize:14, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {error}
            <button type="button" onClick={() => setError('')} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
          </div>
        )}

        {/* Controls */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', marginBottom:22, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', boxShadow:C.shadow }}>

          {/* Year */}
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding:'8px 12px 8px 28px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:14, color:C.text, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Quarter chips */}
          <div style={{ display:'flex', gap:5 }}>
            {QUARTERS.map(q => (
              <button key={String(q.key)} type="button" onClick={() => setQuarter(q.key)}
                style={{ padding:'8px 13px', borderRadius:8,
                  border:`1.5px solid ${quarter===q.key ? C.green : C.border}`,
                  background: quarter===q.key ? C.green : C.card,
                  color: quarter===q.key ? '#fff' : C.muted,
                  fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit', outline:'none' }}>
                {t(q.labelKey)}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ padding:'8px 12px 8px 28px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:14, color:C.text, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
            <option value="">{t('statements.allCategories')}</option>
            {EXP_CATS.map(c => <option key={c.key} value={c.key}>{c.emoji} {t(c.labelKey)}</option>)}
          </select>

          {/* Hide empty toggle */}
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color: hideEmpty ? C.green : C.muted, userSelect:'none' }}>
            <input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)}
              style={{ accentColor:C.green, width:15, height:15, cursor:'pointer' }} />
            {t('statements.hideEmpty')}
          </label>

          <div style={{ flex:1 }} />

          {/* Export */}
          <div style={{ display:'flex', gap:7 }}>
            <button type="button" disabled={!hasData} onClick={() => doExportPDF(year, visibleMonths, tableData, toast, t, kpis)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, color:C.text, fontSize:13, fontWeight:600, cursor: hasData ? 'pointer' : 'not-allowed', opacity: hasData ? 1 : 0.45, fontFamily:'inherit' }}>
              🖨 PDF
            </button>
            <button type="button" disabled={!hasData} onClick={() => doExportCSV(year, visibleMonths, tableData, toast, t)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, color:C.text, fontSize:13, fontWeight:600, cursor: hasData ? 'pointer' : 'not-allowed', opacity: hasData ? 1 : 0.45, fontFamily:'inherit' }}>
              ⬇ CSV
            </button>
          </div>
        </div>

        {/* KPI strip */}
        {!loading && kpis && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:22, animation:'fadeIn 0.25s ease' }}>
            {[
              { label: t('statements.kpi.income'),    value:fmt(kpis.totalIncome),   color:C.green, bg:C.greenLt },
              { label: t('statements.kpi.expenses'),  value:fmt(kpis.totalExpenses), color:C.amber, bg:C.amberBg },
              { label: t('statements.kpi.profit'),    value:fmt(kpis.netProfit),     color: kpis.netProfit>=0 ? C.green : C.red, bg: kpis.netProfit>=0 ? C.greenLt : C.redBg },
              { label: t('statements.kpi.bestMonth'), value: kpis.bestMonth !== null ? t(MONTH_KEYS[kpis.bestMonth]) : '—', color:C.text, bg:C.card },
            ].map(k => (
              <div key={k.label} style={{ background:k.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', boxShadow:C.shadow }}>
                <p style={{ margin:'0 0 5px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>{k.label}</p>
                <p style={{ margin:0, fontSize:20, fontWeight:800, color:k.color, letterSpacing:'-0.3px' }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary bar */}
        {!loading && kpis && hasData && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 18px', marginBottom:18, boxShadow:C.shadow, animation:'fadeIn 0.25s ease' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'center' }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{t('statements.summary')}</span>
              <span style={{ color:C.border }}>|</span>
              <div><span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{t('statements.kpi.income')}: </span><span style={{ fontSize:14, fontWeight:800, color:C.green }}>{fmt(kpis.totalIncome)}</span></div>
              <span style={{ color:C.border }}>|</span>
              <div><span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{t('statements.kpi.expenses')}: </span><span style={{ fontSize:14, fontWeight:800, color:C.amber }}>{fmt(kpis.totalExpenses)}</span></div>
              <span style={{ color:C.border }}>|</span>
              <div><span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{t('statements.kpi.profit')}: </span><span style={{ fontSize:14, fontWeight:800, color: kpis.netProfit>=0 ? C.green : C.red }}>{fmt(kpis.netProfit)}</span></div>
              <span style={{ color:C.border }}>|</span>
              <div><span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{t('statements.kpi.margin')}: </span><span style={{ fontSize:14, fontWeight:800, color: kpis.netProfit>=0 ? C.green : C.red }}>{kpis.totalIncome > 0 ? `${((kpis.netProfit/kpis.totalIncome)*100).toFixed(1)}%` : '—'}</span></div>
            </div>
          </div>
        )}

        {/* Monthly chart */}
        {!loading && hasData && (
          <MonthlyChart months={visibleMonths} tableData={tableData} t={t} />
        )}

        {/* Table */}
        <div style={{ borderRadius:16, boxShadow:C.shadow, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div ref={scrollRef} style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', background:C.card }}>
            <table style={{ borderCollapse:'collapse', minWidth: 160 + visibleMonths.length * 90, width:'100%' }}>

              <thead>
                <tr style={{ background:C.green }}>
                  <th className="sc" style={{ width:160, minWidth:160, padding:'11px 16px', textAlign:'right', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.8)', background:C.green, zIndex:20, whiteSpace:'nowrap', boxShadow:'-2px 0 4px rgba(0,0,0,0.10)' }}>
                    {t('statements.col.category')}
                  </th>
                  {visibleMonths.map(m => (
                    <th key={m} style={{ width:90, minWidth:90, padding:'9px 6px', fontSize:11, fontWeight:700, color:'#fff', textAlign:'center', whiteSpace:'nowrap' }}>
                      <div>{t(MONTH_KEYS[m])}</div>
                      <div style={{ fontSize:9, opacity:0.65, fontWeight:400 }}>{year}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && Array.from({length:7}).map((_,i) => <SkeletonRow key={i} cols={1 + months.length} />)}

                {!loading && !hasData && (
                  <tr>
                    <td colSpan={totalCols} style={{ padding:'56px 24px', textAlign:'center' }}>
                      <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                      <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:C.text }}>{t('statements.empty.title')}</p>
                      <p style={{ margin:'0 0 16px', fontSize:13, color:C.muted }}>{t('statements.empty.hint')}</p>
                      <button type="button" onClick={() => setShowAddModal(true)}
                        style={{ padding:'10px 22px', borderRadius:10, border:'none', background:C.green, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ＋ {t('statements.addEntry')}
                      </button>
                    </td>
                  </tr>
                )}

                {!loading && hasData && (() => {
                  const rows = [];

                  // Income row
                  rows.push(
                    <tr key="income" className="stmt-row" style={{ background:C.greenLt }}>
                      <td className="sc" style={{ padding:'11px 12px', fontSize:13, fontWeight:700, color:C.green, background:C.greenLt, zIndex:10, boxShadow:'-2px 0 4px rgba(0,0,0,0.05)', whiteSpace:'nowrap' }}>
                        💰 {t('statements.row.income')}
                      </td>
                      {visibleMonths.map(m => (
                        <td key={m} title={t('statements.clickForDetails')}
                          onClick={() => tableData.income[m] > 0 && setDrillDown({ year, month:m, category:'income' })}
                          style={{ padding:'11px 6px', fontSize:13, color:C.green, fontWeight:600, textAlign:'center', cursor: tableData.income[m] > 0 ? 'pointer' : 'default' }}>
                          {fmt(tableData.income[m])}
                        </td>
                      ))}
                    </tr>
                  );

                  // Expenses section header (collapsible)
                  rows.push(
                    <tr key="sep-exp" style={{ background:'#F5EDE5', cursor:'pointer' }} onClick={() => setCatsExpanded(v => !v)}>
                      <td colSpan={totalCols} style={{ padding:'8px 16px', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.8px', userSelect:'none' }}>
                        <span style={{ marginLeft:6, fontSize:10 }}>{catsExpanded ? '▼' : '▶'}</span>
                        {t('statements.row.expenses')} {!catsExpanded && <span style={{ fontWeight:400 }}>({t('statements.clickToExpand')})</span>}
                      </td>
                    </tr>
                  );

                  // Individual expense categories (collapsible)
                  if (catsExpanded) {
                    const visibleCats = filterCategory
                      ? EXP_CATS.filter(c => c.key === filterCategory)
                      : EXP_CATS;
                    visibleCats.forEach((cat, idx) => {
                      rows.push(
                        <tr key={cat.key} className="stmt-row" style={{ background: idx % 2 === 0 ? '#FFFDF9' : C.card }}>
                          <td className="sc" style={{ padding:'10px 12px', fontSize:13, color:C.text, background: idx % 2 === 0 ? '#FFFDF9' : C.card, zIndex:10, boxShadow:'-2px 0 4px rgba(0,0,0,0.04)', whiteSpace:'nowrap' }}>
                            {cat.emoji} {t(cat.labelKey)}
                          </td>
                          {visibleMonths.map(m => {
                            const v = tableData.expenses[cat.key]?.[m] ?? 0;
                            return (
                              <td key={m} title={t('statements.clickForDetails')}
                                onClick={() => v > 0 && setDrillDown({ year, month:m, category:cat.key })}
                                style={{ padding:'10px 6px', fontSize:13, color: v > 0 ? C.text : C.muted, textAlign:'center', cursor: v > 0 ? 'pointer' : 'default' }}>
                                {v > 0 ? fmt(v) : <span style={{ opacity:0.35 }}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  }

                  // Total expenses
                  rows.push(
                    <tr key="total-exp" style={{ background:C.amberBg, borderTop:`2px solid ${C.border}` }}>
                      <td className="sc" style={{ padding:'11px 12px', fontSize:13, fontWeight:800, color:C.amber, background:C.amberBg, zIndex:10, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)', whiteSpace:'nowrap' }}>
                        📊 {t('statements.row.totalExp')}
                      </td>
                      {visibleMonths.map(m => (
                        <td key={m} title={t('statements.clickForDetails')}
                          onClick={() => tableData.totalExp[m] > 0 && setDrillDown({ year, month:m, category:'total' })}
                          style={{ padding:'11px 6px', fontSize:13, color:C.amber, fontWeight:700, textAlign:'center', cursor: tableData.totalExp[m] > 0 ? 'pointer' : 'default' }}>
                          {fmt(tableData.totalExp[m])}
                        </td>
                      ))}
                    </tr>
                  );

                  // Net profit with trend arrows
                  rows.push(
                    <tr key="net-profit" style={{ borderTop:`2px solid ${C.border}` }}>
                      <td className="sc" style={{ padding:'13px 12px', fontSize:14, fontWeight:800, color:C.text, background:C.card, zIndex:10, boxShadow:'-2px 0 4px rgba(0,0,0,0.06)', whiteSpace:'nowrap' }}>
                        💹 {t('statements.row.netProfit')}
                      </td>
                      {visibleMonths.map((m, idx) => {
                        const net   = tableData.netProfit[m] ?? 0;
                        const pos   = net >= 0;
                        const prev  = idx > 0 ? (tableData.netProfit[visibleMonths[idx-1]] ?? 0) : null;
                        const trend = prev === null ? null : net > prev ? '↑' : net < prev ? '↓' : null;
                        return (
                          <td key={m} style={{ padding:'13px 6px', fontSize:13, fontWeight:800, textAlign:'center', color: pos ? C.green : C.red, background: pos ? C.greenLt : C.redBg }}>
                            {fmt(net)}
                            {trend && <span style={{ fontSize:11, marginRight:3, color: trend==='↑' ? C.green : C.red }}>{trend}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );

                  // Profit margin %
                  rows.push(
                    <tr key="margin" style={{ borderTop:`1px solid ${C.border}` }}>
                      <td className="sc" style={{ padding:'10px 12px', fontSize:13, fontWeight:700, color:C.muted, background:C.card, zIndex:10, boxShadow:'-2px 0 4px rgba(0,0,0,0.04)', whiteSpace:'nowrap' }}>
                        {t('statements.row.margin')}
                      </td>
                      {visibleMonths.map(m => {
                        const inc = tableData.income[m] ?? 0;
                        const net = tableData.netProfit[m] ?? 0;
                        const margin = inc > 0 ? ((net/inc)*100).toFixed(1) : null;
                        return (
                          <td key={m} style={{ padding:'10px 6px', fontSize:12, fontWeight:700, textAlign:'center', color: margin===null ? C.muted : net>=0 ? C.green : C.red }}>
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

        {/* Expense breakdown bars */}
        {!loading && hasData && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 22px', marginTop:18, boxShadow:C.shadow, animation:'fadeIn 0.25s ease' }}>
            <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px' }}>{t('statements.expBreakdown')}</p>
            {(() => {
              const totals = EXP_CATS.map(cat => ({
                ...cat,
                total: visibleMonths.reduce((s,m) => s + (tableData.expenses[cat.key]?.[m] ?? 0), 0),
              })).filter(c => c.total > 0).sort((a,b) => b.total - a.total);
              const grand = totals.reduce((s,c) => s + c.total, 0) || 1;
              if (totals.length === 0) return <p style={{ margin:0, fontSize:13, color:C.muted }}>{t('statements.noExpenses')}</p>;
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {totals.map(cat => {
                    const pct = Math.round((cat.total / grand) * 100);
                    return (
                      <div key={cat.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:20, fontSize:14, flexShrink:0, textAlign:'center' }}>{cat.emoji}</div>
                        <div style={{ width:68, fontSize:12, fontWeight:700, color:C.text, flexShrink:0 }}>{t(cat.labelKey)}</div>
                        <div style={{ flex:1, height:8, borderRadius:4, background:C.border, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${C.amber},#FBBF24)`, borderRadius:4, transition:'width 0.8s ease' }} />
                        </div>
                        <div style={{ width:130, display:'flex', gap:5, justifyContent:'flex-end', flexShrink:0 }}>
                          <span style={{ fontSize:12, fontWeight:800, color:C.amber }}>{fmt(cat.total)}</span>
                          <span style={{ fontSize:11, color:C.muted }}>({pct}%)</span>
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
