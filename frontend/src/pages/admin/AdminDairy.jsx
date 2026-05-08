import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

import { C as _C } from '../../tokens';

// ── Design tokens (mirrors AdminListings) ────────────────────────────────────
const C = {
  ..._C,
  header:  '#F9FAFB',
  dim:     '#6B7280',
  dimMid:  '#9CA3AF',
  slateBg: '#F8FAFC',
};

const STATUS = {
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected'];

// Dairy product type → display
const TYPE_EMOJI = {
  milk: '🥛', cheese: '🧀', yogurt: '🫙', butter: '🧈',
  cream: '🍦', ghee: '🫕', other: '🍶',
};
const TYPE_LABEL = {
  milk: 'Milk', cheese: 'Cheese', yogurt: 'Yogurt', butter: 'Butter',
  cream: 'Cream', ghee: 'Ghee', other: 'Other',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtPrice = (n) =>
  n == null ? '—' : Number(n).toLocaleString('en-EG', { maximumFractionDigits: 2 });

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${path}`;
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

// ── Seller avatar ─────────────────────────────────────────────────────────────
const SellerAvatar = ({ name, size = 26 }) => {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsla(${hue},60%,93%,1)`, border: `1px solid hsla(${hue},50%,75%,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: '700', color: `hsla(${hue},55%,35%,1)`, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

// ── Product thumbnail ─────────────────────────────────────────────────────────
const Thumb = ({ path, type, size = 48, radius = 8 }) => {
  const [err, setErr] = useState(false);
  const url = path ? getImageUrl(path) : '';
  return (!url || err) ? (
    <div style={{ width: size, height: size, borderRadius: radius, background: '#F9FAFB', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.44, flexShrink: 0 }}>
      {TYPE_EMOJI[type] ?? '🍶'}
    </div>
  ) : (
    <img src={url} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  );
};

// ── Inline action button ──────────────────────────────────────────────────────
const ActBtn = ({ onClick, color, children, disabled, title, size = 'sm' }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    style={{ padding: size === 'sm' ? '4px 9px' : '6px 14px', borderRadius: '6px', border: `1px solid ${color}33`, background: `${color}11`, color, fontSize: '11px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1, transition: 'all 0.12s' }}>
    {children}
  </button>
);

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[48, 80, 56, 140, 100, 80, 80, 90, 100].map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <div className="ad-shimmer" style={{ height: '13px', width: `${w}px`, borderRadius: '6px' }} />
      </td>
    ))}
  </tr>
);

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
    <div className="ad-shimmer" style={{ height: '160px', borderRadius: 0 }} />
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="ad-shimmer" style={{ height: '13px', width: '70%', borderRadius: '6px' }} />
      <div className="ad-shimmer" style={{ height: '11px', width: '50%', borderRadius: '6px' }} />
      <div className="ad-shimmer" style={{ height: '16px', width: '40%', borderRadius: '6px' }} />
    </div>
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EMPTY_MSG = {
  all:      { icon: '📋', msg: 'No dairy products in the system yet.' },
  pending:  { icon: '✅', msg: 'All caught up — no pending products.' },
  approved: { icon: '📬', msg: 'No approved products.' },
  rejected: { icon: '🗂',  msg: 'No rejected products.' },
};
const EmptyState = ({ status }) => {
  const { icon, msg } = EMPTY_MSG[status] ?? EMPTY_MSG.all;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '32px' }}>{icon}</div>
      <div style={{ fontSize: '14px', color: '#64748B' }}>{msg}</div>
    </div>
  );
};

// ── Reject inline form ────────────────────────────────────────────────────────
const RejectForm = ({ onConfirm, onCancel, acting }) => {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div style={{ marginTop: '6px', padding: '10px', borderRadius: '9px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <textarea
        ref={ref}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Rejection reason (min 5 chars)…"
        rows={2}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: `1px solid ${valid ? 'rgba(239,68,68,0.35)' : C.border}`, background: '#F9FAFB', color: C.text, fontSize: '12px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.4' }}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="button" onClick={onCancel} disabled={acting}
          style={{ flex: 1, padding: '5px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button type="button" onClick={() => valid && onConfirm(reason.trim())} disabled={!valid || acting}
          style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: valid ? C.red : 'rgba(239,68,68,0.3)', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: valid && !acting ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: (!valid || acting) ? 0.6 : 1 }}>
          {acting ? '…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteModal = ({ product: p, onConfirm, onCancel }) => (
  <>
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
    <div role="dialog" aria-modal="true" aria-label="Delete product" className="ad-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: C.header, border: '1px solid rgba(239,68,68,0.22)', borderRadius: '16px', padding: '28px', width: 'min(380px, calc(100vw - 32px))', zIndex: 201, textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🗑</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Delete product?</div>
      <div style={{ fontSize: '13px', color: C.dim, lineHeight: '1.55', marginBottom: '22px' }}>
        <strong style={{ color: C.text }}>{p.name}</strong> will be permanently removed.
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        <button type="button" onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: C.red, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
      </div>
    </div>
  </>
);

// ── Detail modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ product: p, onClose, onApprove, onReject, onDelete, acting }) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const isPending  = p.status === 'pending';
  const isApproved = p.status === 'approved';
  const isRejected = p.status === 'rejected';

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }} />
      <div role="dialog" aria-modal="true" aria-label={p.name} className="ad-detail-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(720px, 96vw)', maxHeight: '92vh', background: C.header, border: `1px solid ${C.border}`, borderRadius: '18px', zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{TYPE_EMOJI[p.type] ?? '🍶'}</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: C.text }}>{p.name}</span>
            <StatusBadge status={p.status} />
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: '22px', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="ad-detail-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {/* Left — image */}
          <div className="ad-detail-left" style={{ width: '260px', flexShrink: 0, padding: '20px', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', background: '#F9FAFB', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
              {p.images?.[0]
                ? <img src={getImageUrl(p.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ fontSize: '56px', opacity: 0.25 }}>{TYPE_EMOJI[p.type] ?? '🍶'}</div>
              }
            </div>
            {p.images?.length > 1 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {p.images.slice(1).map((img, i) => (
                  <Thumb key={i} path={img} type={p.type} size={44} radius={6} />
                ))}
              </div>
            )}
          </div>

          {/* Right — details */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Price */}
            <div style={{ fontSize: '28px', fontWeight: '800', color: C.green }}>
              {fmtPrice(p.pricePerUnit)} ج.م <span style={{ fontSize: '15px', fontWeight: '500', color: C.dimMid }}>/ {p.unit}</span>
            </div>

            {/* Key specs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Type',       value: TYPE_LABEL[p.type] ?? p.type ?? '—' },
                { label: 'Quantity',   value: p.quantity != null ? `${p.quantity} ${p.unit}` : '—' },
                { label: 'Production', value: fmtDate(p.productionDate) },
                { label: 'Expiry',     value: fmtDate(p.expiryDate) },
                { label: 'Submitted',  value: fmtDate(p.createdAt) },
                { label: 'Available',  value: p.available ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.card, borderRadius: '9px', padding: '10px 12px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Delivery */}
            {p.deliveryAvailable && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: C.greenBg, border: `1px solid rgba(34,197,94,0.2)`, fontSize: '12px', color: C.green, fontWeight: '600' }}>
                🚚 Delivery available{p.deliveryCost ? ` · ${fmtPrice(p.deliveryCost)} ج.م` : ''}
              </div>
            )}

            {/* Description */}
            {p.description && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Description</div>
                <p style={{ margin: 0, fontSize: '13px', color: C.dim, lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{p.description}</p>
              </div>
            )}

            {/* Rejection reason */}
            {isRejected && p.rejectionReason && (
              <div style={{ padding: '10px 14px', borderRadius: '9px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.red, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Rejection Reason</div>
                <div style={{ fontSize: '13px', color: C.dim }}>{p.rejectionReason}</div>
              </div>
            )}

            {/* Seller */}
            <div style={{ background: C.card, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Seller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SellerAvatar name={p.seller?.name} size={36} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: C.text }}>{p.seller?.name ?? '—'}</div>
                  {p.seller?.farmName && <div style={{ fontSize: '12px', color: C.dim }}>🌾 {p.seller.farmName}</div>}
                  {p.seller?.governorate && <div style={{ fontSize: '12px', color: C.dim }}>📍 {p.seller.governorate}</div>}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '16px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!isApproved && (
                  <button type="button" onClick={onApprove} disabled={acting}
                    style={{ flex: 1, padding: '11px', borderRadius: '9px', border: 'none', background: acting ? 'rgba(34,197,94,0.3)' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {acting ? '…' : '✓  Approve'}
                  </button>
                )}
                {!isRejected && (
                  <button type="button" onClick={() => setRejectOpen(v => !v)} disabled={acting}
                    style={{ flex: 1, padding: '11px', borderRadius: '9px', border: `1px solid rgba(239,68,68,0.3)`, background: C.redBg, color: C.red, fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {acting ? '…' : (rejectOpen ? '↑ Cancel Reject' : '✕  Reject')}
                  </button>
                )}
                <button type="button" onClick={onDelete} disabled={acting}
                  style={{ padding: '11px 16px', borderRadius: '9px', border: `1px solid rgba(239,68,68,0.25)`, background: 'rgba(239,68,68,0.07)', color: C.red, fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  🗑
                </button>
              </div>
              {isApproved  && <div style={{ fontSize: '13px', color: C.green, fontWeight: '600' }}>✓ This product is live</div>}
              {isRejected  && !rejectOpen && <div style={{ fontSize: '13px', color: C.red, fontWeight: '600' }}>✕ This product is rejected</div>}
              {rejectOpen  && (
                <RejectForm
                  acting={acting}
                  onConfirm={(reason) => { setRejectOpen(false); onReject(reason); }}
                  onCancel={() => setRejectOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminDairy = () => {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [view, setView]           = useState('table');
  const [statusFilter, setStatus] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort]           = useState({ col: 'createdAt', dir: 'desc' });
  const [acting, setActing]       = useState(new Set()); // ids currently being actioned
  const [rejectTarget, setRejectTarget] = useState(null); // { id } — inline card reject
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [detailId, setDetailId]   = useState(null);

  // Fetch — NOTE: GET /dairy only returns approved+available for public.
  // The backend has no admin-all endpoint; pending products are fetched here
  // for display. To see truly all statuses an admin-all endpoint would need
  useEffect(() => {
    setLoading(true);
    api.get('/dairy/admin/all')
      .then(({ data }) => setProducts(data))
      .catch(() => setError('Failed to load dairy products.'))
      .finally(() => setLoading(false));
  }, []);

  const addActing  = (id) => setActing(p => new Set([...p, id]));
  const dropActing = (id) => setActing(p => { const n = new Set(p); n.delete(id); return n; });
  const patchProduct = (id, updates) =>
    setProducts(prev => prev.map(p => p._id === id ? { ...p, ...updates } : p));

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    addActing(id);
    try {
      const { data } = await api.post(`/dairy/${id}/approve`, { status: 'approved' });
      patchProduct(id, { status: data.status });
    } catch {
      // silent — keep acting state consistent
    } finally {
      dropActing(id);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async (id, rejectionReason) => {
    addActing(id);
    setRejectTarget(null);
    try {
      const { data } = await api.post(`/dairy/${id}/approve`, { status: 'rejected', rejectionReason });
      patchProduct(id, { status: data.status, rejectionReason: data.rejectionReason });
    } catch {
      // silent
    } finally {
      dropActing(id);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleteTarget(null);
    if (detailId === id) setDetailId(null);
    addActing(id);
    try {
      await api.delete(`/dairy/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch {
      // silent
    } finally {
      dropActing(id);
    }
  };

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = { all: products.length };
  STATUS_TABS.slice(1).forEach(s => { counts[s] = products.filter(p => p.status === s).length; });

  // ── Filtering / sorting ──────────────────────────────────────────────────
  const filtered = products
    .filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter && p.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const { col, dir } = sort;
      if (col === 'pricePerUnit') { const d = (a.pricePerUnit || 0) - (b.pricePerUnit || 0); return dir === 'asc' ? d : -d; }
      if (col === 'createdAt') { const d = new Date(a.createdAt) - new Date(b.createdAt); return dir === 'asc' ? d : -d; }
      if (col === 'seller') { const d = (a.seller?.name ?? '').localeCompare(b.seller?.name ?? ''); return dir === 'asc' ? d : -d; }
      const d = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
      return dir === 'asc' ? d : -d;
    });

  const toggleSort = (col) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));

  const renderTh = (col, label, align = 'left') => (
    <th scope="col" onClick={() => toggleSort(col)}
      aria-sort={sort.col === col ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{ padding: '12px 16px', textAlign: align, fontSize: '11px', fontWeight: '700', color: sort.col === col ? C.amber : C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}
      {sort.col !== col
        ? <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: '#D1D5DB' }}>⇅</span>
        : <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: C.amber }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
      }
    </th>
  );

  const detailProduct = detailId ? products.find(p => p._id === detailId) ?? null : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes ad-shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .ad-shimmer { background:linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%);background-size:200% 100%;animation:ad-shimmer 1.5s infinite; }
        .ad-row { transition:background 0.1s;cursor:pointer; }
        .ad-row:hover { background:#F9FAFB !important; }
        .ad-card { transition:transform 0.15s,box-shadow 0.15s;cursor:pointer; }
        .ad-card:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.10); }
        .ad-card:hover .ad-card-actions { opacity:1 !important; }
        @keyframes ad-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @media (max-width:640px) {
          .ad-hdr { flex-direction:column !important; align-items:flex-start !important; }
          .ad-stats { grid-template-columns:repeat(2,1fr) !important; }
          .ad-view-toggle { display:none !important; }
          .ad-table-wrap { display:none !important; }
          .ad-grid-wrap { display:block !important; }
          .ad-detail-modal {
            position:fixed !important; top:auto !important;
            left:0 !important; right:0 !important; bottom:0 !important;
            transform:none !important; width:100% !important;
            max-height:90vh !important; border-radius:18px 18px 0 0 !important;
            animation:ad-sheet-up 0.24s ease;
          }
          .ad-detail-body { flex-direction:column !important; overflow-y:auto !important; }
          .ad-detail-left { width:100% !important; min-height:200px !important; border-right:none !important; border-bottom:1px solid #E5E7EB !important; }
          .ad-modal {
            position:fixed !important; top:auto !important;
            left:0 !important; right:0 !important; bottom:0 !important;
            transform:none !important; width:100% !important;
            border-radius:18px 18px 0 0 !important;
            animation:ad-sheet-up 0.24s ease;
          }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="ad-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: C.text }}>Dairy Product Moderation</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.dim }}>
            {products.length} total &middot; <span style={{ color: C.amber }}>{counts.pending ?? 0} pending review</span>
            {(counts.rejected ?? 0) > 0 && <> &middot; <span style={{ color: C.red }}>{counts.rejected} rejected</span></>}
          </p>
        </div>
        {/* View toggle */}
        <div className="ad-view-toggle" style={{ display: 'flex', gap: '3px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '3px' }}>
          {[['table', '≡ Table'], ['grid', '⊞ Grid']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setView(v)}
              style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: view === v ? C.amberBg : 'transparent', color: view === v ? C.amber : C.dim, fontSize: '12px', fontWeight: view === v ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', outline: view === v ? `1px solid ${C.amber}28` : undefined, transition: 'all 0.12s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="ad-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {STATUS_TABS.map(s => {
          const sm = STATUS[s];
          const cnt = counts[s] ?? 0;
          const isActive = statusFilter === s;
          return (
            <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={isActive}
              style={{ background: isActive && s !== 'all' ? sm?.bg : C.card, border: `1px solid ${isActive && s !== 'all' ? sm?.border : C.border}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: s === 'all' ? C.text : (sm?.color ?? C.text), marginBottom: '2px' }}>{cnt}</div>
              <div style={{ fontSize: '11px', color: isActive && s !== 'all' ? sm?.color : C.dim, fontWeight: '600', textTransform: 'capitalize' }}>{s === 'all' ? 'All Products' : s}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filter / sort bar ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>Type</span>
        {[{ key: '', label: 'All', emoji: '🧺' }, ...Object.keys(TYPE_EMOJI).map(k => ({ key: k, label: TYPE_LABEL[k], emoji: TYPE_EMOJI[k] }))].map(t => {
          const active = typeFilter === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTypeFilter(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${active ? C.amber + '66' : C.border}`, background: active ? C.amberBg : '#F9FAFB', color: active ? C.amber : C.dim, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
              {t.emoji} {t.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: C.dimMid, flexShrink: 0 }}>Sort:</span>
        {[['createdAt', 'Date'], ['pricePerUnit', 'Price'], ['type', 'Type'], ['seller', 'Seller']].map(([col, label]) => (
          <button key={col} type="button" onClick={() => toggleSort(col)}
            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${sort.col === col ? C.amber + '44' : C.border}`, background: sort.col === col ? C.amberBg : 'transparent', color: sort.col === col ? C.amber : C.dim, fontSize: '11px', fontWeight: sort.col === col ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            {label}{sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        ))}
        {typeFilter && (
          <button type="button" onClick={() => setTypeFilter('')}
            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid rgba(239,68,68,0.25)`, background: 'rgba(239,68,68,0.07)', color: C.red, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {error && <div style={{ color: C.red, marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="ad-table-wrap" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Dairy products" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th scope="col" style={{ padding: '12px 16px', width: '48px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Photo</th>
                  {renderTh('status',       'Status')}
                  {renderTh('type',         'Type')}
                  {renderTh('name',         'Product')}
                  {renderTh('seller',       'Seller')}
                  {renderTh('pricePerUnit', 'Price', 'right')}
                  {renderTh('quantity',     'Qty',   'right')}
                  {renderTh('expiryDate',   'Expiry')}
                  {renderTh('createdAt',    'Submitted')}
                  <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 7 }, (_, i) => <SkeletonRow key={i} />)}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '52px', textAlign: 'center' }}>
                    <EmptyState status={statusFilter} />
                  </td></tr>
                )}
                {!loading && filtered.map(p => {
                  const isActing = acting.has(p._id);
                  const showRejectForm = rejectTarget === p._id;
                  return (
                    <tr key={p._id} className="ad-row"
                      style={{ borderBottom: `1px solid ${C.border}`, background: 'transparent', verticalAlign: 'top' }}
                      onClick={() => setDetailId(p._id)}>
                      <td style={{ padding: '12px 16px' }}>
                        <Thumb path={p.images?.[0]} type={p.type} size={48} radius={7} />
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: '12px 16px', fontSize: '18px' }} title={TYPE_LABEL[p.type] ?? p.type}>
                        {TYPE_EMOJI[p.type] ?? '🍶'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <SellerAvatar name={p.seller?.name} size={24} />
                          <span style={{ fontSize: '12px', color: C.text, fontWeight: '500', whiteSpace: 'nowrap' }}>{p.seller?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: C.green, whiteSpace: 'nowrap' }}>
                        {fmtPrice(p.pricePerUnit)}<span style={{ fontSize: '11px', color: C.dimMid, fontWeight: '400' }}> /{p.unit}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>
                        {p.quantity} {p.unit}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>{fmtDate(p.expiryDate)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>
                      <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {p.status !== 'approved' && (
                              <ActBtn onClick={() => handleApprove(p._id)} color={C.green} disabled={isActing} title="Approve product">✓</ActBtn>
                            )}
                            {p.status !== 'rejected' && (
                              <ActBtn
                                onClick={() => setRejectTarget(showRejectForm ? null : p._id)}
                                color={C.red} disabled={isActing} title="Reject product">
                                {showRejectForm ? '↑' : '✕'}
                              </ActBtn>
                            )}
                            <ActBtn onClick={() => setDetailId(p._id)} color={C.slate} title="View details">
                              <span aria-hidden="true">👁</span>
                            </ActBtn>
                            <ActBtn
                              onClick={() => setDeleteTarget({ id: p._id, name: p.name })}
                              color={C.red} disabled={isActing} title="Delete product">
                              <span aria-hidden="true">🗑</span>
                            </ActBtn>
                          </div>
                          {showRejectForm && (
                            <RejectForm
                              acting={isActing}
                              onConfirm={(reason) => handleReject(p._id, reason)}
                              onCancel={() => setRejectTarget(null)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: C.dim }}>Showing {filtered.length} of {products.length} products</span>
            </div>
          )}
        </div>
      )}

      {/* ── CARD GRID VIEW ── */}
      {view === 'grid' && (
        <div>
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
              {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px' }}><EmptyState status={statusFilter} /></div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
              {filtered.map(p => {
                const isActing = acting.has(p._id);
                const showRejectForm = rejectTarget === p._id;
                return (
                  <div key={p._id} className="ad-card" onClick={() => setDetailId(p._id)}
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
                    {/* Image */}
                    <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.images?.[0]
                        ? <img src={getImageUrl(p.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ fontSize: '48px', opacity: 0.2 }}>{TYPE_EMOJI[p.type] ?? '🍶'}</div>
                      }
                      <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.images?.length > 1 && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', color: '#374151', background: 'rgba(255,255,255,0.88)', padding: '2px 6px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                          +{p.images.length - 1}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                        <SellerAvatar name={p.seller?.name} size={22} />
                        <span style={{ fontSize: '11px', color: C.dim, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.seller?.name ?? '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '15px' }}>{TYPE_EMOJI[p.type] ?? '🍶'}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: C.green, marginBottom: '4px' }}>
                        {fmtPrice(p.pricePerUnit)} <span style={{ fontSize: '11px', fontWeight: '400', color: C.dimMid }}>ج.م/{p.unit}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: C.dimMid }}>
                        {p.quantity} {p.unit} &middot; expires {fmtDate(p.expiryDate)}
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className="ad-card-actions" onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', background: 'linear-gradient(0deg,rgba(13,26,20,0.97) 0%,transparent 100%)', display: 'flex', gap: '5px', opacity: 0, transition: 'opacity 0.15s' }}>
                      {p.status !== 'approved' && (
                        <ActBtn onClick={() => handleApprove(p._id)} color={C.green} disabled={isActing} size="sm">✓</ActBtn>
                      )}
                      {p.status !== 'rejected' && (
                        <ActBtn onClick={(e) => { e.stopPropagation(); setRejectTarget(showRejectForm ? null : p._id); }} color={C.red} disabled={isActing} size="sm">✕</ActBtn>
                      )}
                      <div style={{ flex: 1 }} />
                      <ActBtn onClick={() => setDeleteTarget({ id: p._id, name: p.name })} color={C.red} disabled={isActing} size="sm">🗑</ActBtn>
                    </div>

                    {/* Inline reject form (below card) */}
                    {showRejectForm && (
                      <div style={{ padding: '0 10px 10px' }} onClick={e => e.stopPropagation()}>
                        <RejectForm
                          acting={isActing}
                          onConfirm={(reason) => handleReject(p._id, reason)}
                          onCancel={() => setRejectTarget(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: C.dim, textAlign: 'center' }}>
              Showing {filtered.length} of {products.length} products
            </div>
          )}
        </div>
      )}

      {/* ── Detail modal ── */}
      {detailProduct && (
        <DetailModal
          product={detailProduct}
          onClose={() => setDetailId(null)}
          onApprove={() => handleApprove(detailProduct._id)}
          onReject={(reason) => handleReject(detailProduct._id, reason)}
          onDelete={() => { setDetailId(null); setDeleteTarget({ id: detailProduct._id, name: detailProduct.name }); }}
          acting={acting.has(detailProduct._id)}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminDairy;
