import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { createOrder } from '../../services/orderService';
import { getImageUrl, fmt } from '../../utils/format';

const C = {
  bg:        '#F8F4EE',
  white:     '#FFFFFF',
  green:     '#3A7D44',
  greenDk:   '#2D6235',
  greenLt:   '#F0F7F1',
  greenBg:   '#DCFCE7',
  greenText: '#166534',
  border:    '#E8D5C0',
  text:      '#2C1810',
  muted:     '#8B6B5A',
  shadow:    '0 2px 10px rgba(44,24,16,0.08)',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  amber:     '#D97706',
  amberBg:   '#FEF3C7',
};

const LIVE_META = {
  cattle:  { emoji: '🐄', label: 'ماشية'  },
  buffalo: { emoji: '🐃', label: 'جاموس'  },
  sheep:   { emoji: '🐑', label: 'أغنام'  },
  goat:    { emoji: '🐐', label: 'ماعز'   },
  camel:   { emoji: '🐪', label: 'إبل'    },
  horse:   { emoji: '🐎', label: 'خيول'   },
  poultry: { emoji: '🐔', label: 'دواجن'  },
  rabbit:  { emoji: '🐇', label: 'أرانب'  },
  other:   { emoji: '🐾', label: 'أخرى'   },
};

const PAYMENT_OPTS = [
  { key: 'cod',      icon: '💵', label: 'الدفع عند الاستلام', sub: 'ادفع نقداً عند استلام المواشي' },
  { key: 'instapay', icon: '📱', label: 'إنستاباي',           sub: 'حوّل المبلغ وأرسل رقم العملية' },
];

// ─── Step indicator ─────────────────────────────────────────────────────────
const StepBar = ({ step }) => {
  const steps = ['مراجعة السلة', 'بيانات الدفع', 'تأكيد الطلب'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '24px' }}>
      {steps.map((label, i) => {
        const n      = i + 1;
        const active = step === n;
        const done   = step > n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800',
                background: done ? C.green : active ? C.green : '#E8D5C0',
                color: (done || active) ? '#fff' : C.muted,
                border: active ? `3px solid ${C.greenDk}` : 'none',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500', color: active ? C.green : done ? C.greenText : C.muted, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: step > n ? C.green : C.border, margin: '0 6px', marginBottom: '18px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const BuyerCart = () => {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, total } = useCart();

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [payment,      setPayment]      = useState('cod');
  const [instaRef,     setInstaRef]     = useState('');
  const [address,      setAddress]      = useState('');
  const [placing,      setPlacing]      = useState(false);
  const [errMsg,       setErrMsg]       = useState('');
  const [orderIds,     setOrderIds]     = useState([]);

  const handlePlaceOrder = async () => {
    if (payment === 'instapay' && !instaRef.trim()) {
      setErrMsg('يرجى إدخال رقم عملية التحويل');
      return;
    }
    setPlacing(true);
    setErrMsg('');
    try {
      const notes = [
        payment === 'instapay' ? `InstaPay Ref: ${instaRef.trim()}` : null,
        address.trim() ? `Address: ${address.trim()}` : null,
      ].filter(Boolean).join(' | ');

      const ids = [];
      for (const item of items) {
        const res = await createOrder({
          listing:     item._id,
          paymentType: payment,
          quantity:    item.qty || 1,
          notes:       notes || undefined,
        });
        ids.push(res.data?._id || res.data?.id || '');
      }
      setOrderIds(ids);
      clearCart();
      setCheckoutStep(3);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'حدث خطأ أثناء تقديم الطلبات');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div style={{ margin: '-24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir="rtl">

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #3A7D44 0%, #2D6235 100%)`, padding: '24px 32px' }}>
        <button
          type="button"
          onClick={() => checkoutStep > 1 && checkoutStep < 3 ? setCheckoutStep(s => s - 1) : navigate('/buyer')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', marginBottom: '12px', backdropFilter: 'blur(4px)' }}
        >
          {checkoutStep > 1 && checkoutStep < 3 ? '← رجوع' : '← متابعة التسوق'}
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#fff' }}>🛒 سلة المشتريات</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          {checkoutStep === 3 ? 'تم تقديم الطلب' : `${items.length} ${items.length === 1 ? 'منتج' : 'منتجات'}`}
        </p>
      </div>

      <div style={{ padding: '24px 32px 56px', maxWidth: '860px', margin: '0 auto' }}>

        {checkoutStep < 3 && items.length > 0 && <StepBar step={checkoutStep} />}

        {/* ── STEP 3: CONFIRMATION ─────────────────────── */}
        {checkoutStep === 3 && (
          <div style={{ background: C.white, borderRadius: '20px', padding: '40px 32px', textAlign: 'center', boxShadow: C.shadow }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '900', color: C.text }}>تم تقديم طلبك بنجاح!</h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: C.muted }}>يمكنك متابعة حالة طلباتك من صفحة "طلباتي"</p>

            <div style={{ background: '#F9F5F0', borderRadius: '14px', padding: '18px 24px', marginBottom: '28px', textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: C.muted }}>عدد المنتجات</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{orderIds.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: C.muted }}>طريقة الدفع</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>
                  {payment === 'instapay' ? '📱 إنستاباي' : '💵 الدفع عند الاستلام'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>الإجمالي</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: C.green }}>{fmt(total)} ج.م</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/buyer/orders')}
                style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                عرض طلباتي
              </button>
              <button
                type="button"
                onClick={() => navigate('/buyer')}
                style={{ padding: '12px 28px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                متابعة التسوق
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: CART REVIEW ──────────────────────── */}
        {checkoutStep === 1 && (
          <>
            {/* Error */}
            {errMsg && (
              <div style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: C.red, fontSize: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {errMsg}
                <button type="button" onClick={() => setErrMsg('')} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
              </div>
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: C.white, borderRadius: '16px', boxShadow: C.shadow }}>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>🛒</div>
                <p style={{ color: C.text, fontSize: '17px', fontWeight: '700', margin: '0 0 6px' }}>السلة فارغة</p>
                <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 20px' }}>أضف منتجات من المزارع للبدء</p>
                <button type="button" onClick={() => navigate('/buyer')}
                  style={{ padding: '10px 24px', borderRadius: '9px', border: 'none', background: C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  استعرض المزارع
                </button>
              </div>
            )}

            {items.length > 0 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {items.map(item => {
                    const meta  = LIVE_META[item.type] || LIVE_META.other;
                    const image = item.images?.[0];
                    return (
                      <div key={item._id} style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: C.shadow, display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', overflow: 'hidden' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '10px', background: '#FEF3C7', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {image
                            ? <img src={getImageUrl(image)} alt={item.breed} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '32px' }}>{meta.emoji}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>{item.breed || meta.label}</div>
                          <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{meta.emoji} {meta.label}</div>
                          {item.age && (
                            <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>📅 {item.age} شهر · ⚖️ {item.weight} كجم</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: C.text }}>{fmt(item.price)}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>ج.م</div>
                        </div>
                        <button type="button" onClick={() => removeItem(item._id)} aria-label="إزالة من السلة"
                          style={{ background: C.redBg, border: `1px solid #FECACA`, color: C.red, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: C.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: C.muted, fontWeight: '600' }}>الإجمالي ({items.length} منتج)</span>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: C.text }}>{fmt(total)} <span style={{ fontSize: '13px', color: C.muted }}>ج.م</span></span>
                  </div>
                  <button type="button" onClick={() => setCheckoutStep(2)}
                    style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: C.green, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>
                    متابعة للدفع ←
                  </button>
                  <button type="button" onClick={clearCart}
                    style={{ width: '100%', marginTop: '8px', padding: '9px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    إفراغ السلة
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP 2: PAYMENT & DELIVERY ───────────────── */}
        {checkoutStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Error */}
            {errMsg && (
              <div style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: C.red, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {errMsg}
                <button type="button" onClick={() => setErrMsg('')} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
              </div>
            )}

            {/* Payment methods */}
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: C.shadow }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: C.text }}>💳 طريقة الدفع</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {PAYMENT_OPTS.map(opt => (
                  <div key={opt.key} onClick={() => setPayment(opt.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${payment === opt.key ? C.green : C.border}`, cursor: 'pointer', background: payment === opt.key ? C.greenLt : C.white, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{opt.label}</div>
                      <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{opt.sub}</div>
                    </div>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${payment === opt.key ? C.green : C.border}`, background: payment === opt.key ? C.green : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {payment === opt.key && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '900' }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* InstaPay reference */}
              {payment === 'instapay' && (
                <div style={{ marginTop: '16px', padding: '14px 16px', background: C.amberBg, borderRadius: '12px', border: `1px solid #FDE68A` }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: C.amber, marginBottom: '8px' }}>
                    📋 حوّل المبلغ إلى: <span style={{ fontSize: '15px', letterSpacing: '0.05em' }}>01234567890</span>
                  </div>
                  <input
                    type="text"
                    value={instaRef}
                    onChange={e => setInstaRef(e.target.value)}
                    placeholder="أدخل رقم عملية التحويل…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: C.text }}
                  />
                </div>
              )}
            </div>

            {/* Delivery address */}
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: C.shadow }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: C.text }}>📍 عنوان التسليم (اختياري)</h3>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="اكتب عنوانك التفصيلي للتسليم…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: C.text, resize: 'vertical' }}
              />
            </div>

            {/* Order summary + CTA */}
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '20px 24px', boxShadow: C.shadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: C.muted, fontWeight: '600' }}>إجمالي الطلب ({items.length} منتج)</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: C.text }}>{fmt(total)} <span style={{ fontSize: '13px', color: C.muted }}>ج.م</span></span>
              </div>
              <button type="button" onClick={handlePlaceOrder} disabled={placing}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: placing ? '#9CB89F' : C.green, color: '#fff', fontSize: '15px', fontWeight: '800', cursor: placing ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                {placing ? 'جاري تقديم الطلبات…' : '✅ تأكيد الطلب'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerCart;
