import { useEffect, useState, useMemo } from 'react';
import { getMyOrders, updateOrderStatus } from '../../services/orderService';
import { fmt, getImageUrl } from '../../utils/format';

import { C } from '../../tokens';

const TYPE_META = {
  cattle: { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', ar: 'أبقار' },
  sheep:  { emoji: '🐑', color: '#0369A1', bg: '#DBEAFE', ar: 'أغنام' },
  goat:   { emoji: '🐐', color: '#166534', bg: '#DCFCE7', ar: 'ماعز'  },
  camel:  { emoji: '🐪', color: '#9A3412', bg: '#FFEDD5', ar: 'إبل'   },
  horse:  { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', ar: 'خيول'  },
  other:  { emoji: '🐾', color: '#374151', bg: '#F3F4F6', ar: 'أخرى'  },
};

const STATUS_META = {
  pending:   { label: 'معلق',       color: '#92400E', bg: '#FEF3C7', dot: '🔴' },
  confirmed: { label: 'مؤكد',       color: '#0369A1', bg: '#DBEAFE', dot: '🟢' },
  completed: { label: 'مكتمل',      color: '#166534', bg: '#DCFCE7', dot: '✅' },
  cancelled: { label: 'ملغي',       color: '#991B1B', bg: '#FEE2E2', dot: '⛔' },
};

const DELIVERY_TYPE_AR = {
  none:  'استلام شخصي',
  farm:  'توصيل المزرعة',
  admin: 'توصيل المنصة',
};

const PAYMENT_AR = {
  cod:      '💵 الدفع عند الاستلام',
  instapay: '📱 InstaPay',
  deposit:  '🏦 دفعة مقدمة',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const shortId = (id = '') => id.slice(-8).toUpperCase();

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const parseAddress   = (notes = '') => { const m = notes.match(/Address:\s*([^|]+)/); return m ? m[1].trim() : null; };
const parseDelivType = (notes = '') => {
  if (notes.includes('Self Pickup'))    return 'استلام شخصي';
  if (notes.includes('Local Delivery')) return 'توصيل محلي';
  if (notes.includes('Long Distance'))  return 'توصيل بعيد';
  return null;
};

// ─── ConfirmModal ──────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, confirmLabel, confirmColor = '#DC2626', onConfirm, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: C.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
      <p style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: '10px', background: '#F9F5F0', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          رجوع
        </button>
        <button onClick={onConfirm}
          style={{ flex: 2, padding: '10px', background: confirmColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── DeliveryPanel ─────────────────────────────────────────────────────────────
const DeliveryPanel = ({ order }) => {
  const listing   = order.listing || {};
  const address   = parseAddress(order.notes || '');
  const delivType = parseDelivType(order.notes || '');
  const hasGps    = order.deliveryLocation?.lat != null;

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px', background: '#FAFAF8' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
        تفاصيل التسليم
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>

        {/* Delivery type */}
        <div style={{ padding: '10px 12px', background: C.white, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: 3 }}>نوع التسليم</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>
            {delivType
              || (listing.deliveryType ? DELIVERY_TYPE_AR[listing.deliveryType] : '—')}
          </div>
        </div>

        {/* Payment */}
        <div style={{ padding: '10px 12px', background: C.white, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: 3 }}>طريقة الدفع</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>
            {PAYMENT_AR[order.paymentType] || order.paymentType}
          </div>
          {order.paymentType === 'deposit' && order.depositAmount > 0 && (
            <div style={{ fontSize: '11px', color: C.green, marginTop: 2 }}>
              مقدم: {fmt(order.depositAmount)} ج.م · الباقي: {fmt(order.totalAmount - order.depositAmount)} ج.م
            </div>
          )}
        </div>

        {/* Delivery cost */}
        {order.deliveryCost > 0 && (
          <div style={{ padding: '10px 12px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: '11px', color: '#92400E', marginBottom: 3 }}>تكلفة التوصيل</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#D97706' }}>{fmt(order.deliveryCost)} ج.م</div>
          </div>
        )}

        {/* Address */}
        {(address || hasGps) && (
          <div style={{ padding: '10px 12px', background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, gridColumn: address?.length > 40 ? 'span 2' : undefined }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: 3 }}>عنوان التسليم</div>
            {address && <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.5 }}>📍 {address}</div>}
            {hasGps && (
              <div style={{ fontSize: '11px', color: C.green, marginTop: 3, fontWeight: '600' }}>
                🗺️ {order.deliveryLocation.lat.toFixed(5)}, {order.deliveryLocation.lng.toFixed(5)}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {order.notes && !address && (
          <div style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
            <div style={{ fontSize: '11px', color: '#92400E', marginBottom: 3 }}>ملاحظات المشتري</div>
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>📝 {order.notes}</div>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── OrderCard ─────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusChange }) => {
  const [showDetails, setShowDetails]   = useState(false);
  const [modal, setModal]               = useState(null); // { action, status, message, label, color }
  const [loading, setLoading]           = useState(false);
  const [actionError, setActionError]   = useState('');

  const listing  = order.listing || {};
  const buyer    = order.buyer   || {};
  const meta     = TYPE_META[listing.type] || TYPE_META.other;
  const sm       = STATUS_META[order.status] ?? STATUS_META.pending;
  const thumb    = listing.images?.[0];
  const waPhone  = buyer.phone ? `https://wa.me/${buyer.phone.replace(/\D/g, '')}` : null;

  const isPending   = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';

  const execAction = async (newStatus) => {
    setLoading(true);
    setActionError('');
    try {
      const updated = await updateOrderStatus(order._id, newStatus);
      onStatusChange(updated.data);
    } catch (e) {
      setActionError(e.response?.data?.message || 'فشل تحديث الطلب');
    } finally {
      setLoading(false);
      setModal(null);
    }
  };

  return (
    <div style={{ background: C.white, borderRadius: 18, overflow: 'hidden', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>

      {/* ═══════ CARD BODY ═══════ */}
      <div style={{ padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Thumbnail */}
        <div style={{ width: 84, height: 84, borderRadius: 14, background: meta.bg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, position: 'relative' }}>
          {thumb
            ? <img src={getImageUrl(thumb)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : meta.emoji}
          <span style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 12, lineHeight: 1 }}>{sm.dot}</span>
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1: animal + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {listing.breed || listing.type || 'مواشي'}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                {meta.emoji} {meta.ar}
                {listing.weight ? ` · ${listing.weight} كجم` : ''}
                {listing.age    ? ` · ${listing.age} شهر`    : ''}
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {sm.dot} {sm.label}
            </span>
          </div>

          {/* Row 2: dates */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              <span style={{ color: C.text, fontWeight: 600 }}>📅 الطلب:</span> {fmtDate(order.createdAt)}
            </span>
            {order.status === 'completed' && (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                ✅ اكتمل: {fmtDate(order.updatedAt)}
              </span>
            )}
          </div>

          {/* Row 3: buyer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(buyer.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials(buyer.name || '')}
            </div>
            <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{buyer.name || '—'}</span>
            {buyer.phone && (
              <>
                <a href={`tel:${buyer.phone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: C.green, fontWeight: 700, textDecoration: 'none', background: C.greenLt, padding: '2px 8px', borderRadius: 10, border: `1px solid ${C.green}30` }}>
                  📞 اتصال
                </a>
                {waPhone && (
                  <a href={waPhone} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#166534', fontWeight: 700, textDecoration: 'none', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10, border: '1px solid #16653430' }}>
                    💬 واتساب
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ TOTAL ROW ═══════ */}
      <div style={{ margin: '0 20px', padding: '12px 16px', background: '#F9F5F0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>الإجمالي</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(order.totalAmount)}</span>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>ج.م</span>
          </div>
          {order.deliveryCost > 0 && (
            <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>🚚 توصيل: {fmt(order.deliveryCost)} ج.م</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
            {PAYMENT_AR[order.paymentType] || order.paymentType}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>طلب #{shortId(order._id)}</span>
        </div>
      </div>

      {/* ═══════ ACTION BUTTONS ═══════ */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>

        {/* Toggle details */}
        <button type="button" onClick={() => setShowDetails(p => !p)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: showDetails ? C.green : C.greenLt, color: showDetails ? '#fff' : C.green, border: `1.5px solid ${C.green}40`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          📋 تفاصيل
          <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>

        {/* Confirm — pending only */}
        {isPending && (
          <button type="button"
            onClick={() => setModal({ newStatus: 'confirmed', message: 'هل تريد تأكيد هذا الطلب؟ سيتلقى المشتري إشعارًا بالتأكيد.', label: '✓ تأكيد الطلب', color: C.green })}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            ✓ تأكيد الطلب
          </button>
        )}

        {/* Complete — confirmed only */}
        {isConfirmed && (
          <button type="button"
            onClick={() => setModal({ newStatus: 'completed', message: 'هل تم تسليم هذا الطلب للمشتري؟ لا يمكن التراجع عن هذا الإجراء.', label: '✅ تأكيد التسليم', color: C.green })}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            ✅ تأكيد التسليم
          </button>
        )}

        {/* Cancel — pending or confirmed */}
        {(isPending || isConfirmed) && (
          <button type="button"
            onClick={() => setModal({ newStatus: 'cancelled', message: 'هل تريد إلغاء هذا الطلب؟ سيتلقى المشتري إشعارًا بالإلغاء.', label: '✕ إلغاء الطلب', color: '#DC2626' })}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: '#FEF2F2', color: '#991B1B', border: '1.5px solid #FECACA', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            ✕ إلغاء
          </button>
        )}

        {/* WhatsApp buyer */}
        {waPhone && (
          <a href={`${waPhone}?text=${encodeURIComponent(`مرحبًا، بخصوص طلب رقم #${shortId(order._id)}`)}`}
            target="_blank" rel="noreferrer" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', border: '1px solid #16653425', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
            💬 واتساب
          </a>
        )}
      </div>

      {/* Action error */}
      {actionError && (
        <div style={{ margin: '0 20px 14px', padding: '9px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#991B1B', fontWeight: 600 }}>
          ⚠️ {actionError}
        </div>
      )}

      {/* ═══════ DETAILS PANEL ═══════ */}
      <div style={{ maxHeight: showDetails ? '500px' : 0, overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
        <DeliveryPanel order={order} />

        {/* Order timeline */}
        <div style={{ padding: '0 20px 16px', background: '#FAFAF8' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            التاريخ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(() => {
              const tl = order.timeline || [];
              const tlAt = (s) => { const e = tl.find(x => x.status === s); return e ? fmtDateTime(e.at) : null; };
              return [
                { label: 'تم تقديم الطلب', time: fmtDateTime(order.createdAt), done: true, icon: '📋', cancel: false },
                { label: order.status !== 'pending' ? 'تم التأكيد' : 'في انتظار التأكيد', time: tlAt('confirmed') || (order.status !== 'pending' && order.status !== 'cancelled' ? fmtDateTime(order.updatedAt) : null), done: order.status !== 'pending' && order.status !== 'cancelled', icon: '✓', cancel: false },
                ...(tl.find(x => x.status === 'dispatched') ? [{ label: 'جارٍ الشحن', time: tlAt('dispatched'), done: true, icon: '🚚', cancel: false }] : []),
                { label: order.status === 'completed' ? 'تم التسليم' : 'التسليم', time: tlAt('completed') || (order.status === 'completed' ? fmtDateTime(order.updatedAt) : null), done: order.status === 'completed', icon: '📦', cancel: false },
                ...(order.status === 'cancelled' ? [{ label: 'تم الإلغاء', time: tlAt('cancelled') || fmtDateTime(order.updatedAt), done: true, icon: '✕', cancel: true }] : []),
              ];
            })().map((ev, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: ev.cancel ? '#FEE2E2' : ev.done ? C.greenLt : '#F9F5F0', border: `2px solid ${ev.cancel ? '#EF4444' : ev.done ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                    {ev.cancel
                      ? <span style={{ color: '#EF4444', fontWeight: 900 }}>✕</span>
                      : ev.done
                        ? <span style={{ color: C.green, fontWeight: 900 }}>✓</span>
                        : <span style={{ color: C.border }}>●</span>}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 20, background: ev.done && !ev.cancel ? C.green : C.border, margin: '3px 0', opacity: ev.done ? 1 : 0.3 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 12 : 0, paddingTop: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ev.cancel ? '#991B1B' : ev.done ? C.text : C.muted }}>
                    {ev.icon} {ev.label}
                  </div>
                  {ev.time && <div style={{ fontSize: 11, color: C.green, marginTop: 2, fontWeight: 600 }}>🕐 {ev.time}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {modal && (
        <ConfirmModal
          message={modal.message}
          confirmLabel={modal.label}
          confirmColor={modal.color}
          onConfirm={() => execAction(modal.newStatus)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const SK = 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)';
const sk = (w, h, r = 8) => ({ width: w, height: h, borderRadius: r, background: SK, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite', flexShrink: 0 });

const SkeletonCard = () => (
  <div style={{ background: C.white, borderRadius: 18, padding: '18px 20px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
    <style>{`@keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div aria-hidden style={sk(84, 84, 14)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div aria-hidden style={sk('55%', 18)} />
        <div aria-hidden style={sk('35%', 13)} />
        <div aria-hidden style={sk('70%', 12)} />
        <div aria-hidden style={sk('50%', 12)} />
      </div>
      <div aria-hidden style={sk(64, 26, 20)} />
    </div>
    <div style={{ margin: '14px 0', height: 58, borderRadius: 12, background: SK, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.4s ease-in-out infinite' }} />
    <div style={{ display: 'flex', gap: 8 }}>
      {[100, 120, 80].map((w, i) => <div key={i} aria-hidden style={sk(w, 36, 10)} />)}
    </div>
  </div>
);

// ─── Filter config ─────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',       label: 'الكل',      match: () => true },
  { key: 'pending',   label: 'معلقة',     match: o => o.status === 'pending' },
  { key: 'confirmed', label: 'مؤكدة',     match: o => o.status === 'confirmed' },
  { key: 'completed', label: 'مكتملة',    match: o => o.status === 'completed' },
  { key: 'cancelled', label: 'ملغية',     match: o => o.status === 'cancelled' },
];

// ─── SellerOrders ──────────────────────────────────────────────────────────────
const SellerOrders = () => {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    getMyOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError('تعذّر تحميل الطلبات. حاول مرة أخرى.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (updated) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
  };

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => { c[f.key] = orders.filter(f.match).length; });
    return c;
  }, [orders]);

  const filtered = useMemo(() =>
    orders.filter(FILTERS.find(f => f.key === filter)?.match ?? (() => true)),
  [orders, filter]);

  const totalRevenue = useMemo(() =>
    orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.totalAmount || 0), 0),
  [orders]);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: C.white, borderRadius: 20, boxShadow: C.shadow }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#B91C1C', margin: '0 0 16px' }}>{error}</p>
      <button onClick={() => window.location.reload()}
        style={{ padding: '10px 24px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
        إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div style={{ margin: '-24px', padding: '24px', background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", boxSizing: 'border-box' }} dir="rtl">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          طلبات المشترين 📦
        </h1>
        <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>
          {loading ? 'جارٍ التحميل…' : (
            <>
              {orders.length} طلب إجمالي
              {counts.pending > 0 && (
                <span style={{ marginRight: 10, color: '#92400E', fontWeight: 700, background: '#FEF3C7', padding: '1px 8px', borderRadius: 8, fontSize: 12 }}>
                  🔴 {counts.pending} معلق يحتاج إجراء
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              style={{ padding: '8px 16px', background: active ? C.green : C.white, color: active ? '#fff' : C.text, border: `1.5px solid ${active ? C.green : C.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', boxShadow: active ? 'none' : C.shadow, fontFamily: 'inherit' }}>
              {f.label}
              {counts[f.key] > 0 && (
                <span style={{ background: active ? 'rgba(255,255,255,0.3)' : C.border, color: active ? '#fff' : C.muted, fontSize: 11, fontWeight: 700, padding: '0 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: C.white, borderRadius: 20, boxShadow: C.shadow }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>
            {filter === 'cancelled' ? '🚫' : filter === 'completed' ? '✅' : filter === 'pending' ? '⏳' : '📦'}
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>
            {filter === 'all' ? 'لا توجد طلبات بعد' : `لا توجد طلبات ${FILTERS.find(f => f.key === filter)?.label}`}
          </h3>
          <p style={{ color: C.muted, fontSize: 15, margin: '0 0 24px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            {filter === 'all'
              ? 'ستظهر هنا الطلبات عندما يقوم المشترون بالشراء من إعلاناتك.'
              : 'لا توجد طلبات في هذه الفئة حاليًا.'}
          </p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')}
              style={{ padding: '10px 22px', background: 'transparent', color: C.green, border: `2px solid ${C.green}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
              عرض كل الطلبات
            </button>
          )}
        </div>
      )}

      {/* Orders list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(order => (
            <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Summary strip */}
      {!loading && orders.length > 0 && (
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { icon: '📦', label: 'إجمالي الطلبات', val: orders.length,        color: C.text    },
            { icon: '⏳', label: 'معلقة',           val: counts.pending,       color: '#92400E' },
            { icon: '✅', label: 'مكتملة',           val: counts.completed,     color: C.green   },
            { icon: '💰', label: 'إجمالي الإيرادات', val: `${fmt(totalRevenue)} ج.م`, color: C.green },
          ].map(({ icon, label, val, color }) => (
            <div key={label} style={{ background: C.white, borderRadius: 12, padding: '14px 16px', boxShadow: C.shadow, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
