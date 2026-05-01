import { useEffect, useMemo, useRef, useState } from 'react';
import { getIncome, addIncome, updateIncome, deleteIncome } from '../../services/financeService';
import { getMyListings } from '../../services/listingService';
import { fmt } from '../../utils/format';
import { useToast } from '../../components/Toast';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#F0FAF4',
  card:       '#FFFFFF',
  green:      '#3A7D44',
  greenDark:  '#2D6235',
  greenBg:    '#DCFCE7',
  greenText:  '#166534',
  greenLight: '#D1FAE5',
  teal:       '#0D9488',
  tealBg:     '#CCFBF1',
  tealText:   '#134E4A',
  amber:      '#D97706',
  amberBg:    '#FEF3C7',
  amberText:  '#92400E',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
  redText:    '#B91C1C',
  tan:        '#C49A6C',
  border:     '#BBF7D0',
  borderSoft: '#E8D5C0',
  text:       '#14532D',
  textBody:   '#1F2937',
  textMuted:  '#4B7A5A',
  shadow:     '0 1px 3px rgba(20,83,45,0.07), 0 4px 12px rgba(20,83,45,0.05)',
  shadowMd:   '0 4px 20px rgba(20,83,45,0.10)',
};

// ─── Source & status metadata ──────────────────────────────────────────────────
const SOURCE = {
  sale:    { label: 'بيع',    emoji: '💰', bg: C.greenBg,  color: C.greenText, dot: '#22C55E', donut: '#16A34A' },
  deposit: { label: 'عربون', emoji: '💳', bg: C.tealBg,   color: C.tealText,  dot: '#14B8A6', donut: '#0F766E' },
};

const STATUS_META = {
  received: { label: 'مُستلم', bg: C.greenBg,  color: C.greenText, dot: '#22C55E' },
  pending:  { label: 'معلّق',  bg: C.amberBg,  color: C.amberText, dot: '#F59E0B' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const parseApiErr = (err) => {
  const d = err?.response?.data;
  if (!d) return 'Network error. Please try again.';
  if (d.errors?.length) return d.errors[0].msg;
  return d.message || 'Something went wrong.';
};

const fmtSAR  = (v) => `${fmt(v ?? 0)} ج.م`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' });

const startOf = (y, m) => new Date(y, m,     1);
const endOf   = (y, m) => new Date(y, m + 1, 0, 23, 59, 59);

const inRange = (dateStr, from, to) => {
  const d = new Date(dateStr);
  if (from && d < new Date(from))           return false;
  if (to   && d > new Date(to + 'T23:59:59')) return false;
  return true;
};

// Encode buyer + status into the note field
const buildNote = (buyer, status, note) => {
  const parts = [];
  if (buyer.trim())       parts.push(`Buyer:${buyer.trim()}`);
  if (status === 'pending') parts.push('Status:Pending');
  const meta = parts.length ? `[${parts.join('|')}] ` : '';
  return `${meta}${note}`.trim();
};

// Decode buyer + status from a note field
const parseMeta = (note = '') => {
  const m = note.match(/^\[([^\]]+)\]/);
  if (!m) return { buyer: null, status: 'received', cleanNote: note };
  const pairs = {};
  m[1].split('|').forEach(p => {
    const idx = p.indexOf(':');
    if (idx !== -1) pairs[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
  });
  return {
    buyer:    pairs.Buyer  || null,
    status:   pairs.Status ? pairs.Status.toLowerCase() : 'received',
    cleanNote: note.slice(m[0].length).trim(),
  };
};

// ─── CSV export ────────────────────────────────────────────────────────────────
const exportCSV = (rows) => {
  const header = ['Date', 'Source', 'Description', 'Buyer', 'Linked Animal', 'Status', 'Amount (EGP)'];
  const lines = rows.map(e => {
    const { buyer, status, cleanNote } = parseMeta(e.note);
    return [
      new Date(e.date).toISOString().slice(0, 10),
      SOURCE[e.type]?.label || e.type,
      cleanNote,
      buyer || '',
      e.listing ? `${e.listing.type}${e.listing.breed ? ` — ${e.listing.breed}` : ''}` : '',
      status,
      e.amount,
    ];
  });
  const csv = [header, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `farmflow-income-${today()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ─── SVG Donut chart (Sale vs Deposit) ────────────────────────────────────────
const DonutChart = ({ saleTotal, depositTotal }) => {
  const total = saleTotal + depositTotal;
  const R = 34, CX = 50, CY = 50, SW = 15;
  const CIRC = 2 * Math.PI * R;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px' }}>📊</div>
          <div style={{ fontSize: '10px', color: C.textMuted }}>No data</div>
        </div>
      </div>
    );
  }

  const saleArc    = (saleTotal    / total) * CIRC;
  const depositArc = (depositTotal / total) * CIRC;
  const salePct    = ((saleTotal   / total) * 100).toFixed(0);

  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <g transform={`rotate(-90 ${CX} ${CY})`}>
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#BBF7D0" strokeWidth={SW} />
          {/* Sale segment */}
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke={SOURCE.sale.donut}
            strokeWidth={SW}
            strokeDasharray={`${saleArc.toFixed(2)} ${CIRC.toFixed(2)}`}
            strokeDashoffset="0"
            strokeLinecap="butt"
          />
          {/* Deposit segment */}
          {depositArc > 0 && (
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke={SOURCE.deposit.donut}
              strokeWidth={SW}
              strokeDasharray={`${depositArc.toFixed(2)} ${CIRC.toFixed(2)}`}
              strokeDashoffset={`${-saleArc.toFixed(2)}`}
              strokeLinecap="butt"
            />
          )}
        </g>
      </svg>
      {/* Center label */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: C.greenText, lineHeight: 1 }}>{salePct}%</div>
        <div style={{ fontSize: '9px', color: C.textMuted, marginTop: '2px' }}>sales</div>
      </div>
    </div>
  );
};

// ─── Badges ────────────────────────────────────────────────────────────────────
const SourceBadge = ({ type, small }) => {
  const s = SOURCE[type] || SOURCE.sale;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: small ? '3px 8px' : '4px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontSize: small ? '11px' : '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {s.emoji} {s.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_META[status] || STATUS_META.received;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '20px', background: s.bg, color: s.color, fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

// ─── Input primitives ──────────────────────────────────────────────────────────
const FI = ({ style = {}, ...rest }) => {
  const [f, setF] = useState(false);
  return (
    <input {...rest}
      onFocus={e => { setF(true);  rest.onFocus?.(e); }}
      onBlur={e  => { setF(false); rest.onBlur?.(e);  }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${f ? C.green : C.border}`, background: '#fff', fontSize: '14px', color: C.textBody, transition: 'border-color 0.15s', fontFamily: 'inherit', ...style }}
    />
  );
};

const FSel = ({ style = {}, children, ...rest }) => {
  const [f, setF] = useState(false);
  return (
    <select {...rest}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${f ? C.green : C.border}`, background: '#fff', fontSize: '14px', color: C.textBody, cursor: 'pointer', fontFamily: 'inherit', ...style }}>
      {children}
    </select>
  );
};

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: '12px', fontWeight: '700', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
    {children}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
const EMPTY_FORM = { type: 'sale', amount: '', date: today(), buyer: '', status: 'received', listing: '', note: '' };

const SellerIncome = () => {
  const toast = useToast();
  const [incomes,   setIncomes]   = useState([]);
  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState('');
  const [formOpen,   setFormOpen]   = useState(true);

  const [deletingId, setDeletingId] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const formRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([getIncome(), getMyListings()])
      .then(([incRes, listRes]) => {
        setIncomes(incRes.data);
        setListings(listRes.data);
      })
      .catch(() => setFetchErr('Failed to load income data.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Summary calculations ───────────────────────────────────────────────────
  const now = new Date();
  const thisMonthStart = startOf(now.getFullYear(), now.getMonth());
  const thisMonthEnd   = endOf(now.getFullYear(),   now.getMonth());
  const lastMonthStart = startOf(now.getFullYear(), now.getMonth() - 1);
  const lastMonthEnd   = endOf(now.getFullYear(),   now.getMonth() - 1);

  const thisMonth = useMemo(() =>
    incomes.filter(i => { const d = new Date(i.date); return d >= thisMonthStart && d <= thisMonthEnd; }),
    [incomes]
  );
  const lastMonth = useMemo(() =>
    incomes.filter(i => { const d = new Date(i.date); return d >= lastMonthStart && d <= lastMonthEnd; }),
    [incomes]
  );

  const thisMonthTotal = thisMonth.reduce((s, i) => s + i.amount, 0);
  const lastMonthTotal = lastMonth.reduce((s, i) => s + i.amount, 0);
  const trendPct = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100)
    : null;

  const saleTotal    = thisMonth.filter(i => i.type === 'sale').reduce((s, i) => s + i.amount, 0);
  const depositTotal = thisMonth.filter(i => i.type === 'deposit').reduce((s, i) => s + i.amount, 0);

  const saleEntries    = thisMonth.filter(i => i.type === 'sale');
  const avgSalePrice   = saleEntries.length > 0
    ? saleEntries.reduce((s, i) => s + i.amount, 0) / saleEntries.length
    : null;

  const allTimeSales   = incomes.filter(i => i.type === 'sale');
  const allTimeAvgSale = allTimeSales.length > 0
    ? allTimeSales.reduce((s, i) => s + i.amount, 0) / allTimeSales.length
    : null;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    return incomes.filter(i => {
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      if (!inRange(i.date, dateFrom, dateTo)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const { buyer, cleanNote } = parseMeta(i.note);
        const animal = i.listing ? `${i.listing.type} ${i.listing.breed || ''}`.toLowerCase() : '';
        if (!cleanNote.toLowerCase().includes(q)
          && !(buyer || '').toLowerCase().includes(q)
          && !animal.includes(q)
          && !(SOURCE[i.type]?.label || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [incomes, typeFilter, dateFrom, dateTo, search]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const startEdit = (entry) => {
    const { buyer, status, cleanNote } = parseMeta(entry.note);
    setEditId(entry._id);
    setForm({
      type:    entry.type,
      amount:  String(entry.amount),
      date:    new Date(entry.date).toISOString().slice(0, 10),
      buyer:   buyer || '',
      status:  status,
      listing: entry.listing?._id || '',
      note:    cleanNote,
    });
    setFormErr('');
    setFormOpen(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErr('');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setFormErr('Enter a valid amount.'); return; }
    setFormErr('');
    setSubmitting(true);

    const payload = {
      type:    form.type,
      amount:  parseFloat(form.amount),
      date:    form.date || today(),
      note:    buildNote(form.buyer, form.status, form.note),
      ...(form.listing ? { listing: form.listing } : {}),
    };

    try {
      if (editId) {
        const { data } = await updateIncome(editId, payload);
        setIncomes(prev => prev.map(x => x._id === editId ? data : x));
        setEditId(null);
        toast.success('Income entry updated.');
      } else {
        const { data } = await addIncome(payload);
        setIncomes(prev => [data, ...prev]);
        toast.success('Income recorded.');
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormErr(parseApiErr(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteIncome(id);
      setIncomes(prev => prev.filter(x => x._id !== id));
      toast.success('Income entry deleted.');
    } catch {
      toast.error('Failed to delete income entry. Please try again.');
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
        .inc-row:hover { background: #F0FDF4 !important; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ background: 'linear-gradient(135deg, #14532D 0%, #166534 55%, #15803D 100%)', padding: '24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -8, top: -20, fontSize: '120px', opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>📈</div>
        <div style={{ position: 'absolute', left: 20, bottom: -30, fontSize: '90px', opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🌿</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>Income</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
              {loading ? 'Loading…' : `${incomes.length} entr${incomes.length !== 1 ? 'ies' : 'y'} · ${fmtSAR(incomes.reduce((s, i) => s + i.amount, 0))} all time`}
            </p>
          </div>
          <button type="button" onClick={() => exportCSV(visible)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px 56px', maxWidth: '1050px', margin: '0 auto' }}>

        {/* Error banner */}
        {fetchErr && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '10px', padding: '11px 16px', color: C.redText, fontSize: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {fetchErr}
            <button type="button" onClick={() => setFetchErr('')} aria-label="Dismiss error" style={{ background: 'none', border: 'none', color: C.redText, cursor: 'pointer', fontSize: '15px', padding: 0 }}><span aria-hidden="true">✕</span></button>
          </div>
        )}

        {/* ── Summary strip ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>

            {/* Total this month */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>This Month</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: C.greenText, letterSpacing: '-0.5px', lineHeight: 1 }}>
                {fmtSAR(thisMonthTotal)}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textMuted }}>{thisMonth.length} entr{thisMonth.length !== 1 ? 'ies' : 'y'}</p>
            </div>

            {/* Trend vs last month */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>vs Last Month</p>
              {trendPct === null ? (
                <p style={{ margin: 0, fontSize: '14px', color: C.textMuted }}>No prior data</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: 1, color: trendPct >= 0 ? C.greenText : C.redText }}>
                      {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                    </span>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textMuted }}>
                    {trendPct >= 0 ? 'Up from' : 'Down from'} {fmtSAR(lastMonthTotal)}
                  </p>
                </>
              )}
            </div>

            {/* Sale vs Deposit donut */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px 18px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Source Breakdown</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <DonutChart saleTotal={saleTotal} depositTotal={depositTotal} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                  {[{ key: 'sale', total: saleTotal }, { key: 'deposit', total: depositTotal }].map(({ key, total: t }) => {
                    const s = SOURCE[key];
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: s.color }}>{s.emoji} {s.label}</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: C.textBody }}>{fmtSAR(t)}</span>
                        </div>
                        <div style={{ height: '5px', background: '#E8F5E9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(saleTotal + depositTotal) > 0 ? (t / (saleTotal + depositTotal)) * 100 : 0}%`, background: s.donut, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Average sale price */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Sale Price</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: C.teal, letterSpacing: '-0.5px', lineHeight: 1 }}>
                {avgSalePrice != null ? fmtSAR(avgSalePrice) : '—'}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textMuted }}>
                {avgSalePrice != null
                  ? `${saleEntries.length} sale${saleEntries.length !== 1 ? 's' : ''} this month`
                  : allTimeAvgSale != null
                    ? `All time: ${fmtSAR(allTimeAvgSale)}`
                    : 'No sales yet'}
              </p>
            </div>
          </div>
        )}

        {/* ── Record / Edit Income form ── */}
        <div ref={formRef} style={{ background: C.card, borderRadius: '16px', boxShadow: C.shadow, border: `1.5px solid ${editId ? C.tan : C.border}`, marginBottom: '24px', overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: (formOpen || editId) ? `1px solid ${C.border}` : 'none', background: editId ? '#F0FDF4' : '#F6FEFA', cursor: editId ? 'default' : 'pointer' }}
            onClick={() => { if (!editId) setFormOpen(p => !p); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{editId ? '✏️' : '➕'}</span>
              <div>
                <span style={{ fontWeight: '700', fontSize: '15px', color: C.text }}>
                  {editId ? 'Edit Income Entry' : 'Record Income'}
                </span>
                {editId && <span style={{ fontSize: '12px', color: C.textMuted, marginLeft: '10px' }}>Editing — save to apply changes</span>}
              </div>
            </div>
            {!editId && (
              <span style={{ color: C.textMuted, fontSize: '18px', display: 'inline-block', transition: 'transform 0.2s', transform: formOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            )}
          </div>

          {/* Body */}
          {(formOpen || editId) && (
            <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Type toggle cards */}
              <div>
                <FieldLabel>Income Source *</FieldLabel>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['sale', 'deposit'].map(t => {
                    const s = SOURCE[t];
                    const active = form.type === t;
                    return (
                      <button key={t} type="button" onClick={() => setF('type', t)}
                        style={{ flex: 1, padding: '14px 10px', borderRadius: '12px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: active ? C.greenText : C.textMuted }}>{s.label}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>
                          {t === 'sale' ? 'Full sale received' : 'Partial / advance payment'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                {/* Date */}
                <div>
                  <FieldLabel>Date *</FieldLabel>
                  <FI type="date" value={form.date} onChange={e => setF('date', e.target.value)} required max={today()} />
                </div>

                {/* Amount */}
                <div>
                  <FieldLabel>Amount *</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <FI type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0.00" required style={{ paddingRight: '54px' }} />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
                  </div>
                </div>

                {/* Linked listing */}
                <div>
                  <FieldLabel>Linked Animal <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></FieldLabel>
                  <FSel value={form.listing} onChange={e => setF('listing', e.target.value)}>
                    <option value="">— None —</option>
                    {listings.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.type}{l.breed ? ` — ${l.breed}` : ''}
                      </option>
                    ))}
                  </FSel>
                </div>

                {/* Buyer name */}
                <div>
                  <FieldLabel>Buyer Name <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></FieldLabel>
                  <FI type="text" value={form.buyer} onChange={e => setF('buyer', e.target.value)} placeholder="e.g. Mohammed Al-Rashid" />
                </div>
              </div>

              {/* Status */}
              <div>
                <FieldLabel>Payment Status</FieldLabel>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ k: 'received', icon: '✅', sub: 'Payment in hand' }, { k: 'pending', icon: '⏳', sub: 'Awaiting payment' }].map(({ k, icon, sub }) => {
                    const active = form.status === k;
                    const sm = STATUS_META[k];
                    return (
                      <button key={k} type="button" onClick={() => setF('status', k)}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenBg : C.card, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', marginBottom: '3px' }}>{icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: active ? C.greenText : C.textMuted, textTransform: 'capitalize' }}>{k}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '1px' }}>{sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></FieldLabel>
                <textarea
                  value={form.note}
                  onChange={e => setF('note', e.target.value)}
                  placeholder="e.g. 'Sold 3 Najdi sheep to Al-Rashid farm, transport arranged for Friday'"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '14px', color: C.textBody, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {/* Form error */}
              {formErr && (
                <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '9px', padding: '10px 13px', color: C.redText, fontSize: '13px' }}>{formErr}</div>
              )}

              {/* CTA */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {editId && (
                  <button type="button" onClick={cancelEdit}
                    style={{ padding: '10px 18px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 22px', borderRadius: '9px', border: 'none', background: submitting ? '#4AA85A' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.greenDark; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.green; }}
                >
                  {submitting ? 'Saving…' : editId ? '✓ Update Entry' : '+ Record Income'}
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
              type="text" placeholder="Search by buyer, notes…" value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search income by buyer or notes"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 30px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '13px', color: C.textBody, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '13px', padding: 0 }}>✕</button>
            )}
          </div>

          {/* Type pills */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {[{ k: 'all', label: 'All' }, { k: 'sale', label: '🤝 Sales' }, { k: 'deposit', label: '💰 Deposits' }].map(({ k, label }) => (
              <button key={k} type="button" onClick={() => setTypeFilter(k)}
                aria-pressed={typeFilter === k}
                style={{ padding: '7px 12px', borderRadius: '20px', border: `1.5px solid ${typeFilter === k ? C.green : C.border}`, background: typeFilter === k ? C.green : C.card, color: typeFilter === k ? '#fff' : C.textMuted, fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo || today()}
              style={{ padding: '8px 10px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '12px', color: C.textBody }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <span aria-hidden="true" style={{ fontSize: '12px', color: C.textMuted }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} max={today()}
              style={{ padding: '8px 10px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '12px', color: C.textBody }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ padding: '6px 10px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: C.textMuted }}>
              {visible.length} result{visible.length !== 1 ? 's' : ''}{visible.length !== incomes.length ? ` (filtered from ${incomes.length})` : ''}
            </span>
            {visible.length > 0 && (
              <span style={{ fontSize: '13px', fontWeight: '800', color: C.greenText }}>
                ▲ {fmtSAR(visible.reduce((s, i) => s + i.amount, 0))}
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: '58px', borderRadius: '12px', background: 'linear-gradient(90deg,#D1FAE5 0%,#F0FDF4 50%,#D1FAE5 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: '16px', border: `1.5px dashed ${C.border}` }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>{search || typeFilter !== 'all' || dateFrom || dateTo ? '🔍' : '🌱'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: C.text }}>
              {search || typeFilter !== 'all' || dateFrom || dateTo ? 'No income entries match your filters' : 'No income recorded yet'}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: C.textMuted }}>
              {search || typeFilter !== 'all' || dateFrom || dateTo
                ? 'Try clearing your filters to see all entries.'
                : 'Start recording your first sale or deposit above.'}
            </p>
            {(search || typeFilter !== 'all' || dateFrom || dateTo) && (
              <button type="button" onClick={() => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}
                style={{ padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.card, color: C.textBody, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Clear all filters
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
                <tr style={{ background: '#F0FDF4', borderBottom: `2px solid ${C.border}` }}>
                  {['Date', 'Source', 'Description & Buyer', 'Animal', 'Status', 'Amount', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: i >= 5 ? 'right' : 'left', fontSize: '11px', fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(entry => {
                  const { buyer, status, cleanNote } = parseMeta(entry.note);
                  const isDelConfirm = deletingId === entry._id;
                  const isEditing    = editId === entry._id;
                  return (
                    <tr key={entry._id} className="inc-row"
                      style={{ borderBottom: `1px solid ${C.border}`, background: isEditing ? '#F0FDF4' : '#fff', transition: 'background 0.1s' }}>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {fmtDate(entry.date)}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '12px 14px' }}>
                        <SourceBadge type={entry.type} small />
                      </td>

                      {/* Description & buyer */}
                      <td style={{ padding: '12px 14px', maxWidth: '220px' }}>
                        <div style={{ fontSize: '13px', color: C.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanNote || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>No description</span>}
                        </div>
                        {buyer && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>👤 {buyer}</div>}
                      </td>

                      {/* Animal */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {entry.listing
                          ? <span>🐾 {entry.listing.type}{entry.listing.breed ? ` — ${entry.listing.breed}` : ''}</span>
                          : '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={status} />
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '800', fontSize: '15px', color: C.greenText }}>+{fmtSAR(entry.amount)}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isDelConfirm ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: C.redText, fontWeight: '600' }}>Delete?</span>
                            <button type="button" onClick={() => confirmDelete(entry._id)} disabled={deleting}
                              style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: C.red, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                              {deleting ? '…' : 'Yes'}
                            </button>
                            <button type="button" onClick={() => setDeletingId(null)}
                              style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                              No
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button type="button" onClick={() => startEdit(entry)}
                              style={{ padding: '6px 11px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.card, color: C.textBody, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textBody; }}>
                              ✏ Edit
                            </button>
                            <button type="button" onClick={() => setDeletingId(entry._id)}
                              style={{ padding: '6px 11px', borderRadius: '7px', border: '1px solid #FECACA', background: C.redBg, color: C.redText, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer total */}
            <div style={{ padding: '12px 16px', background: '#F0FDF4', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: C.textMuted }}>Total shown:</span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: C.greenText }}>
                +{fmtSAR(visible.reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MOBILE CARDS
        ══════════════════════════════════════════════════════════ */}
        {!loading && visible.length > 0 && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visible.map(entry => {
              const { buyer, status, cleanNote } = parseMeta(entry.note);
              const isDelConfirm = deletingId === entry._id;
              return (
                <div key={entry._id} style={{ background: C.card, borderRadius: '14px', border: `1.5px solid ${editId === entry._id ? C.tan : C.border}`, boxShadow: C.shadow, overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ padding: '14px 14px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <SourceBadge type={entry.type} />
                        <StatusBadge status={status} />
                      </div>
                      <span style={{ fontWeight: '800', fontSize: '17px', color: C.greenText }}>+{fmtSAR(entry.amount)}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: cleanNote ? C.textBody : C.textMuted, fontStyle: cleanNote ? 'normal' : 'italic', marginBottom: '5px' }}>
                      {cleanNote || 'No description'}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: C.textMuted, flexWrap: 'wrap' }}>
                      <span>📅 {fmtDate(entry.date)}</span>
                      {buyer && <span>👤 {buyer}</span>}
                      {entry.listing && <span>🐾 {entry.listing.type}{entry.listing.breed ? ` — ${entry.listing.breed}` : ''}</span>}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
                    {isDelConfirm ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ flex: 1, fontSize: '13px', color: C.redText, fontWeight: '600' }}>Delete this entry?</span>
                        <button type="button" onClick={() => confirmDelete(entry._id)} disabled={deleting}
                          style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: C.red, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                          {deleting ? '…' : 'Delete'}
                        </button>
                        <button type="button" onClick={() => setDeletingId(null)}
                          style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => startEdit(entry)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.card, color: C.textBody, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ✏ Edit
                        </button>
                        <button type="button" onClick={() => setDeletingId(entry._id)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: '1px solid #FECACA', background: C.redBg, color: C.redText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          🗑 Delete
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

export default SellerIncome;
