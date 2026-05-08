import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus as updateStatusApi, setOrderDelivery } from '../../services/adminService';
import { fmt, getImageUrl } from '../../utils/format';

import { C as _C } from '../../tokens';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ..._C,
  header:  '#F9FAFB',
  dim:     '#6B7280',
  dimMid:  '#9CA3AF',
  slateBg: '#F8FAFC',
};

const STATUS = {
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', rowBg: '#FFFDF5' },
  confirmed: { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', rowBg: '#F5F8FF' },
  completed: { label: 'Delivered', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', rowBg: '#F5FDF6' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', rowBg: '#FAFAFA' },
};

const PAYMENT = {
  cod:      { label: 'Cash on Delivery', short: 'COD',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  deposit:  { label: 'Deposit',          short: 'Deposit',  color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  instapay: { label: 'InstaPay',         short: 'InstaPay', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

const ANIMAL_EMOJI = { cattle: '🐄', sheep: '🐑', goat: '🐐', camel: '🐪', horse: '🐴', other: '🐾' };

const DELIVERY_STATUS = {
  pending:    { label: 'Pending Pickup', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  in_transit: { label: 'In Transit',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  delivered:  { label: 'Delivered',     color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
};

const shortId  = (id) => id ? '#' + String(id).slice(-6).toUpperCase() : '—';
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT    = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtMoney = (n) => typeof n === 'number' ? n.toLocaleString('en-SA') : '0';

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

// ── PaymentBadge ──────────────────────────────────────────────────────────────
const PaymentBadge = ({ type }) => {
  const p = PAYMENT[type] ?? PAYMENT.cod;
  return (
    <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: p.bg, color: p.color, border: `1px solid ${p.border}`, whiteSpace: 'nowrap' }}>
      {p.short}
    </span>
  );
};

// ── User avatar ───────────────────────────────────────────────────────────────
const UserAvatar = ({ name, size = 28 }) => {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `hsla(${hue},60%,93%,1)`, border: `1px solid hsla(${hue},50%,75%,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: '700', color: `hsla(${hue},55%,35%,1)` }}>
      {initials}
    </div>
  );
};

// ── Order timeline ────────────────────────────────────────────────────────────
const OrderTimeline = ({ order }) => {
  const steps = [
    { label: 'Order Placed',    time: order.createdAt, done: true,  color: C.amber },
    { label: 'Confirmed',       time: order.status !== 'pending' ? order.updatedAt : null, done: ['confirmed','completed'].includes(order.status), color: C.blue },
    { label: 'Delivered',       time: order.status === 'completed' ? order.updatedAt : null, done: order.status === 'completed', color: C.green },
    { label: 'Cancelled',       time: order.status === 'cancelled' ? order.updatedAt : null, done: order.status === 'cancelled', color: C.red, skip: order.status !== 'cancelled' && order.status !== 'pending' },
  ].filter(s => !s.skip);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => (
        <div key={step.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Dot + line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: step.done ? step.color : '#E5E7EB', border: `2px solid ${step.done ? step.color : '#D1D5DB'}`, boxShadow: step.done ? `0 0 6px ${step.color}55` : 'none', transition: 'all 0.2s' }} />
            {i < steps.length - 1 && (
              <div style={{ width: '2px', height: '28px', background: step.done ? `${step.color}66` : '#E5E7EB', marginTop: '3px' }} />
            )}
          </div>
          {/* Label + time */}
          <div style={{ paddingBottom: i < steps.length - 1 ? '18px' : 0 }}>
            <div style={{ fontSize: '13px', fontWeight: step.done ? '600' : '400', color: step.done ? C.text : C.dimMid }}>{step.label}</div>
            {step.time && <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>{fmtDT(step.time)}</div>}
            {!step.time && !step.done && <div style={{ fontSize: '11px', color: C.dimMid, marginTop: '2px', fontStyle: 'italic' }}>Awaiting…</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Listing thumbnail (with fallback) ─────────────────────────────────────────
const ListingThumb = ({ listing, size = 44 }) => {
  const [err, setErr] = useState(false);
  const src = listing?.images?.[0] ? getImageUrl(listing.images[0]) : '';
  return (!src || err) ? (
    <div style={{ width: size, height: size, borderRadius: '8px', background: '#FFFFFF', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, flexShrink: 0 }}>
      {ANIMAL_EMOJI[listing?.type] ?? '🐾'}
    </div>
  ) : (
    <img src={src} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '8px', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  );
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[60, 110, 110, 130, 90, 80, 90, 72, 60].map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <div className="shimmer-bar" style={{ height: '13px', width: `${w}px`, borderRadius: '6px' }} />
      </td>
    ))}
  </tr>
);

// ── Contact card ──────────────────────────────────────────────────────────────
const ContactCard = ({ label, user, accentColor }) => (
  <div style={{ background: C.card, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}`, flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>{label}</div>
    {user ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserAvatar name={user.name} size={32} />
          <div style={{ fontWeight: '600', fontSize: '14px', color: C.text }}>{user.name}</div>
        </div>
        {user.phone && (
          <a href={`tel:${user.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: accentColor, textDecoration: 'none', fontWeight: '500' }}>
            📞 {user.phone}
          </a>
        )}
        {!user.phone && <div style={{ fontSize: '12px', color: C.dimMid, fontStyle: 'italic' }}>No phone on file</div>}
      </div>
    ) : (
      <div style={{ fontSize: '13px', color: C.dimMid }}>—</div>
    )}
  </div>
);

// ── Detail modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ order: o, onClose, onStatusUpdate, onDeliveryUpdate, adminNote, onNoteChange, updating }) => {
  const [selStatus,      setSelStatus]      = useState(o.status);
  const [delivCost,      setDelivCost]      = useState(String(o.deliveryCost || ''));
  const [delivStatus,    setDelivStatus]    = useState(o.deliveryStatus || 'pending');
  const [delivSaving,    setDelivSaving]    = useState(false);
  const [delivSaved,     setDelivSaved]     = useState(false);
  const statusChanged = selStatus !== o.status;
  const isAdminDelivery = o.listing?.deliveryType === 'admin';
  const sm = STATUS[o.status] ?? STATUS.pending;
  const pm = PAYMENT[o.paymentType] ?? PAYMENT.cod;
  const balance = o.totalAmount - (o.depositAmount || 0);

  const saveDelivery = async () => {
    setDelivSaving(true);
    try {
      const data = {};
      const cost = parseFloat(delivCost);
      if (!isNaN(cost) && cost >= 0) data.deliveryCost = cost;
      data.deliveryStatus = delivStatus;
      await onDeliveryUpdate(o._id, data);
      setDelivSaved(true);
      setTimeout(() => setDelivSaved(false), 2000);
    } finally {
      setDelivSaving(false);
    }
  };

  return (
    <>
      <div className="ao-modal-overlay" onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      <div role="dialog" aria-modal="true" aria-label={`Order ${shortId(order._id)}`} className="ao-modal-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(820px, 96vw)', maxHeight: '92vh', background: C.header, border: `1px solid ${C.border}`, borderRadius: '18px', zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Modal header ── */}
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '800', color: C.text, letterSpacing: '0.5px' }}>{shortId(o._id)}</span>
            <StatusBadge status={o.status} />
            <span style={{ fontSize: '12px', color: C.dim }}>Placed {fmtDate(o.createdAt)}</span>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: '22px', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* ── Modal body (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Buyer + Seller cards */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <ContactCard label="Buyer"  user={o.buyer}  accentColor={C.blue}  />
            <ContactCard label="Seller" user={o.seller} accentColor={C.amber} />
          </div>

          {/* Listing details */}
          <div style={{ background: C.card, borderRadius: '12px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Livestock Item</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <ListingThumb listing={o.listing} size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, textTransform: 'capitalize', marginBottom: '3px' }}>
                  {o.listing?.type ?? '—'}{o.listing?.breed ? ` · ${o.listing.breed}` : ''}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: C.green }}>{fmtMoney(o.listing?.price ?? o.totalAmount)} ج.م</div>
              </div>
              {o.listing?.images?.length > 1 && (
                <div style={{ fontSize: '11px', color: C.dim, background: '#F3F4F6', padding: '3px 8px', borderRadius: '8px' }}>
                  +{o.listing.images.length - 1} photos
                </div>
              )}
            </div>
          </div>

          {/* Timeline + Payment side-by-side */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {/* Timeline */}
            <div style={{ flex: 1, background: C.card, borderRadius: '12px', padding: '16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Order Timeline</div>
              <OrderTimeline order={o} />
            </div>

            {/* Payment */}
            <div style={{ flex: 1, background: C.card, borderRadius: '12px', padding: '16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Payment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.dim }}>Method</span>
                  <PaymentBadge type={o.paymentType} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.dim }}>Total</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{fmtMoney(o.totalAmount)} ج.م</span>
                </div>
                {o.paymentType === 'deposit' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: C.dim }}>Deposit Paid</span>
                      <span style={{ fontSize: '13px', color: C.green, fontWeight: '600' }}>{fmtMoney(o.depositAmount)} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: C.dim }}>Balance Due</span>
                      <span style={{ fontSize: '13px', color: C.amber, fontWeight: '700' }}>{fmtMoney(balance)} ج.م</span>
                    </div>
                  </>
                )}
                {o.paymentType === 'cod' && (
                  <div style={{ fontSize: '11px', color: C.dim, background: 'rgba(168,85,247,0.06)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.12)' }}>
                    Full amount collected on delivery
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buyer notes */}
          {o.notes && (
            <div style={{ background: C.card, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Buyer Notes</div>
              <p style={{ margin: 0, fontSize: '13px', color: C.dim, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{o.notes}</p>
            </div>
          )}

          {/* Admin delivery management — only for admin-handled orders */}
          {isAdminDelivery && (
            <div style={{ background: C.card, borderRadius: '12px', padding: '16px', border: `1px solid rgba(59,130,246,0.25)` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.blue, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📦</span> Admin Delivery Management
              </div>

              {/* Delivery status buttons */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: C.dimMid, fontWeight: '600', marginBottom: '8px' }}>Delivery Status</div>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  {Object.entries(DELIVERY_STATUS).map(([val, { label, color, bg, border }]) => (
                    <button key={val} type="button" onClick={() => setDelivStatus(val)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${delivStatus === val ? border : C.border}`, background: delivStatus === val ? bg : 'transparent', color: delivStatus === val ? color : C.dim, fontSize: '12px', fontWeight: delivStatus === val ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery cost input */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: C.dimMid, fontWeight: '600', marginBottom: '8px' }}>Delivery Cost (ج.م)</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number" min="0" step="0.01"
                    value={delivCost}
                    onChange={e => setDelivCost(e.target.value)}
                    placeholder="0.00"
                    style={{ flex: 1, maxWidth: '160px', padding: '8px 12px', borderRadius: '9px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '14px', fontWeight: '700', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: '13px', color: C.dimMid }}>ج.م</span>
                </div>
                {o.deliveryCost > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: C.dimMid }}>
                    Current saved cost: <span style={{ color: C.green, fontWeight: '700' }}>{o.deliveryCost} ج.م</span>
                  </div>
                )}
              </div>

              {/* Save button */}
              <button type="button" onClick={saveDelivery} disabled={delivSaving}
                style={{ padding: '8px 20px', borderRadius: '9px', border: 'none', background: delivSaved ? C.green : C.blue, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: delivSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', opacity: delivSaving ? 0.7 : 1 }}>
                {delivSaving ? 'Saving…' : delivSaved ? '✓ Saved' : 'Save Delivery Info'}
              </button>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Admin Notes</div>
            <textarea
              value={adminNote}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Internal notes (not visible to buyer or seller)…"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${C.border}`, background: '#F9FAFB', color: C.text, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
            />
          </div>

          {/* Status update */}
          <div style={{ background: C.card, borderRadius: '12px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Update Status</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selStatus}
                onChange={e => setSelStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '9px', border: `1px solid ${statusChanged ? STATUS[selStatus]?.border ?? C.border : C.border}`, background: statusChanged ? STATUS[selStatus]?.bg ?? C.card : C.card, color: statusChanged ? STATUS[selStatus]?.color ?? C.text : C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', minWidth: '160px' }}
              >
                {Object.entries(STATUS).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button type="button"
                onClick={() => { if (statusChanged) onStatusUpdate(o._id, selStatus); }}
                disabled={!statusChanged || updating}
                style={{ padding: '8px 20px', borderRadius: '9px', border: 'none', background: statusChanged && !updating ? sm.color : '#E5E7EB', color: statusChanged && !updating ? '#000' : C.dimMid, fontSize: '13px', fontWeight: '700', cursor: statusChanged && !updating ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s', opacity: statusChanged ? 1 : 0.5 }}>
                {updating ? 'Updating…' : 'Update Status'}
              </button>
              {!statusChanged && <span style={{ fontSize: '12px', color: C.dimMid }}>No changes</span>}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminOrders = () => {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // Filters
  const [search,        setSearch]       = useState('');
  const [statusFilters, setStatusFilters]= useState(new Set()); // empty = all
  const [payFilter,     setPayFilter]    = useState('all');
  const [buyerSearch,   setBuyerSearch]  = useState('');
  const [sellerSearch,  setSellerSearch] = useState('');
  const [dateFrom,      setDateFrom]     = useState('');
  const [dateTo,        setDateTo]       = useState('');
  const [showAdvanced,  setShowAdvanced] = useState(false);

  // Sort
  const [sort, setSort] = useState({ col: 'createdAt', dir: 'desc' });

  // Detail modal
  const [detailOrder,  setDetailOrder]  = useState(null);
  const [adminNotes,   setAdminNotes]   = useState({});
  const [updating,     setUpdating]     = useState(false);

  // Load
  useEffect(() => {
    getAllOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  // Keep detail order in sync with orders array (reflects status updates)
  const activeDetail = detailOrder ? (orders.find(o => o._id === detailOrder._id) ?? detailOrder) : null;

  // ── Stats ────────────────────────────────────────────────────────────────
  const now   = new Date();
  const month = now.getMonth(), year = now.getFullYear();
  const ordersThisMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
  const totalRevenue  = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const pendingCount  = orders.filter(o => o.status === 'pending').length;

  // ── Filters + sort ───────────────────────────────────────────────────────
  const filtered = orders
    .filter(o => {
      if (search && !o._id.toLowerCase().endsWith(search.toLowerCase().replace('#','')) && !shortId(o._id).toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilters.size > 0 && !statusFilters.has(o.status)) return false;
      if (payFilter !== 'all' && o.paymentType !== payFilter) return false;
      if (buyerSearch  && !(o.buyer?.name  ?? '').toLowerCase().includes(buyerSearch.toLowerCase()))  return false;
      if (sellerSearch && !(o.seller?.name ?? '').toLowerCase().includes(sellerSearch.toLowerCase())) return false;
      if (dateFrom && new Date(o.createdAt) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(o.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    })
    .sort((a, b) => {
      const { col, dir } = sort;
      if (col === 'totalAmount') { const d = a.totalAmount - b.totalAmount; return dir === 'asc' ? d : -d; }
      if (col === 'status') { const d = a.status.localeCompare(b.status); return dir === 'asc' ? d : -d; }
      const d = new Date(a.createdAt) - new Date(b.createdAt);
      return dir === 'asc' ? d : -d;
    });

  const toggleSort = (col) => setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));

  const toggleStatus = (s) => setStatusFilters(prev => {
    const n = new Set(prev);
    n.has(s) ? n.delete(s) : n.add(s);
    return n;
  });

  const hasFilters = search || statusFilters.size > 0 || payFilter !== 'all' || buyerSearch || sellerSearch || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch(''); setStatusFilters(new Set()); setPayFilter('all');
    setBuyerSearch(''); setSellerSearch(''); setDateFrom(''); setDateTo('');
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    try {
      const { data } = await updateStatusApi(id, status);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, ...data } : o));
    } catch { /* silent */ }
    finally { setUpdating(false); }
  };

  // ── Delivery update (admin-handled orders) ─────────────────────────────────
  const handleDeliveryUpdate = async (id, delivData) => {
    try {
      const { data } = await setOrderDelivery(id, delivData);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, ...data } : o));
    } catch { /* silent */ }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Order ID','Buyer','Seller','Item','Date','Status','Amount (EGP)','Payment'];
    const rows = filtered.map(o => [
      shortId(o._id),
      o.buyer?.name ?? '—',
      o.seller?.name ?? '—',
      [o.listing?.type, o.listing?.breed].filter(Boolean).join(' · '),
      fmtDate(o.createdAt),
      STATUS[o.status]?.label ?? o.status,
      o.totalAmount,
      PAYMENT[o.paymentType]?.label ?? o.paymentType,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'farmflow_orders.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  // ── Sort header ───────────────────────────────────────────────────────────
  const renderTh = (col, label, align = 'left') => (
    <th scope="col" onClick={() => toggleSort(col)}
      aria-sort={sort.col === col ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{ padding: '12px 16px', textAlign: align, fontSize: '11px', fontWeight: '700', color: sort.col === col ? C.blue : C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}
      {sort.col !== col
        ? <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: '#D1D5DB' }}>⇅</span>
        : <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: C.blue }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
      }
    </th>
  );

  return (
    <div className="adm-page" style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .shimmer-bar { background:linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite; }
        .o-row { transition:background 0.1s;cursor:pointer; }
        .o-row:hover { background: #F9FAFB !important; }
        input[type='date']::-webkit-calendar-picker-indicator { cursor: pointer; }
        .ao-m-cards { display:none; flex-direction:column; gap:8px; }
        @keyframes ao-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @media (max-width:640px) {
          .adm-page   { padding:16px !important; padding-top:72px !important; }
          .ao-stats   { grid-template-columns:repeat(2,1fr) !important; }
          .ao-table   { display:none !important; }
          .ao-m-cards { display:flex !important; }
          .ao-hdr     { flex-direction:column !important; align-items:flex-start !important; }
          .ao-filters { flex-direction:column !important; }
          .ao-chips   { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
          .ao-modal-overlay { align-items:flex-end !important; padding:0 !important; }
          .ao-modal-card {
            top:auto !important; left:0 !important; right:0 !important; bottom:0 !important;
            transform:none !important; width:100% !important; max-width:100% !important;
            border-radius:18px 18px 0 0 !important;
            animation:ao-sheet-up 0.28s cubic-bezier(0.32,0.72,0,1);
          }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="ao-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: C.text }}>Order Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.dim }}>
            {orders.length} total orders &middot; {fmtMoney(totalRevenue)} ج.م revenue
            {pendingCount > 0 && <> &middot; <span style={{ color: C.amber }}>{pendingCount} pending</span></>}
          </p>
        </div>
        <button type="button" onClick={exportCSV}
          style={{ padding: '9px 16px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.card, color: C.dim, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="ao-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Orders',       value: orders.length,      color: C.text,  sub: 'All time' },
          { label: 'This Month',         value: ordersThisMonth,    color: C.blue,  sub: new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' }) },
          { label: 'Revenue',            value: fmtMoney(totalRevenue) + ' ج.م', color: C.green, sub: 'Non-cancelled' },
          { label: 'Pending',            value: pendingCount,       color: pendingCount > 0 ? C.amber : C.dim, sub: 'Awaiting confirmation' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px 18px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color, marginBottom: '3px', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: '11px', color: C.dim, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
            <div style={{ fontSize: '10px', color: C.dimMid, marginTop: '2px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
        {/* Primary row */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '140px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.dim, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID…"
              aria-label="Search orders by ID"
              style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: '9px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* Status chips */}
          <div className="ao-chips" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Object.entries(STATUS).map(([val, { label, color }]) => {
              const active = statusFilters.has(val);
              return (
                <button key={val} type="button" onClick={() => toggleStatus(val)}
                  aria-pressed={active}
                  style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${active ? color + '44' : C.border}`, background: active ? color + '15' : 'transparent', color: active ? color : C.dim, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  {label}
                </button>
              );
            })}
            {statusFilters.size > 0 && (
              <button type="button" onClick={() => setStatusFilters(new Set())}
                style={{ padding: '5px 8px', borderRadius: '7px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Toggle advanced */}
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            style={{ padding: '7px 14px', borderRadius: '9px', border: `1px solid ${showAdvanced ? C.blue + '44' : C.border}`, background: showAdvanced ? C.blueBg : 'transparent', color: showAdvanced ? C.blue : C.dim, fontSize: '12px', fontWeight: showAdvanced ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            ⚙ Filters{hasFilters ? ' •' : ''}
          </button>
          {hasFilters && (
            <button type="button" onClick={clearFilters}
              style={{ padding: '7px 12px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear all
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Date range */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit', colorScheme: 'light' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit', colorScheme: 'light' }} />
            </div>

            {/* Payment filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</label>
              <div style={{ display: 'flex', gap: '4px', background: '#F9FAFB', borderRadius: '8px', padding: '3px' }}>
                {[['all', 'All'], ['cod', 'COD'], ['deposit', 'Deposit'], ['instapay', 'InstaPay']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setPayFilter(val)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: payFilter === val ? 'rgba(168,85,247,0.15)' : 'transparent', color: payFilter === val ? '#A855F7' : C.dim, fontSize: '11px', fontWeight: payFilter === val ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Buyer / Seller search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px', minWidth: '130px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buyer</label>
              <input value={buyerSearch} onChange={e => setBuyerSearch(e.target.value)} placeholder="Filter by buyer…"
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px', minWidth: '130px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seller</label>
              <input value={sellerSearch} onChange={e => setSellerSearch(e.target.value)} placeholder="Filter by seller…"
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: C.red, marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {/* ── Table (desktop) ── */}
      <div className="ao-table" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table aria-label="Orders" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', whiteSpace: 'nowrap' }}>Order ID</th>
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Buyer</th>
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Seller</th>
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Item</th>
                {renderTh('createdAt', 'Date')}
                {renderTh('status', 'Status')}
                {renderTh('totalAmount', 'Amount', 'right')}
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Payment</th>
                <th scope="col" style={{ padding: '12px 16px', width: '60px' }} />
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '52px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontSize: '14px', color: C.dim }}>
                      {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.map(o => {
                const sm = STATUS[o.status] ?? STATUS.pending;
                return (
                  <tr key={o._id} className="o-row"
                    style={{ borderBottom: `1px solid ${C.border}`, background: sm.rowBg }}
                    onClick={() => setDetailOrder(o)}>
                    {/* Order ID */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: sm.color, letterSpacing: '0.5px' }}>{shortId(o._id)}</span>
                        {o.listing?.deliveryType === 'admin' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: C.blue, background: 'rgba(59,130,246,0.12)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content' }}>📦 Admin Delivery</span>
                        )}
                      </div>
                    </td>
                    {/* Buyer */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <UserAvatar name={o.buyer?.name} size={24} />
                        <span style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{o.buyer?.name ?? '—'}</span>
                      </div>
                    </td>
                    {/* Seller */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <UserAvatar name={o.seller?.name} size={24} />
                        <span style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{o.seller?.name ?? '—'}</span>
                      </div>
                    </td>
                    {/* Item */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListingThumb listing={o.listing} size={34} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, textTransform: 'capitalize' }}>{o.listing?.type ?? '—'}</div>
                          {o.listing?.breed && <div style={{ fontSize: '11px', color: C.dim }}>{o.listing.breed}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Date */}
                    <td style={{ padding: '13px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                    {/* Status */}
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={o.status} /></td>
                    {/* Amount */}
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: C.green, whiteSpace: 'nowrap' }}>{fmtMoney(o.totalAmount)} ج.م</td>
                    {/* Payment */}
                    <td style={{ padding: '13px 16px' }}><PaymentBadge type={o.paymentType} /></td>
                    {/* View */}
                    <td style={{ padding: '13px 16px' }}>
                      <button type="button" onClick={e => { e.stopPropagation(); setDetailOrder(o); }}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: C.dim }}>Showing {filtered.length} of {orders.length} orders</span>
            {hasFilters && <span style={{ fontSize: '12px', color: C.blue, fontWeight: '500' }}>Filters active</span>}
          </div>
        )}
      </div>

      {/* ── Mobile card list ── */}
      <div className="ao-m-cards">
        {loading && [1,2,3,4,5].map(i => (
          <div key={i} className="shimmer-bar" style={{ height: '100px', borderRadius: '12px' }} />
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dim }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontSize: '14px' }}>{orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}</div>
          </div>
        )}
        {!loading && filtered.map(o => {
          const sm = STATUS[o.status] ?? STATUS.pending;
          return (
            <div key={o._id}
              onClick={() => setDetailOrder(o)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${sm.color}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', minHeight: '48px' }}>
              {/* Row 1: ID + Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '800', color: sm.color, letterSpacing: '0.5px' }}>{shortId(o._id)}</span>
                <StatusBadge status={o.status} />
              </div>
              {/* Row 2: Buyer → Seller */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '9px', minWidth: 0, overflow: 'hidden' }}>
                <UserAvatar name={o.buyer?.name} size={22} />
                <span style={{ fontSize: '12px', color: C.text, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{o.buyer?.name ?? '—'}</span>
                <span style={{ fontSize: '11px', color: C.dimMid, flexShrink: 0 }}>→</span>
                <UserAvatar name={o.seller?.name} size={22} />
                <span style={{ fontSize: '12px', color: C.text, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{o.seller?.name ?? '—'}</span>
              </div>
              {/* Row 3: Date + Amount */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: C.dim }}>{fmtDate(o.createdAt)}</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: C.green }}>{fmtMoney(o.totalAmount)} ج.م</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail modal ── */}
      {activeDetail && (
        <DetailModal
          order={activeDetail}
          onClose={() => setDetailOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onDeliveryUpdate={handleDeliveryUpdate}
          adminNote={adminNotes[activeDetail._id] ?? ''}
          onNoteChange={v => setAdminNotes(p => ({ ...p, [activeDetail._id]: v }))}
          updating={updating}
        />
      )}
    </div>
  );
};

export default AdminOrders;
