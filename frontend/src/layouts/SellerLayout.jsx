import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFarm } from '../context/FarmContext';
import { useLang } from '../context/LangContext';
import { useMsgUnread } from '../context/MsgUnreadContext';
import NotificationBell from '../components/NotificationBell';

const S = {
  sidebarBg:   'var(--sidebar-bg, #F0F7F1)',
  activeBg:    'var(--sidebar-active-bg, rgba(58,125,68,0.09))',
  activeColor: 'var(--sidebar-active-color, #3A7D44)',
  dimColor:    'var(--sidebar-dim-color, #4B6B4E)',
  border:      'var(--sidebar-border, #D4E8D6)',
  mainBg:      'var(--main-bg, #F7FBF7)',
  text:        'var(--sidebar-text, #1A2E1C)',
};

// Returns 3 grouped nav sections tailored to the active farm type.
const getFarmLinks = (farmType) => {
  const listingsIcon = farmType === 'poultry' ? '🐔' : farmType === 'horses' ? '🐎' : '🐄';
  const herdIcon     = farmType === 'poultry' ? '🐔' : farmType === 'horses' ? '🐎' : '🐾';
  const herdLabelKey = farmType === 'poultry' ? 'nav.poultryHerd' : farmType === 'horses' ? 'nav.horsesHerd' : 'nav.herd';
  return [
    // ── البيع ──
    [
      { to: '/seller',             labelKey: 'nav.dashboard', icon: '🏠', end: true },
      { to: '/seller/listings',    labelKey: 'nav.listings',  icon: listingsIcon },
      { to: '/seller/add-listing', labelKey: 'nav.addListing',icon: '➕' },
      { to: '/seller/orders',      labelKey: 'nav.orders',    icon: '📦' },
    ],
    // ── المزرعة ──
    [
      { to: '/seller/herd',    labelKey: herdLabelKey, icon: herdIcon },
      { to: '/seller/finance', labelKey: 'nav.finance', icon: '💰' },
      { to: '/seller/supplies',labelKey: 'nav.supplies',icon: '🛒' },
      ...(!farmType || farmType === 'dairy' || farmType === 'mixed'
        ? [{ to: '/seller/dairy', labelKey: 'nav.dairy', icon: '🥛' }]
        : []
      ),
    ],
    // ── عام ──
    [
      { to: '/seller/messages', labelKey: 'nav.messages', icon: '💬', msgBadge: true },
      { to: '/seller/farms',    labelKey: 'nav.farms',    icon: '🏡' },
      { to: '/seller/settings', labelKey: 'nav.settings', icon: '⚙️' },
    ],
  ];
};

// ── Farm Switcher (inline) ────────────────────────────────────────────────────
const FarmSwitcher = ({ collapsed }) => {
  const { farms, activeFarm, switchFarm } = useFarm();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!activeFarm) return null;
  if (farms.length <= 1 && collapsed) return (
    <div title={activeFarm.name} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: '16px' }}>🏡</span>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', padding: collapsed ? '6px 8px' : '8px 10px', borderBottom: `1px solid ${S.border}` }}>
      <button type="button" onClick={() => farms.length > 1 && setOpen(p => !p)}
        title={collapsed ? activeFarm.name : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: '8px', padding: collapsed ? '6px 0' : '7px 10px',
          justifyContent: collapsed ? 'center' : 'space-between',
          background: open ? 'rgba(58,125,68,0.07)' : 'transparent',
          border: `1px solid ${open ? S.activeColor : S.border}`,
          borderRadius: '8px', cursor: farms.length > 1 ? 'pointer' : 'default',
          transition: 'all 0.15s', fontFamily: 'inherit',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>🏡</span>
          {!collapsed && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeFarm.name}
            </span>
          )}
        </div>
        {!collapsed && farms.length > 1 && (
          <span style={{ fontSize: '9px', color: S.dimColor, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 4px)', left: '10px', right: '10px',
          background: S.sidebarBg, border: `1px solid ${S.border}`,
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {farms.map(farm => (
            <button key={farm._id} type="button"
              onClick={() => { switchFarm(farm); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px', background: farm._id === activeFarm._id ? 'rgba(58,125,68,0.08)' : 'transparent',
                border: 'none', borderBottom: `1px solid ${S.border}`, cursor: 'pointer',
                textAlign: 'right', fontFamily: 'inherit', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (farm._id !== activeFarm._id) e.currentTarget.style.background = 'rgba(58,125,68,0.04)'; }}
              onMouseLeave={e => { if (farm._id !== activeFarm._id) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: '13px' }}>🏡</span>
              <div style={{ minWidth: 0, textAlign: 'right', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{farm.name}</div>
                <div style={{ fontSize: '10px', color: S.dimColor }}>{farm.governorate || farm.type}</div>
              </div>
              {farm._id === activeFarm._id && <span style={{ fontSize: '12px', color: S.activeColor, flexShrink: 0 }}>✓</span>}
            </button>
          ))}
          <button type="button"
            onClick={() => { navigate('/seller/farms'); setOpen(false); }}
            style={{
              width: '100%', padding: '9px 12px', background: 'transparent',
              border: 'none', color: S.activeColor, fontSize: '12px', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: 'inherit',
            }}>
            <span>＋</span> إضافة مزرعة
          </button>
        </div>
      )}
    </div>
  );
};

const SellerLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const { msgUnread } = useMsgUnread();
  const { activeFarm } = useFarm();
  const LINK_GROUPS = getFarmLinks(activeFarm?.type);

  // Extra top padding to clear macOS traffic-light buttons (hiddenInset title bar)
  const isMacDesktop = window.electron?.platform === 'darwin';

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const W = collapsed ? '64px' : '220px';

  const renderLink = (mobile, { to, labelKey, icon, end, msgBadge }) => (
    <NavLink key={to} to={to} end={end}
      onClick={mobile ? () => setMobileOpen(false) : undefined}
      title={!mobile && collapsed ? t(labelKey) : undefined}
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
        position: 'relative',
      })}>
      <span style={{ fontSize: (!mobile && collapsed) ? '18px' : '15px', lineHeight: 1, flexShrink: 0, position: 'relative' }}>
        {icon}
        {msgBadge && collapsed && !mobile && msgUnread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#DC2626', color: '#fff', borderRadius: '9999px', fontSize: 8, fontWeight: 800, minWidth: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
            {msgUnread > 9 ? '9+' : msgUnread}
          </span>
        )}
      </span>
      {(mobile || !collapsed) && t(labelKey)}
      {msgBadge && (!collapsed || mobile) && msgUnread > 0 && (
        <span style={{ marginRight: 'auto', background: '#DC2626', color: '#fff', borderRadius: '9999px', fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
          {msgUnread > 9 ? '9+' : msgUnread}
        </span>
      )}
    </NavLink>
  );

  const renderLinks = (mobile = false) =>
    LINK_GROUPS.map((group, gi) => (
      <div key={gi}>
        {gi > 0 && (
          <div style={{ height: '1px', background: S.border, margin: !mobile && collapsed ? '6px 4px' : '6px 2px', opacity: 0.8 }} />
        )}
        {group.map(link => renderLink(mobile, link))}
      </div>
    ));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      <style>{`
        .sl-sidebar { display: flex; }
        .sl-topbar  { display: none; }
        .sl-spacer  { display: none; }
        *:focus-visible { outline: 2px solid var(--primary, #3A7D44); outline-offset: 2px; border-radius: 4px; }
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
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Brand — doubles as macOS titlebar drag area */}
        <div style={{
          padding: isMacDesktop
            ? (collapsed ? '36px 0 18px' : '36px 18px 14px')
            : (collapsed ? '18px 0'      : '20px 18px 14px'),
          borderBottom: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          WebkitAppRegion: 'drag',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🌾</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: S.text, letterSpacing: '-0.3px' }}>FarmFlow</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.activeColor, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{t('seller.portal')}</span>
              </div>
            </div>
          )}
          {collapsed && <span style={{ fontSize: '20px', lineHeight: 1 }}>🌾</span>}
          <button type="button" onClick={() => setCollapsed(p => !p)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.dimColor, fontSize: '14px', padding: '4px', borderRadius: '6px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
            <span aria-hidden="true">{collapsed ? '▶' : '◀'}</span>
          </button>
        </div>

        {/* Farm Switcher */}
        <FarmSwitcher collapsed={collapsed} />

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
                  <div style={{ fontSize: '11px', color: S.dimColor }}>{t('seller.account')}</div>
                </div>
              </div>
              <button type="button" onClick={handleLogout}
                style={{ width: '100%', padding: '7px', borderRadius: '8px', border: `1px solid ${S.border}`, background: 'transparent', color: S.dimColor, fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.dimColor; e.currentTarget.style.borderColor = S.border; }}>
                {t('auth.logout')}
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
          <span style={{ fontSize: '9px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px', background: S.activeBg, padding: '2px 7px', borderRadius: '4px', border: `1px solid ${S.border}` }}>{t('seller.badge')}</span>
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
              <span style={{ fontSize: '10px', fontWeight: '700', color: S.dimColor, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{t('seller.portal')}</span>
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
            <div style={{ fontSize: '11px', color: S.dimColor, marginTop: '1px' }}>حساب البائع</div>
          </div>
        </div>

        {/* Farm Switcher (mobile) */}
        <FarmSwitcher collapsed={false} />

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
            ⏏ {t('auth.logout')}
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
              <span style={{ fontSize: '12px', fontWeight: '800', color: S.text }}>FarmFlow {t('seller.portal')}</span>
              <span aria-hidden="true" style={{ color: S.border }}>·</span>
              <span style={{ fontSize: '12px', color: S.dimColor }}>🛡 {t('footer.protected')}</span>
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
