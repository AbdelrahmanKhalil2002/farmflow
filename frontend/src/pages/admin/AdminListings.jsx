import { useEffect, useRef, useState } from 'react';
import {
  getAllListings,
  approveListing,
  rejectListing,
  deleteListing as deleteListingApi,
} from '../../services/adminService';
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
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  sold:     { label: 'Sold',     color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
};

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'sold'];
const EMOJI   = { cattle: '🐄', sheep: '🐑', goat: '🐐', camel: '🐪', horse: '🐴', poultry: '🐔', other: '🐾' };
const TYPE_AR = { cattle: 'ماشية', sheep: 'أغنام', goat: 'ماعز', camel: 'إبل', horse: 'خيول', poultry: 'دواجن', other: 'أخرى' };

const GENDER_OPTS = [
  { key: '',       label: 'الكل'    },
  { key: 'male',   label: '♂ ذكر'  },
  { key: 'female', label: '♀ أنثى' },
  { key: 'other',  label: '⚥ آخر'  },
];

const extractGender = (desc = '') => {
  if (desc.includes('Gender: Male'))   return 'male';
  if (desc.includes('Gender: Female')) return 'female';
  if (desc.includes('Gender: Other'))  return 'other';
  return null;
};

const extractColor  = (desc = '') => { const m = desc.match(/Color:\s*([^|\]]+)/);  return m ? m[1].trim() : ''; };
const extractHealth = (desc = '') => { const m = desc.match(/Health:\s*([^|\]]+)/); return m ? m[1].trim() : ''; };
const extractTraits = (desc = '') => { const m = desc.match(/Traits:\s*([^|\]]+)/); return m ? m[1].trim().split(',').map(t => t.trim()).filter(Boolean) : []; };

const FILTER_COLORS = ['بني', 'أسود', 'أبيض', 'رمادي', 'كستنائي', 'منقط', 'مختلط', 'أشهب'];
const FILTER_HEALTH = [
  { key: 'صحي',           label: '💚 صحي'           },
  { key: 'معفّى',          label: '💉 معفّى'          },
  { key: 'معتمد بيطرياً', label: '📋 معتمد'          },
];
const FILTER_TRAITS = [
  { key: 'dairy',    label: '🥛 ألبان' },
  { key: 'meat',     label: '🥩 لحم'   },
  { key: 'breeding', label: '🌱 تربية' },
  { key: 'show',     label: '🏆 عروض'  },
  { key: 'working',  label: '💪 عمل'   },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAge = (m) => {
  if (!m && m !== 0) return '—';
  const y = Math.floor(m / 12), mo = m % 12;
  return m < 12 ? `${m} mo` : mo ? `${y}y ${mo}mo` : `${y} yr`;
};
const parseMeta = (desc = '') => {
  const r = { gender: '', color: '', health: '', traits: [], delivery: false, deliveryCost: '', cleanDesc: desc };
  const match = desc.match(/^\[([^\]]+)\]\s*/);
  if (!match) return r;
  const s = match[1];
  const get = (key) => { const m = s.match(new RegExp(key + ':\\s*([^|\\]]+)')); return m ? m[1].trim() : ''; };
  const dm = s.match(/Delivery.*?\((\d+)\s*(?:SAR|ج\.م)\)/u);
  return { gender: get('Gender').replace(/[♂♀]/g, '').trim(), color: get('Color'), health: get('Health'), traits: get('Traits') ? get('Traits').split(',').map(t => t.trim()).filter(Boolean) : [], delivery: s.includes('Delivery: Available'), deliveryCost: dm ? dm[1] : '', cleanDesc: desc.slice(match[0].length) };
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status, overlay }) => {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: overlay ? '3px 8px' : '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px', background: overlay ? 'rgba(0,0,0,0.72)' : s.bg, color: overlay ? s.color : s.color, border: `1px solid ${overlay ? s.color + '55' : s.border}`, backdropFilter: overlay ? 'blur(4px)' : 'none', whiteSpace: 'nowrap' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

// ── Image with fallback ───────────────────────────────────────────────────────
const Thumb = ({ path, size = 56, type, radius = 8 }) => {
  const [err, setErr] = useState(false);
  const url = path ? getImageUrl(path) : '';
  return (!url || err) ? (
    <div style={{ width: size, height: size, borderRadius: radius, background: '#FFFFFF', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, flexShrink: 0 }}>
      {EMOJI[type] ?? '🐾'}
    </div>
  ) : (
    <img src={url} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  );
};

// ── Seller avatar ─────────────────────────────────────────────────────────────
const SellerAvatar = ({ name, size = 26 }) => {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: `hsla(${hue},38%,22%,0.9)`, border: `1px solid hsla(${hue},42%,42%,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: '700', color: `hsla(${hue},65%,72%,1)`, flexShrink: 0 }}>{initials}</div>;
};

// ── Photo carousel (used in detail modal) ────────────────────────────────────
const PhotoCarousel = ({ images = [], type }) => {
  const [idx, setIdx] = useState(0);
  const src = images[idx] ? getImageUrl(images[idx]) : '';
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => { setIdx(0); setImgErr(false); }, [images]);
  useEffect(() => { setImgErr(false); }, [idx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      {/* Main image */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: '12px', overflow: 'hidden', background: '#F9FAFB', border: `1px solid ${C.border}`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(!src || imgErr) ? (
          <div style={{ fontSize: '64px', opacity: 0.3 }}>{EMOJI[type] ?? '🐾'}</div>
        ) : (
          <img src={src} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" aria-label="Next photo" onClick={() => setIdx(i => (i + 1) % images.length)}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <span aria-hidden="true">›</span>
            </button>
            <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.45)', padding: '2px 7px', borderRadius: '10px', backdropFilter: 'blur(4px)' }}>{idx + 1} / {images.length}</div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              style={{ width: '48px', height: '36px', borderRadius: '7px', overflow: 'hidden', border: `2px solid ${i === idx ? C.amber : 'transparent'}`, padding: 0, cursor: 'pointer', flexShrink: 0 }}>
              <Thumb path={img} size={48} type={type} radius={5} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Detail modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ listing: l, onClose, onApprove, onReject, acting, adminNote, onNoteChange }) => {
  const meta   = parseMeta(l.description);
  const isSold = l.status === 'sold';
  const isPending  = l.status === 'pending';
  const isApproved = l.status === 'approved';
  const isRejected = l.status === 'rejected';
  const title  = [l.type, l.breed].filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)).join(' · ');

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }} />
      <div role="dialog" aria-modal="true" aria-label={title} className="al-detail-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(940px, 96vw)', maxHeight: '92vh', background: C.header, border: `1px solid ${C.border}`, borderRadius: '18px', zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: '800', color: C.text }}>{title}</span>
            <StatusBadge status={l.status} />
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: '22px', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="al-detail-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {/* Left — photo carousel */}
          <div className="al-detail-left" style={{ width: '360px', flexShrink: 0, padding: '20px', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <PhotoCarousel images={l.images} type={l.type} />
          </div>

          {/* Right — details */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Price + key specs */}
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: C.green, marginBottom: '12px' }}>
                {fmt(l.price)} ج.م
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Type',     value: l.type ? l.type[0].toUpperCase() + l.type.slice(1) : '—' },
                  { label: 'Breed',    value: l.breed || '—' },
                  { label: 'Age',      value: fmtAge(l.age) },
                  { label: 'Weight',   value: l.weight ? `${l.weight} kg` : '—' },
                  { label: 'Location', value: l.location || '—' },
                  { label: 'Submitted', value: fmtDate(l.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: C.card, borderRadius: '9px', padding: '10px 12px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '10px', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata (gender, color, health, traits) */}
            {(meta.gender || meta.color || meta.health || meta.traits.length > 0) && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Attributes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {meta.gender && <Tag label="Gender" value={meta.gender} />}
                  {meta.color  && <Tag label="Color"  value={meta.color} />}
                  {meta.health && <Tag label="Health" value={meta.health} />}
                  {meta.traits.map(t => <Tag key={t} value={t} />)}
                  {meta.delivery && <Tag label="Delivery" value={meta.deliveryCost ? `${meta.deliveryCost} ج.م` : 'Available'} color={C.green} />}
                </div>
              </div>
            )}

            {/* Description */}
            {meta.cleanDesc && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Description</div>
                <p style={{ margin: 0, fontSize: '13px', color: C.dim, lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{meta.cleanDesc}</p>
              </div>
            )}

            {/* Seller */}
            <div style={{ background: C.card, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Seller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SellerAvatar name={l.seller?.name} size={36} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: C.text }}>{l.seller?.name ?? '—'}</div>
                  {l.seller?.phone && <div style={{ fontSize: '12px', color: C.dim }}>📞 {l.seller.phone}</div>}
                </div>
              </div>
            </div>

            {/* Admin notes */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Admin Notes</div>
              <textarea
                value={adminNote}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="Internal notes (not visible to seller)…"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${C.border}`, background: '#F9FAFB', color: C.text, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
              />
            </div>

            {/* Action buttons */}
            {!isSold && (
              <div style={{ display: 'flex', gap: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                {!isApproved && (
                  <button type="button" onClick={onApprove} disabled={acting}
                    style={{ flex: 1, padding: '11px', borderRadius: '9px', border: 'none', background: acting ? 'rgba(34,197,94,0.3)' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {acting ? '…' : '✓  Approve'}
                  </button>
                )}
                {!isRejected && (
                  <button type="button" onClick={onReject} disabled={acting}
                    style={{ flex: 1, padding: '11px', borderRadius: '9px', border: `1px solid rgba(239,68,68,0.3)`, background: acting ? 'rgba(239,68,68,0.04)' : C.redBg, color: C.red, fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {acting ? '…' : '✕  Reject'}
                  </button>
                )}
                {isApproved && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: C.green, fontWeight: '600' }}>✓ This listing is live</div>}
                {isRejected && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: C.red, fontWeight: '600' }}>✕ This listing is rejected</div>}
              </div>
            )}
            {isSold && <div style={{ fontSize: '13px', color: C.slate, fontWeight: '500', paddingTop: '8px' }}>This listing has been sold — no actions available.</div>}
          </div>
        </div>
      </div>
    </>
  );
};

const Tag = ({ label, value, color }) => (
  <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', background: '#F3F4F6', color: color ?? C.dim, border: `1px solid ${C.border}` }}>
    {label ? <><span style={{ color: C.dimMid }}>{label}: </span>{value}</> : value}
  </span>
);

// ── Reject reason modal ───────────────────────────────────────────────────────
const RejectModal = ({ count, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;
  return (
    <>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
      <div role="dialog" aria-modal="true" aria-label={`Reject ${count > 1 ? count + ' listings' : 'listing'}`} className="al-reject-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: C.header, border: '1px solid rgba(239,68,68,0.22)', borderRadius: '16px', padding: '28px', width: 'min(420px, calc(100vw - 32px))', zIndex: 201 }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>
          Reject {count > 1 ? `${count} listings` : 'listing'}
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: C.dim, lineHeight: '1.5' }}>
          Provide a reason for rejection. This helps maintain content quality standards.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Incomplete information, blurry photos, price too high…"
          rows={4}
          autoFocus
          style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${valid ? 'rgba(239,68,68,0.35)' : C.border}`, background: '#F9FAFB', color: C.text, fontSize: '13px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5', marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button type="button" onClick={() => valid && onConfirm(reason.trim())} disabled={!valid}
            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: valid ? C.red : 'rgba(239,68,68,0.3)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: valid ? 1 : 0.6 }}>
            Confirm Reject
          </button>
        </div>
      </div>
    </>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteModal = ({ listing: l, onConfirm, onCancel }) => (
  <>
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
    <div role="dialog" aria-modal="true" aria-label="Delete listing" className="al-delete-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: C.header, border: '1px solid rgba(239,68,68,0.22)', borderRadius: '16px', padding: '28px', width: 'min(380px, calc(100vw - 32px))', zIndex: 201, textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🗑</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Delete listing?</div>
      <div style={{ fontSize: '13px', color: C.dim, lineHeight: '1.55', marginBottom: '22px' }}>
        <strong style={{ color: C.text }}>{l.title}</strong> will be permanently removed.
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        <button type="button" onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: C.red, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
      </div>
    </div>
  </>
);

// ── Skeleton rows / cards ─────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[40, 60, 56, 140, 120, 90, 100, 100].map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <div className="shimmer-bar" style={{ height: '13px', width: `${w}px`, borderRadius: '6px' }} />
      </td>
    ))}
  </tr>
);

const SkeletonCard = () => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
    <div className="shimmer-bar" style={{ height: '180px', borderRadius: 0 }} />
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="shimmer-bar" style={{ height: '13px', width: '70%', borderRadius: '6px' }} />
      <div className="shimmer-bar" style={{ height: '11px', width: '50%', borderRadius: '6px' }} />
      <div className="shimmer-bar" style={{ height: '16px', width: '40%', borderRadius: '6px' }} />
    </div>
  </div>
);

// ── Inline action button ──────────────────────────────────────────────────────
const ActBtn = ({ onClick, color, bg, border: bd, children, disabled, title, size = 'sm' }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    style={{ padding: size === 'sm' ? '4px 9px' : '6px 14px', borderRadius: '6px', border: `1px solid ${bd || color + '33'}`, background: bg || color + '11', color, fontSize: '11px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1, transition: 'all 0.12s' }}>
    {children}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const AdminListings = () => {
  const [listings, setListings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [view, setView]             = useState('table');
  const [statusFilter, setStatus]   = useState('pending');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [breedSearch,  setBreedSearch]  = useState('');
  const [breedOpen,    setBreedOpen]    = useState(false);
  const [genderFilter, setGenderFilter] = useState('');
  const [ageMin,       setAgeMin]       = useState('');
  const [ageMax,       setAgeMax]       = useState('');
  const [ageUnit,      setAgeUnit]      = useState('months');
  const [weightMin,    setWeightMin]    = useState('');
  const [weightMax,    setWeightMax]    = useState('');
  const [colorFilter,  setColorFilter]  = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [traitsFilter, setTraitsFilter] = useState([]);
  const [sort, setSort]             = useState({ col: 'createdAt', dir: 'desc' });
  const [selected, setSelected]     = useState(new Set());
  const [detailId, setDetailId]     = useState(null);
  const [rejectFlow, setRejectFlow] = useState(null); // { ids, fromDetail }
  const [deleteTarget, setDelete]   = useState(null); // { id, title }
  const [acting, setActing]         = useState(new Set());
  const [adminNotes, setNotes]      = useState({});
  const breedRef = useRef(null);

  useEffect(() => {
    getAllListings()
      .then(({ data }) => setListings(data))
      .catch(() => setError('Failed to load listings.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e) => { if (breedRef.current && !breedRef.current.contains(e.target)) setBreedOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addActing   = (ids) => setActing(p => { const n = new Set(p); ids.forEach(id => n.add(id)); return n; });
  const dropActing  = (ids) => setActing(p => { const n = new Set(p); ids.forEach(id => n.delete(id)); return n; });
  const patch       = (ids, status) => setListings(p => p.map(l => ids.includes(l._id) ? { ...l, status } : l));
  const deselect    = (ids) => setSelected(p => { const n = new Set(p); ids.forEach(id => n.delete(id)); return n; });

  const handleApprove = async (ids) => {
    addActing(ids);
    try {
      await Promise.all(ids.map(id => approveListing(id)));
      patch(ids, 'approved');
      deselect(ids);
      if (ids.includes(detailId)) setDetailId(null);
    } catch { /* silent */ }
    finally { dropActing(ids); }
  };

  const openReject = (ids, fromDetail = false) => setRejectFlow({ ids, fromDetail });

  const handleRejectConfirm = async (/* reason captured but not sent to backend yet */) => {
    const { ids, fromDetail } = rejectFlow;
    setRejectFlow(null);
    if (fromDetail) setDetailId(null);
    addActing(ids);
    try {
      await Promise.all(ids.map(id => rejectListing(id)));
      patch(ids, 'rejected');
      deselect(ids);
    } catch { /* silent */ }
    finally { dropActing(ids); }
  };

  const handleDeleteConfirm = async () => {
    const { id } = deleteTarget;
    setDelete(null);
    if (detailId === id) setDetailId(null);
    addActing([id]);
    try {
      await deleteListingApi(id);
      setListings(p => p.filter(l => l._id !== id));
      deselect([id]);
    } catch { /* silent */ }
    finally { dropActing([id]); }
  };

  // ── Filtering / sorting ──────────────────────────────────────────────────
  const counts = { all: listings.length };
  STATUS_TABS.slice(1).forEach(s => { counts[s] = listings.filter(l => l.status === s).length; });

  // breed autocomplete suggestions
  const breedSuggestions = (() => {
    const typeScope = typeFilter ? listings.filter(l => l.type === typeFilter) : listings;
    const seen = new Set();
    for (const l of typeScope) if (l.breed) seen.add(l.breed);
    const q = breedSearch.toLowerCase();
    return [...seen].filter(b => !q || b.toLowerCase().includes(q)).sort().slice(0, 7);
  })();

  const filtered = listings
    .filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter && l.type !== typeFilter) return false;
      if (breedSearch && !(l.breed || '').toLowerCase().includes(breedSearch.toLowerCase())) return false;
      if (genderFilter && extractGender(l.description || '') !== genderFilter) return false;
      if (ageMin || ageMax) {
        const mult = ageUnit === 'years' ? 12 : 1;
        if (ageMin && (l.age ?? 0) < +ageMin * mult) return false;
        if (ageMax && (l.age ?? 0) > +ageMax * mult) return false;
      }
      if (weightMin && (l.weight ?? 0) < +weightMin) return false;
      if (weightMax && (l.weight ?? 0) > +weightMax) return false;
      if (colorFilter  && !extractColor(l.description || '').toLowerCase().includes(colorFilter.toLowerCase())) return false;
      if (healthFilter && extractHealth(l.description || '') !== healthFilter) return false;
      if (traitsFilter.length) {
        const lt = extractTraits(l.description || '');
        if (!traitsFilter.every(t => lt.includes(t))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const { col, dir } = sort;
      if (col === 'price')       { const d = a.price - b.price; return dir === 'asc' ? d : -d; }
      if (col === 'createdAt')   { const d = new Date(a.createdAt) - new Date(b.createdAt); return dir === 'asc' ? d : -d; }
      if (col === 'seller.name') { const d = (a.seller?.name ?? '').localeCompare(b.seller?.name ?? ''); return dir === 'asc' ? d : -d; }
      const d = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
      return dir === 'asc' ? d : -d;
    });

  const toggleSort = (col) => setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));

  // ── Selection ────────────────────────────────────────────────────────────
  const visibleIds   = filtered.map(l => l._id);
  const allChosen    = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someChosen   = selected.size > 0;

  const toggleAll = () => setSelected(s => {
    const n = new Set(s);
    if (allChosen) visibleIds.forEach(id => n.delete(id));
    else           visibleIds.forEach(id => n.add(id));
    return n;
  });
  const toggleOne = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // ── Sort header helper ────────────────────────────────────────────────────
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

  const detailListing = detailId ? listings.find(l => l._id === detailId) ?? null : null;
  const selectedArr   = [...selected];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="adm-page" style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .shimmer-bar { background:linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite; }
        .l-row { transition:background 0.1s;cursor:pointer; }
        .l-row:hover { background:#F9FAFB !important; }
        .l-card { transition:transform 0.15s,box-shadow 0.15s;cursor:pointer; }
        .l-card:hover { transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.10); }
        .l-card:hover .card-actions { opacity:1 !important; }
        .al-table-section { display:block; }
        .al-grid-section { display:block; }
        .al-hidden { display:none !important; }
        @keyframes al-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @media (max-width:640px) {
          .al-hdr { flex-direction:column !important; align-items:flex-start !important; }
          .al-stats { grid-template-columns:repeat(2,1fr) !important; }
          .al-view-toggle { display:none !important; }
          .al-table-section { display:none !important; }
          .al-grid-section.al-hidden { display:block !important; }
          .al-detail-modal {
            position:fixed !important; top:auto !important;
            left:0 !important; right:0 !important; bottom:0 !important;
            transform:none !important; width:100% !important;
            max-height:88vh !important; border-radius:18px 18px 0 0 !important;
            animation:al-sheet-up 0.24s ease;
          }
          .al-detail-body { flex-direction:column !important; overflow-y:auto !important; overflow-x:hidden !important; }
          .al-detail-left { width:100% !important; height:220px !important; border-right:none !important; border-bottom:1px solid #E5E7EB !important; }
          .al-reject-modal, .al-delete-modal {
            position:fixed !important; top:auto !important;
            left:0 !important; right:0 !important; bottom:0 !important;
            transform:none !important; width:100% !important;
            border-radius:18px 18px 0 0 !important;
            animation:al-sheet-up 0.24s ease;
          }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="al-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: C.text }}>Listing Moderation</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.dim }}>
            {listings.length} total &middot; <span style={{ color: C.amber }}>{counts.pending ?? 0} pending review</span>
            {(counts.rejected ?? 0) > 0 && <> &middot; <span style={{ color: C.red }}>{counts.rejected} rejected</span></>}
          </p>
        </div>
        {/* View toggle */}
        <div className="al-view-toggle" style={{ display: 'flex', gap: '3px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '3px' }}>
          {[['table', '≡ Table'], ['grid', '⊞ Grid']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: view === v ? 'rgba(245,158,11,0.12)' : 'transparent', color: view === v ? C.amber : C.dim, fontSize: '12px', fontWeight: view === v ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', outline: view === v ? `1px solid ${C.amber}28` : undefined, transition: 'all 0.12s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="al-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {STATUS_TABS.map(s => {
          const sm = STATUS[s];
          const cnt = counts[s] ?? 0;
          const isActive = statusFilter === s;
          return (
            <button key={s} type="button" onClick={() => setStatus(s)}
              aria-pressed={isActive}
              style={{ background: isActive && s !== 'all' ? sm?.bg : C.card, border: `1px solid ${isActive && s !== 'all' ? sm?.border : C.border}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: s === 'all' ? C.text : (sm?.color ?? C.text), marginBottom: '2px' }}>{cnt}</div>
              <div style={{ fontSize: '11px', color: isActive && s !== 'all' ? sm?.color : C.dim, fontWeight: '600', textTransform: 'capitalize' }}>{s === 'all' ? 'All Listings' : s}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Row 1 — نوع المواشي */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginLeft: '2px', flexShrink: 0 }}>النوع</span>
          {[{ key: '', label: 'الكل', emoji: '🐾' }, ...Object.keys(EMOJI).map(k => ({ key: k, label: TYPE_AR[k] || k, emoji: EMOJI[k] }))].map(t => {
            const active = typeFilter === t.key;
            return (
              <button key={t.key} type="button" onClick={() => { setTypeFilter(t.key); setBreedSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${active ? C.amber + '66' : C.border}`, background: active ? C.amberBg : '#F9FAFB', color: active ? C.amber : C.dim, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>

        {/* Row 2 — السلالة + الجنس */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* السلالة autocomplete */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }} ref={breedRef}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.dim, pointerEvents: 'none' }}>🔍</span>
            <input value={breedSearch}
              onChange={e => { setBreedSearch(e.target.value); setBreedOpen(true); }}
              onFocus={() => setBreedOpen(true)}
              placeholder="السلالة…" dir="rtl"
              aria-label="بحث حسب السلالة"
              style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: '9px', border: `1px solid ${breedSearch ? C.amber + '55' : C.border}`, background: '#FFFFFF', color: C.text, fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            {breedSearch && (
              <button type="button" onClick={() => { setBreedSearch(''); setBreedOpen(false); }}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.dim, fontSize: '15px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
            )}
            {breedOpen && breedSuggestions.length > 0 && (
              <ul style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: C.header, border: `1px solid ${C.border}`, borderRadius: '9px', zIndex: 300, overflow: 'hidden', listStyle: 'none', margin: 0, padding: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
                {breedSuggestions.map(b => (
                  <li key={b} onMouseDown={() => { setBreedSearch(b); setBreedOpen(false); }}
                    style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '13px', color: C.dim, borderBottom: `1px solid ${C.border}`, direction: 'rtl', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* الجنس */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', marginLeft: '4px' }}>الجنس</span>
            {GENDER_OPTS.map(g => {
              const active = genderFilter === g.key;
              return (
                <button key={g.key} type="button" onClick={() => setGenderFilter(g.key)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${active ? C.amber + '55' : C.border}`, background: active ? C.amberBg : '#F9FAFB', color: active ? C.amber : C.dim, fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3 — العمر + Sort */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>العمر</span>
          <input type="number" min="0" value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="من"
            style={{ width: '70px', padding: '6px 9px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
          <span style={{ color: C.dim, fontSize: '12px' }}>—</span>
          <input type="number" min="0" value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="إلى"
            style={{ width: '70px', padding: '6px 9px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: '7px', overflow: 'hidden', flexShrink: 0 }}>
            {[{ v: 'months', l: 'أشهر' }, { v: 'years', l: 'سنوات' }].map(u => (
              <button key={u.v} type="button" onClick={() => setAgeUnit(u.v)}
                style={{ padding: '5px 10px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', background: ageUnit === u.v ? C.amber + '22' : 'transparent', color: ageUnit === u.v ? C.amber : C.dim, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                {u.l}
              </button>
            ))}
          </div>
          {(ageMin || ageMax || typeFilter || breedSearch || genderFilter || weightMin || weightMax || colorFilter || healthFilter || traitsFilter.length > 0) && (
            <button type="button" onClick={() => { setTypeFilter(''); setBreedSearch(''); setGenderFilter(''); setAgeMin(''); setAgeMax(''); setWeightMin(''); setWeightMax(''); setColorFilter(''); setHealthFilter(''); setTraitsFilter([]); }}
              style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid rgba(239,68,68,0.25)`, background: 'rgba(239,68,68,0.07)', color: C.red, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
              ✕ مسح الفلاتر
            </button>
          )}
          <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: C.dimMid, alignSelf: 'center' }}>ترتيب:</span>
            {[['createdAt', 'التاريخ'], ['price', 'السعر'], ['type', 'النوع']].map(([col, label]) => (
              <button key={col} type="button" onClick={() => toggleSort(col)}
                style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${sort.col === col ? C.amber + '44' : C.border}`, background: sort.col === col ? C.amberBg : 'transparent', color: sort.col === col ? C.amber : C.dim, fontSize: '11px', fontWeight: sort.col === col ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}{sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4 — الوزن + اللون + الصحة + الصفات */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>الوزن</span>
          <input type="number" min="0" value={weightMin} onChange={e => setWeightMin(e.target.value)} placeholder="من"
            style={{ width: '65px', padding: '6px 9px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
          <span style={{ color: C.dim, fontSize: '12px' }}>—</span>
          <input type="number" min="0" value={weightMax} onChange={e => setWeightMax(e.target.value)} placeholder="إلى"
            style={{ width: '65px', padding: '6px 9px', borderRadius: '8px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />
          <span style={{ color: C.dim, fontSize: '11px' }}>كجم</span>

          <div style={{ width: '1px', height: '18px', background: C.border, flexShrink: 0 }} />

          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>اللون</span>
          <input value={colorFilter} onChange={e => setColorFilter(e.target.value)} placeholder="ابحث…" dir="rtl"
            style={{ width: '90px', padding: '6px 9px', borderRadius: '8px', border: `1px solid ${colorFilter ? C.amber + '55' : C.border}`, background: '#FFFFFF', color: C.text, fontSize: '12px', fontFamily: 'inherit' }} />

          <div style={{ width: '1px', height: '18px', background: C.border, flexShrink: 0 }} />

          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>الصحة</span>
          {FILTER_HEALTH.map(h => {
            const active = healthFilter === h.key;
            return (
              <button key={h.key} type="button" onClick={() => setHealthFilter(active ? '' : h.key)}
                style={{ padding: '4px 9px', borderRadius: '6px', border: `1px solid ${active ? C.amber + '55' : C.border}`, background: active ? C.amberBg : '#F9FAFB', color: active ? C.amber : C.dim, fontSize: '11px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                {h.label}
              </button>
            );
          })}

          <div style={{ width: '1px', height: '18px', background: C.border, flexShrink: 0 }} />

          <span style={{ fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>الصفات</span>
          {FILTER_TRAITS.map(t => {
            const active = traitsFilter.includes(t.key);
            return (
              <button key={t.key} type="button" onClick={() => setTraitsFilter(prev => active ? prev.filter(k => k !== t.key) : [...prev, t.key])}
                style={{ padding: '4px 9px', borderRadius: '6px', border: `1px solid ${active ? C.amber + '55' : C.border}`, background: active ? C.amberBg : '#F9FAFB', color: active ? C.amber : C.dim, fontSize: '11px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                {active && '✓ '}{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {someChosen && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: C.amber }}>{selected.size} selected</span>
          <div style={{ flex: 1 }} />
          <ActBtn onClick={() => handleApprove(selectedArr.filter(id => { const l = listings.find(l => l._id === id); return l && l.status !== 'approved' && l.status !== 'sold'; }))} color={C.green} size="md">✓ Approve Selected</ActBtn>
          <ActBtn onClick={() => openReject(selectedArr.filter(id => { const l = listings.find(l => l._id === id); return l && l.status !== 'rejected' && l.status !== 'sold'; }))} color={C.red} size="md">✕ Reject Selected</ActBtn>
          <button type="button" onClick={() => setSelected(new Set())} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
        </div>
      )}

      {error && <div style={{ color: C.red, marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {/* ── TABLE VIEW ── */}
      <div className={view !== 'table' ? 'al-table-section al-hidden' : 'al-table-section'}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Listings" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th scope="col" style={{ padding: '12px 16px', width: '40px' }}>
                    <IndeterminateCheckbox checked={allChosen} indeterminate={someChosen && !allChosen} onChange={toggleAll} aria-label="Select all listings" />
                  </th>
                  {renderTh('status', 'Status')}
                  <th scope="col" style={{ padding: '12px 16px', width: '56px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Photo</th>
                  {renderTh('seller.name', 'Seller')}
                  {renderTh('type', 'Type / Breed')}
                  {renderTh('price', 'Price', 'right')}
                  {renderTh('createdAt', 'Submitted')}
                  <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 7 }, (_, i) => <SkeletonRow key={i} />)}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '52px', textAlign: 'center' }}>
                    <EmptyState status={statusFilter} />
                  </td></tr>
                )}
                {!loading && filtered.map(l => {
                  const isActing = acting.has(l._id);
                  const isChosen = selected.has(l._id);
                  return (
                    <tr key={l._id} className="l-row"
                      style={{ borderBottom: `1px solid ${C.border}`, background: isChosen ? 'rgba(245,158,11,0.03)' : 'transparent' }}
                      onClick={() => setDetailId(l._id)}>
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isChosen} onChange={() => toggleOne(l._id)}
                          aria-label={`Select ${l.type || 'listing'}${l.breed ? ' · ' + l.breed : ''}`}
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: C.amber }} />
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={l.status} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <Thumb path={l.images?.[0]} size={48} type={l.type} radius={7} />
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <SellerAvatar name={l.seller?.name} size={26} />
                          <span style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{l.seller?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, textTransform: 'capitalize' }}>{l.type}</div>
                        {l.breed && <div style={{ fontSize: '11px', color: C.dim }}>{l.breed}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: C.green, whiteSpace: 'nowrap' }}>{fmt(l.price)} ج.م</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          {l.status !== 'approved' && l.status !== 'sold' && (
                            <ActBtn onClick={() => handleApprove([l._id])} color={C.green} disabled={isActing} title="Approve listing" aria-label="Approve listing">✓</ActBtn>
                          )}
                          {l.status !== 'rejected' && l.status !== 'sold' && (
                            <ActBtn onClick={() => openReject([l._id])} color={C.red} disabled={isActing} title="Reject listing" aria-label="Reject listing">✕</ActBtn>
                          )}
                          <ActBtn onClick={() => setDetailId(l._id)} color={C.slate} disabled={isActing} title="View details" aria-label="View listing details">
                            <span aria-hidden="true">👁</span>
                          </ActBtn>
                          <ActBtn onClick={() => setDelete({ id: l._id, title: [l.type, l.breed].filter(Boolean).join(' · ') })} color={C.red} disabled={isActing} title="Delete listing" aria-label="Delete listing">
                            <span aria-hidden="true">🗑</span>
                          </ActBtn>
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
              <span style={{ fontSize: '12px', color: C.dim }}>Showing {filtered.length} of {listings.length} listings</span>
              {someChosen && <span style={{ fontSize: '12px', color: C.amber, fontWeight: '600' }}>{selected.size} selected</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── CARD GRID VIEW ── */}
      <div className={view !== 'grid' ? 'al-grid-section al-hidden' : 'al-grid-section'}>
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
              {Array.from({ length: 9 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px' }}><EmptyState status={statusFilter} /></div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
              {filtered.map(l => {
                const isActing = acting.has(l._id);
                const isChosen = selected.has(l._id);
                const sm = STATUS[l.status];
                return (
                  <div key={l._id} className="l-card" onClick={() => setDetailId(l._id)}
                    style={{ background: C.card, border: `1px solid ${isChosen ? C.amber + '55' : C.border}`, borderRadius: '14px', overflow: 'hidden', position: 'relative', boxShadow: isChosen ? `0 0 0 2px ${C.amber}33` : 'none' }}>
                    {/* Photo */}
                    <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#F9FAFB' }}>
                      {l.images?.[0]
                        ? <img src={getImageUrl(l.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', opacity: 0.2 }}>{EMOJI[l.type] ?? '🐾'}</div>
                      }
                      {/* Overlays */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        <StatusBadge status={l.status} overlay />
                      </div>
                      {l.images?.length > 1 && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                          +{l.images.length - 1}
                        </div>
                      )}
                      {/* Select checkbox */}
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px' }} onClick={e => { e.stopPropagation(); toggleOne(l._id); }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: isChosen ? C.amber : 'rgba(0,0,0,0.5)', border: `1.5px solid ${isChosen ? C.amber : 'rgba(255,255,255,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'all 0.1s', cursor: 'pointer' }}>
                          {isChosen && <span style={{ color: '#000', fontSize: '11px', fontWeight: '900', lineHeight: 1 }}>✓</span>}
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                        <SellerAvatar name={l.seller?.name} size={24} />
                        <span style={{ fontSize: '12px', color: C.dim, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.seller?.name ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '2px', textTransform: 'capitalize' }}>{l.type}{l.breed ? ` · ${l.breed}` : ''}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: C.green, marginBottom: '6px' }}>{fmt(l.price)} ج.م</div>
                      <div style={{ fontSize: '11px', color: C.dimMid }}>📅 {fmtDate(l.createdAt)}</div>
                    </div>

                    {/* Quick actions (hover) */}
                    <div className="card-actions" onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px', background: 'linear-gradient(0deg,rgba(13,26,20,0.97) 0%,transparent 100%)', display: 'flex', gap: '6px', opacity: 0, transition: 'opacity 0.15s' }}>
                      {l.status !== 'approved' && l.status !== 'sold' && (
                        <ActBtn onClick={() => handleApprove([l._id])} color={C.green} disabled={isActing} size="sm">✓ Approve</ActBtn>
                      )}
                      {l.status !== 'rejected' && l.status !== 'sold' && (
                        <ActBtn onClick={() => openReject([l._id])} color={C.red} disabled={isActing} size="sm">✕ Reject</ActBtn>
                      )}
                      <div style={{ flex: 1 }} />
                      <ActBtn onClick={() => setDelete({ id: l._id, title: [l.type, l.breed].filter(Boolean).join(' · ') })} color={C.red} disabled={isActing} size="sm">🗑</ActBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: C.dim, textAlign: 'center' }}>
              Showing {filtered.length} of {listings.length} listings
              {someChosen && <> &middot; <span style={{ color: C.amber, fontWeight: '600' }}>{selected.size} selected</span></>}
            </div>
          )}
      </div>

      {/* ── Detail modal ── */}
      {detailListing && (
        <DetailModal
          listing={detailListing}
          onClose={() => setDetailId(null)}
          onApprove={() => handleApprove([detailListing._id])}
          onReject={() => openReject([detailListing._id], true)}
          acting={acting.has(detailListing._id)}
          adminNote={adminNotes[detailListing._id] ?? ''}
          onNoteChange={v => setNotes(p => ({ ...p, [detailListing._id]: v }))}
        />
      )}

      {/* ── Reject modal ── */}
      {rejectFlow && (
        <RejectModal
          count={rejectFlow.ids.length}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectFlow(null)}
        />
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          listing={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDelete(null)}
        />
      )}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EMPTY_MSG = {
  all:      { icon: '📋', msg: 'No listings in the system yet.' },
  pending:  { icon: '✅', msg: 'All caught up — no pending listings.' },
  approved: { icon: '📬', msg: 'No approved listings.' },
  rejected: { icon: '🗂',  msg: 'No rejected listings.' },
  sold:     { icon: '🎉', msg: 'No sold listings.' },
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

// ── Indeterminate checkbox ────────────────────────────────────────────────────
const IndeterminateCheckbox = ({ checked, indeterminate, onChange, 'aria-label': ariaLabel }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#F59E0B' }} />;
};

export default AdminListings;
