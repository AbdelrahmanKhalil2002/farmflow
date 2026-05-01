import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../../services/orderService';
import { createReview } from '../../services/reviewService';
import { fmt, getImageUrl } from '../../utils/format';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#F8F4EE',
  white:   '#FFFFFF',
  green:   '#3A7D44',
  greenDk: '#2D6235',
  greenLt: '#F0F7F1',
  border:  '#E8D5C0',
  text:    '#2C1810',
  muted:   '#8B6B5A',
  shadow:  '0 2px 10px rgba(44,24,16,0.08)',
  shadowHv:'0 8px 24px rgba(44,24,16,0.14)',
};

const TYPE_META = {
  cattle: { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', ar: 'أبقار' },
  sheep:  { emoji: '🐑', color: '#0369A1', bg: '#DBEAFE', ar: 'أغنام' },
  goat:   { emoji: '🐐', color: '#166534', bg: '#DCFCE7', ar: 'ماعز'  },
  camel:  { emoji: '🐪', color: '#9A3412', bg: '#FFEDD5', ar: 'إبل'   },
  horse:  { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', ar: 'خيول'  },
  other:  { emoji: '🐾', color: '#374151', bg: '#F3F4F6', ar: 'أخرى'  },
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: 'معلق',         color: '#92400E', bg: '#FEF3C7', badge: '#EF4444', dot: '🔴', step: 0 },
  confirmed: { label: 'مؤكد',         color: '#0369A1', bg: '#DBEAFE', badge: '#22C55E', dot: '🟢', step: 1 },
  transit:   { label: 'قيد التسليم',  color: '#92400E', bg: '#FEF9C3', badge: '#EAB308', dot: '🟡', step: 2 },
  completed: { label: 'تم التسليم',   color: '#166534', bg: '#DCFCE7', badge: C.green,   dot: '✅', step: 3 },
  cancelled: { label: 'ملغي',         color: '#991B1B', bg: '#FEE2E2', badge: '#EF4444', dot: '🔴', step: -1 },
};

const STAGES_AR = ['تم الطلب', 'مؤكد', 'قيد التسليم', 'تم التسليم'];

// Resolves a 4-step stage index that accounts for admin delivery status
const effectiveStatus = (order) => {
  if (!order) return 'pending';
  if (order.status === 'confirmed' &&
      (order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'delivered')) {
    return 'transit';
  }
  return order.status;
};

const stageIndex = (status) => {
  if (status === 'pending')   return 0;
  if (status === 'confirmed') return 1;
  if (status === 'transit')   return 2;
  if (status === 'completed') return 3;
  return -1;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d, opts = {}) =>
  new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric', ...opts });

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const estimatedDelivery = (createdAt, notes = '') => {
  const base = new Date(createdAt);
  let days = 5;
  if (notes.includes('Self Pickup'))    days = 2;
  else if (notes.includes('Local Del')) days = 3;
  else if (notes.includes('Long Dist')) days = 7;
  base.setDate(base.getDate() + days);
  return fmtDate(base);
};

const parseAddress    = (notes = '') => { const m = notes.match(/Address:\s*([^|]+)/); return m ? m[1].trim() : null; };
const parseDelivType  = (notes = '') => {
  if (notes.includes('Self Pickup'))    return 'استلام شخصي';
  if (notes.includes('Local Delivery')) return 'توصيل محلي';
  if (notes.includes('Long Distance'))  return 'توصيل بعيد';
  return null;
};

const shortId = (id = '') => id.slice(-8).toUpperCase();

const downloadReceipt = (order) => {
  const l  = order.listing || {};
  const sl = order.seller  || {};
  const pad = (s, n = 12) => String(s).padEnd(n);
  const hr  = '─'.repeat(40);
  const lines = [
    '╔════════════════════════════════════════╗',
    '║        FARMFLOW — إيصال الطلب          ║',
    '╚════════════════════════════════════════╝',
    '',
    `${pad('رقم الطلب:')}  ${shortId(order._id)}`,
    `${pad('التاريخ:')}    ${fmtDate(order.createdAt)}`,
    `${pad('الحالة:')}     ${STATUS_META[order.status]?.label ?? order.status}`,
    '', hr, '  الحيوان', hr,
    `${pad('النوع:')}     ${[l.breed, l.type].filter(Boolean).join(' — ') || 'غير محدد'}`,
    `${pad('السعر:')}     ${fmt(l.price ?? order.totalAmount)} ج.م`,
    '', hr, '  البائع', hr,
    `${pad('الاسم:')}     ${sl.name  || 'غير محدد'}`,
    `${pad('الهاتف:')}    ${sl.phone || 'غير محدد'}`,
    '', hr, '  الدفع', hr,
    `${pad('الطريقة:')}   ${order.paymentType === 'instapay' ? 'InstaPay' : order.paymentType === 'cod' ? 'الدفع عند الاستلام' : 'دفعة مقدمة'}`,
    ...(order.paymentType === 'deposit' ? [
      `${pad('المقدم:')}    ${fmt(order.depositAmount)} ج.م`,
      `${pad('الباقي:')}    ${fmt(order.totalAmount - order.depositAmount)} ج.م`,
    ] : []),
    ...(order.deliveryCost > 0 ? [`${pad('التوصيل:')}   ${fmt(order.deliveryCost)} ج.م`] : []),
    `${pad('الإجمالي:')}  ${fmt(order.totalAmount)} ج.م`,
    '', hr, '  شكرًا لاستخدامك فارم فلو! 🌾', hr,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `farmflow-${shortId(order._id)}.txt`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ─── ProgressTracker (Arabic) ─────────────────────────────────────────────────
const ProgressTracker = ({ order }) => {
  const status    = effectiveStatus(order);
  const idx       = stageIndex(status);
  const cancelled = order?.status === 'cancelled';
  return (
    <div style={{ padding: '16px 0 4px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
        مسار الطلب
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STAGES_AR.map((label, i) => {
          const done    = !cancelled && idx >= i;
          const current = !cancelled && idx === i;
          const dotBg   = cancelled ? '#FCA5A5' : done ? C.green : C.border;
          const lineBg  = cancelled ? '#FCA5A5' : (i < idx && !cancelled) ? C.green : C.border;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STAGES_AR.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: current ? '16px' : '12px', height: current ? '16px' : '12px',
                  borderRadius: '50%', background: dotBg,
                  boxShadow: current ? `0 0 0 4px ${C.green}25` : 'none',
                  border: done || cancelled ? 'none' : `2px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {done && !cancelled && <span style={{ color: '#fff', fontSize: '8px', fontWeight: '900' }}>✓</span>}
                </div>
                <span style={{ fontSize: '9px', fontWeight: current ? '700' : '500', color: done ? C.green : C.muted, whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {label}
                </span>
              </div>
              {i < STAGES_AR.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: lineBg, margin: '7px 3px 0', minWidth: '16px', transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── StatusTimeline (Arabic) ──────────────────────────────────────────────────
const StatusTimeline = ({ order }) => {
  const status    = effectiveStatus(order);
  const idx       = stageIndex(status);
  const cancelled = order.status === 'cancelled';
  const estDel    = estimatedDelivery(order.createdAt, order.notes || '');

  const events = [
    { label: 'تم تقديم الطلب',     sub: `طلب #${shortId(order._id)}`,                         time: fmtDateTime(order.createdAt),    done: true,    icon: '📋' },
    { label: idx >= 1 ? 'تأكيد البائع' : 'في انتظار التأكيد', sub: idx >= 1 ? 'قبل البائع طلبك' : 'سيرد البائع خلال 24 ساعة', time: idx >= 1 ? fmtDateTime(order.updatedAt) : null, done: idx >= 1, icon: '✅' },
    { label: 'في الطريق',           sub: idx >= 3 ? 'تم شحن الحيوان' : `متوقع: ${estDel}`,    time: idx >= 3 ? `${estDel}` : null,   done: idx >= 3, icon: '🚚' },
    { label: idx >= 3 ? 'تم التسليم' : 'التسليم المتوقع', sub: idx >= 3 ? 'اكتملت العملية بنجاح' : `${estDel}`, time: idx >= 3 ? fmtDateTime(order.updatedAt) : null, done: idx >= 3, icon: '📦' },
  ];

  if (cancelled) events.push({ label: 'تم الإلغاء', sub: `بتاريخ ${fmtDate(order.updatedAt)}`, time: fmtDateTime(order.updatedAt), done: true, icon: '✕', cancel: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '22px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: ev.cancel ? '#FEE2E2' : ev.done ? C.greenLt : '#F9F5F0',
              border: `2px solid ${ev.cancel ? '#EF4444' : ev.done ? C.green : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0,
            }}>
              {ev.cancel
                ? <span style={{ color: '#EF4444', fontSize: '10px', fontWeight: '900' }}>✕</span>
                : ev.done
                  ? <span style={{ color: C.green, fontSize: '11px', fontWeight: '900' }}>✓</span>
                  : <span style={{ color: C.border, fontSize: '8px' }}>●</span>}
            </div>
            {i < events.length - 1 && (
              <div style={{ width: '2px', flex: 1, minHeight: '22px', background: (ev.done && !ev.cancel) ? C.green : C.border, margin: '3px 0', opacity: ev.done ? 1 : 0.35 }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: i < events.length - 1 ? '14px' : 0, paddingTop: '2px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: ev.cancel ? '#991B1B' : ev.done ? C.text : C.muted }}>
              {ev.icon} {ev.label}
            </div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{ev.sub}</div>
            {ev.time && <div style={{ fontSize: '11px', color: C.green, marginTop: '3px', fontWeight: '600' }}>🕐 {ev.time}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── ReviewModal ─────────────────────────────────────────────────────────────
const ReviewModal = ({ order, onClose, onSubmitted }) => {
  const [rating,   setRating]  = useState(0);
  const [hoverStar, setHover]  = useState(0);
  const [comment,  setComment] = useState('');
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');

  const handleSubmit = async () => {
    if (!rating) { setError('يرجى اختيار عدد النجوم'); return; }
    setLoading(true);
    setError('');
    try {
      await createReview({ orderId: order._id, rating, comment: comment.trim() || undefined });
      onSubmitted();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || 'فشل إرسال التقييم';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background:C.white, borderRadius:16, padding:'24px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:C.text }}>تقييم طلبك</h3>
          <button type="button" onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.muted, padding:0, lineHeight:1 }}>✕</button>
        </div>

        {/* Stars */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:16 }}>
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:36, color: s <= (hoverStar || rating) ? '#F59E0B' : '#CBD5E1', lineHeight:1, padding:'2px', transition:'color 0.1s' }}>
              ★
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="أضف تعليقًا (اختياري)…"
          maxLength={500}
          rows={3}
          style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, color:C.text, resize:'vertical', fontFamily:'inherit', outline:'none' }}
        />

        {error && <p style={{ margin:'8px 0 0', color:'#DC2626', fontSize:13 }}>{error}</p>}

        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', background:'#F9F5F0', color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            إلغاء
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || !rating}
            style={{ flex:2, padding:'10px', background: loading || !rating ? C.muted : C.green, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: loading || !rating ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'background 0.15s' }}>
            {loading ? 'جاري الإرسال…' : 'إرسال التقييم'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── OrderCard ────────────────────────────────────────────────────────────────
const OrderCard = ({ order }) => {
  const [showTrack,  setShowTrack]  = useState(false);
  const [cancelMsg,  setCancelMsg]  = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewed,   setReviewed]   = useState(false);

  const listing  = order.listing || {};
  const seller   = order.seller  || {};
  const meta     = TYPE_META[listing.type] || TYPE_META.other;
  const sm       = STATUS_META[effectiveStatus(order)] ?? STATUS_META.pending;
  const thumb    = listing.images?.[0];
  const address  = parseAddress(order.notes || '');
  const delivType= parseDelivType(order.notes || '');
  const estDel   = estimatedDelivery(order.createdAt, order.notes || '');
  const isPending = order.status === 'pending';
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';
  const waPhone  = seller.phone ? `https://wa.me/${seller.phone.replace(/\D/g, '')}` : null;

  return (
    <div style={{ background: C.white, borderRadius: '18px', overflow: 'hidden', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>

      {/* ═══════════ CARD BODY ═══════════ */}
      <div style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Thumbnail */}
        <div style={{ width: '84px', height: '84px', borderRadius: '14px', background: meta.bg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', position: 'relative' }}>
          {thumb
            ? <img src={getImageUrl(thumb)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : meta.emoji}
          {/* Status dot overlay */}
          <span style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '12px', lineHeight: 1 }}>{sm.dot}</span>
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1: title + status badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: C.text, textTransform: 'capitalize', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {listing.breed || listing.type || 'مواشي'}
              </div>
              {listing.type && (
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>
                  {meta.emoji} {meta.ar}
                  {listing.weight ? ` · ${listing.weight} كجم` : ''}
                  {listing.age    ? ` · ${listing.age} شهر`    : ''}
                </div>
              )}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: sm.bg, color: sm.color,
              fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {sm.dot} {sm.label}
            </span>
          </div>

          {/* Row 2: dates */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: C.muted }}>
              <span style={{ color: C.text, fontWeight: '600' }}>📅 الطلب:</span> {fmtDate(order.createdAt)}
            </span>
            {!isCancelled && !isCompleted && (
              <span style={{ fontSize: '12px', color: C.muted }}>
                <span style={{ color: C.text, fontWeight: '600' }}>🚚 التسليم المتوقع:</span> {estDel}
              </span>
            )}
            {isCompleted && order.updatedAt && (
              <span style={{ fontSize: '12px', color: C.green, fontWeight: '600' }}>
                ✅ تم التسليم: {fmtDate(order.updatedAt)}
              </span>
            )}
          </div>

          {/* Row 3: seller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                {initials(seller.name || '')}
              </div>
              <span style={{ fontSize: '12px', color: C.text, fontWeight: '700' }}>{seller.name || '—'}</span>
            </div>
            {seller.phone && (
              <>
                <a href={`tel:${seller.phone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: C.green, fontWeight: '700', textDecoration: 'none', background: C.greenLt, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${C.green}30` }}>
                  📞 اتصال
                </a>
                <a href={waPhone} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#166534', fontWeight: '700', textDecoration: 'none', background: '#DCFCE7', padding: '2px 8px', borderRadius: '10px', border: '1px solid #16653430' }}>
                  💬 واتساب
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ TOTAL ROW ═══════════ */}
      <div style={{ margin: '0 20px', padding: '12px 16px', background: '#F9F5F0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>الإجمالي</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(order.totalAmount)}</span>
            <span style={{ fontSize: '13px', color: C.muted, fontWeight: '600' }}>ج.م</span>
          </div>
          {order.paymentType === 'deposit' && order.depositAmount > 0 && (
            <span style={{ fontSize: '11px', color: C.green, fontWeight: '600' }}>
              دفع مقدم: {fmt(order.depositAmount)} ج.م · الباقي: {fmt(order.totalAmount - order.depositAmount)} ج.م
            </span>
          )}
          {order.deliveryCost > 0 && (
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '600' }}>
              🚚 تكلفة التوصيل: {fmt(order.deliveryCost)} ج.م
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: '600' }}>
            {order.paymentType === 'instapay' ? '📱 InstaPay'
             : order.paymentType === 'deposit' ? '🏦 دفعة مقدمة'
             : '💵 الدفع عند الاستلام'}
          </span>
          <span style={{ fontSize: '11px', color: C.muted }}>
            طلب #{shortId(order._id)}
          </span>
        </div>
      </div>

      {/* ═══════════ ACTION BUTTONS ═══════════ */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

        {/* تتبع */}
        <button type="button" onClick={() => setShowTrack(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 16px', background: showTrack ? C.green : C.greenLt, color: showTrack ? '#fff' : C.green, border: `1.5px solid ${C.green}40`, borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          📍 تتبع الطلب
          <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: showTrack ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>

        {/* رسالة للبائع */}
        {waPhone && (
          <a href={waPhone} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 16px', background: '#DCFCE7', color: '#166534', border: '1.5px solid #16653430', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
            💬 رسالة للبائع
          </a>
        )}

        {/* إلغاء */}
        {isPending && !cancelMsg && (
          <button type="button" onClick={() => setCancelMsg(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 16px', background: '#FEF2F2', color: '#991B1B', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ إلغاء
          </button>
        )}

        {/* Rate for completed orders */}
        {isCompleted && !reviewed && (
          <button type="button" onClick={() => setShowReview(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', background:'#FEF3C7', color:'#92400E', border:'1.5px solid #FDE68A', borderRadius:'10px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⭐ تقييم
          </button>
        )}
        {isCompleted && reviewed && (
          <span style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', background:'#F0F7F1', color:C.green, border:`1px solid ${C.border}`, borderRadius:'10px', fontSize:13, fontWeight:700 }}>
            ✓ تم التقييم
          </span>
        )}

        {/* Receipt */}
        <button type="button" onClick={() => downloadReceipt(order)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 14px', background: '#F9F5F0', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          📥 إيصال
        </button>
      </div>

      {/* Review modal */}
      {showReview && (
        <ReviewModal
          order={order}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setReviewed(true); setShowReview(false); }}
        />
      )}

      {/* Cancel hint */}
      {cancelMsg && (
        <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>ℹ️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B', marginBottom: '4px' }}>طلب الإلغاء</div>
            <div style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.6 }}>
              لإلغاء هذا الطلب، يرجى التواصل مع البائع مباشرة عبر واتساب أو الاتصال وطلب الإلغاء.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {waPhone && (
                <a href={`${waPhone}?text=${encodeURIComponent(`مرحبًا، أريد إلغاء الطلب #${shortId(order._id)}`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ padding: '7px 14px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: '1px solid #16653430' }}>
                  💬 إرسال طلب الإلغاء
                </a>
              )}
              <button type="button" onClick={() => setCancelMsg(false)}
                style={{ padding: '7px 14px', background: '#F9F5F0', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TRACK PANEL ═══════════ */}
      <div style={{ maxHeight: showTrack ? '600px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>

            {/* Progress + Timeline */}
            <div>
              <ProgressTracker order={order} />
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  التفاصيل
                </div>
                <StatusTimeline order={order} />
              </div>
            </div>

            {/* Payment + delivery */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                تفاصيل الدفع
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ padding: '10px 12px', background: '#F9F5F0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, fontWeight: '600', marginBottom: '3px' }}>طريقة الدفع</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>
                    {order.paymentType === 'instapay' ? '📱 InstaPay'
                     : order.paymentType === 'deposit' ? '🏦 دفعة مقدمة'
                     : '💵 الدفع عند الاستلام'}
                  </div>
                </div>
                {order.deliveryCost > 0 && (
                  <div style={{ padding: '10px 12px', background: '#FEF9C3', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', border: '1px solid #FDE68A' }}>
                    <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>🚚 تكلفة التوصيل</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#D97706' }}>{fmt(order.deliveryCost)} ج.م</span>
                  </div>
                )}
                {order.paymentType === 'deposit' && (
                  <>
                    <div style={{ padding: '10px 12px', background: '#F9F5F0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: C.muted }}>المدفوع مقدمًا</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: C.green }}>{fmt(order.depositAmount)} ج.م</span>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#F9F5F0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: C.muted }}>الباقي عند الاستلام</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{fmt(order.totalAmount - order.depositAmount)} ج.م</span>
                    </div>
                  </>
                )}
                <div style={{ padding: '10px 12px', background: C.greenLt, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${C.green}25` }}>
                  <span style={{ fontSize: '12px', color: C.green, fontWeight: '700' }}>الإجمالي</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: C.green }}>{fmt(order.totalAmount)} ج.م</span>
                </div>
                {(address || delivType) && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>التسليم</div>
                    {delivType && <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>🚚 {delivType}</div>}
                    {address && <div style={{ fontSize: '12px', color: C.muted, background: '#F9F5F0', padding: '8px 10px', borderRadius: '8px' }}>📍 {address}</div>}
                  </div>
                )}
                {order.notes && !address && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400E', lineHeight: 1.5, marginTop: '4px' }}>
                    📝 {order.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Order items (cart/multi-item orders) */}
            {order.items?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  منتجات الطلب ({order.items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {order.items.map((item, i) => {
                    const il  = item.listing || {};
                    const imeta = TYPE_META[il.type] || TYPE_META.other;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F9F5F0', borderRadius: '10px' }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{imeta.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{il.breed || imeta.ar || 'حيوان'}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>{imeta.ar}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</div>
                        </div>
                        {item.price > 0 && (
                          <span style={{ fontSize: '13px', fontWeight: '800', color: C.green }}>{fmt(item.price)} ج.م</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seller detail */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                البائع
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#F9F5F0', borderRadius: '12px', marginBottom: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                  {initials(seller.name || '')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{seller.name || 'بائع'}</div>
                  {seller.phone && <div style={{ fontSize: '12px', color: C.muted, marginTop: '1px' }}>📞 {seller.phone}</div>}
                </div>
                <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px' }}>✓ موثق</span>
              </div>
              {seller.phone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {waPhone && (
                    <a href={waPhone} target="_blank" rel="noreferrer"
                      style={{ display: 'block', padding: '10px 14px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: '1px solid #16653425' }}>
                      💬 رسالة واتساب
                    </a>
                  )}
                  <a href={`tel:${seller.phone}`}
                    style={{ display: 'block', padding: '10px 14px', background: C.greenLt, color: C.green, textDecoration: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: `1px solid ${C.green}30` }}>
                    📞 اتصال مباشر
                  </a>
                </div>
              )}
              <button type="button" onClick={() => downloadReceipt(order)}
                style={{ width: '100%', marginTop: '8px', padding: '10px 14px', background: '#F9F5F0', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                📥 تحميل الإيصال
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SK = 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)';
const sk = (w, h, r = 8) => ({ width: w, height: h, borderRadius: r, background: SK, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite', flexShrink: 0 });

const SkeletonCard = () => (
  <div style={{ background: C.white, borderRadius: '18px', padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
    <style>{`@keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div aria-hidden style={sk('84px', '84px', 14)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <div aria-hidden style={sk('55%', 18)} />
        <div aria-hidden style={sk('35%', 13)} />
        <div aria-hidden style={sk('70%', 12)} />
        <div aria-hidden style={sk('50%', 12)} />
      </div>
      <div aria-hidden style={sk(64, 26, 20)} />
    </div>
    <div style={{ margin: '14px 0', height: '58px', borderRadius: '12px', background: SK, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite' }} />
    <div style={{ display: 'flex', gap: '8px' }}>
      {[100, 120, 72, 56].map((w, i) => <div key={i} aria-hidden style={sk(w, 36, 10)} />)}
    </div>
  </div>
);

// ─── Filter config ────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',       label: 'كل الطلبات',  match: () => true },
  { key: 'active',    label: 'نشطة',         match: o => ['pending','confirmed'].includes(o.status) },
  { key: 'completed', label: 'مُسلَّمة',     match: o => o.status === 'completed' },
  { key: 'cancelled', label: 'ملغية',        match: o => o.status === 'cancelled' },
];

// ─── BuyerOrders ──────────────────────────────────────────────────────────────
const BuyerOrders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    getMyOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError('تعذّر تحميل الطلبات. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => { c[f.key] = orders.filter(f.match).length; });
    return c;
  }, [orders]);

  const filtered = useMemo(() =>
    orders.filter(FILTERS.find(f => f.key === filter)?.match ?? (() => true)),
  [orders, filter]);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: C.white, borderRadius: '20px', boxShadow: C.shadow }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
      <p style={{ color: '#B91C1C', margin: '0 0 16px' }}>{error}</p>
      <button onClick={() => window.location.reload()}
        style={{ padding: '10px 24px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
        إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div style={{ margin: '-24px', padding: '24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          طلباتي 📦
        </h1>
        <p style={{ color: C.muted, margin: 0, fontSize: '13px' }}>
          {loading ? 'جارٍ التحميل…' : (
            <>
              {orders.length} طلب إجمالي
              {counts.active > 0 && <span style={{ marginRight: '10px', color: C.green, fontWeight: '700' }}>· {counts.active} نشط</span>}
            </>
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              style={{ padding: '8px 16px', background: active ? C.green : C.white, color: active ? '#fff' : C.text, border: `1.5px solid ${active ? C.green : C.border}`, borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s', boxShadow: active ? 'none' : C.shadow, fontFamily: 'inherit' }}>
              {f.label}
              {counts[f.key] > 0 && (
                <span style={{ background: active ? 'rgba(255,255,255,0.3)' : C.border, color: active ? '#fff' : C.muted, fontSize: '11px', fontWeight: '700', padding: '0 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: C.white, borderRadius: '20px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '56px', marginBottom: '14px' }}>
            {filter === 'cancelled' ? '🚫' : filter === 'completed' ? '✅' : '📦'}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>
            {filter === 'all' ? 'لا توجد طلبات بعد' : `لا توجد طلبات ${FILTERS.find(f => f.key === filter)?.label}`}
          </h3>
          <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 24px', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            {filter === 'all'       ? 'ستظهر هنا طلباتك بعد إجراء عملية شراء.'
             : filter === 'cancelled' ? 'لم يتم إلغاء أي طلبات.'
             : filter === 'completed' ? 'ستظهر هنا الطلبات المكتملة.'
             : 'لا توجد طلبات نشطة حاليًا.'}
          </p>
          {filter === 'all'
            ? <Link to="/buyer" style={{ display: 'inline-block', padding: '12px 28px', background: C.green, color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px' }}>
                🌾 تصفح المواشي
              </Link>
            : <button onClick={() => setFilter('all')}
                style={{ padding: '10px 22px', background: 'transparent', color: C.green, border: `2px solid ${C.green}`, borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', fontFamily: 'inherit' }}>
                عرض كل الطلبات
              </button>}
        </div>
      )}

      {/* Orders list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(order => <OrderCard key={order._id} order={order} />)}
        </div>
      )}

      {/* Summary strip */}
      {!loading && orders.length > 0 && (
        <div style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { icon: '📦', label: 'إجمالي الطلبات', val: orders.length,  color: C.text },
            { icon: '⏳', label: 'نشطة',            val: counts.active, color: '#92400E' },
            { icon: '✅', label: 'مُسلَّمة',         val: counts.completed, color: C.green },
            { icon: '💰', label: 'إجمالي الإنفاق',  val: `${fmt(orders.reduce((s, o) => s + (o.totalAmount || 0), 0))} ج.م`, color: C.text },
          ].map(({ icon, label, val, color }) => (
            <div key={label} style={{ background: C.white, borderRadius: '12px', padding: '14px 16px', boxShadow: C.shadow, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontWeight: '600', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;
