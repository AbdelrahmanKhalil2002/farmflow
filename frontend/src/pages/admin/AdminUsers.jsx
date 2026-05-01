import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers, toggleUserStatus, deleteUser as deleteUserApi } from '../../services/adminService';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#F8FAFC',
  card:      '#FFFFFF',
  header:    '#F9FAFB',
  border:    '#E5E7EB',
  text:      '#111827',
  dim:       '#6B7280',
  dimMid:    '#9CA3AF',
  green:     '#16A34A',
  greenBg:   '#F0FDF4',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  blue:      '#2563EB',
  blueBg:    '#EFF6FF',
  purple:    '#7C3AED',
  purpleBg:  '#F5F3FF',
};

const ROLE_META = {
  seller: { label: 'Seller', color: '#D97706', bg: '#FFFBEB' },
  buyer:  { label: 'Buyer',  color: '#2563EB', bg: '#EFF6FF' },
  admin:  { label: 'Admin',  color: '#7C3AED', bg: '#F5F3FF' },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
const fmtN = (n) => Number(n || 0).toLocaleString();

// ── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsla(${hue},38%,22%,0.9)`,
      border: `1px solid hsla(${hue},42%,42%,0.3)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: '700',
      color: `hsla(${hue},65%,72%,1)`, letterSpacing: '-0.3px',
    }}>
      {initials}
    </div>
  );
};

// ── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const m = ROLE_META[role] ?? { label: role, color: '#64748B', bg: 'transparent' };
  return (
    <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px', background: m.bg, color: m.color, border: `1px solid ${m.color}22`, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: active ? '#F0FDF4' : '#FEF2F2', color: active ? '#16A34A' : '#DC2626', border: `1px solid ${active ? '#BBF7D0' : '#FECACA'}` }}>
    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: active ? '#16A34A' : '#DC2626' }} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[40, 160, 140, 68, 76, 48, 48, 96, 108, 72].map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <div className="shimmer-bar" style={{ height: '13px', width: `${w}px`, borderRadius: '6px' }} />
      </td>
    ))}
  </tr>
);

// ── InfoRow (used inside drawer) ─────────────────────────────────────────────
const InfoRow = ({ label, value, valueColor }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
    <span style={{ fontSize: '12px', color: '#64748B', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: '13px', color: valueColor ?? '#111827', fontWeight: '500', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

// ── StatBox (used inside drawer) ─────────────────────────────────────────────
const StatBox = ({ label, value, color }) => (
  <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '14px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
    <div style={{ fontSize: '18px', fontWeight: '800', color, marginBottom: '3px' }}>{value}</div>
    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>{label}</div>
  </div>
);

// ── Profile Drawer ───────────────────────────────────────────────────────────
const ProfileDrawer = ({ user: u, isSelf, onClose, onToggle, onDelete }) => (
  <>
    <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
    <div role="dialog" aria-modal="true" aria-label="User Profile" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: '#FFFFFF', borderLeft: '1px solid #E5E7EB', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 16px rgba(0,0,0,0.08)' }}>
      {/* Drawer header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>User Profile</span>
        <button type="button" aria-label="Close profile" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '20px', lineHeight: 1, padding: '2px 6px', borderRadius: '6px' }}>
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Avatar name={u.name} size={52} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>{u.name}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <RoleBadge role={u.role} />
              <StatusBadge active={u.isActive} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <InfoRow label="Email" value={u.email} />
            <InfoRow label="Phone" value={u.phone || '—'} />
          </div>
        </div>

        {/* Stats */}
        {(u.role === 'seller' || u.role === 'buyer') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {u.role === 'seller' && <>
              <StatBox label="Listings"      value={fmtN(u.listingCount)}  color="#D97706" />
              <StatBox label="Revenue (EGP)" value={fmtN(u.sellerRevenue)} color="#16A34A" />
            </>}
            {u.role === 'buyer' && (
              <StatBox label="Orders" value={fmtN(u.orderCount)} color="#2563EB" />
            )}
          </div>
        )}

        {/* Account */}
        <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <InfoRow label="Registered" value={fmtDate(u.createdAt)} />
            <InfoRow label="Last Login"  value={fmtDT(u.lastLogin)} />
            <InfoRow label="User ID"     value={u._id} valueColor="#9CA3AF" />
          </div>
        </div>

        {/* Actions */}
        {!isSelf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            <button type="button"
              onClick={() => onToggle(u._id, u.isActive, u.name)}
              style={{ padding: '10px 16px', borderRadius: '9px', border: `1px solid ${u.isActive ? '#FECACA' : '#BBF7D0'}`, background: u.isActive ? '#FEF2F2' : '#F0FDF4', color: u.isActive ? '#DC2626' : '#16A34A', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              {u.isActive ? '🔒  Deactivate Account' : '🔓  Activate Account'}
            </button>
            <button type="button"
              onClick={() => onDelete(u._id, u.name)}
              style={{ padding: '10px 16px', borderRadius: '9px', border: '1px solid #FECACA', background: 'transparent', color: '#DC2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑  Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  </>
);

// ── Toggle Confirmation Modal ────────────────────────────────────────────────
const ToggleModal = ({ name, isActive, onConfirm, onCancel, busy }) => (
  <>
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200 }} />
    <div role="dialog" aria-modal="true" aria-label={isActive ? 'Deactivate account' : 'Activate account'} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '32px 28px', width: 'min(380px, calc(100vw - 32px))', zIndex: 201, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div aria-hidden="true" style={{ fontSize: '32px', marginBottom: '12px' }}>{isActive ? '🔒' : '🔓'}</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
        {isActive ? 'Deactivate account?' : 'Activate account?'}
      </div>
      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.55', marginBottom: '24px' }}>
        {isActive
          ? <><strong style={{ color: '#111827' }}>{name}</strong> will lose all access to the platform.</>
          : <><strong style={{ color: '#111827' }}>{name}</strong> will regain full platform access.</>
        }
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} disabled={busy}
          style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '1px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy}
          style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: isActive ? '#DC2626' : '#16A34A', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>
          {busy ? '…' : isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  </>
);

// ── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteModal = ({ name, onConfirm, onCancel, busy }) => (
  <>
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
    <div role="dialog" aria-modal="true" aria-label="Delete account" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#FFFFFF', border: '1px solid #FECACA', borderRadius: '16px', padding: '32px 28px', width: 'min(380px, calc(100vw - 32px))', zIndex: 201, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div aria-hidden="true" style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Delete account?</div>
      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.55', marginBottom: '24px' }}>
        You are about to permanently delete <strong style={{ color: '#111827' }}>{name}</strong>. This cannot be undone.
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} disabled={busy}
          style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '1px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy}
          style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: '#DC2626', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </>
);

// ── Main component ───────────────────────────────────────────────────────────
const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Filters
  const [search,    setSearch]    = useState('');
  const [roleTab,   setRoleTab]   = useState('all');
  const [statusTab, setStatusTab] = useState('all');

  // Sort
  const [sort, setSort] = useState({ col: 'createdAt', dir: 'desc' });

  // Bulk selection
  const [selected, setSelected] = useState(new Set());

  // Drawer
  const [drawerUserId, setDrawerUserId] = useState(null);

  // Modals
  const [toggleModal, setToggleModal] = useState(null); // { id, name, isActive }
  const [deleteModal, setDeleteModal] = useState(null); // { id, name }
  const [toggling,    setToggling]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getAllUsers()
      .then(({ data }) => setUsers(data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  // Drawer user is derived from the users array so it auto-updates after toggle
  const drawerUser = drawerUserId ? (users.find(u => u._id === drawerUserId) ?? null) : null;

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = users
    .filter(u => {
      const q = search.trim().toLowerCase();
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleTab !== 'all' && u.role !== roleTab) return false;
      if (statusTab === 'active'   && !u.isActive) return false;
      if (statusTab === 'inactive' &&  u.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      const { col, dir } = sort;
      if (['listingCount', 'orderCount', 'sellerRevenue'].includes(col)) {
        const d = (Number(a[col]) || 0) - (Number(b[col]) || 0);
        return dir === 'asc' ? d : -d;
      }
      if (['createdAt', 'lastLogin'].includes(col)) {
        const d = new Date(a[col] || 0) - new Date(b[col] || 0);
        return dir === 'asc' ? d : -d;
      }
      const d = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
      return dir === 'asc' ? d : -d;
    });

  const toggleSort = (col) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));

  // ── Selection ────────────────────────────────────────────────────────────
  const visibleIds  = filtered.map(u => u._id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => setSelected(s => {
    const n = new Set(s);
    if (allSelected) visibleIds.forEach(id => n.delete(id));
    else             visibleIds.forEach(id => n.add(id));
    return n;
  });

  const toggleOne = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // ── Bulk toggle ──────────────────────────────────────────────────────────
  const bulkToggle = async (activate) => {
    const ids = [...selected].filter(id => {
      if (id === currentUser?._id) return false;
      const u = users.find(u => u._id === id);
      return u && (activate ? !u.isActive : u.isActive);
    });
    setSelected(new Set());
    if (!ids.length) return;
    try {
      await Promise.all(ids.map(id => toggleUserStatus(id)));
      setUsers(prev => prev.map(u => ids.includes(u._id) ? { ...u, isActive: activate } : u));
    } catch { /* silent */ }
  };

  // ── CSV export ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Name', 'Email', 'Role', 'Status', 'Listings', 'Orders', 'Registered', 'Last Login'];
    const rows = filtered.map(u => [
      u.name, u.email, u.role, u.isActive ? 'Active' : 'Inactive',
      u.listingCount ?? 0, u.orderCount ?? 0,
      fmtDate(u.createdAt), fmtDT(u.lastLogin),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'farmflow_users.csv',
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Toggle confirm ───────────────────────────────────────────────────────
  const handleToggleConfirm = async () => {
    if (!toggleModal) return;
    setToggling(true);
    try {
      await toggleUserStatus(toggleModal.id);
      setUsers(prev => prev.map(u => u._id === toggleModal.id ? { ...u, isActive: !toggleModal.isActive } : u));
    } catch { /* silent */ }
    finally { setToggling(false); setToggleModal(null); }
  };

  // ── Delete confirm ───────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteUserApi(deleteModal.id);
      setUsers(prev => prev.filter(u => u._id !== deleteModal.id));
      setDrawerUserId(null);
    } catch { /* silent */ }
    finally { setDeleting(false); setDeleteModal(null); }
  };

  // ── Counts ───────────────────────────────────────────────────────────────
  const totalSellers  = users.filter(u => u.role === 'seller').length;
  const totalBuyers   = users.filter(u => u.role === 'buyer').length;
  const totalInactive = users.filter(u => !u.isActive).length;

  // ── Sort-header helper ───────────────────────────────────────────────────
  const Th = ({ col, children, align = 'left' }) => (
    <th scope="col" onClick={() => toggleSort(col)}
      aria-sort={sort.col === col ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{ padding: '12px 16px', textAlign: align, fontSize: '11px', fontWeight: '700', color: sort.col === col ? C.green : C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {children}
      {sort.col !== col
        ? <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: '#D1D5DB' }}>⇅</span>
        : <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: '10px', color: C.green }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
      }
    </th>
  );

  // ── Tab button style ─────────────────────────────────────────────────────
  const tabBtn = (active, color) => ({
    padding: '5px 12px', borderRadius: '7px', border: 'none',
    background: active ? `${color}18` : 'transparent',
    color:      active ? color : C.dim,
    fontSize: '12px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
    outline: active ? `1px solid ${color}28` : undefined,
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="adm-page" style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .shimmer-bar { background: linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
        .u-row { transition:background 0.1s; cursor:pointer; }
        .u-row:hover { background:#F9FAFB !important; }
        .au-m-cards { display:none; flex-direction:column; gap:8px; }
        @media (max-width:640px) {
          .adm-page  { padding:16px !important; padding-top:72px !important; }
          .au-stats  { grid-template-columns:repeat(2,1fr) !important; }
          .au-table  { display:none !important; }
          .au-m-cards{ display:flex !important; }
          .au-hdr    { flex-direction:column !important; align-items:flex-start !important; }
          .au-filters{ flex-direction:column !important; }
          .au-tabs   { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="au-hdr" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '22px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: C.text }}>User Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.dim }}>
            {users.length} total &middot; {totalSellers} sellers &middot; {totalBuyers} buyers
            {totalInactive > 0 && <> &middot; <span style={{ color: C.red }}>{totalInactive} inactive</span></>}
          </p>
        </div>
        <button type="button" onClick={exportCSV}
          style={{ padding: '9px 16px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.card, color: C.dim, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="au-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Users', value: users.length, color: C.text },
          { label: 'Sellers',     value: totalSellers,  color: C.amber },
          { label: 'Buyers',      value: totalBuyers,   color: C.blue  },
          { label: 'Inactive',    value: totalInactive, color: totalInactive > 0 ? C.red : C.dim },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color, marginBottom: '3px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: C.dim, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="au-filters" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 14px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.dim, pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users by name or email"
            style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: '9px', border: `1px solid ${C.border}`, background: '#FFFFFF', color: C.text, fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        {/* Role tabs */}
        <div style={{ display: 'flex', gap: '3px', background: '#F3F4F6', borderRadius: '9px', padding: '3px' }}>
          {['all', 'seller', 'buyer', 'admin'].map(r => {
            const color = r === 'seller' ? C.amber : r === 'admin' ? C.purple : r === 'buyer' ? C.blue : C.text;
            return (
              <button key={r} type="button" onClick={() => setRoleTab(r)} aria-pressed={roleTab === r} style={tabBtn(roleTab === r, color)}>
                {r === 'all' ? 'All Roles' : r[0].toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '3px', background: '#F3F4F6', borderRadius: '9px', padding: '3px' }}>
          {['all', 'active', 'inactive'].map(s => {
            const color = s === 'inactive' ? C.red : s === 'active' ? C.green : C.text;
            return (
              <button key={s} type="button" onClick={() => setStatusTab(s)} aria-pressed={statusTab === s} style={tabBtn(statusTab === s, color)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.16)', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: C.green }}>{selected.size} selected</span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={() => bulkToggle(true)}  style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${C.green}30`, background: C.greenBg, color: C.green, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Activate</button>
          <button type="button" onClick={() => bulkToggle(false)} style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${C.red}30`, background: C.redBg, color: C.red, fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Deactivate</button>
          <button type="button" onClick={() => setSelected(new Set())} style={{ padding: '6px 12px', borderRadius: '7px', border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ color: C.red, marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {/* ── Table (desktop) ── */}
      <div className="au-table" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table aria-label="Users" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {/* Select-all checkbox */}
                <th scope="col" style={{ padding: '12px 16px', width: '40px' }}>
                  <IndeterminateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    aria-label="Select all users"
                  />
                </th>
                <Th col="name">User</Th>
                <Th col="email">Email</Th>
                <Th col="role">Role</Th>
                <Th col="isActive">Status</Th>
                <Th col="listingCount" align="center">Listings</Th>
                <Th col="orderCount"   align="center">Orders</Th>
                <Th col="createdAt">Registered</Th>
                <Th col="lastLogin">Last Login</Th>
                <th scope="col" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: C.dimMid, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 7 }, (_, i) => <SkeletonRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '52px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
                    <div style={{ fontSize: '14px', color: C.dim }}>No users match your filters</div>
                  </td>
                </tr>
              )}

              {!loading && filtered.map(u => {
                const isSelf   = u._id === currentUser?._id;
                const isChosen = selected.has(u._id);
                return (
                  <tr key={u._id} className="u-row"
                    style={{ borderBottom: `1px solid ${C.border}`, background: isChosen ? 'rgba(34,197,94,0.03)' : !u.isActive ? 'rgba(239,68,68,0.02)' : 'transparent' }}
                    onClick={() => setDrawerUserId(u._id)}>
                    {/* Checkbox */}
                    <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChosen} onChange={() => toggleOne(u._id)}
                        aria-label={`Select ${u.name}`}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: C.green }} />
                    </td>
                    {/* Name */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={u.name} size={32} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, lineHeight: 1.3 }}>{u.name}</div>
                          {isSelf && <div style={{ fontSize: '10px', color: C.green, fontWeight: '800', letterSpacing: '0.4px' }}>YOU</div>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', color: C.dim }}>{u.email}</span>
                    </td>
                    {/* Role */}
                    <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}><StatusBadge active={u.isActive} /></td>
                    {/* Listings */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: u.role === 'seller' ? C.amber : C.dimMid }}>
                      {u.role === 'seller' ? fmtN(u.listingCount) : '—'}
                    </td>
                    {/* Orders */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: u.role === 'buyer' ? C.blue : C.dimMid }}>
                      {u.role === 'buyer' ? fmtN(u.orderCount) : '—'}
                    </td>
                    {/* Registered */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>
                      {fmtDate(u.createdAt)}
                    </td>
                    {/* Last Login */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: C.dim, whiteSpace: 'nowrap' }}>
                      {fmtDT(u.lastLogin)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      {isSelf ? (
                        <span style={{ fontSize: '12px', color: C.dimMid }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <button type="button"
                            onClick={() => setToggleModal({ id: u._id, name: u.name, isActive: u.isActive })}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${u.isActive ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, background: u.isActive ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)', color: u.isActive ? C.red : C.green, fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button"
                            onClick={() => setDeleteModal({ id: u._id, name: u.name })}
                            title="Delete"
                            style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.18)', background: 'transparent', color: C.red, fontSize: '13px', cursor: 'pointer', lineHeight: 1 }}>
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: C.dim }}>Showing {filtered.length} of {users.length} users</span>
            {someSelected && <span style={{ fontSize: '12px', color: C.green, fontWeight: '600' }}>{selected.size} selected</span>}
          </div>
        )}
      </div>

      {/* ── Mobile card list ── */}
      <div className="au-m-cards">
        {loading && [1,2,3,4,5].map(i => (
          <div key={i} className="shimmer-bar" style={{ height: '72px', borderRadius: '12px' }} />
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dim }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '14px' }}>No users match your filters</div>
          </div>
        )}
        {!loading && filtered.map(u => {
          const isSelf = u._id === currentUser?._id;
          return (
            <div key={u._id}
              onClick={() => setDrawerUserId(u._id)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minHeight: '72px' }}>
              <Avatar name={u.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}
                    {isSelf && <span style={{ fontSize: '10px', color: C.green, fontWeight: '800', marginLeft: '6px' }}>YOU</span>}
                  </span>
                  <StatusBadge active={u.isActive} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <RoleBadge role={u.role} />
                  <span style={{ fontSize: '11px', color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{u.email}</span>
                </div>
              </div>
              <span style={{ color: C.dimMid, fontSize: '16px', flexShrink: 0 }}>›</span>
            </div>
          );
        })}
      </div>

      {/* ── Profile drawer ── */}
      {drawerUser && (
        <ProfileDrawer
          user={drawerUser}
          isSelf={drawerUser._id === currentUser?._id}
          onClose={() => setDrawerUserId(null)}
          onToggle={(id, isActive, name) => { setDrawerUserId(null); setToggleModal({ id, name, isActive }); }}
          onDelete={(id, name) => { setDrawerUserId(null); setDeleteModal({ id, name }); }}
        />
      )}

      {/* ── Toggle modal ── */}
      {toggleModal && (
        <ToggleModal
          name={toggleModal.name}
          isActive={toggleModal.isActive}
          busy={toggling}
          onConfirm={handleToggleConfirm}
          onCancel={() => setToggleModal(null)}
        />
      )}

      {/* ── Delete modal ── */}
      {deleteModal && (
        <DeleteModal
          name={deleteModal.name}
          busy={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
};

// ── Indeterminate checkbox helper ────────────────────────────────────────────
// useRef must be called at component level (not inside render helpers)
const IndeterminateCheckbox = ({ checked, indeterminate, onChange, 'aria-label': ariaLabel }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      aria-label={ariaLabel}
      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#16A34A' }} />
  );
};

export default AdminUsers;
