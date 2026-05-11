import { useEffect, useState, useCallback } from 'react';
import { getBudgets, setBudget } from '../../services/budgetService';
import { getStatements } from '../../services/statementsService';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

// Convert backend array [{month:0-based, income, expenses:{cat:amt}}]
// to {income:{1:amt}, expenses:{cat:{1:amt}}} that the budget map logic expects
const normalizeStmtData = (raw) => {
  if (!raw || !Array.isArray(raw)) return raw ?? null;
  const income = {};
  const expenses = {};
  raw.forEach(row => {
    const m = (row.month ?? 0) + 1;
    income[m] = row.income || 0;
    Object.entries(row.expenses || {}).forEach(([cat, amt]) => {
      if (!expenses[cat]) expenses[cat] = {};
      expenses[cat][m] = amt;
    });
  });
  return { income, expenses };
};

const EXP_CATS = [
  { key: 'feed',        labelKey: 'expenses.cat.feed',        emoji: '🌾' },
  { key: 'doctor',      labelKey: 'expenses.cat.doctor',      emoji: '🏥' },
  { key: 'transport',   labelKey: 'expenses.cat.transport',   emoji: '🚚' },
  { key: 'electricity', labelKey: 'expenses.cat.electricity', emoji: '⚡' },
  { key: 'salary',      labelKey: 'expenses.cat.salary',      emoji: '👷' },
  { key: 'rent',        labelKey: 'expenses.cat.rent',        emoji: '🏠' },
  { key: 'water',       labelKey: 'expenses.cat.water',       emoji: '💧' },
  { key: 'maintenance', labelKey: 'expenses.cat.maintenance', emoji: '🔧' },
  { key: 'other',       labelKey: 'expenses.cat.other',       emoji: '📦' },
  { key: 'income',      labelKey: 'budget.cat.income',        emoji: '💰' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const fmt = (v) => v != null && v !== 0
  ? Number(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م'
  : '—';

// ─── Inline editable cell ──────────────────────────────────────────────────
const BudgetCell = ({ value, onSave, catKey, year, month, tFn }) => {
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
      title={tFn('budget.setTarget')}
      style={{
        padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
        color: value ? C.greenText : C.muted, background: value ? C.greenBg : '#F9F5F0',
        border: `1px dashed ${value ? C.green : C.border}`, minWidth: '70px', textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      {saving ? '…' : value ? fmt(value) : `+ ${tFn('budget.setTarget')}`}
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────
const SellerBudget = () => {
  const { t, isRTL } = useLang();
  const [year,     setYear]     = useState(CURRENT_YEAR);
  const [budgets,  setBudgets]  = useState({}); // { 'feed-3': 1200, ... }
  const [actuals,  setActuals]  = useState({}); // { 'feed-3': 980, ... }
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');

  const CUSTOM_ROWS_KEY = 'farmflow_custom_budget_rows';
  const CUSTOM_EMOJIS = [
    '📦','🚜','🌱','🔑','💊','🏪','📱','📋','🎯','🌿',
    '🪣','💡','🛒','👔','🔩','🧰','🏗️','🚁','🔬','🧪',
    '🌾','💼','🎁','🚗','⚙️','🏋️','🏥','💈','💰','📌',
  ];
  const loadCustomRows = () => { try { return JSON.parse(localStorage.getItem(CUSTOM_ROWS_KEY) || '[]'); } catch { return []; } };
  const [customRows, setCustomRows] = useState(loadCustomRows);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [addRowLabel, setAddRowLabel] = useState('');
  const [addRowEmoji, setAddRowEmoji] = useState('📦');
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);

  const persistCustomRows = (rows) => { setCustomRows(rows); localStorage.setItem(CUSTOM_ROWS_KEY, JSON.stringify(rows)); };
  const addCustomRow = () => {
    if (!addRowLabel.trim()) return;
    persistCustomRows([...customRows, { id: Date.now().toString(), label: addRowLabel.trim(), emoji: addRowEmoji, budgets: {} }]);
    setAddRowLabel(''); setAddRowEmoji('📦'); setAddRowOpen(false);
  };
  const deleteCustomRow = (id) => persistCustomRows(customRows.filter(r => r.id !== id));
  const renameCustomRow = (id, label) => persistCustomRows(customRows.map(r => r.id === id ? { ...r, label } : r));
  const setCustomRowEmoji = (id, emoji) => { persistCustomRows(customRows.map(r => r.id === id ? { ...r, emoji } : r)); setEmojiPickerFor(null); };
  const saveCustomCellBudget = (id, yr, month, amount) => {
    persistCustomRows(customRows.map(r => r.id === id ? { ...r, budgets: { ...r.budgets, [`${yr}-${month}`]: amount } } : r));
  };
  const customRowAnnualBudget = (row) =>
    Array.from({ length: 12 }, (_, i) => row.budgets?.[`${year}-${i+1}`] || 0).reduce((s,v) => s+v, 0);

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
    setToast(t('budget.saved'));
    setTimeout(() => setToast(''), 2000);
  };

  const MONTHS = [
    t('budget.jan'), t('budget.feb'), t('budget.mar'), t('budget.apr'),
    t('budget.may'), t('budget.jun'), t('budget.jul'), t('budget.aug'),
    t('budget.sep'), t('budget.oct'), t('budget.nov'), t('budget.dec'),
  ];

  // Annual target per category (sum of 12 months)
  const annualTarget = (catKey) =>
    Array.from({ length: 12 }, (_, i) => budgets[`${catKey}-${i + 1}`] || 0).reduce((s, v) => s + v, 0);
  const annualActual = (catKey) =>
    Array.from({ length: 12 }, (_, i) => actuals[`${catKey}-${i + 1}`] || 0).reduce((s, v) => s + v, 0);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: C.green, color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: C.text }}>📊 {t('budget.title')}</h1>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>{t('budget.subtitle')}</p>
      </div>

      {/* Year selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: C.muted, fontWeight: '600' }}>{t('budget.year')}:</span>
        {YEAR_OPTIONS.map(y => (
          <button key={y} type="button" onClick={() => setYear(y)}
            style={{ padding: '6px 16px', borderRadius: '8px', border: `1.5px solid ${year === y ? C.green : C.border}`, background: year === y ? C.green : C.card, color: year === y ? '#fff' : C.text, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            {y}
          </button>
        ))}
      </div>

      {emojiPickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setEmojiPickerFor(null)} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.muted }}>{t('budget.loading')}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { labelKey: 'budget.totalExpTarget', value: EXP_CATS.filter(c => c.key !== 'income').reduce((s, c) => s + annualTarget(c.key), 0), color: C.amber },
              { labelKey: 'budget.totalIncTarget', value: annualTarget('income'), color: C.green },
              { labelKey: 'budget.actualExp', value: EXP_CATS.filter(c => c.key !== 'income').reduce((s, c) => s + annualActual(c.key), 0), color: C.muted },
            ].map((card, i) => (
              <div key={i} style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px 20px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '12px', color: C.muted, fontWeight: '600', marginBottom: '6px' }}>{t(card.labelKey)}</div>
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
                      {t('budget.cat')}
                    </th>
                    {MONTHS.map((m, i) => (
                      <th key={i} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: C.muted, borderBottom: `1px solid ${C.border}`, minWidth: '90px' }}>
                        {m}
                      </th>
                    ))}
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: C.muted, borderBottom: `1px solid ${C.border}`, minWidth: '100px', background: C.greenLt }}>
                      {t('budget.annual')}
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
                            <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t(cat.labelKey)}</span>
                          </div>
                          {annualA > 0 && (
                            <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                              {t('budget.actual')}: <span style={{ color: over ? C.red : C.green, fontWeight: '600' }}>{fmt(annualA)}</span>
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
                                <BudgetCell value={bval} onSave={handleSave} catKey={cat.key} year={year} month={m} tFn={t} />
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
                            <div style={{ fontSize: '10px', color: C.red, fontWeight: '600', marginTop: '2px' }}>{t('budget.overLimit')}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Custom rows ── */}
                  {customRows.map((row, ci) => {
                    const annT = customRowAnnualBudget(row);
                    return (
                      <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}`, background: ci % 2 === 0 ? '#FFFBF5' : '#FFF8EE', position: 'relative' }}>
                        <td style={{ padding: '10px 12px', position: 'sticky', right: 0, background: ci % 2 === 0 ? '#FFFBF5' : '#FFF8EE', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button type="button" onClick={() => setEmojiPickerFor(emojiPickerFor === row.id ? null : row.id)}
                              style={{ background: '#F3F4F6', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontSize: '15px' }}>
                              {row.emoji}
                            </button>
                            <input defaultValue={row.label} onBlur={e => renameCustomRow(row.id, e.target.value || row.label)}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                              style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '700', color: C.text, outline: 'none', width: '80px' }}
                            />
                            <button type="button" onClick={() => deleteCustomRow(row.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '14px', marginRight: 'auto' }}>×</button>
                          </div>
                          {emojiPickerFor === row.id && (
                            <div style={{ position: 'absolute', zIndex: 50, background: '#fff', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '200px', bottom: '34px', right: '12px' }}>
                              {CUSTOM_EMOJIS.map(em => (
                                <button key={em} type="button" onClick={() => setCustomRowEmoji(row.id, em)}
                                  style={{ background: row.emoji === em ? '#E5E7EB' : 'none', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', fontSize: '16px' }}>
                                  {em}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        {Array.from({ length: 12 }, (_, mi) => {
                          const m = mi + 1;
                          const bval = row.budgets?.[`${year}-${m}`];
                          return (
                            <td key={m} style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <BudgetCell value={bval} onSave={(_, yr, mo, amt) => saveCustomCellBudget(row.id, yr, mo, amt)}
                                catKey={`custom-${row.id}`} year={year} month={m} tFn={t} />
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 14px', textAlign: 'center', background: '#FFF3E0' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: annT > 0 ? '#D97706' : C.muted }}>
                            {annT > 0 ? fmt(annT) : '—'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Add custom row ── */}
                  <tr style={{ background: '#FAFAF5' }}>
                    <td colSpan={14} style={{ padding: '8px 16px' }}>
                      {addRowOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ position: 'relative' }}>
                            <button type="button" onClick={() => setEmojiPickerFor(emojiPickerFor === 'new' ? null : 'new')}
                              style={{ background: '#F3F4F6', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '18px' }}>
                              {addRowEmoji}
                            </button>
                            {emojiPickerFor === 'new' && (
                              <div style={{ position: 'absolute', zIndex: 50, background: '#fff', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', flexWrap: 'wrap', gap: '4px', width: '220px', bottom: '38px', right: 0 }}>
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
                            style={{ padding: '7px 12px', borderRadius: '8px', border: `1.5px solid ${C.green}`, fontSize: '13px', width: '140px', outline: 'none', fontFamily: 'inherit' }}
                          />
                          <button type="button" onClick={addCustomRow}
                            style={{ padding: '7px 16px', borderRadius: '8px', background: C.green, color: '#fff', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                            إضافة
                          </button>
                          <button type="button" onClick={() => setAddRowOpen(false)}
                            style={{ padding: '7px 12px', borderRadius: '8px', background: '#F3F4F6', color: '#6B7280', border: `1px solid ${C.border}`, fontSize: '13px', cursor: 'pointer' }}>
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddRowOpen(true)}
                          style={{ background: 'none', border: `1.5px dashed ${C.border}`, borderRadius: '8px', padding: '6px 16px', color: C.muted, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>＋</span> إضافة بند مخصص
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ padding: '14px 20px', background: '#F9F5F0', borderTop: `1px solid ${C.border}`, fontSize: '12px', color: C.muted }}>
              💡 {t('budget.hint')}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerBudget;
