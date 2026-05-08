import { useEffect, useState } from 'react';
import { createOrder } from '../../services/orderService';

import { C } from '../../tokens';

const CAT_AR    = { feed:'علف', veterinary:'مستلزمات بيطرية', equipment:'معدات', seeds:'بذور', other:'أخرى' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };
const BASE_URL  = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const fmt = (n) => Number(n).toLocaleString('ar-EG');

const inp = (extra = {}) => ({
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px',
  color: C.text, background: C.white, fontFamily: 'inherit', ...extra,
});

const STEPS = [
  { n: 1, label: 'الكمية والتفاصيل' },
  { n: 2, label: 'طريقة الدفع' },
  { n: 3, label: 'تأكيد الطلب' },
];

const ProgressBar = ({ step }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
      {STEPS.map(s => (
        <div key={s.n} style={{ flex: 1, height: 5, borderRadius: 3, background: step >= s.n ? C.green : C.border, transition: 'background 0.3s' }} />
      ))}
    </div>
    <div style={{ display: 'flex', gap: 5 }}>
      {STEPS.map(s => (
        <div key={s.n} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: step === s.n ? 700 : 500, color: step > s.n ? C.green : step === s.n ? C.text : C.border }}>
          {step > s.n ? '✓ ' : `${s.n}. `}{s.label}
        </div>
      ))}
    </div>
  </div>
);

const SupplyOrderModal = ({ supply, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [qty, setQty]   = useState(supply.minOrderQty || 1);
  const [payment, setPayment]   = useState({ type: 'cod', instapayRef: '' });
  const [notes, setNotes]       = useState('');
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmit]   = useState(false);
  const isMobile = window.innerWidth < 600;

  const totalPrice = parseFloat((supply.pricePerUnit * qty).toFixed(2));
  const image = supply.images?.[0];
  const catEmoji = CAT_EMOJI[supply.category] || '📦';
  const catLabel = CAT_AR[supply.category] || supply.category;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const validate = () => {
    if (step === 1) {
      if (qty < (supply.minOrderQty || 1)) { setStepError(`الحد الأدنى للطلب ${supply.minOrderQty} ${supply.unit}`); return false; }
      if (qty > supply.quantity)            { setStepError(`الكمية المتاحة ${supply.quantity} ${supply.unit} فقط`); return false; }
    }
    if (step === 2 && payment.type === 'instapay' && !payment.instapayRef.trim()) {
      setStepError('أدخل رقم مرجع التحويل'); return false;
    }
    setStepError(''); return true;
  };

  const next = () => { if (validate()) setStep(p => p + 1); };
  const back = () => { setStepError(''); setStep(p => p - 1); };

  const submit = async () => {
    setSubmit(true); setStepError('');
    try {
      const noteParts = [
        notes && `ملاحظة: ${notes}`,
        payment.type === 'instapay' && payment.instapayRef && `مرجع InstaPay: ${payment.instapayRef}`,
      ].filter(Boolean);

      await createOrder({
        supplyId:    supply._id,
        quantity:    qty,
        paymentType: payment.type,
        notes:       noteParts.join(' | ') || undefined,
      });
      onSuccess();
    } catch (err) {
      const d = err.response?.data;
      setStepError(d?.message || d?.errors?.[0]?.msg || 'حدث خطأ. حاول مرة أخرى.');
    } finally {
      setSubmit(false);
    }
  };

  // ── Step 1: Qty & Details ────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Supply recap */}
      <div style={{ display: 'flex', gap: 14, padding: 16, background: '#F9F5F0', borderRadius: 14, alignItems: 'center' }}>
        <div style={{ width: 72, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {image
            ? <img src={`${BASE_URL}${image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : catEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ background: C.greenBg, color: C.greenText, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, display: 'inline-block', marginBottom: 4 }}>
            {catEmoji} {catLabel}
          </span>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supply.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {fmt(supply.pricePerUnit)} ج.م / {supply.unit}
            {supply.minOrderQty > 1 && ` · الحد الأدنى: ${supply.minOrderQty} ${supply.unit}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmt(totalPrice)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>ج.م إجمالي</div>
        </div>
      </div>

      {/* Qty selector */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          الكمية المطلوبة ({supply.unit})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => setQty(q => Math.max(supply.minOrderQty || 1, q - 1))}
            style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 20, cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>
            −
          </button>
          <input type="number" value={qty} min={supply.minOrderQty || 1} max={supply.quantity}
            onChange={e => setQty(Math.max(supply.minOrderQty || 1, Math.min(supply.quantity, Number(e.target.value) || 1)))}
            style={{ ...inp({ textAlign: 'center', width: 100 }) }} />
          <button type="button" onClick={() => setQty(q => Math.min(supply.quantity, q + 1))}
            style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 20, cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>
            +
          </button>
          <div style={{ flex: 1, fontSize: 12, color: C.muted }}>
            متاح: {fmt(supply.quantity)} {supply.unit}
          </div>
        </div>
      </div>

      {/* Price summary */}
      <div style={{ background: C.greenLt, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: C.muted }}>{fmt(supply.pricePerUnit)} ج.م × {qty} {supply.unit}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{fmt(totalPrice)} ج.م</span>
      </div>

      {/* Delivery note */}
      {supply.deliveryAvailable && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1D4ED8' }}>
          🚚 توصيل متاح
          {supply.deliveryCost ? ` · تكلفة التوصيل: ${fmt(supply.deliveryCost)} ج.م` : ' · قابل للتفاوض'}
        </div>
      )}

      {/* Notes */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ملاحظات <span style={{ fontWeight: 400, color: C.muted }}>(اختياري)</span>
        </div>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="تعليمات التسليم أو أي ملاحظات أخرى…"
          style={{ ...inp({ resize: 'vertical' }) }} />
      </div>
    </div>
  );

  // ── Step 2: Payment ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* COD */}
      <label style={{ display: 'flex', gap: 13, padding: 16, border: `2px solid ${payment.type === 'cod' ? C.green : C.border}`, borderRadius: 14, cursor: 'pointer', background: payment.type === 'cod' ? C.greenLt : C.white, alignItems: 'flex-start' }}>
        <input type="radio" name="pmt" value="cod" checked={payment.type === 'cod'}
          onChange={() => setPayment(p => ({ ...p, type: 'cod' }))}
          style={{ accentColor: C.green, flexShrink: 0, marginTop: 3, cursor: 'pointer' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: payment.type === 'cod' ? C.green : C.text, marginBottom: 4 }}>💵 الدفع عند الاستلام</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>ادفع المبلغ كاملاً عند استلام المنتج.</div>
          {payment.type === 'cod' && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: C.white, borderRadius: 9, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: C.muted }}>المبلغ عند الاستلام</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{fmt(totalPrice)} ج.م</span>
            </div>
          )}
        </div>
      </label>

      {/* InstaPay */}
      <label style={{ display: 'flex', gap: 13, padding: 16, border: `2px solid ${payment.type === 'instapay' ? C.green : C.border}`, borderRadius: 14, cursor: 'pointer', background: payment.type === 'instapay' ? C.greenLt : C.white, alignItems: 'flex-start' }}>
        <input type="radio" name="pmt" value="instapay" checked={payment.type === 'instapay'}
          onChange={() => setPayment(p => ({ ...p, type: 'instapay' }))}
          style={{ accentColor: C.green, flexShrink: 0, marginTop: 3, cursor: 'pointer' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: payment.type === 'instapay' ? C.green : C.text, marginBottom: 4 }}>📱 InstaPay</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>حول المبلغ وأدخل رقم مرجع التحويل.</div>
          {payment.type === 'instapay' && (
            <div style={{ marginTop: 12 }} onClick={e => e.preventDefault()}>
              <input type="text" placeholder="رقم مرجع التحويل…" value={payment.instapayRef}
                onChange={e => setPayment(p => ({ ...p, instapayRef: e.target.value }))}
                style={inp()} />
              <div style={{ marginTop: 8, padding: '10px 12px', background: C.white, borderRadius: 9, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: C.muted }}>المبلغ المطلوب</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{fmt(totalPrice)} ج.م</span>
              </div>
            </div>
          )}
        </div>
      </label>
    </div>
  );

  // ── Step 3: Confirm ──────────────────────────────────────────────────────────
  const renderStep3 = () => {
    const rows = [
      { label: 'المنتج',        val: supply.name,                             bold: true  },
      { label: 'التصنيف',       val: `${catEmoji} ${catLabel}`,               bold: false },
      null,
      { label: 'الكمية',        val: `${qty} ${supply.unit}`,                 bold: false },
      { label: 'سعر الوحدة',    val: `${fmt(supply.pricePerUnit)} ج.م`,       bold: false },
      { label: 'الإجمالي',      val: `${fmt(totalPrice)} ج.م`,                bold: true  },
      null,
      { label: 'طريقة الدفع',   val: payment.type === 'cod' ? 'الدفع عند الاستلام' : 'InstaPay', bold: false },
      ...(supply.location ? [{ label: 'الموقع', val: `📍 ${supply.location}`, bold: false }] : []),
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div style={{ padding: '11px 16px', background: C.text, color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
            📋 ملخص الطلب
          </div>
          <div style={{ background: C.white }}>
            {rows.map((row, i) => {
              if (row === null) return <div key={i} style={{ height: 1, background: C.border }} />;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '9px 16px', background: row.bold ? C.greenLt : 'transparent' }}>
                  <span style={{ fontSize: row.bold ? 14 : 12, color: row.bold ? C.text : C.muted, fontWeight: row.bold ? 700 : 500 }}>{row.label}</span>
                  <span style={{ fontSize: row.bold ? 15 : 13, color: row.bold ? C.green : C.text, fontWeight: row.bold ? 800 : 600, textAlign: 'right' }}>{row.val}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seller */}
        {supply.seller && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', background: C.greenLt, borderRadius: 12, border: `1px solid ${C.green}30` }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(supply.seller.name?.[0] || supply.seller.farmName?.[0] || '؟').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{supply.seller.farmName || supply.seller.name || 'البائع'}</div>
              <div style={{ fontSize: 11, color: C.muted }}>سيتواصل معك البائع لتأكيد الطلب</div>
            </div>
          </div>
        )}

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
          ℹ️ بعد تقديم الطلب سيتواصل البائع معك لتأكيد التفاصيل وترتيب التسليم.
        </div>
      </div>
    );
  };

  const stepTitles = ['', 'الكمية والتفاصيل', 'طريقة الدفع', 'مراجعة وتأكيد'];
  const panelStyle = isMobile
    ? { position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '92vh', borderRadius: '24px 24px 0 0', background: C.white, zIndex: 201, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(44,24,16,0.2)', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }
    : { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px,calc(100vw - 32px))', maxHeight: '90vh', borderRadius: 24, background: C.white, zIndex: 201, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: C.shadow, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" };

  return (
    <>
      <style>{`
        @keyframes ffModalIn  { from { opacity:0; transform:translate(-50%,-46%); } to { opacity:1; transform:translate(-50%,-50%); } }
        @keyframes ffDrawerIn { from { opacity:0; transform:translateY(100%); }   to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div aria-hidden onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.6)', zIndex: 200, backdropFilter: 'blur(2px)' }} />

      <div role="dialog" aria-modal dir="rtl"
        style={{ ...panelStyle, animation: isMobile ? 'ffDrawerIn 0.28s ease-out' : 'ffModalIn 0.22s ease-out' }}>

        {isMobile && (
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? '8px 20px 0' : '22px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{stepTitles[step]}</h2>
            <button type="button" onClick={onClose} aria-label="إغلاق"
              style={{ background: '#F3EDE5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 20, flexShrink: 0 }}>
              ×
            </button>
          </div>
          <ProgressBar step={step} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 20px' : '18px 24px' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {stepError && (
            <div role="alert" style={{ marginTop: 12, background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: '11px 14px', color: C.red, fontSize: 13, lineHeight: 1.5 }}>
              ⚠️ {stepError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '14px 20px 22px' : '16px 24px 22px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
            خطوة {step} من {STEPS.length}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button type="button" onClick={back}
                style={{ flex: 1, padding: 13, background: '#F3EDE5', color: C.text, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                → رجوع
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={next}
                style={{ flex: step > 1 ? 2 : 1, padding: 13, background: C.green, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = C.greenDk}
                onMouseLeave={e => e.currentTarget.style.background = C.green}>
                التالي ←
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting}
                style={{ flex: 2, padding: 13, background: submitting ? '#6AAF74' : C.green, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'جاري الإرسال…' : '✓ تأكيد الطلب'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplyOrderModal;
