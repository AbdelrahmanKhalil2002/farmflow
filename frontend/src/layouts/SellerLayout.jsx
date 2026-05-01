import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const S = {
  sidebarBg:   '#F0F7F1',
  activeBg:    'rgba(58,125,68,0.09)',
  activeColor: '#3A7D44',
  dimColor:    '#4B6B4E',
  border:      '#D4E8D6',
  mainBg:      '#F7FBF7',
  text:        '#1A2E1C',
};

const LINKS = [
  { to: '/seller',             label: 'الرئيسية',      icon: '▦', end: true },
  { to: '/seller/listings',    label: 'مواشيّ',        icon: '🐄'           },
  { to: '/seller/add-listing', label: 'إضافة إعلان',  icon: '＋'           },
  { to: '/seller/dairy',       label: 'الألبان',       icon: '🥛'           },
  { to: '/seller/expenses',    label: 'المصروفات',     icon: '📉'           },
  { to: '/seller/income',      label: 'الدخل',         icon: '💰'           },
  { to: '/seller/statements',  label: 'كشف الحسابات', icon: '📊'           },
  { to: '/seller/budget',      label: 'الميزانية',     icon: '🎯'           },
  { to: '/seller/herd',        label: 'إدارة القطيع', icon: '🐾'           },
  { to: '/seller/supplies',    label: 'مستلزماتي',    icon: '🛒'           },
  { to: '/seller/settings',    label: 'الإعدادات',     icon: '⚙️'           },
];

const SellerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const W = collapsed ? '64px' : '220px';

  const renderLinks = (mobile = false) =>
    LINKS.map(({ to, label, icon, end }) => (
      <NavLink key={to} to={to} end={end}
        onClick={mobile ? () => setMobileOpen(false) : undefined}
        title={!mobile && collapsed ? label : undefined}
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center',
          gap: !mobile && collapsed ? 0 : '10px',
          justifyContent: !mobile && collapsed ? 'center' : 'flex-start',
          padding: !mobile && collapsed ? '10px 0' : '10px 12px',
          borderRadius: '9px', textDecoration: 'none',
          fontSize: '14px', fontWeight: isActive ? '700' : '500',
          background: isActive ? S.activeBg : 'transparent',
          color: isActive ? S.activeColor : S.dimColor,
          borderLeft: (!mobile && collapsed) ? 'none' : `2px solid ${isActive ? S.activeColor : 'transparent'}`,
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        })}>
        <span style={{ fontSize: (!mobile && collapsed) ? '18px' : '15px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        {(mobile || !collapsed) && label}
      </NavLink>
    ));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      <style>{`
        .sl-sidebar { display: flex; }
        .sl-topbar  { display: none; }
        .sl-spacer  { display: none; }
        *:focus-visible { outline: 2px solid #3A7D44; outline-offset: 2px; border-radius: 4px; }
        @media (max-width: 640px) {
          .sl-sidebar { display: none !important; }
          .sl-topbar  { display: flex !important; }
          .sl-spacer  { display: block !important; height: 56px; }
          .sl-page    { padding: 16px !important; padding-top: 72px !important; }
        }
      `}</style>

      {/* ── Desktop Sidebar ── */}
      <aside className="sl-sidebar" style={{
        width: W, flexShrink: 0, background: S.sidebarBg,
        borderRight: `1px solid ${S.border}`,
        flexDirection: 'column',
        transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: collapsed ? '18px 0' : '20px 18px 14px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🌾</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: S.text, letterSpacing: '-0.3px' }}>FarmFlow</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.activeColor, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Seller Portal</span>
              </div>
            </div>
          )}
          {collapsed && <span style={{ fontSize: '20px', lineHeight: 1 }}>🌾</span>}
          <button type="button" onClick={() => setCollapsed(p => !p)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.dimColor, fontSize: '14px', padding: '4px', borderRadius: '6px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <span aria-hidden="true">{collapsed ? '▶' : '◀'}</span>
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" style={{ flex: 1, padding: collapsed ? '10px 8px' : '10px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>
          {renderLinks(false)}
        </nav>

        {/* User footer */}
        <div style={{ padding: collapsed ? '12px 8px' : '14px 14px', borderTop: `1px solid ${S.border}` }}>
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(58,125,68,0.12)', border: '1px solid rgba(58,125,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: S.activeColor, flexShrink: 0 }}>
                  {(user?.name?.[0] || 'S').toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Seller'}</div>
                  <div style={{ fontSize: '11px', color: S.dimColor }}>Seller Account</div>
                </div>
              </div>
              <button type="button" onClick={handleLogout}
                style={{ width: '100%', padding: '7px', borderRadius: '8px', border: `1px solid ${S.border}`, background: 'transparent', color: S.dimColor, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.dimColor; e.currentTarget.style.borderColor = S.border; }}>
                Sign Out
              </button>
            </>
          ) : (
            <button type="button" onClick={handleLogout} aria-label="Sign out"
              style={{ width: '100%', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: S.dimColor, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
              onMouseLeave={e => e.currentTarget.style.color = S.dimColor}>
              <span aria-hidden="true">⏏</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sl-topbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
        background: S.sidebarBg, borderBottom: `1px solid ${S.border}`,
        zIndex: 90, alignItems: 'center', padding: '0 16px', gap: '12px',
        boxShadow: '0 1px 6px rgba(26,46,28,0.1)',
      }}>
        <button type="button" onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="sl-mobile-drawer"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.text, fontSize: '20px', padding: '8px', lineHeight: 1, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
          <span aria-hidden="true">☰</span>
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🌾</span>
          <span style={{ fontSize: '15px', fontWeight: '800', color: S.text, letterSpacing: '-0.3px' }}>FarmFlow</span>
          <span style={{ fontSize: '9px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px', background: S.activeBg, padding: '2px 7px', borderRadius: '4px', border: `1px solid ${S.border}` }}>Seller</span>
        </div>
        <NotificationBell />
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(58,125,68,0.12)', border: '1px solid rgba(58,125,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: S.activeColor, flexShrink: 0 }}>
          {(user?.name?.[0] || 'S').toUpperCase()}
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 95 }} />
      )}

      {/* ── Mobile drawer ── */}
      <aside id="sl-mobile-drawer" aria-label="Navigation menu" aria-hidden={!mobileOpen}
        style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '264px',
        background: S.sidebarBg, borderRight: `1px solid ${S.border}`,
        display: 'flex', flexDirection: 'column',
        zIndex: 96,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.24s ease',
        boxShadow: mobileOpen ? '4px 0 20px rgba(26,46,28,0.18)' : 'none',
      }}>
        {/* Drawer brand */}
        <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>🌾</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: S.text, letterSpacing: '-0.3px' }}>FarmFlow</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.activeColor, display: 'inline-block' }} />
              <span style={{ fontSize: '10px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Seller Portal</span>
            </div>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.dimColor, fontSize: '20px', padding: '4px 6px', lineHeight: 1 }}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Drawer user info */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(58,125,68,0.12)', border: '1px solid rgba(58,125,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: S.activeColor, flexShrink: 0 }}>
            {(user?.name?.[0] || 'S').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: S.text }}>{user?.name || 'Seller'}</div>
            <div style={{ fontSize: '11px', color: S.dimColor, marginTop: '1px' }}>Seller Account</div>
          </div>
        </div>

        {/* Drawer nav */}
        <nav aria-label="Navigation menu" style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {renderLinks(true)}
        </nav>

        {/* Drawer sign out */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${S.border}` }}>
          <button type="button" onClick={handleLogout}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${S.border}`, background: 'transparent', color: S.dimColor, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', minHeight: '44px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.dimColor; e.currentTarget.style.borderColor = S.border; }}>
            ⏏ Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, background: S.mainBg, overflowY: 'auto', minHeight: '100vh', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="sl-spacer" />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* ── Site Footer ── */}
        <footer style={{ background: S.sidebarBg, borderTop: `1px solid ${S.border}` }}>
          <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: '15px' }}>🌾</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: S.text }}>FarmFlow Seller Portal</span>
              <span aria-hidden="true" style={{ color: S.border }}>·</span>
              <span style={{ fontSize: '12px', color: S.dimColor }}>🛡 All transactions protected by FarmFlow</span>
            </div>
            <nav aria-label="Footer links" style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                ['Terms of Service', '/terms'],
                ['Privacy Policy',   '/privacy'],
                ['Support & Help',   '/support'],
              ].map(([label, href]) => (
                <a key={label} href={href}
                  style={{ fontSize: '12px', color: S.dimColor, textDecoration: 'none', fontWeight: '600' }}
                  onMouseEnter={e => e.currentTarget.style.color = S.activeColor}
                  onMouseLeave={e => e.currentTarget.style.color = S.dimColor}>
                  {label}
                </a>
              ))}
            </nav>
            <div style={{ fontSize: '11px', color: S.dimColor, opacity: 0.7 }}>
              © {new Date().getFullYear()} FarmFlow. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default SellerLayout;
