import { useEffect, useMemo, useRef, useState } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../../services/financeService';
import { getMyListings } from '../../services/listingService';
import { fmt } from '../../utils/format';
import { useToast } from '../../components/Toast';
import { isDesktop } from '../../utils/platform';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

// ─── Category metadata ─────────────────────────────────────────────────────────
const CATS = {
  // Livestock-specific
  feed:         { labelKey: 'expenses.cat.feed',         emoji: '🌾', bg: C.amberBg,  color: C.amberText,   bar: '#D97706', group: 'livestock' },
  doctor:       { labelKey: 'expenses.cat.doctor',       emoji: '🏥', bg: C.blueBg,   color: C.blueText,    bar: '#2563EB', group: 'livestock' },
  transport:    { labelKey: 'expenses.cat.transport',    emoji: '🚛', bg: C.purpleBg, color: C.purpleText,  bar: '#7C3AED', group: 'livestock' },
  // Monthly farm
  electricity:  { labelKey: 'expenses.cat.electricity',  emoji: '⚡', bg: '#FEF9C3',  color: '#713F12',     bar: '#CA8A04', group: 'monthly'   },
  salary:       { labelKey: 'expenses.cat.salary',       emoji: '👷', bg: C.greenBg,  color: C.greenText,   bar: '#16A34A', group: 'monthly'   },
  rent:         { labelKey: 'expenses.cat.rent',         emoji: '🏠', bg: '#DBEAFE',  color: '#1E40AF',     bar: '#3B82F6', group: 'monthly'   },
  water:        { labelKey: 'expenses.cat.water',        emoji: '💧', bg: '#CFFAFE',  color: '#0C4A6E',     bar: '#0891B2', group: 'monthly'   },
  maintenance:  { labelKey: 'expenses.cat.maintenance',  emoji: '🔧', bg: '#FCE7F3',  color: '#831843',     bar: '#DB2777', group: 'monthly'   },
  other:        { labelKey: 'expenses.cat.other',        emoji: '📦', bg: '#F3F4F6',  color: '#374151',     bar: '#9CA3AF', group: 'monthly'   },
};

const CAT_KEYS          = ['feed', 'doctor', 'transport', 'electricity', 'salary', 'rent', 'water', 'maintenance', 'other'];
const LIVESTOCK_CAT_KEYS = ['feed', 'doctor', 'transport'];
const MONTHLY_CAT_KEYS   = ['electricity', 'salary', 'rent', 'water', 'maintenance', 'other'];

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = { category: 'feed', amount: '', date: today(), note: '', listing: '', recurringDay: '' };

// ─── Helpers ───────────────────────────────────────────────────────────────────
const parseApiErr = (err) => {
  const d = err?.response?.data;
  if (!d) return 'Network error. Please try again.';
  if (d.errors?.length) return d.errors[0].msg;
  return d.message || 'Something went wrong.';
};

const fmtSAR = (v) => `${fmt(v ?? 0)} ج.م`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

const startOf = (year, month) => new Date(year, month, 1);
const endOf   = (year, month) => new Date(year, month + 1, 0, 23, 59, 59);

const inRange = (dateStr, from, to) => {
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to   && d > new Date(to + 'T23:59:59')) return false;
  return true;
};

// ─── CSV export ────────────────────────────────────────────────────────────────
const exportCSV = async (rows, toast, tFn) => {
  const filename = `farmflow-expenses-${today()}.csv`;
  const header = ['Date', 'Category', 'Description', 'Linked Animal', 'Amount (EGP)'];
  const lines = rows.map(e => [
    new Date(e.date).toISOString().slice(0, 10),
    tFn ? tFn(CATS[e.category]?.labelKey || 'expenses.cat.other') : (e.category || ''),
    e.note || '',
    e.listing ? `${e.listing.type} — ${e.listing.breed || ''}`.trim() : '',
    e.amount,
  ]);
  const csv = [header, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  if (isDesktop) {
    const buffer = Array.from(new TextEncoder().encode('﻿' + csv));
    const res = await window.electron.saveFile({ filename, buffer });
    if (res?.success) toast?.success(
      <span>{tFn ? tFn('herd.csv.saved') : 'File saved'}
        <button onClick={() => window.electron.openFile(res.filePath)}
          style={{ marginRight:8, background:'none', border:'none', color:'#3A7D44', cursor:'pointer', fontWeight:700, fontSize:13 }}>{tFn ? tFn('herd.csv.open') : 'Open'} ←</button>
      </span>
    );
  } else {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};

// ─── PDF export ────────────────────────────────────────────────────────────────
const buildExpensesHTML = (rows, dateFrom, dateTo, tFn) => {
  const fmtN = v => v ? Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م' : '—';
  const fmtD = d => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  const total = rows.reduce((s, e) => s + (e.amount || 0), 0);

  const catTotals = Object.fromEntries(CAT_KEYS.map(k => [k, 0]));
  rows.forEach(e => { if (catTotals[e.category] !== undefined) catTotals[e.category] += e.amount || 0; });

  const dateRange = dateFrom && dateTo
    ? `${dateFrom} → ${dateTo}`
    : dateFrom ? `من ${dateFrom}`
    : dateTo   ? `حتى ${dateTo}`
    : 'جميع الفترات';

  const makeTd = (txt, right = false, bold = false, bg = '') =>
    `<td style="padding:7px 10px;text-align:${right ? 'right' : 'center'};border:1px solid #ddd;font-weight:${bold ? '700' : '400'};font-size:11px;${bg ? `background:${bg};` : ''}">${txt ?? '—'}</td>`;

  const catRows = CAT_KEYS
    .filter(k => catTotals[k] > 0)
    .sort((a, b) => catTotals[b] - catTotals[a])
    .map(k => `<tr>
      ${makeTd(`${CATS[k].emoji} ${tFn ? tFn(CATS[k].labelKey) : k}`, true)}
      ${makeTd(fmtN(catTotals[k]))}
      ${makeTd(total > 0 ? `${((catTotals[k] / total) * 100).toFixed(1)}%` : '—')}
    </tr>`).join('');

  const txRows = rows.map(e => `<tr>
    ${makeTd(fmtD(e.date), true)}
    ${makeTd(`${CATS[e.category]?.emoji || ''} ${tFn ? tFn(CATS[e.category]?.labelKey || 'expenses.cat.other') : e.category}`, true)}
    ${makeTd(e.note || '—', true)}
    ${makeTd(e.listing ? `${e.listing.type}${e.listing.breed ? ' — ' + e.listing.breed : ''}` : '—', true)}
    ${makeTd(fmtN(e.amount))}
  </tr>`).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير المصروفات</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;direction:rtl;color:#2C1810}
  h2{margin:0 0 3px;font-size:18px}
  .sub{margin:0 0 18px;color:#8B6B5A;font-size:12px}
  .kpi-row{display:flex;gap:14px;margin-bottom:18px}
  .kpi{flex:1;border:1px solid #E8D5C0;border-radius:8px;padding:12px 16px;background:#FEFAF5}
  .kpi p{margin:0}.kpi .lbl{font-size:10px;font-weight:700;color:#8B6B5A;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px!important}
  .kpi .val{font-size:18px;font-weight:800;color:#DC2626}
  .kpi.cnt .val{color:#2C1810;font-size:16px}
  h3{font-size:12px;font-weight:700;color:#8B6B5A;text-transform:uppercase;letter-spacing:.6px;margin:18px 0 7px}
  table{border-collapse:collapse;width:100%;margin-bottom:16px}
  th{background:#3A7D44;color:#fff;padding:8px 10px;font-size:11px;font-weight:700;text-align:right;border:1px solid #2D6235}
  th:not(:first-child){text-align:center}
  .foot td{background:#FEF3C7;font-weight:700;color:#92400E}
  @media print{button{display:none}}
</style></head>
<body>
  <h2>تقرير المصروفات — FarmFlow</h2>
  <p class="sub">الفترة: ${dateRange} &nbsp;|&nbsp; تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
  <div class="kpi-row">
    <div class="kpi"><p class="lbl">إجمالي المصروفات</p><p class="val">${fmtN(total)}</p></div>
    <div class="kpi cnt"><p class="lbl">عدد المعاملات</p><p class="val">${rows.length}</p></div>
  </div>
  <h3>تفصيل حسب الفئة</h3>
  <table>
    <thead><tr><th>الفئة</th><th>الإجمالي</th><th>النسبة</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot class="foot"><tr>
      ${makeTd('الإجمالي', true, true, '#FEF3C7')}
      ${makeTd(fmtN(total), false, true, '#FEF3C7')}
      ${makeTd('100%', false, true, '#FEF3C7')}
    </tr></tfoot>
  </table>
  <h3>المعاملات (${rows.length})</h3>
  <table>
    <thead><tr><th>التاريخ</th><th>الفئة</th><th>الوصف</th><th>الحيوان</th><th>المبلغ</th></tr></thead>
    <tbody>${txRows}</tbody>
    <tfoot class="foot"><tr>
      <td colspan="4" style="padding:7px 10px;text-align:right;border:1px solid #ddd;font-size:11px;font-weight:700;background:#FEF3C7">الإجمالي</td>
      ${makeTd(fmtN(total), false, true, '#FEF3C7')}
    </tr></tfoot>
  </table>
  <button onclick="window.print()" style="padding:8px 20px;background:#3A7D44;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖸 طباعة / حفظ PDF</button>
</body></html>`;
};

const doExportExpensesPDF = async (rows, dateFrom, dateTo, toast, tFn) => {
  const html = buildExpensesHTML(rows, dateFrom, dateTo, tFn);
  if (isDesktop) {
    const res = await window.electron.savePdf({ html, filename: `farmflow-expenses-${today()}.pdf` });
    if (res?.success) toast?.success(
      <span>{tFn ? tFn('herd.csv.saved') : 'File saved'}
        <button onClick={() => window.electron.openFile(res.filePath)}
          style={{ marginRight:8, background:'none', border:'none', color:'#3A7D44', cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {tFn ? tFn('herd.csv.open') : 'Open'} ←
        </button>
      </span>
    );
  } else {
    const w = window.open('', '_blank', 'width=940,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  }
};

// ─── Category badge ────────────────────────────────────────────────────────────
const CatBadge = ({ cat, small, t }) => {
  const m = CATS[cat] || CATS.other;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: small ? '4px' : '5px', padding: small ? '3px 8px' : '4px 10px', borderRadius: '20px', background: m.bg, color: m.color, fontSize: small ? '11px' : '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {m.emoji} {t(m.labelKey)}
    </span>
  );
};

// ─── Focusable input ───────────────────────────────────────────────────────────
const FI = ({ style = {}, ...rest }) => {
  const [f, setF] = useState(false);
  return (
    <input {...rest}
      onFocus={e => { setF(true); rest.onFocus?.(e); }}
      onBlur={e => { setF(false); rest.onBlur?.(e); }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${f ? C.green : C.border}`, background: '#fff', fontSize: '14px', color: C.text, transition: 'border-color 0.15s', fontFamily: 'inherit', ...style }}
    />
  );
};

const FSelect = ({ style = {}, children, ...rest }) => {
  const [f, setF] = useState(false);
  return (
    <select {...rest}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${f ? C.green : C.border}`, background: '#fff', fontSize: '14px', color: C.text, cursor: 'pointer', fontFamily: 'inherit', ...style }}
    >
      {children}
    </select>
  );
};

// ─── Category breakdown bar chart ─────────────────────────────────────────────
const BreakdownBars = ({ totals, grandTotal, t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {CAT_KEYS.map(k => {
      const m   = CATS[k];
      const amt = totals[k] || 0;
      const pct = grandTotal > 0 ? (amt / grandTotal * 100) : 0;
      return (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: C.textMuted }}>{m.emoji} {t(m.labelKey)}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{fmtSAR(amt)} <span style={{ fontWeight: 400, color: C.textMuted }}>({pct.toFixed(0)}%)</span></span>
          </div>
          <div style={{ height: '7px', background: '#EDE0D4', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: m.bar, borderRadius: '4px', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
const SellerExpenses = () => {
  const toast  = useToast();
  const { t }  = useLang();
  const [expenses,  setExpenses]  = useState([]);
  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');

  // Form state
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);   // null = adding new
  const [receipt,    setReceipt]    = useState(null);   // File | null
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState('');
  const [formOpen,   setFormOpen]   = useState(true);

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // Filters
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const formRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([getExpenses(), getMyListings()])
      .then(([expRes, listRes]) => {
        setExpenses(expRes.data);
        setListings(listRes.data);
      })
      .catch(() => setFetchErr(t('expenses.loadErr')))
      .finally(() => setLoading(false));
  }, []);

  // ── Summary calculations ─────────────────────────────────────────────────
  const now = new Date();
  const thisMonthStart = startOf(now.getFullYear(), now.getMonth());
  const thisMonthEnd   = endOf(now.getFullYear(), now.getMonth());
  const lastMonthStart = startOf(now.getFullYear(), now.getMonth() - 1);
  const lastMonthEnd   = endOf(now.getFullYear(), now.getMonth() - 1);

  const thisMonth = useMemo(() =>
    expenses.filter(e => { const d = new Date(e.date); return d >= thisMonthStart && d <= thisMonthEnd; }),
    [expenses]
  );
  const lastMonth = useMemo(() =>
    expenses.filter(e => { const d = new Date(e.date); return d >= lastMonthStart && d <= lastMonthEnd; }),
    [expenses]
  );

  const thisMonthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonth.reduce((s, e) => s + e.amount, 0);

  const trendPct = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100)
    : null;

  const thisMonthCatTotals = useMemo(() => {
    const t = Object.fromEntries(CAT_KEYS.map(k => [k, 0]));
    thisMonth.forEach(e => { t[e.category] = (t[e.category] || 0) + e.amount; });
    return t;
  }, [thisMonth]);

  // ── Filtered + searched list ─────────────────────────────────────────────
  const visible = useMemo(() => {
    return expenses.filter(e => {
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      if (!inRange(e.date, dateFrom, dateTo)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const note = (e.note || '').toLowerCase();
        const animal = e.listing ? `${e.listing.type} ${e.listing.breed || ''}`.toLowerCase() : '';
        if (!note.includes(q) && !animal.includes(q) && !(CATS[e.category]?.label || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [expenses, catFilter, dateFrom, dateTo, search]);

  // ── Desktop menu shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electron?.onMenuAction) return;
    return window.electron.onMenuAction(({ type }) => {
      if (type === 'export-csv') exportCSV(visible, toast, t);
      if (type === 'export-pdf') doExportExpensesPDF(visible, dateFrom, dateTo, toast, t);
    });
  }, [visible, dateFrom, dateTo, toast, t]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const startEdit = (expense) => {
    setEditId(expense._id);
    setForm({
      category:     expense.category,
      amount:       String(expense.amount),
      date:         new Date(expense.date).toISOString().slice(0, 10),
      note:         expense.note || '',
      listing:      expense.listing?._id || '',
      recurringDay: expense.recurringDay != null ? String(expense.recurringDay) : '',
    });
    setFormErr('');
    setFormOpen(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setReceipt(null);
  };

  // ── Submit (add or update) ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setFormErr(t('expenses.form.invalidAmount')); return; }
    setFormErr('');
    setSubmitting(true);

    // Embed receipt filename into note if provided
    const note = receipt
      ? `[Receipt: ${receipt.name}] ${form.note}`.trim()
      : form.note;

    const rd = form.recurringDay !== '' ? parseInt(form.recurringDay, 10) : null;
    const payload = {
      category:     form.category,
      amount:       parseFloat(form.amount),
      date:         form.date || today(),
      note,
      ...(form.listing ? { listing: form.listing } : {}),
      recurringDay: rd,
    };

    try {
      if (editId) {
        const { data } = await updateExpense(editId, payload);
        setExpenses(prev => prev.map(x => x._id === editId ? data : x));
        setEditId(null);
        toast.success(t('expenses.updateSuccess'));
      } else {
        const { data } = await addExpense(payload);
        setExpenses(prev => [data, ...prev]);
        toast.success(t('expenses.addSuccess'));
      }
      setForm(EMPTY_FORM);
      setReceipt(null);
    } catch (err) {
      setFormErr(parseApiErr(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(x => x._id !== id));
      toast.success(t('expenses.deleteSuccess'));
    } catch {
      toast.error(t('expenses.deleteErr'));
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        .exp-row:hover { background: #FDFAF6 !important; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ background: 'linear-gradient(135deg, #2C1810 0%, #5C3317 55%, #7C4A1E 100%)', padding: '24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -8, top: -20, fontSize: '120px', opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>📉</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>{t('expenses.title')}</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              {loading ? t('common.loading') : `${expenses.length} ${t('expenses.registeredCount')}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => doExportExpensesPDF(visible, dateFrom, dateTo, toast, t)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              🖨 PDF
            </button>
            <button type="button" onClick={() => exportCSV(visible, toast, t)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              ⬇ {t('expenses.downloadCSV')}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px 56px', maxWidth: '1050px', margin: '0 auto' }}>

        {/* Fetch error */}
        {fetchErr && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '10px', padding: '11px 16px', color: C.redText, fontSize: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            {fetchErr}
            <button type="button" onClick={() => setFetchErr('')} aria-label={t('common.closeError')} style={{ background: 'none', border: 'none', color: C.redText, cursor: 'pointer', fontSize: '15px' }}><span aria-hidden="true">✕</span></button>
          </div>
        )}

        {/* ── Summary strip ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '14px', marginBottom: '24px' }}>

            {/* Total this month */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{t('expenses.thisMonth')}</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: C.redText, letterSpacing: '-0.5px', lineHeight: 1 }}>
                {fmtSAR(thisMonthTotal)}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textMuted }}>
                {thisMonth.length} {t('expenses.expenseCount')}
              </p>
            </div>

            {/* Trend vs last month */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{t('expenses.vsLastMonth')}</p>
              {trendPct === null ? (
                <p style={{ margin: 0, fontSize: '15px', color: C.textMuted }}>{t('common.noData')}</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: 1, color: trendPct > 0 ? C.redText : C.greenText }}>
                      {trendPct > 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                    </span>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textMuted }}>
                    {trendPct > 0 ? t('expenses.higher') : t('expenses.lower')} {t('expenses.than')} {fmtSAR(lastMonthTotal)}
                  </p>
                </>
              )}
            </div>

            {/* Category breakdown */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{t('expenses.categoryBreakdown')}</p>
              {thisMonthTotal === 0
                ? <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>{t('expenses.noExpensesThisMonth')}</p>
                : <BreakdownBars totals={thisMonthCatTotals} grandTotal={thisMonthTotal} t={t} />
              }
            </div>
          </div>
        )}

        {/* ── Add / Edit form ── */}
        <div ref={formRef} style={{ background: C.card, borderRadius: '16px', boxShadow: C.shadow, border: `1.5px solid ${editId ? C.tan : C.border}`, marginBottom: '24px', overflow: 'hidden' }}>
          {/* Form header */}
          <div role={!editId ? 'button' : undefined} tabIndex={!editId ? 0 : undefined}
            aria-expanded={!editId ? formOpen : undefined}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: formOpen ? `1px solid ${C.border}` : 'none', background: editId ? '#FFF8F0' : '#FAF5EF', cursor: !editId ? 'pointer' : 'default' }}
            onClick={() => { if (!editId) setFormOpen(p => !p); }}
            onKeyDown={e => { if (!editId && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setFormOpen(p => !p); } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{editId ? '✏️' : '➕'}</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: C.text }}>
                {editId ? t('expenses.editTitle') : t('expenses.addTitle')}
              </span>
              {editId && <span style={{ fontSize: '12px', color: C.textMuted }}>{t('expenses.editModeHint')}</span>}
            </div>
            {!editId && (
              <span style={{ color: C.textMuted, fontSize: '18px', transition: 'transform 0.2s', display: 'inline-block', transform: formOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            )}
          </div>

          {/* Form body */}
          {(formOpen || editId) && (
            <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>

                {/* Date */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.date')} *</div>
                  <FI type="date" value={form.date} onChange={e => setF('date', e.target.value)} required max={today()} />
                </div>

                {/* Category */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.category')} *</div>
                  <FSelect value={form.category} onChange={e => setF('category', e.target.value)} required>
                    <optgroup label={t('expenses.group.livestock')}>
                      {LIVESTOCK_CAT_KEYS.map(k => (
                        <option key={k} value={k}>{CATS[k].emoji} {t(CATS[k].labelKey)}</option>
                      ))}
                    </optgroup>
                    <optgroup label={t('expenses.group.monthly')}>
                      {MONTHLY_CAT_KEYS.map(k => (
                        <option key={k} value={k}>{CATS[k].emoji} {t(CATS[k].labelKey)}</option>
                      ))}
                    </optgroup>
                  </FSelect>
                </div>

                {/* Amount */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.amount')} *</div>
                  <div style={{ position: 'relative' }}>
                    <FI type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0.00" required style={{ paddingRight: '54px' }} />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
                  </div>
                </div>

                {/* Linked animal */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.linkedAnimal')} <span style={{ fontWeight: 400, textTransform: 'none' }}>{t('common.optional')}</span></div>
                  <FSelect value={form.listing} onChange={e => setF('listing', e.target.value)}>
                    <option value="">— {t('expenses.form.noAnimal')} —</option>
                    {listings.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.type} {l.breed ? `— ${l.breed}` : ''}
                      </option>
                    ))}
                  </FSelect>
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.description')}</div>
                <textarea
                  value={form.note}
                  onChange={e => setF('note', e.target.value)}
                  placeholder={t('expenses.form.descPlaceholder')}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '14px', color: C.text, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {/* Recurring toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.recurringDay !== '' ? C.greenBg : '#F9F5F0', border: `1px solid ${form.recurringDay !== '' ? '#BBF7D0' : C.border}`, borderRadius: '10px', gap: '12px', flexWrap: 'wrap', cursor: 'pointer' }}
                onClick={() => setF('recurringDay', form.recurringDay !== '' ? '' : String(new Date(form.date || today()).getDate()))}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: form.recurringDay !== '' ? C.greenText : C.text }}>🔁 تكرار شهري</div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
                    {form.recurringDay !== '' ? `يُنشأ تلقائيًا كل شهر في اليوم ${form.recurringDay}` : 'اضغط لتفعيل التكرار الشهري التلقائي'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
                  {form.recurringDay !== '' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: C.textMuted, whiteSpace: 'nowrap' }}>يوم</span>
                      <input
                        type="number" min="1" max="28"
                        value={form.recurringDay}
                        onChange={e => {
                          const v = Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1));
                          setF('recurringDay', String(v));
                        }}
                        style={{ width: '56px', padding: '6px 8px', border: `1.5px solid ${C.green}`, borderRadius: '7px', fontSize: '14px', fontWeight: '700', color: C.greenText, background: '#fff', textAlign: 'center', fontFamily: 'inherit' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => setF('recurringDay', form.recurringDay !== '' ? '' : String(new Date(form.date || today()).getDate()))}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: form.recurringDay !== '' ? C.green : '#D1D5DB', transition: 'background 0.2s' }} />
                    <div style={{ position: 'absolute', top: '3px', left: form.recurringDay !== '' ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>

              {/* Receipt upload */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('expenses.form.receipt')} <span style={{ fontWeight: 400, textTransform: 'none' }}>{t('common.optional')}</span></div>
                {receipt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 13px', background: C.greenBg, border: `1px solid #BBF7D0`, borderRadius: '9px' }}>
                    <span style={{ fontSize: '16px' }}>📎</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: C.greenText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receipt.name}</span>
                    <button type="button" onClick={() => setReceipt(null)} style={{ background: 'none', border: 'none', color: C.redText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>{t('expenses.form.removeReceipt')}</button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 13px', border: `1.5px dashed ${C.border}`, borderRadius: '9px', background: '#FDFAF7', cursor: 'pointer' }}>
                    <span style={{ fontSize: '16px' }}>📎</span>
                    <span style={{ fontSize: '13px', color: C.textMuted }}>{t('expenses.form.attachReceipt')}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => setReceipt(e.target.files[0] || null)} />
                  </label>
                )}
              </div>

              {/* Form error */}
              {formErr && (
                <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '9px', padding: '10px 13px', color: C.redText, fontSize: '13px' }}>
                  {formErr}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {editId && (
                  <button type="button" onClick={cancelEdit}
                    style={{ padding: '10px 18px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    {t('common.cancel')}
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 22px', borderRadius: '9px', border: 'none', background: submitting ? '#6AAF74' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.greenDark; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.green; }}
                >
                  {submitting ? t('common.saving') : editId ? `✓ ${t('expenses.form.update')}` : `+ ${t('expenses.form.submit')}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '140px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: C.textMuted, pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              aria-label={t('expenses.filter.searchLabel')}
              placeholder={t('expenses.filter.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 30px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '13px', color: C.text, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label={t('expenses.filter.clearSearch')} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '13px', padding: 0 }}><span aria-hidden="true">✕</span></button>
            )}
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {[{ k: 'all', label: t('common.all') }, ...CAT_KEYS.map(k => ({ k, label: `${CATS[k].emoji} ${t(CATS[k].labelKey)}` }))].map(({ k, label }) => (
              <button key={k} type="button" onClick={() => setCatFilter(k)}
                aria-pressed={catFilter === k}
                style={{ padding: '7px 12px', borderRadius: '20px', border: `1.5px solid ${catFilter === k ? C.green : C.border}`, background: catFilter === k ? C.green : C.card, color: catFilter === k ? '#fff' : C.textMuted, fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo || today()}
              aria-label={t('expenses.filter.dateFromLabel')}
              style={{ padding: '8px 10px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '12px', color: C.text }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <span aria-hidden="true" style={{ fontSize: '12px', color: C.textMuted }}>{t('common.to')}</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} max={today()}
              aria-label={t('expenses.filter.dateToLabel')}
              style={{ padding: '8px 10px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '12px', color: C.text }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ padding: '6px 10px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>
              {visible.length} {t('expenses.results')}
              {visible.length !== expenses.length ? ` (${t('expenses.outOf').replace('{total}', expenses.length)})` : ''}
            </span>
            {visible.length > 0 && (
              <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>
                {t('expenses.total')}: {fmtSAR(visible.reduce((s, e) => s + e.amount, 0))}
              </span>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: '58px', borderRadius: '12px', background: 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: '16px', border: `1.5px dashed ${C.border}` }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>{search || catFilter !== 'all' || dateFrom || dateTo ? '🔍' : '📋'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: C.text }}>
              {search || catFilter !== 'all' || dateFrom || dateTo ? t('expenses.empty.filteredTitle') : t('expenses.empty.title')}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: C.textMuted }}>
              {search || catFilter !== 'all' || dateFrom || dateTo
                ? t('expenses.empty.filteredHint')
                : t('expenses.empty.hint')}
            </p>
            {(search || catFilter !== 'all' || dateFrom || dateTo) && (
              <button type="button" onClick={() => { setSearch(''); setCatFilter('all'); setDateFrom(''); setDateTo(''); }}
                style={{ padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                {t('expenses.empty.clearAll')}
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            DESKTOP TABLE
        ══════════════════════════════════════════════════════════ */}
        {!loading && visible.length > 0 && !isMobile && (
          <div style={{ background: C.card, borderRadius: '16px', boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF5EF', borderBottom: `2px solid ${C.border}` }}>
                  {[t('expenses.col.date'), t('expenses.col.category'), t('expenses.col.description'), t('expenses.col.animal'), t('expenses.col.amount'), t('expenses.col.actions')].map((h, i) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: i >= 4 ? 'right' : 'left', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(exp => {
                  const isDelConfirm = deletingId === exp._id;
                  const isEditing    = editId === exp._id;
                  return (
                    <tr key={exp._id} className="exp-row"
                      style={{ borderBottom: `1px solid ${C.border}`, background: isEditing ? '#FFF8F0' : '#fff', transition: 'background 0.1s' }}>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {fmtDate(exp.date)}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 14px' }}>
                        <CatBadge cat={exp.category} small t={t} />
                      </td>

                      {/* Description */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.text, maxWidth: '220px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.note || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>{t('expenses.noDescription')}</span>}
                        </div>
                      </td>

                      {/* Animal */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {exp.listing
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span>🐾</span><span>{exp.listing.type}{exp.listing.breed ? ` — ${exp.listing.breed}` : ''}</span></span>
                          : '—'}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: C.text, whiteSpace: 'nowrap' }}>
                        {fmtSAR(exp.amount)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isDelConfirm ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: C.redText, fontWeight: '600' }}>{t('expenses.delete.confirm')}</span>
                            <button type="button" onClick={() => confirmDelete(exp._id)} disabled={deleting}
                              style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: C.red, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                              {deleting ? '…' : t('common.yes')}
                            </button>
                            <button type="button" onClick={() => setDeletingId(null)}
                              style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                              {t('common.no')}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button type="button" onClick={() => startEdit(exp)}
                              style={{ padding: '6px 11px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>
                              ✏ {t('common.edit')}
                            </button>
                            <button type="button" onClick={() => setDeletingId(exp._id)}
                              style={{ padding: '6px 11px', borderRadius: '7px', border: `1px solid #FECACA`, background: C.redBg, color: C.redText, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              🗑 {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer total */}
            <div style={{ padding: '12px 16px', background: '#FAF5EF', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: C.textMuted }}>{t('expenses.displayedTotal')}:</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: C.text }}>
                {fmtSAR(visible.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MOBILE CARDS
        ══════════════════════════════════════════════════════════ */}
        {!loading && visible.length > 0 && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visible.map(exp => {
              const isDelConfirm = deletingId === exp._id;
              return (
                <div key={exp._id} style={{ background: C.card, borderRadius: '14px', border: `1.5px solid ${editId === exp._id ? C.tan : C.border}`, boxShadow: C.shadow, overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ padding: '14px 14px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
                      <CatBadge cat={exp.category} t={t} />
                      <span style={{ fontWeight: '800', fontSize: '16px', color: C.text }}>{fmtSAR(exp.amount)}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: exp.note ? C.text : C.textMuted, fontStyle: exp.note ? 'normal' : 'italic', marginBottom: '6px' }}>
                      {exp.note || t('expenses.noDescription')}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: C.textMuted }}>
                      <span>📅 {fmtDate(exp.date)}</span>
                      {exp.listing && <span>🐾 {exp.listing.type}{exp.listing.breed ? ` — ${exp.listing.breed}` : ''}</span>}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
                    {isDelConfirm ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ flex: 1, fontSize: '13px', color: C.redText, fontWeight: '600' }}>{t('expenses.delete.confirmMsg')}</span>
                        <button type="button" onClick={() => confirmDelete(exp._id)} disabled={deleting}
                          style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: C.red, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                          {deleting ? '…' : t('common.delete')}
                        </button>
                        <button type="button" onClick={() => setDeletingId(null)}
                          style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => startEdit(exp)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ✏ {t('common.edit')}
                        </button>
                        <button type="button" onClick={() => setDeletingId(exp._id)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1px solid #FECACA`, background: C.redBg, color: C.redText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          🗑 {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerExpenses;
