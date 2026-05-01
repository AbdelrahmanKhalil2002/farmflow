import { useEffect, useState, useCallback } from 'react';
import { getBudgets, setBudget } from '../../services/budgetService';
import { getStatements } from '../../services/statementsService';

const C = {
  bg:       '#FEFAF5',
  card:     '#FFFFFF',
  green:    '#3A7D44',
  greenDk:  '#2D6235',
  greenLt:  '#F0F7F1',
  greenBg:  '#DCFCE7',
  greenText:'#166534',
  border:   '#E8D5C0',
  text:     '#2C1810',
  muted:    '#8B6B5A',
  shadow:   '0 1px 3px rgba(44,24,16,0.08)',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amber:    '#D97706',
  amberBg:  '#FEF3C7',
};

const EXP_CATS = [
  { key: 'feed',        label: 'علف',      emoji: '🌾' },
  { key: 'doctor',      label: 'بيطري',    emoji: '🏥' },
  { key: 'transport',   label: 'نقل',      emoji: '🚚' },
  { key: 'electricity', label: 'كهرباء',   emoji: '⚡' },
  { key: 'salary',      label: 'رواتب',    emoji: '👷' },
  { key: 'rent',        label: 'إيجار',    emoji: '🏠' },
  { key: 'water',       label: 'مياه',     emoji: '💧' },
  { key: 'maintenance', label: 'صيانة',    emoji: '🔧' },
  { key: 'other',       label: 'أخرى',     emoji: '📦' },
  { key: 'income',      label: 'هدف الدخل', emoji: '💰' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const fmt = (v) => v != null && v !== 0
  ? Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م'
  : '—';

// ─── Inline editable cell ──────────────────────────────────────────────────
const BudgetCell = ({ value, onSave, catKey, year, month }) => {
  const [editing, setEditing] = useState(false);
  const [input,   setInput]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const startEdit = () => { setInput(value || ''); setEditing(true); };

  const commit = async () => {
    const n = parseFloat(input);
    if (isNaN(n) || n < 0) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(catKey, year, month, n);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        value={input}
        autoFocus
        min="0"
        onChange={e => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ width: '90px', padding: '4px 6px', border: `2px solid ${C.green}`, borderRadius: '6px', fontSize: '12px', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
      />
    );
  }

  return (
    <div
      onClick={startEdit}
      title="انقر للتعديل"
      style={{
        padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
        color: value ? C.greenText : C.muted, background: value ? C.greenBg : '#F9F5F0',
        border: `1px dashed ${value ? C.green : C.border}`, minWidth: '70px', textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      {saving ? '…' : value ? fmt(value) : '+ تحديد'}
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────
const SellerBudget = () => {
  const [year,     setYear]     = useState(CURRENT_YEAR);
  const [budgets,  setBudgets]  = useState({}); // { 'feed-3': 1200, ... }
  const [actuals,  setActuals]  = useState({}); // { 'feed-3': 980, ... }
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');

  // Load budgets + actuals for the year
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        getBudgets(year),
        getStatements({ year }).catch(() => ({ data: null })),
      ]);
      // Build budgets map
      const bMap = {};
      (bRes.data || []).forEach(b => { bMap[`${b.category}-${b.month}`] = b.targetAmount; });
      setBudgets(bMap);

      // Build actuals map from statements
      const stmt = sRes?.data;
      if (stmt) {
        const aMap = {};
        // Expenses
        if (stmt.expenses) {
          Object.entries(stmt.expenses).forEach(([cat, monthMap]) => {
            Object.entries(monthMap || {}).forEach(([m, v]) => {
              aMap[`${cat}-${m}`] = (aMap[`${cat}-${m}`] || 0) + (v || 0);
            });
          });
        }
        // Income
        if (stmt.income) {
          Object.entries(stmt.income).forEach(([m, v]) => {
            aMap[`income-${m}`] = (v || 0);
          });
        }
        setActuals(aMap);
      }
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (category, yr, month, targetAmount) => {
    await setBudget({ year: yr, month, category, targetAmount });
    setBudgets(prev => ({ ...prev, [`${category}-${month}`]: targetAmount }));
    setToast('تم الحفظ ✓');
    setTimeout(() => setToast(''), 2000);
  };

  const MONTHS = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  // Annual target per category (sum of 12 months)
  const annualTarget = (catKey) =>
    Array.from({ length: 12 }, (_, i) => budgets[`${catKey}-${i + 1}`] || 0).reduce((s, v) => s + v, 0);
  const annualActual = (catKey) =>
    Array.from({ length: 12 }, (_, i) => actuals[`${catKey}-${i + 1}`] || 0).reduce((s, v) => s + v, 0);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir="rtl">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: C.green, color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: C.text }}>📊 الميزانية والأهداف</h1>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>حدد أهدافك الشهرية لكل فئة وتابع الفعلي مقابل المستهدف</p>
      </div>

      {/* Year selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: C.muted, fontWeight: '600' }}>السنة:</span>
        {YEAR_OPTIONS.map(y => (
          <button key={y} type="button" onClick={() => setYear(y)}
            style={{ padding: '6px 16px', borderRadius: '8px', border: `1.5px solid ${year === y ? C.green : C.border}`, background: year === y ? C.green : C.card, color: year === y ? '#fff' : C.text, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            {y}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.muted }}>جاري التحميل…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'إجمالي هدف المصروفات', value: EXP_CATS.filter(c => c.key !== 'income').reduce((s, c) => s + annualTarget(c.key), 0), color: C.amber },
              { label: 'إجمالي هدف الدخل', value: annualTarget('income'), color: C.green },
              { label: 'الفعلي للمصروفات', value: EXP_CATS.filter(c => c.key !== 'income').reduce((s, c) => s + annualActual(c.key), 0), color: C.muted },
            ].map((card, i) => (
              <div key={i} style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px 20px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '12px', color: C.muted, fontWeight: '600', marginBottom: '6px' }}>{card.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: card.color }}>{fmt(card.value)}</div>
              </div>
            ))}
          </div>

          {/* Budget table */}
          <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: 'auto' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#F9F5F0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: C.muted, borderBottom: `1px solid ${C.border}`, position: 'sticky', right: 0, background: '#F9F5F0', minWidth: '120px' }}>
                      الفئة
                    </th>
                    {MONTHS.map((m, i) => (
                      <th key={m} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: C.muted, borderBottom: `1px solid ${C.border}`, minWidth: '90px' }}>
                        {m}
                      </th>
                    ))}
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: C.muted, borderBottom: `1px solid ${C.border}`, minWidth: '100px', background: C.greenLt }}>
                      السنوي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EXP_CATS.map((cat, ci) => {
                    const annualT = annualTarget(cat.key);
                    const annualA = annualActual(cat.key);
                    const over    = cat.key !== 'income' ? annualA > annualT && annualT > 0 : annualA < annualT;
                    return (
                      <tr key={cat.key} style={{ borderBottom: `1px solid ${C.border}`, background: ci % 2 === 0 ? C.card : '#FEFAF5' }}>
                        <td style={{ padding: '12px 16px', position: 'sticky', right: 0, background: ci % 2 === 0 ? C.card : '#FEFAF5', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{cat.emoji}</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{cat.label}</span>
                          </div>
                          {annualA > 0 && (
                            <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                              فعلي: <span style={{ color: over ? C.red : C.green, fontWeight: '600' }}>{fmt(annualA)}</span>
                            </div>
                          )}
                        </td>
                        {Array.from({ length: 12 }, (_, mi) => {
                          const m     = mi + 1;
                          const bval  = budgets[`${cat.key}-${m}`];
                          const aval  = actuals[`${cat.key}-${m}`] || 0;
                          const isOver = bval && aval > 0 && (cat.key !== 'income' ? aval > bval : aval < bval);
                          return (
                            <td key={m} style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <BudgetCell value={bval} onSave={handleSave} catKey={cat.key} year={year} month={m} />
                                {aval > 0 && (
                                  <span style={{ fontSize: '10px', color: isOver ? C.red : C.green, fontWeight: '600' }}>
                                    {isOver ? '▲' : '▼'} {fmt(aval)}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 14px', textAlign: 'center', background: C.greenLt }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: annualT > 0 ? C.greenText : C.muted }}>
                            {annualT > 0 ? fmt(annualT) : '—'}
                          </div>
                          {over && annualT > 0 && (
                            <div style={{ fontSize: '10px', color: C.red, fontWeight: '600', marginTop: '2px' }}>تجاوز الحد</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '14px 20px', background: '#F9F5F0', borderTop: `1px solid ${C.border}`, fontSize: '12px', color: C.muted }}>
              💡 انقر على أي خلية لتحديد الهدف الشهري · تظهر الأرقام الخضراء الأداء الفعلي مقارنةً بالهدف
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerBudget;
