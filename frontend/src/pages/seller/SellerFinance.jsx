import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getIncome,   addIncome,   updateIncome,   deleteIncome,
} from '../../services/financeService';
import { getStatements } from '../../services/statementsService';
import { getBudgets, setBudget } from '../../services/budgetService';
import { getMyListings } from '../../services/listingService';
import { fmt } from '../../utils/format';
import { useToast } from '../../components/Toast';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';
import { C as _C } from '../../tokens';
import SellerAnalytics from './SellerAnalytics';

// ─── Statements data normalizer ────────────────────────────────────────────────
// Backend returns [{month:0-based, income, expenses:{cat:amt}}]
// Frontend expects {income:{1:amt,...}, expenses:{cat:{1:amt,...}}}
const normalizeStmtData = (raw) => {
  if (!raw || !Array.isArray(raw)) return raw ?? null;
  const income = {};
  const expenses = {};
  raw.forEach(row => {
    const m = (row.month ?? 0) + 1; // 0-based → 1-based
    income[m] = row.income || 0;
    Object.entries(row.expenses || {}).forEach(([cat, amt]) => {
      if (!expenses[cat]) expenses[cat] = {};
      expenses[cat][m] = amt;
    });
  });
  return { income, expenses };
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const today = () => new Date().toISOString().slice(0, 10);

const AR_MONTHS = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const EXPENSE_CATS = {
  feed:         { label: 'علف',         emoji: '🌾', color: '#D97706', bg: '#FFFBEB' },
  doctor:       { label: 'طبيب بيطري', emoji: '🏥', color: '#2563EB', bg: '#EFF6FF' },
  transport:    { label: 'نقل',         emoji: '🚛', color: '#7C3AED', bg: '#F5F3FF' },
  electricity:  { label: 'كهرباء',      emoji: '⚡', color: '#B45309', bg: '#FEF3C7' },
  salary:       { label: 'مرتبات',      emoji: '👷', color: '#16A34A', bg: '#F0FDF4' },
  rent:         { label: 'إيجار',       emoji: '🏠', color: '#1D4ED8', bg: '#DBEAFE' },
  water:        { label: 'مياه',        emoji: '💧', color: '#0891B2', bg: '#CFFAFE' },
  maintenance:  { label: 'صيانة',       emoji: '🔧', color: '#DB2777', bg: '#FCE7F3' },
  other:        { label: 'أخرى',        emoji: '📦', color: '#374151', bg: '#F3F4F6' },
};

const CAT_KEYS = Object.keys(EXPENSE_CATS);

const EXP_CATS_WITH_INCOME = [
  ...CAT_KEYS.map(k => ({ key: k, ...EXPENSE_CATS[k] })),
  { key: 'income', label: 'دخل', emoji: '💰', color: '#16A34A', bg: '#F0FDF4' },
];

const CUSTOM_EMOJIS = [
  '📦','🚜','🌱','🔑','💊','🏪','📱','📋','🎯','🌿',
  '🪣','💡','🛒','👔','🔩','🧰','🏗️','🚁','🔬','🧪',
  '🌾','💼','🎁','🚗','⚙️','🏋️','🏥','💈','💰','📌',
];

// ─── Parse API error ───────────────────────────────────────────────────────────

const parseErr = (err) => {
  const d = err?.response?.data;
  if (!d) return 'خطأ في الشبكة، حاول مرة أخرى';
  if (d.errors?.length) return d.errors[0].msg;
  return d.message || 'حدث خطأ ما';
};

// ─── Shared focusable input component ─────────────────────────────────────────

const FInput = ({ style = {}, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...rest}
      onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        borderRadius: '8px', border: `1.5px solid ${focused ? '#3A7D44' : '#E5E7EB'}`,
        background: '#fff', fontSize: '14px', color: '#111827',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        transition: 'border-color 0.15s', outline: 'none', ...style,
      }}
    />
  );
};

const FTextarea = ({ style = {}, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...rest}
      onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        borderRadius: '8px', border: `1.5px solid ${focused ? '#3A7D44' : '#E5E7EB'}`,
        background: '#fff', fontSize: '14px', color: '#111827',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        transition: 'border-color 0.15s', outline: 'none', resize: 'vertical', lineHeight: 1.6,
        ...style,
      }}
    />
  );
};

const FSelect = ({ style = {}, children, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...rest}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        borderRadius: '8px', border: `1.5px solid ${focused ? '#3A7D44' : '#E5E7EB'}`,
        background: '#fff', fontSize: '14px', color: '#111827', cursor: 'pointer',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        transition: 'border-color 0.15s', outline: 'none', ...style,
      }}
    >
      {children}
    </select>
  );
};

// ─── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr>
    {[1,2,3,4,5,6].map(i => (
      <td key={i} style={{ padding: '12px 14px' }}>
        <div style={{ height: '16px', borderRadius: '6px', background: 'linear-gradient(90deg,#F3F4F6 0%,#E5E7EB 50%,#F3F4F6 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </td>
    ))}
  </tr>
);

// ─── Budget inline cell ────────────────────────────────────────────────────────

const BudgetCell = ({ value, actual, catKey, year, month, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [input,   setInput]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const startEdit = () => { setInput(value != null ? String(value) : ''); setEditing(true); };

  const commit = async () => {
    const n = parseFloat(input);
    if (isNaN(n) || n < 0) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(catKey, year, month, n); }
    finally { setSaving(false); setEditing(false); }
  };

  const isOver = value != null && actual != null && catKey !== 'income'
    ? actual > value
    : catKey === 'income' && value != null && actual != null
      ? actual < value
      : false;

  if (editing) {
    return (
      <input
        type="number" min="0" autoFocus value={input}
        onChange={e => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ width: '80px', padding: '4px 6px', border: '2px solid #3A7D44', borderRadius: '6px', fontSize: '11px', textAlign: 'center', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div
        onClick={startEdit}
        style={{
          padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
          color: value ? '#166534' : '#9CA3AF', background: value ? '#F0FDF4' : '#F9FAFB',
          border: `1px dashed ${value ? '#3A7D44' : '#D1D5DB'}`, minWidth: '68px', textAlign: 'center',
          transition: 'all 0.15s',
        }}
      >
        {saving ? '…' : value ? `${fmt(value)} ج.م` : '+ تعيين'}
      </div>
      {actual != null && actual > 0 && (
        <span style={{ fontSize: '10px', fontWeight: '600', color: isOver ? '#DC2626' : '#16A34A' }}>
          {isOver ? '▲' : '▼'} {fmt(actual)} ج.م
        </span>
      )}
    </div>
  );
};

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────

const MonthlyBarChart = ({ stmtData, year }) => {
  const now = new Date();
  const currentMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const lastN = Math.min(6, currentMonth);
  const months = Array.from({ length: lastN }, (_, i) => currentMonth - lastN + 1 + i);

  const incomeByMonth  = (m) => stmtData?.income?.[m] ?? 0;
  const expensesByMonth = (m) => Object.values(stmtData?.expenses ?? {}).reduce((s, cat) => s + (cat[m] ?? 0), 0);

  const values = months.map(m => ({ m, inc: incomeByMonth(m), exp: expensesByMonth(m) }));
  const maxVal = Math.max(...values.map(v => Math.max(v.inc, v.exp)), 1);

  const W = 520, H = 160, padLeft = 10, padRight = 10, padTop = 16, padBottom = 32;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;
  const groupW = chartW / lastN;
  const barW = Math.min(18, groupW * 0.35);
  const gap = 3;

  const scaleY = (v) => chartH - (v / maxVal) * chartH;

  const yLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: padTop + scaleY(f * maxVal),
    label: f > 0 ? `${fmt(Math.round(f * maxVal))}` : '',
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', direction: 'ltr' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Y grid lines */}
      {yLines.map((line, i) => (
        <line key={i} x1={padLeft} y1={line.y} x2={W - padRight} y2={line.y}
          stroke="#E5E7EB" strokeWidth="1" strokeDasharray={i > 0 ? '3,3' : undefined} />
      ))}

      {/* Break-even dashed line at y=0 profit (where inc == exp) */}
      {(() => {
        const avgInc = values.reduce((s,v) => s+v.inc,0) / (lastN||1);
        const avgExp = values.reduce((s,v) => s+v.exp,0) / (lastN||1);
        if (avgInc > 0 && avgExp > 0) {
          const be = Math.min(avgInc, avgExp);
          const beY = padTop + scaleY(be);
          return <line x1={padLeft} y1={beY} x2={W - padRight} y2={beY} stroke="#6B7280" strokeWidth="1" strokeDasharray="4,4" />;
        }
        return null;
      })()}

      {values.map((v, gi) => {
        const cx = padLeft + gi * groupW + groupW / 2;
        const incH = (v.inc / maxVal) * chartH;
        const expH = (v.exp / maxVal) * chartH;
        const incX = cx - barW - gap / 2;
        const expX = cx + gap / 2;

        return (
          <g key={v.m}>
            {/* Income bar */}
            {incH > 0 && (
              <rect
                x={incX} y={padTop + chartH - incH} width={barW} height={incH}
                fill="#16A34A" rx="3" opacity="0.85"
              />
            )}
            {/* Expense bar */}
            {expH > 0 && (
              <rect
                x={expX} y={padTop + chartH - expH} width={barW} height={expH}
                fill="#DC2626" rx="3" opacity="0.75"
              />
            )}
            {/* Month label */}
            <text
              x={cx} y={H - 6}
              textAnchor="middle" fontSize="9" fill="#6B7280"
              fontFamily="system-ui, sans-serif"
            >
              {AR_MONTHS[v.m - 1]?.slice(0, 5)}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={padLeft} y={2} width={8} height={8} fill="#16A34A" rx="2" />
      <text x={padLeft + 11} y={9.5} fontSize="8" fill="#374151" fontFamily="system-ui, sans-serif">دخل</text>
      <rect x={padLeft + 36} y={2} width={8} height={8} fill="#DC2626" rx="2" />
      <text x={padLeft + 47} y={9.5} fontSize="8" fill="#374151" fontFamily="system-ui, sans-serif">مصروفات</text>
    </svg>
  );
};

// ─── Transaction Modal ─────────────────────────────────────────────────────────

const TxModal = ({ modal, onClose, onSaved, listings, farmId }) => {
  const toast = useToast();

  const isEdit = modal.mode === 'edit';
  const [txType,    setTxType]    = useState(isEdit ? modal.row?._kind : (modal.defaultType ?? 'expense'));
  const [category,  setCategory]  = useState(isEdit && modal.row?._kind === 'expense' ? (modal.row.category || 'feed') : 'feed');
  const [amount,    setAmount]    = useState(isEdit ? String(modal.row?.amount ?? '') : '');
  const [date,      setDate]      = useState(isEdit ? new Date(modal.row?.date).toISOString().slice(0,10) : today());
  const [note,      setNote]      = useState(isEdit ? (modal.row?.note || '') : '');
  const [incType,   setIncType]   = useState(isEdit && modal.row?._kind === 'income' ? (modal.row.type || 'sale') : 'sale');
  const [recurring,    setRecurring]    = useState(isEdit ? (modal.row?.recurring ?? false) : false);
  const [recurringDay, setRecurringDay] = useState(isEdit ? (modal.row?.recurringDay ?? 1) : 1);
  const [submitting, setSubmitting] = useState(false);
  const [formErr,   setFormErr]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setFormErr('أدخل مبلغاً صحيحاً'); return; }
    setFormErr('');
    setSubmitting(true);

    try {
      const recurFields = recurring ? { recurring: true, recurringDay: Number(recurringDay) } : { recurring: false };
      if (txType === 'expense') {
        const payload = { category, amount: parseFloat(amount), date: date || today(), note, ...recurFields, ...(farmId ? { farmId } : {}) };
        if (isEdit) {
          const { data } = await updateExpense(modal.row._id, payload);
          onSaved('expense', 'update', data);
          toast.success('تم تحديث المصروف');
        } else {
          const { data } = await addExpense(payload);
          onSaved('expense', 'add', data);
          toast.success('تمت إضافة المصروف');
        }
      } else {
        const payload = { amount: parseFloat(amount), date: date || today(), note, type: incType, ...recurFields, ...(farmId ? { farmId } : {}) };
        if (isEdit) {
          const { data } = await updateIncome(modal.row._id, payload);
          onSaved('income', 'update', data);
          toast.success('تم تحديث الدخل');
        } else {
          const { data } = await addIncome(payload);
          onSaved('income', 'add', data);
          toast.success('تمت إضافة الدخل');
        }
      }
      onClose();
    } catch (err) {
      setFormErr(parseErr(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>
            {isEdit ? '✏️ تعديل معاملة' : '+ إضافة معاملة'}
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#6B7280', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Type switcher */}
          {!isEdit && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { k: 'expense', label: '📉 مصروف' },
                { k: 'income',  label: '💰 دخل'   },
              ].map(opt => (
                <button
                  key={opt.k} type="button"
                  onClick={() => setTxType(opt.k)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '9px', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                    border: txType === opt.k ? 'none' : '1.5px solid #E5E7EB',
                    background: txType === opt.k ? (opt.k === 'expense' ? '#FEF2F2' : '#F0FDF4') : '#F9FAFB',
                    color: txType === opt.k ? (opt.k === 'expense' ? '#DC2626' : '#16A34A') : '#6B7280',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Expense: category grid */}
          {txType === 'expense' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>الفئة *</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {CAT_KEYS.map(k => {
                  const m = EXPENSE_CATS[k];
                  const sel = category === k;
                  return (
                    <button key={k} type="button" onClick={() => setCategory(k)}
                      style={{
                        padding: '8px 6px', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                        border: `1.5px solid ${sel ? m.color : '#E5E7EB'}`,
                        background: sel ? m.bg : '#F9FAFB',
                        color: sel ? m.color : '#374151',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Income: type selector */}
          {txType === 'income' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>النوع *</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ k: 'sale', label: '🛒 مبيعات' }, { k: 'advance', label: '💵 دفعة مقدمة' }].map(opt => (
                  <button key={opt.k} type="button" onClick={() => setIncType(opt.k)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                      border: `1.5px solid ${incType === opt.k ? '#3A7D44' : '#E5E7EB'}`,
                      background: incType === opt.k ? '#F0FDF4' : '#F9FAFB',
                      color: incType === opt.k ? '#166534' : '#6B7280',
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>المبلغ *</div>
            <div style={{ position: 'relative' }}>
              <FInput
                type="number" min="0.01" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" required
                style={{ paddingLeft: '52px' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: '#6B7280', pointerEvents: 'none' }}>ج.م</span>
            </div>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>التاريخ *</div>
            <FInput type="date" value={date} onChange={e => setDate(e.target.value)} required max={today()} />
          </div>

          {/* Note */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ملاحظة <span style={{ fontWeight: 400, textTransform: 'none' }}>(اختياري)</span></div>
            <FTextarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="وصف مختصر..." />
          </div>

          {/* Recurring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: recurring ? '#F0FDF4' : '#F9FAFB', borderRadius: '10px', border: `1.5px solid ${recurring ? '#BBF7D0' : '#E5E7EB'}`, transition: 'all 0.15s' }}>
            <input type="checkbox" id="recurring-cb" checked={recurring} onChange={e => setRecurring(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3A7D44', flexShrink: 0 }} />
            <label htmlFor="recurring-cb" style={{ fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', flex: 1, userSelect: 'none' }}>
              🔁 معاملة متكررة شهرياً
            </label>
            {recurring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>كل يوم</span>
                <input type="number" min="1" max="31" value={recurringDay} onChange={e => setRecurringDay(e.target.value)}
                  style={{ width: '52px', padding: '5px 8px', border: '1.5px solid #3A7D44', borderRadius: '6px', fontSize: '13px', textAlign: 'center', fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>من الشهر</span>
              </div>
            )}
          </div>

          {/* Error */}
          {formErr && (
            <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 13px', color: '#B91C1C', fontSize: '13px' }}>
              {formErr}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              إلغاء
            </button>
            <button type="submit" disabled={submitting}
              style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: submitting ? '#6AAF74' : '#3A7D44', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
              {submitting ? 'جاري الحفظ…' : isEdit ? '✓ حفظ التعديل' : '+ إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

const DeleteConfirmModal = ({ item, onCancel, onConfirm, busy }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
  >
    <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑</div>
      <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: '#111827' }}>حذف المعاملة؟</h3>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>لا يمكن التراجع عن هذا الإجراء.</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          إلغاء
        </button>
        <button type="button" onClick={onConfirm} disabled={busy}
          style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy ? '…' : 'حذف'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Date grouping helpers ────────────────────────────────────────────────────

const getDateGroup = (dateStr) => {
  const d   = new Date(dateStr);
  const now = new Date();
  const yd  = new Date(now); yd.setDate(now.getDate() - 1);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  if (d.toDateString() === now.toDateString()) return 'today';
  if (d.toDateString() === yd.toDateString())  return 'yesterday';
  if (d >= weekAgo)                            return 'this_week';
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'this_month';
  return 'earlier';
};

const DATE_GROUP_LABEL = { today: 'اليوم', yesterday: 'أمس', this_week: 'هذا الأسبوع', this_month: 'هذا الشهر', earlier: 'سابق' };
const DATE_GROUP_ORDER = ['today', 'yesterday', 'this_week', 'this_month', 'earlier'];

// ─── Main Component ────────────────────────────────────────────────────────────

const SellerFinance = () => {
  const toast          = useToast();
  const { t }          = useLang();
  const { activeFarm } = useFarm();

  // Tab
  const [tab, setTab] = useState('tx');

  // Transactions data
  const [expenses,  setExpenses]  = useState([]);
  const [income,    setIncome]    = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Filters
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter,  setCatFilter]  = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  // Summary data
  const [stmtYear,    setStmtYear]    = useState(CURRENT_YEAR);
  const [stmtData,    setStmtData]    = useState(null);
  const [stmtLoading, setStmtLoading] = useState(false);
  const [stmtLoaded,  setStmtLoaded]  = useState(false);

  // Budget data
  const [budgetYear,    setBudgetYear]    = useState(CURRENT_YEAR);
  const [budgets,       setBudgetsState]  = useState({});
  const [actuals,       setActuals]       = useState({});
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetLoaded,  setBudgetLoaded]  = useState(false);

  // ── Custom budget rows (stored in localStorage) ──────────────────────────
  // Shape: [{ id, label, emoji, budgets: { 'year-month': amount } }]
  const CUSTOM_ROWS_KEY = 'farmflow_custom_budget_rows';
  const loadCustomRows = () => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_ROWS_KEY) || '[]'); } catch { return []; }
  };
  const [customRows,    setCustomRows]    = useState(loadCustomRows);
  const [addRowOpen,    setAddRowOpen]    = useState(false);
  const [addRowLabel,   setAddRowLabel]   = useState('');
  const [addRowEmoji,   setAddRowEmoji]   = useState('📦');
  const [emojiPickerFor, setEmojiPickerFor] = useState(null); // row id

  const persistCustomRows = (rows) => {
    setCustomRows(rows);
    localStorage.setItem(CUSTOM_ROWS_KEY, JSON.stringify(rows));
  };
  const addCustomRow = () => {
    if (!addRowLabel.trim()) return;
    const newRow = { id: Date.now().toString(), label: addRowLabel.trim(), emoji: addRowEmoji, budgets: {} };
    persistCustomRows([...customRows, newRow]);
    setAddRowLabel(''); setAddRowEmoji('📦'); setAddRowOpen(false);
  };
  const deleteCustomRow = (id) => persistCustomRows(customRows.filter(r => r.id !== id));
  const renameCustomRow = (id, label) =>
    persistCustomRows(customRows.map(r => r.id === id ? { ...r, label } : r));
  const setCustomRowEmoji = (id, emoji) => {
    persistCustomRows(customRows.map(r => r.id === id ? { ...r, emoji } : r));
    setEmojiPickerFor(null);
  };
  const saveCustomCellBudget = (id, year, month, amount) => {
    const key = `${year}-${month}`;
    persistCustomRows(customRows.map(r => r.id === id ? { ...r, budgets: { ...r.budgets, [key]: amount } } : r));
  };
  const customRowAnnualBudget = (row) =>
    Array.from({ length: 12 }, (_, i) => row.budgets?.[`${budgetYear}-${i+1}`] || 0).reduce((s,v) => s+v, 0);

  // Modal
  const [modal,         setModal]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  // ── Load transactions on mount ───────────────────────────────────────────
  useEffect(() => {
    setTxLoading(true);
    const farmId = activeFarm?._id;
    const p = farmId ? { farmId } : {};
    Promise.all([getExpenses(p), getIncome(p)])
      .then(([expRes, incRes]) => {
        setExpenses(expRes.data || []);
        setIncome(incRes.data || []);
      })
      .catch(() => toast.error('فشل تحميل المعاملات'))
      .finally(() => setTxLoading(false));
  }, [activeFarm?._id]);

  // ── Load summary data when tab activated ────────────────────────────────
  useEffect(() => {
    if (tab !== 'summary') return;
    setStmtLoaded(false);
    setStmtLoading(true);
    getStatements(stmtYear)
      .then(res => { setStmtData(normalizeStmtData(res.data?.data ?? res.data)); setStmtLoaded(true); })
      .catch(() => { toast.error('فشل تحميل الملخص'); setStmtLoaded(true); })
      .finally(() => setStmtLoading(false));
  }, [tab, stmtYear]);

  // ── Load budget data when tab activated ─────────────────────────────────
  const loadBudget = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        getBudgets(budgetYear),
        getStatements(budgetYear).catch(() => ({ data: null })),
      ]);
      const bMap = {};
      (bRes.data || []).forEach(b => { bMap[`${b.category}-${b.month}`] = b.targetAmount; });
      setBudgetsState(bMap);

      const stmt = normalizeStmtData(sRes?.data?.data ?? sRes?.data);
      if (stmt) {
        const aMap = {};
        if (stmt.expenses) {
          Object.entries(stmt.expenses).forEach(([cat, monthMap]) => {
            Object.entries(monthMap || {}).forEach(([m, v]) => {
              aMap[`${cat}-${m}`] = (aMap[`${cat}-${m}`] || 0) + (v || 0);
            });
          });
        }
        if (stmt.income) {
          Object.entries(stmt.income).forEach(([m, v]) => { aMap[`income-${m}`] = (v || 0); });
        }
        setActuals(aMap);
      }
      setBudgetLoaded(true);
    } catch {
      toast.error('فشل تحميل الميزانية');
    } finally {
      setBudgetLoading(false);
    }
  }, [budgetYear]);

  useEffect(() => {
    if (tab !== 'budget') return;
    loadBudget();
  }, [tab, budgetYear]);

  // ── Merge all rows ────────────────────────────────────────────────────────
  const allRows = useMemo(() => {
    const exp = expenses.map(e => ({ ...e, _kind: 'expense' }));
    const inc = income.map(i => ({ ...i, _kind: 'income' }));
    return [...exp, ...inc].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, income]);

  // ── Filter rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (typeFilter === 'expense' && r._kind !== 'expense') return false;
      if (typeFilter === 'income'  && r._kind !== 'income')  return false;
      if (catFilter !== 'all' && r._kind === 'expense' && r.category !== catFilter) return false;
      if (catFilter !== 'all' && r._kind === 'income') return false;
      if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(r.date) > new Date(dateTo + 'T23:59:59')) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const note = (r.note || '').toLowerCase();
        const catLabel = r._kind === 'expense' ? (EXPENSE_CATS[r.category]?.label || '').toLowerCase() : '';
        if (!note.includes(q) && !catLabel.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, typeFilter, catFilter, dateFrom, dateTo, search]);

  // ── Group filtered rows by date for table display ─────────────────────────
  const groupedRows = useMemo(() => {
    const groups = {};
    filtered.forEach(r => {
      const g = getDateGroup(r.date);
      (groups[g] = groups[g] || []).push(r);
    });
    const result = [];
    DATE_GROUP_ORDER.forEach(g => {
      if (groups[g]?.length) {
        result.push({ _isGroupHeader: true, group: g, count: groups[g].length });
        groups[g].forEach(r => result.push(r));
      }
    });
    return result;
  }, [filtered]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpiIncome   = filtered.filter(r => r._kind === 'income').reduce((s,r) => s + r.amount, 0);
  const kpiExpenses = filtered.filter(r => r._kind === 'expense').reduce((s,r) => s + r.amount, 0);
  const kpiNet      = kpiIncome - kpiExpenses;

  const isFiltered = search || typeFilter !== 'all' || catFilter !== 'all' || dateFrom || dateTo;

  // ── Summary KPIs ──────────────────────────────────────────────────────────
  const now     = new Date();
  const thisM   = now.getMonth() + 1;
  const lastM   = thisM === 1 ? 12 : thisM - 1;

  const monthIncome   = (m) => stmtData?.income?.[m] ?? 0;
  const monthExpenses = (m) => Object.values(stmtData?.expenses ?? {}).reduce((s, cat) => s + (cat[m] ?? 0), 0);
  const monthNet      = (m) => monthIncome(m) - monthExpenses(m);

  const thisMonthNet  = monthNet(thisM);
  const lastMonthNet  = monthNet(lastM);
  const yearNet       = AR_MONTHS.reduce((s, _, i) => s + monthNet(i + 1), 0);

  const trendPct = lastMonthNet !== 0
    ? ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet) * 100)
    : null;

  // ── Category breakdown ────────────────────────────────────────────────────
  const catTotals = useMemo(() => {
    const totals = {};
    if (!stmtData?.expenses) return totals;
    CAT_KEYS.forEach(k => {
      totals[k] = AR_MONTHS.reduce((s, _, i) => s + (stmtData.expenses[k]?.[i+1] ?? 0), 0);
    });
    return totals;
  }, [stmtData]);

  const totalExpenses = Object.values(catTotals).reduce((s,v) => s+v, 0);

  // ── Budget helpers ────────────────────────────────────────────────────────
  const annualBudget = (catKey) =>
    Array.from({ length: 12 }, (_, i) => budgets[`${catKey}-${i+1}`] || 0).reduce((s,v) => s+v, 0);
  const annualActual = (catKey) =>
    Array.from({ length: 12 }, (_, i) => actuals[`${catKey}-${i+1}`] || 0).reduce((s,v) => s+v, 0);

  const handleBudgetSave = async (category, year, month, targetAmount) => {
    await setBudget({ year, month, category, targetAmount });
    setBudgetsState(prev => ({ ...prev, [`${category}-${month}`]: targetAmount }));
    toast.success('تم حفظ الميزانية');
  };

  // ── Modal save callback ───────────────────────────────────────────────────
  const handleSaved = (kind, action, data) => {
    if (kind === 'expense') {
      setExpenses(prev =>
        action === 'add'
          ? [data, ...prev]
          : prev.map(x => x._id === data._id ? data : x)
      );
    } else {
      setIncome(prev =>
        action === 'add'
          ? [data, ...prev]
          : prev.map(x => x._id === data._id ? data : x)
      );
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'expense') {
        await deleteExpense(confirmDelete.id);
        setExpenses(prev => prev.filter(x => x._id !== confirmDelete.id));
      } else {
        await deleteIncome(confirmDelete.id);
        setIncome(prev => prev.filter(x => x._id !== confirmDelete.id));
      }
      toast.success('تم حذف المعاملة');
      setConfirmDelete(null);
    } catch {
      toast.error('فشل حذف المعاملة');
    } finally {
      setDeleting(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = filtered;
    const header = ['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ (ج.م)'];
    const lines = rows.map(r => [
      new Date(r.date).toLocaleDateString('ar-EG'),
      r._kind === 'income' ? 'دخل' : 'مصروف',
      r._kind === 'expense' ? (EXPENSE_CATS[r.category]?.label ?? r.category) : (r.type === 'sale' ? 'مبيعات' : 'دفعة'),
      r.note || '',
      r.amount,
    ]);
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `farmflow-finance-${today()}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const rows = filtered;
    const totalIncome   = rows.filter(r => r._kind === 'income').reduce((s, r) => s + r.amount, 0);
    const totalExpenses = rows.filter(r => r._kind === 'expense').reduce((s, r) => s + r.amount, 0);
    const net = totalIncome - totalExpenses;

    const catBreakdown = CAT_KEYS
      .map(k => ({ ...EXPENSE_CATS[k], key: k, amount: rows.filter(r => r._kind === 'expense' && r.category === k).reduce((s, r) => s + r.amount, 0) }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const catTotal = catBreakdown.reduce((s, c) => s + c.amount, 0);

    const dateRange = (dateFrom || dateTo)
      ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('ar-EG') : '—'} إلى ${dateTo ? new Date(dateTo).toLocaleDateString('ar-EG') : '—'}`
      : `حتى ${new Date().toLocaleDateString('ar-EG')}`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير المالية - FarmFlow</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#fff;color:#111;direction:rtl;padding:32px;font-size:13px}
    .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #3A7D44;padding-bottom:16px;margin-bottom:24px}
    .logo{font-size:22px;font-weight:900;color:#3A7D44}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
    .kpi{background:#F9FAFB;border-radius:10px;padding:14px 16px;border:1px solid #E5E7EB}
    .kpi-lbl{font-size:11px;color:#6B7280;text-transform:uppercase;margin-bottom:6px}
    .kpi-val{font-size:20px;font-weight:900}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#F3F4F6;padding:9px 12px;text-align:right;font-size:11px;color:#6B7280;font-weight:700;border-bottom:2px solid #E5E7EB}
    td{padding:9px 12px;border-bottom:1px solid #F3F4F6;font-size:12px}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
    .inc{color:#16A34A;background:#F0FDF4}.exp{color:#DC2626;background:#FEF2F2}
    .sec{font-size:14px;font-weight:800;color:#111;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #E5E7EB}
    .cat-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6}
    .bar{height:6px;background:#E5E7EB;border-radius:3px;flex:1;overflow:hidden}
    .bar-fill{height:100%;border-radius:3px}
    .print-btn{position:fixed;top:20px;left:20px;padding:10px 20px;background:#3A7D44;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;z-index:999}
    @media print{.print-btn{display:none!important}}
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 طباعة / PDF</button>
  <div class="hdr">
    <div>
      <div class="logo">🌿 FarmFlow</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">منصة إدارة المزارع</div>
    </div>
    <div style="text-align:left">
      <div style="font-size:18px;font-weight:800">تقرير المالية</div>
      <div style="font-size:12px;color:#6B7280">الفترة: ${dateRange}</div>
      <div style="font-size:12px;color:#6B7280">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-lbl">إجمالي الدخل</div><div class="kpi-val" style="color:#16A34A">${fmt(totalIncome)} ج.م</div></div>
    <div class="kpi"><div class="kpi-lbl">إجمالي المصروفات</div><div class="kpi-val" style="color:#DC2626">${fmt(totalExpenses)} ج.م</div></div>
    <div class="kpi"><div class="kpi-lbl">${net >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</div><div class="kpi-val" style="color:${net >= 0 ? '#2563EB' : '#DC2626'}">${net < 0 ? '−' : ''}${fmt(Math.abs(net))} ج.م</div></div>
  </div>
  <div class="sec">📋 قائمة المعاملات (${rows.length} معاملة)</div>
  <table>
    <thead><tr><th>التاريخ</th><th>النوع</th><th>الفئة / المصدر</th><th>الوصف</th><th style="text-align:left">المبلغ</th></tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${new Date(r.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
          <td><span class="badge ${r._kind === 'income' ? 'inc' : 'exp'}">${r._kind === 'income' ? 'دخل' : 'مصروف'}</span></td>
          <td>${r._kind === 'income' ? (r.type === 'sale' ? 'مبيعات' : 'دفعة مقدمة') : ((EXPENSE_CATS[r.category]?.emoji ?? '') + ' ' + (EXPENSE_CATS[r.category]?.label ?? r.category))}</td>
          <td>${(r.note || '—') + (r.recurring ? ' 🔁' : '')}</td>
          <td style="text-align:left;font-weight:700;color:${r._kind === 'income' ? '#16A34A' : '#DC2626'}">${r._kind === 'income' ? '+' : '−'}${fmt(r.amount)} ج.م</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${catBreakdown.length > 0 ? `
    <div class="sec">📊 توزيع المصروفات حسب الفئة</div>
    ${catBreakdown.map(c => `
      <div class="cat-row">
        <span style="font-size:16px;width:22px">${c.emoji}</span>
        <span style="min-width:90px;font-weight:600">${c.label}</span>
        <div class="bar"><div class="bar-fill" style="width:${Math.max(2, (c.amount / catTotal) * 100).toFixed(1)}%;background:${c.color}"></div></div>
        <span style="font-weight:700;min-width:120px;text-align:left">${fmt(c.amount)} ج.م (${((c.amount / catTotal) * 100).toFixed(0)}%)</span>
      </div>
    `).join('')}
  ` : ''}
</body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ background: '#F3F4F6', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .tx-row:hover { background: #F9FAFB !important; }
        .tx-row .row-actions { opacity: 0; }
        .tx-row:hover .row-actions { opacity: 1; }
        @media (max-width: 640px) { .tx-row .row-actions { opacity: 1; } }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { background: #F3F4F6 !important; }
      `}</style>

      {/* ── Sticky header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 0 10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>💼</span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111827' }}>المالية</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                ↓ CSV
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🖨 PDF
              </button>
              <button
                type="button"
                onClick={() => setModal({ mode: 'add', defaultType: 'expense' })}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3A7D44', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                + إضافة معاملة
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {[
              { k: 'tx',         label: 'معاملات'   },
              { k: 'summary',    label: 'ملخص'      },
              { k: 'budget',     label: 'الميزانية' },
              { k: 'analytics',  label: 'تحليلات'   },
            ].map(t => (
              <button
                key={t.k} type="button"
                className="tab-btn"
                onClick={() => setTab(t.k)}
                style={{
                  padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: tab === t.k ? '700' : '500',
                  color: tab === t.k ? '#3A7D44' : '#6B7280',
                  background: 'transparent',
                  borderBottom: tab === t.k ? '2.5px solid #3A7D44' : '2.5px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 56px' }}>

        {/* ════════════════════════════════════════════════════════
            TAB: معاملات
        ════════════════════════════════════════════════════════ */}
        {tab === 'tx' && (
          <>
            {/* KPI Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'إجمالي الدخل', value: kpiIncome,   color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'إجمالي المصروفات', value: kpiExpenses, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                {
                  label: kpiNet >= 0 ? 'صافي الربح' : 'صافي الخسارة',
                  value: Math.abs(kpiNet),
                  color: kpiNet >= 0 ? '#2563EB' : '#DC2626',
                  bg: kpiNet >= 0 ? '#EFF6FF' : '#FEF2F2',
                  border: kpiNet >= 0 ? '#BFDBFE' : '#FECACA',
                  prefix: kpiNet < 0 ? '−' : '',
                },
              ].map((card, i) => (
                <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: card.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', opacity: 0.8 }}>{card.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: card.color, letterSpacing: '-0.5px' }}>
                    {card.prefix}{fmt(card.value)} ج.م
                  </div>
                </div>
              ))}
            </div>

            {/* Filter toolbar */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '140px' }}>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="بحث في الوصف..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 32px 8px 10px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3A7D44'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', padding: 0 }}>✕</button>
                )}
              </div>

              {/* Type chips */}
              <div style={{ display: 'flex', gap: '5px' }}>
                {[
                  { k: 'all',     label: 'الكل'       },
                  { k: 'expense', label: '📉 مصروفات' },
                  { k: 'income',  label: '💰 دخل'     },
                ].map(opt => (
                  <button key={opt.k} type="button" onClick={() => { setTypeFilter(opt.k); if (opt.k === 'income') setCatFilter('all'); }}
                    style={{ padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${typeFilter === opt.k ? '#3A7D44' : '#E5E7EB'}`, background: typeFilter === opt.k ? '#3A7D44' : '#F9FAFB', color: typeFilter === opt.k ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Category dropdown (only for expense/all) */}
              {typeFilter !== 'income' && (
                <select
                  value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '13px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3A7D44'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                >
                  <option value="all">كل الفئات</option>
                  {CAT_KEYS.map(k => (
                    <option key={k} value={k}>{EXPENSE_CATS[k].emoji} {EXPENSE_CATS[k].label}</option>
                  ))}
                </select>
              )}

              {/* Date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ padding: '7px 9px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '12px', color: '#374151', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3A7D44'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom}
                  style={{ padding: '7px 9px', borderRadius: '8px', border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '12px', color: '#374151', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3A7D44'} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Clear filters */}
              {isFiltered && (
                <button type="button" onClick={() => { setSearch(''); setTypeFilter('all'); setCatFilter('all'); setDateFrom(''); setDateTo(''); }}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  مسح الفلاتر
                </button>
              )}
            </div>

            {/* Results info */}
            {!txLoading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 2px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  {filtered.length} معاملة{filtered.length !== allRows.length ? ` (من ${allRows.length})` : ''}
                </span>
              </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                      {['التاريخ', 'النوع', 'الفئة / المصدر', 'الوصف', 'المبلغ', 'إجراءات'].map((h, i) => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: i >= 4 ? 'left' : 'right', fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txLoading && [1,2,3,4,5].map(i => <SkeletonRow key={i} />)}

                    {!txLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '60px 24px', textAlign: 'center' }}>
                          <div style={{ fontSize: '44px', marginBottom: '10px' }}>
                            {isFiltered ? '🔍' : '💰'}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                            {isFiltered ? 'لا توجد نتائج للفلاتر المحددة' : 'لا توجد معاملات'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
                            {isFiltered ? 'جرّب تغيير الفلاتر أو مسحها' : 'ابدأ بإضافة أول معاملة'}
                          </div>
                        </td>
                      </tr>
                    )}

                    {!txLoading && groupedRows.map((row, idx) => {
                      if (row._isGroupHeader) {
                        return (
                          <tr key={`group-${row.group}`}>
                            <td colSpan={6} style={{ padding: '8px 14px 5px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', borderTop: idx > 0 ? '1px solid #E5E7EB' : undefined }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {DATE_GROUP_LABEL[row.group]}
                              </span>
                              <span style={{ fontSize: '11px', color: '#9CA3AF', marginRight: '6px' }}>({row.count})</span>
                            </td>
                          </tr>
                        );
                      }

                      const isIncome  = row._kind === 'income';
                      const catMeta   = isIncome ? null : EXPENSE_CATS[row.category];
                      const rowBg     = isIncome ? '#F0FDF4' : '#FEF2F2';
                      const amtColor  = isIncome ? '#16A34A' : '#DC2626';

                      return (
                        <tr key={`${row._kind}-${row._id}`} className="tx-row"
                          style={{ borderBottom: '1px solid #F3F4F6', background: '#fff', transition: 'background 0.1s' }}>

                          {/* Date */}
                          <td style={{ padding: '11px 14px', fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                            {new Date(row.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>

                          {/* Type badge */}
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: rowBg, color: amtColor, fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              {isIncome ? '💰 دخل' : '📉 مصروف'}
                            </span>
                          </td>

                          {/* Category / Source */}
                          <td style={{ padding: '11px 14px' }}>
                            {isIncome ? (
                              <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>
                                {row.type === 'sale' ? '🛒 مبيعات' : '💵 دفعة مقدمة'}
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px',
                                background: catMeta?.bg ?? '#F3F4F6', color: catMeta?.color ?? '#374151',
                                fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap',
                              }}>
                                {catMeta?.emoji} {catMeta?.label ?? row.category}
                              </span>
                            )}
                          </td>

                          {/* Description */}
                          <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', maxWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                              {row.recurring && <span title="متكررة" style={{ fontSize: '12px', flexShrink: 0 }}>🔁</span>}
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.note || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>بدون وصف</span>}
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td style={{ padding: '11px 14px', textAlign: 'left', fontWeight: '800', fontSize: '14px', color: amtColor, whiteSpace: 'nowrap' }}>
                            {isIncome ? '+' : '−'}{fmt(row.amount)} ج.م
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                            <div className="row-actions" style={{ display: 'flex', gap: '5px', justifyContent: 'flex-start', transition: 'opacity 0.15s' }}>
                              <button type="button"
                                onClick={() => setModal({ mode: 'edit', row })}
                                style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: '12px', cursor: 'pointer', transition: 'all 0.12s' }}
                                title="تعديل"
                              >
                                ✏️
                              </button>
                              <button type="button"
                                onClick={() => setConfirmDelete({ id: row._id, type: row._kind })}
                                style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', cursor: 'pointer' }}
                                title="حذف"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              {!txLoading && filtered.length > 0 && (
                <div style={{ padding: '10px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>دخل: <strong style={{ color: '#16A34A' }}>{fmt(kpiIncome)} ج.م</strong></span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>مصروفات: <strong style={{ color: '#DC2626' }}>{fmt(kpiExpenses)} ج.م</strong></span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>الصافي: <strong style={{ color: kpiNet >= 0 ? '#2563EB' : '#DC2626' }}>{kpiNet < 0 ? '−' : ''}{fmt(Math.abs(kpiNet))} ج.م</strong></span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: ملخص
        ════════════════════════════════════════════════════════ */}
        {tab === 'summary' && (
          <>
            {/* Year selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>السنة:</span>
              {[CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <button key={y} type="button" onClick={() => setStmtYear(y)}
                  style={{ padding: '7px 18px', borderRadius: '8px', border: `1.5px solid ${stmtYear === y ? '#3A7D44' : '#E5E7EB'}`, background: stmtYear === y ? '#3A7D44' : '#fff', color: stmtYear === y ? '#fff' : '#374151', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.12s' }}>
                  {y}
                </button>
              ))}
            </div>

            {stmtLoading && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', fontSize: '15px' }}>
                ⏳ جاري تحميل البيانات…
              </div>
            )}

            {!stmtLoading && stmtLoaded && (
              <>
                {/* 4 KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  {[
                    {
                      label: 'الدخل هذا الشهر', value: monthIncome(thisM),
                      color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
                      sub: lastMonthNet !== 0 && trendPct !== null
                        ? `مقارنة بالشهر الماضي ${trendPct >= 0 ? '+' : ''}${trendPct?.toFixed(1)}%`
                        : 'لا توجد بيانات مقارنة',
                    },
                    {
                      label: 'المصروفات هذا الشهر', value: monthExpenses(thisM),
                      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
                      sub: `${AR_MONTHS[thisM - 1]} ${stmtYear}`,
                    },
                    {
                      label: 'صافي الربح هذا الشهر', value: Math.abs(thisMonthNet),
                      color: thisMonthNet >= 0 ? '#2563EB' : '#DC2626',
                      bg: thisMonthNet >= 0 ? '#EFF6FF' : '#FEF2F2',
                      border: thisMonthNet >= 0 ? '#BFDBFE' : '#FECACA',
                      prefix: thisMonthNet < 0 ? '−' : '',
                      sub: thisMonthNet >= 0 ? 'ربح' : 'خسارة',
                    },
                    {
                      label: 'صافي الربح هذا العام', value: Math.abs(yearNet),
                      color: yearNet >= 0 ? '#2563EB' : '#DC2626',
                      bg: yearNet >= 0 ? '#EFF6FF' : '#FEF2F2',
                      border: yearNet >= 0 ? '#BFDBFE' : '#FECACA',
                      prefix: yearNet < 0 ? '−' : '',
                      sub: `إجمالي ${stmtYear}`,
                    },
                  ].map((card, i) => (
                    <div key={i} style={{ background: card.bg, border: `1px solid ${card.border || '#E5E7EB'}`, borderRadius: '14px', padding: '18px 20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: card.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', opacity: 0.8 }}>{card.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: card.color, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                        {card.prefix}{fmt(card.value)} ج.م
                      </div>
                      <div style={{ fontSize: '12px', color: card.color, opacity: 0.7 }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '14px' }}>آخر 6 أشهر — دخل مقابل مصروفات</div>
                  <MonthlyBarChart stmtData={stmtData} year={stmtYear} />
                </div>

                {/* Expense breakdown by category */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '16px' }}>توزيع المصروفات حسب الفئة</div>
                  {totalExpenses === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '14px' }}>
                      لا توجد مصروفات لهذه السنة
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {CAT_KEYS
                        .filter(k => (catTotals[k] || 0) > 0)
                        .sort((a, b) => (catTotals[b] || 0) - (catTotals[a] || 0))
                        .map(k => {
                          const m = EXPENSE_CATS[k];
                          const amt = catTotals[k] || 0;
                          const pct = totalExpenses > 0 ? (amt / totalExpenses * 100) : 0;
                          return (
                            <div key={k}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{m.emoji} {m.label}</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                                  {fmt(amt)} ج.م <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: '12px' }}>({pct.toFixed(0)}%)</span>
                                </span>
                              </div>
                              <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: الميزانية
        ════════════════════════════════════════════════════════ */}
        {tab === 'budget' && (
          <>
            {/* Year selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>السنة:</span>
              {[CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <button key={y} type="button" onClick={() => setBudgetYear(y)}
                  style={{ padding: '7px 18px', borderRadius: '8px', border: `1.5px solid ${budgetYear === y ? '#3A7D44' : '#E5E7EB'}`, background: budgetYear === y ? '#3A7D44' : '#fff', color: budgetYear === y ? '#fff' : '#374151', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.12s' }}>
                  {y}
                </button>
              ))}
            </div>

            {budgetLoading && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', fontSize: '15px' }}>
                ⏳ جاري تحميل الميزانية…
              </div>
            )}

            {!budgetLoading && budgetLoaded && (
              <>
                {/* 3 summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  {[
                    {
                      label: 'إجمالي المصروفات المستهدفة',
                      value: EXP_CATS_WITH_INCOME.filter(c => c.key !== 'income').reduce((s,c) => s + annualBudget(c.key), 0),
                      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
                    },
                    {
                      label: 'إجمالي الدخل المستهدف',
                      value: annualBudget('income'),
                      color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
                    },
                    {
                      label: 'إجمالي المصروفات الفعلية',
                      value: EXP_CATS_WITH_INCOME.filter(c => c.key !== 'income').reduce((s,c) => s + annualActual(c.key), 0),
                      color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',
                    },
                  ].map((card, i) => (
                    <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '14px', padding: '16px 20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: card.color, marginBottom: '6px', opacity: 0.9 }}>{card.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: card.color }}>{fmt(card.value)} ج.م</div>
                    </div>
                  ))}
                </div>

                {/* Budget table */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#6B7280', borderLeft: '1px solid #E5E7EB', position: 'sticky', right: 0, background: '#F9FAFB', zIndex: 2, minWidth: '130px' }}>
                            الفئة
                          </th>
                          {AR_MONTHS.map((m, i) => (
                            <th key={i} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#6B7280', minWidth: '85px' }}>
                              {m.slice(0, 5)}
                            </th>
                          ))}
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#166534', background: '#F0FDF4', minWidth: '100px' }}>
                            السنوي
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {EXP_CATS_WITH_INCOME.map((cat, ci) => {
                          const annT = annualBudget(cat.key);
                          const annA = annualActual(cat.key);
                          const over = cat.key !== 'income' ? (annA > annT && annT > 0) : (annA < annT && annT > 0);
                          return (
                            <tr key={cat.key} style={{ borderBottom: '1px solid #F3F4F6', background: ci % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                              <td style={{ padding: '12px 16px', position: 'sticky', right: 0, background: ci % 2 === 0 ? '#fff' : '#FAFAFA', borderLeft: '1px solid #F3F4F6', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span style={{ fontSize: '15px' }}>{cat.emoji}</span>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{cat.label}</span>
                                </div>
                                {annA > 0 && (
                                  <div style={{ fontSize: '10px', color: over ? '#DC2626' : '#16A34A', marginTop: '2px', fontWeight: '600' }}>
                                    فعلي: {fmt(annA)} ج.م
                                  </div>
                                )}
                              </td>
                              {Array.from({ length: 12 }, (_, mi) => {
                                const m    = mi + 1;
                                const bval = budgets[`${cat.key}-${m}`];
                                const aval = actuals[`${cat.key}-${m}`] ?? 0;
                                return (
                                  <td key={m} style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <BudgetCell value={bval} actual={aval > 0 ? aval : null}
                                      catKey={cat.key} year={budgetYear} month={m} onSave={handleBudgetSave} />
                                  </td>
                                );
                              })}
                              <td style={{ padding: '10px 14px', textAlign: 'center', background: '#F0FDF4' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: annT > 0 ? '#166534' : '#9CA3AF' }}>
                                  {annT > 0 ? `${fmt(annT)} ج.م` : '—'}
                                </div>
                                {over && annT > 0 && <div style={{ fontSize: '9px', color: '#DC2626', fontWeight: '600', marginTop: '2px' }}>تجاوز الحد</div>}
                              </td>
                            </tr>
                          );
                        })}

                        {/* ── Custom rows ── */}
                        {customRows.map((row, ci) => {
                          const annT = customRowAnnualBudget(row);
                          return (
                            <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6', background: ci % 2 === 0 ? '#FFFBF5' : '#FFF8EE' }}>
                              <td style={{ padding: '10px 12px', position: 'sticky', right: 0, background: ci % 2 === 0 ? '#FFFBF5' : '#FFF8EE', borderLeft: '1px solid #F3F4F6', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {/* Emoji picker trigger */}
                                  <button type="button" onClick={() => setEmojiPickerFor(emojiPickerFor === row.id ? null : row.id)}
                                    style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '2px 5px', cursor: 'pointer', fontSize: '14px', lineHeight: 1.2 }}>
                                    {row.emoji}
                                  </button>
                                  {/* Inline rename */}
                                  <input defaultValue={row.label} onBlur={e => renameCustomRow(row.id, e.target.value || row.label)}
                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                    style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', color: '#111827', outline: 'none', width: '80px', cursor: 'text' }}
                                  />
                                  <button type="button" onClick={() => deleteCustomRow(row.id)} title="حذف"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '13px', marginRight: 'auto', padding: '0 2px' }}>
                                    ×
                                  </button>
                                </div>
                                {/* Emoji picker dropdown */}
                                {emojiPickerFor === row.id && (
                                  <div style={{ position: 'absolute', zIndex: 50, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '8px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '200px', bottom: '34px', right: 0 }}>
                                    {CUSTOM_EMOJIS.map(em => (
                                      <button key={em} type="button" onClick={() => setCustomRowEmoji(row.id, em)}
                                        style={{ background: row.emoji === em ? '#E5E7EB' : 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {Array.from({ length: 12 }, (_, mi) => {
                                const m = mi + 1;
                                const bval = row.budgets?.[`${budgetYear}-${m}`];
                                return (
                                  <td key={m} style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <BudgetCell value={bval} actual={null}
                                      catKey={`custom-${row.id}`} year={budgetYear} month={m}
                                      onSave={(_, yr, mo, amount) => saveCustomCellBudget(row.id, yr, mo, amount)} />
                                  </td>
                                );
                              })}
                              <td style={{ padding: '10px 14px', textAlign: 'center', background: '#FFF8EE' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: annT > 0 ? '#D97706' : '#9CA3AF' }}>
                                  {annT > 0 ? `${fmt(annT)} ج.م` : '—'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* ── Add custom row button ── */}
                        <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAF5' }}>
                          <td colSpan={14} style={{ padding: '8px 16px' }}>
                            {addRowOpen ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative' }}>
                                  <button type="button" onClick={() => setEmojiPickerFor('new')}
                                    style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '18px' }}>
                                    {addRowEmoji}
                                  </button>
                                  {emojiPickerFor === 'new' && (
                                    <div style={{ position: 'absolute', zIndex: 50, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '8px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '220px', bottom: '38px', right: 0 }}>
                                      {CUSTOM_EMOJIS.map(em => (
                                        <button key={em} type="button" onClick={() => { setAddRowEmoji(em); setEmojiPickerFor(null); }}
                                          style={{ background: addRowEmoji === em ? '#E5E7EB' : 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', fontSize: '16px' }}>
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <input autoFocus value={addRowLabel} onChange={e => setAddRowLabel(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') addCustomRow(); if (e.key === 'Escape') setAddRowOpen(false); }}
                                  placeholder="اسم البند" dir="rtl"
                                  style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #3A7D44', fontSize: '13px', width: '140px', outline: 'none', fontFamily: 'inherit' }}
                                />
                                <button type="button" onClick={addCustomRow}
                                  style={{ padding: '7px 16px', borderRadius: '8px', background: '#3A7D44', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                                  إضافة
                                </button>
                                <button type="button" onClick={() => setAddRowOpen(false)}
                                  style={{ padding: '7px 12px', borderRadius: '8px', background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', fontSize: '13px', cursor: 'pointer' }}>
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setAddRowOpen(true)}
                                style={{ background: 'none', border: '1.5px dashed #D1D5DB', borderRadius: '8px', padding: '6px 16px', color: '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '16px' }}>＋</span> إضافة بند مخصص
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* صافي الربح المستهدف row */}
                        {(() => {
                          const annIncBudget = annualBudget('income');
                          const annExpBudget = EXP_CATS_WITH_INCOME.filter(c => c.key !== 'income').reduce((s,c) => s + annualBudget(c.key), 0)
                            + customRows.reduce((s, row) => s + customRowAnnualBudget(row), 0);
                          const annNet = annIncBudget - annExpBudget;
                          return (
                            <tr style={{ borderTop: '2px solid #D1D5DB', background: annNet >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
                              <td style={{ padding: '12px 16px', position: 'sticky', right: 0, background: annNet >= 0 ? '#F0FDF4' : '#FEF2F2', borderLeft: '1px solid #E5E7EB', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span style={{ fontSize: '15px' }}>📊</span>
                                  <span style={{ fontSize: '12px', fontWeight: '800', color: annNet >= 0 ? '#166534' : '#991B1B' }}>صافي الربح المستهدف</span>
                                </div>
                              </td>
                              {Array.from({ length: 12 }, (_, mi) => {
                                const m = mi + 1;
                                const incB = budgets[`income-${m}`] || 0;
                                const expB = CAT_KEYS.reduce((s, k) => s + (budgets[`${k}-${m}`] || 0), 0)
                                  + customRows.reduce((s, row) => s + (row.budgets?.[`${budgetYear}-${m}`] || 0), 0);
                                const net = incB - expB;
                                const hasData = incB > 0 || expB > 0;
                                return (
                                  <td key={m} style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    {hasData ? (
                                      <div style={{ fontSize: '11px', fontWeight: '700', color: net >= 0 ? '#16A34A' : '#DC2626', background: net >= 0 ? '#DCFCE7' : '#FEE2E2', padding: '4px 6px', borderRadius: '6px', minWidth: '68px', display: 'inline-block', textAlign: 'center' }}>
                                        {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#D1D5DB', fontSize: '11px' }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '10px 14px', textAlign: 'center', background: annNet >= 0 ? '#DCFCE7' : '#FEE2E2' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: annNet >= 0 ? '#166534' : '#991B1B' }}>
                                  {annIncBudget > 0 || annExpBudget > 0
                                    ? `${annNet >= 0 ? '+' : '−'}${fmt(Math.abs(annNet))} ج.م`
                                    : '—'}
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '12px 18px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', fontSize: '12px', color: '#6B7280' }}>
                    💡 اضغط على أي خلية لتعيين أو تعديل الميزانية المستهدفة. تُحفظ تلقائياً.
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Analytics tab ── */}
      {tab === 'analytics' && (
        <div style={{ margin: '0 -20px' }}>
          <SellerAnalytics embedded={true} />
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <TxModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          listings={[]}
          farmId={activeFarm?._id}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          item={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          busy={deleting}
        />
      )}

      {/* Close emoji picker on outside click */}
      {emojiPickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setEmojiPickerFor(null)} />
      )}
    </div>
  );
};

export default SellerFinance;
