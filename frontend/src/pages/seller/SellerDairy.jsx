import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyDairy, deleteDairy, updateDairyStock } from '../../services/dairyService';
import { useToast } from '../../components/Toast';

const C = {
  bg: '#FEFAF5', card: '#FFFFFF', green: '#3A7D44', greenDk: '#2D6235',
  greenBg: '#DCFCE7', greenText: '#166534', amber: '#D97706', amberBg: '#FEF3C7',
  amberText: '#92400E', red: '#DC2626', redBg: '#FEF2F2', redText: '#B91C1C',
  border: '#E8D5C0', text: '#2C1810', muted: '#8B6B5A',
  shadow: '0 1px 3px rgba(44,24,16,0.08), 0 4px 12px rgba(44,24,16,0.06)',
};

const TYPE_META = {
  milk:    { emoji: '🥛', label: 'لبن' },
  cheese:  { emoji: '🧀', label: 'جبنة' },
  yogurt:  { emoji: '🫙', label: 'زبادي' },
  butter:  { emoji: '🧈', label: 'زبدة' },
  cream:   { emoji: '🍦', label: 'قشطة' },
  ghee:    { emoji: '🫕', label: 'سمن' },
  other:   { emoji: '📦', label: 'أخرى' },
};

const UNIT_LABELS = { kg: 'كجم', liter: 'لتر', piece: 'قطعة', pack: 'عبوة', dozen: 'دزينة' };

const STATUS_META = {
  pending:  { label: 'قيد المراجعة', bg: C.amberBg,  color: C.amberText },
  approved: { label: 'معتمد',        bg: C.greenBg,  color: C.greenText },
  rejected: { label: 'مرفوض',       bg: C.redBg,    color: C.redText   },
};

const fmtDate = d => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
const fmt     = n => Number(n ?? 0).toLocaleString('ar-EG');

const SellerDairy = () => {
  const toast    = useToast();
  const navigate = useNavigate();
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [deletingId,    setDeletingId]    = useState(null);
  const [stockModal,    setStockModal]    = useState(null);
  const [stockChange,   setStockChange]   = useState('');
  const [stockNote,     setStockNote]     = useState('');
  const [stockLoading,  setStockLoading]  = useState(false);
  const [expandedStock, setExpandedStock] = useState({});

  useEffect(() => {
    getMyDairy()
      .then(r => setProducts(r.data))
      .catch(() => setError('فشل تحميل المنتجات. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setDeletingId(id);
    try {
      await deleteDairy(id);
      setProducts(p => p.filter(x => x._id !== id));
      toast.success('تم حذف المنتج.');
    } catch {
      toast.error('فشل الحذف. حاول مرة أخرى.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStockUpdate = async () => {
    const change = parseFloat(stockChange);
    if (!change || change === 0) return;
    setStockLoading(true);
    try {
      const updated = await updateDairyStock(stockModal.product._id, { change, note: stockNote });
      setProducts(p => p.map(x => x._id === updated.data._id ? updated.data : x));
      setStockModal(null);
      setStockChange('');
      setStockNote('');
      toast.success('تم تحديث المخزون');
    } catch {
      toast.error('فشل تحديث المخزون');
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C4A6E 0%, #0E7490 55%, #0891B2 100%)', padding: '24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -8, top: -20, fontSize: '110px', opacity: 0.07, lineHeight: 1, pointerEvents: 'none' }}>🥛</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>منتجات الألبان</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
              {loading ? 'جاري التحميل…' : `${products.length} منتج`}
            </p>
          </div>
          <button type="button" onClick={() => navigate('/seller/add-dairy')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
            + إضافة منتج ألبان
          </button>
        </div>
      </div>

      {/* Stock Modal */}
      {stockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) { setStockModal(null); setStockChange(''); setStockNote(''); } }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', direction: 'rtl', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: C.text }}>
              تحديث مخزون: {stockModal.product.name}
            </h3>
            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>
              الكمية الحالية: <strong style={{ color: C.text }}>{fmt(stockModal.product.quantity)} {UNIT_LABELS[stockModal.product.unit] || stockModal.product.unit}</strong>
              {stockChange && parseFloat(stockChange) !== 0 && (
                <span> → <strong style={{ color: parseFloat(stockChange) > 0 ? C.green : C.red }}>
                  {fmt(stockModal.product.quantity + parseFloat(stockChange))} {UNIT_LABELS[stockModal.product.unit] || stockModal.product.unit}
                </strong></span>
              )}
            </div>

            {/* Add / Withdraw quick buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button type="button"
                onClick={() => { const abs = Math.abs(parseFloat(stockChange) || 0); setStockChange(abs > 0 ? String(abs) : ''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${parseFloat(stockChange) > 0 ? C.green : C.border}`, background: parseFloat(stockChange) > 0 ? C.greenBg : '#fff', color: parseFloat(stockChange) > 0 ? C.greenText : C.text, fontWeight: '800', fontSize: '18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                ➕ إضافة
              </button>
              <button type="button"
                onClick={() => { const abs = Math.abs(parseFloat(stockChange) || 0); setStockChange(abs > 0 ? String(-abs) : ''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${parseFloat(stockChange) < 0 ? C.red : C.border}`, background: parseFloat(stockChange) < 0 ? C.redBg : '#fff', color: parseFloat(stockChange) < 0 ? C.redText : C.text, fontWeight: '800', fontSize: '18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                ➖ سحب
              </button>
            </div>

            {/* Quantity input */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>الكمية</div>
              <input type="number" min="0" step="any"
                value={Math.abs(parseFloat(stockChange) || 0) || ''}
                onChange={e => {
                  const abs = parseFloat(e.target.value) || 0;
                  const sign = parseFloat(stockChange) < 0 ? -1 : 1;
                  setStockChange(abs > 0 ? String(sign * abs) : '');
                }}
                placeholder="أدخل الكمية"
                style={{ width: '100%', padding: '10px 13px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: '9px', fontSize: '15px', fontWeight: '700', textAlign: 'center', color: C.text, fontFamily: 'inherit', outline: 'none' }} />
            </div>

            {/* Note input */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>ملاحظة (اختياري)</div>
              <input type="text" value={stockNote} onChange={e => setStockNote(e.target.value)}
                placeholder="مثال: استلام دفعة جديدة"
                style={{ width: '100%', padding: '10px 13px', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: '9px', fontSize: '14px', color: C.text, fontFamily: 'inherit', outline: 'none' }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleStockUpdate}
                disabled={stockLoading || !stockChange || parseFloat(stockChange) === 0}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: stockLoading || !stockChange || parseFloat(stockChange) === 0 ? '#9CA3AF' : C.green, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '800', cursor: stockLoading || !stockChange || parseFloat(stockChange) === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {stockLoading ? 'جاري الحفظ…' : 'حفظ'}
              </button>
              <button type="button"
                onClick={() => { setStockModal(null); setStockChange(''); setStockNote(''); }}
                style={{ padding: '12px 20px', borderRadius: '10px', background: '#F3F4F6', color: C.text, border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '24px 32px 56px', maxWidth: '900px', margin: '0 auto' }}>

        {error && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: C.redText, fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontSize: '15px' }}>جاري التحميل…</div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🥛</div>
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: C.text }}>لا يوجد منتجات ألبان بعد</h2>
            <p style={{ margin: '0 0 24px', color: C.muted, fontSize: '14px' }}>أضف جبنة، لبن، زبادي أو غيرها من منتجات مزرعتك.</p>
            <button type="button" onClick={() => navigate('/seller/add-dairy')}
              style={{ padding: '12px 24px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + إضافة أول منتج
            </button>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {products.map(p => {
              const tm = TYPE_META[p.type] || TYPE_META.other;
              const sm = STATUS_META[p.status] || STATUS_META.pending;
              return (
                <div key={p._id} style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '18px 20px', boxShadow: C.shadow }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Icon */}
                    <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#CFFAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                      {tm.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{p.name}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: sm.bg, color: sm.color, fontWeight: '700' }}>{sm.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '13px', color: C.muted }}>
                        <span>{tm.emoji} {tm.label}</span>
                        <span>📦 {fmt(p.quantity)} {UNIT_LABELS[p.unit] || p.unit}</span>
                        <span style={{ fontWeight: '700', color: C.green }}>{fmt(p.pricePerUnit)} ج.م / {UNIT_LABELS[p.unit] || p.unit}</span>
                        {p.expiryDate && <span>⏳ تنتهي: {fmtDate(p.expiryDate)}</span>}
                      </div>
                      {p.status === 'rejected' && p.rejectionReason && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.redText, background: C.redBg, padding: '5px 10px', borderRadius: '7px', display: 'inline-block' }}>
                          سبب الرفض: {p.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setStockModal({ product: p })}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.green}`, background: C.greenBg, color: C.greenText, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        📊 تحديث المخزون
                      </button>
                      <button type="button" onClick={() => navigate(`/seller/edit-dairy/${p._id}`)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        ✏️ تعديل
                      </button>
                      <button type="button" onClick={() => handleDelete(p._id)} disabled={deletingId === p._id}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #FECACA', background: C.redBg, color: C.redText, fontSize: '13px', fontWeight: '600', cursor: deletingId === p._id ? 'not-allowed' : 'pointer' }}>
                        {deletingId === p._id ? '…' : '🗑'}
                      </button>
                    </div>
                  </div>

                  {/* Stock log toggle */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
                    <button type="button"
                      onClick={() => setExpandedStock(prev => ({ ...prev, [p._id]: !prev[p._id] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: C.muted, fontWeight: '600', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📊 سجل المخزون
                      <span style={{ display: 'inline-block', transform: expandedStock[p._id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '10px' }}>▾</span>
                    </button>
                    {expandedStock[p._id] && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(p.stockLog?.length > 0) ? (
                          [...p.stockLog].reverse().slice(0, 5).map((entry, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', padding: '6px 10px', borderRadius: '7px', background: '#F9FAFB', border: `1px solid ${C.border}` }}>
                              <span style={{ color: entry.change > 0 ? C.green : C.red, fontWeight: '700', minWidth: '50px' }}>
                                {entry.change > 0 ? '+' : ''}{fmt(entry.change)}
                              </span>
                              <span style={{ color: C.muted, flex: 1 }}>{entry.note || '—'}</span>
                              <span style={{ color: C.muted, flexShrink: 0 }}>{fmtDate(entry.date || entry.createdAt)}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '12px', color: C.muted, padding: '6px 2px' }}>لا يوجد سجل مخزون بعد.</div>
                        )}
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

export default SellerDairy;
