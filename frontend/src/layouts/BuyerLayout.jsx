import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useCart } from '../context/CartContext';
import { useMsgUnread } from '../context/MsgUnreadContext';
import NotificationBell from '../components/NotificationBell';
import EidCountdownBanner from '../components/EidCountdownBanner';

const S = {
  navBg:       'var(--sidebar-bg, #F0F7F1)',
  mainBg:      'var(--main-bg, #F7FBF7)',
  activeColor: 'var(--sidebar-active-color, #3A7D44)',
  activeBg:    'var(--sidebar-active-bg, rgba(58,125,68,0.09))',
  dimColor:    'var(--sidebar-dim-color, #4B6B4E)',
  border:      'var(--sidebar-border, #D4E8D6)',
  text:        'var(--sidebar-text, #1A2E1C)',
  drawerBg:    'var(--sidebar-bg, #F0F7F1)',
};

const LINKS = [
  { to: '/buyer',           labelKey: 'nav.browse',    icon: '🌾', end: true },
  { to: '/buyer/orders',    labelKey: 'nav.myOrders',  icon: '📦'           },
  { to: '/buyer/messages',  labelKey: 'nav.messages',  icon: '💬', msgBadge: true },
  { to: '/buyer/favorites', labelKey: 'nav.favorites', icon: '❤️'           },
  { to: '/buyer/settings',  labelKey: 'nav.settings',  icon: '⚙️'           },
];

const BuyerLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const cart = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    if (dropOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  // Lock scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const { msgUnread } = useMsgUnread();

  const initial = (user?.name?.[0] || 'B').toUpperCase();
  const firstName = user?.name?.split(' ')[0] || 'Buyer';
  const isMacDesktop = window.electron?.platform === 'darwin';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* ── Responsive styles ── */}
      <style>{`
        .bl-desktop-nav { display: flex !important; }
        .bl-hamburger   { display: none !important; }
        .bl-nav-name    { display: inline !important; }
        *:focus-visible { outline: 2px solid var(--primary, #3A7D44); outline-offset: 2px; border-radius: 4px; }
        @media (max-width: 768px) {
          .bl-desktop-nav { display: none !important; }
          .bl-hamburger   { display: flex !important; }
          .bl-nav-name    { display: none !important; }
        }
        .bl-drop-link:hover { background: var(--sidebar-active-bg, rgba(58,125,68,0.09)) !important; }
        .bl-drawer-link:hover { background: var(--sidebar-active-bg, rgba(58,125,68,0.09)) !important; }
      `}</style>

      {/* ── Top Navbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: S.navBg,
        borderBottom: `1px solid ${S.border}`,
        boxShadow: '0 1px 4px rgba(26,46,28,0.06)',
        // macOS: entire header is the drag zone; children mark themselves no-drag
        WebkitAppRegion: isMacDesktop ? 'drag' : undefined,
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          // Extra left padding on macOS so logo doesn't collide with traffic lights
          padding: isMacDesktop ? '0 20px 0 88px' : '0 20px',
          height: '62px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img src="/logo.png" alt="FarmFlow" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: '16px', fontWeight: '800', color: S.text, letterSpacing: '-0.3px' }}>
              FarmFlow
            </span>
          </div>

          {/* Desktop nav — center */}
          <nav aria-label="Main navigation" className="bl-desktop-nav" style={{ flex: 1, alignItems: 'center', gap: '4px', justifyContent: 'center', WebkitAppRegion: 'no-drag' }}>
            {LINKS.map(({ to, labelKey, end, msgBadge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => ({
                  padding: '7px 16px',
                  borderRadius: '9px',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? S.activeColor : S.dimColor,
                  background: isActive ? S.activeBg : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                })}
              >
                {t(labelKey)}
                {msgBadge && msgUnread > 0 && (
                  <span style={{ background: '#DC2626', color: '#fff', borderRadius: '9999px', fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {msgUnread > 9 ? '9+' : msgUnread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0, WebkitAppRegion: 'no-drag' }}>

            <NotificationBell />

            {/* Cart icon */}
            <button
              type="button"
              onClick={() => navigate('/buyer/cart')}
              aria-label={`السلة (${cart.count})`}
              style={{
                position: 'relative', background: 'none',
                border: `1px solid ${cart.count > 0 ? S.activeColor : 'transparent'}`,
                borderRadius: '9999px', cursor: 'pointer',
                padding: '6px 10px', fontSize: '18px', lineHeight: 1,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = S.activeBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🛒
              {cart.count > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: S.activeColor, color: '#fff',
                  borderRadius: '9999px', fontSize: '10px', fontWeight: '800',
                  minWidth: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                }}>
                  {cart.count}
                </span>
              )}
            </button>

            {/* Avatar + dropdown */}
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropOpen(p => !p)}
                aria-label={`Account menu for ${user?.name || 'user'}`}
                aria-expanded={dropOpen}
                aria-haspopup="true"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'none', border: `1px solid ${dropOpen ? S.border : 'transparent'}`,
                  cursor: 'pointer', padding: '5px 10px 5px 5px',
                  borderRadius: '9999px', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = S.activeBg}
                onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(58,125,68,0.12)', border: '2px solid rgba(58,125,68,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', color: S.activeColor, flexShrink: 0,
                }}>
                  {initial}
                </div>
                <span
                  className="bl-nav-name"
                  style={{ fontSize: '13px', fontWeight: '600', color: S.text, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {firstName}
                </span>
                <span aria-hidden="true" style={{ fontSize: '10px', color: S.dimColor, lineHeight: 1 }}>▾</span>
              </button>

              {/* Dropdown */}
              {dropOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: S.navBg, border: `1px solid ${S.border}`,
                  borderRadius: '10px', boxShadow: '0 6px 20px rgba(26,46,28,0.12)',
                  minWidth: '180px', overflow: 'hidden', zIndex: 200,
                }}>
                  {/* User info */}
                  <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${S.border}` }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: S.text }}>{user?.name}</div>
                    <div style={{ fontSize: '11px', color: S.dimColor, marginTop: '2px' }}>{t('buyer.account')}</div>
                  </div>

                  {/* Nav items */}
                  <div style={{ padding: '6px' }}>
                    {LINKS.map(({ to, labelKey, icon, end, msgBadge }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className="bl-drop-link"
                        onClick={() => setDropOpen(false)}
                        style={({ isActive }) => ({
                          display: 'flex', alignItems: 'center', gap: '9px',
                          padding: '8px 10px', borderRadius: '7px',
                          textDecoration: 'none', fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          color: isActive ? S.activeColor : S.text,
                          background: isActive ? S.activeBg : 'transparent',
                          transition: 'background 0.1s',
                        })}
                      >
                        <span style={{ fontSize: '15px' }}>{icon}</span>
                        {t(labelKey)}
                        {msgBadge && msgUnread > 0 && (
                          <span style={{ marginRight: 'auto', background: '#DC2626', color: '#fff', borderRadius: '9999px', fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                            {msgUnread > 9 ? '9+' : msgUnread}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>

                  {/* Sign out */}
                  <div style={{ padding: '6px', borderTop: `1px solid ${S.border}` }}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: '7px',
                        border: 'none', background: 'transparent',
                        color: '#DC2626', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '14px' }}>⏏</span>
                      {t('auth.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="bl-hamburger"
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: S.text, fontSize: '20px', padding: '6px',
                lineHeight: 1, borderRadius: '8px', WebkitAppRegion: 'no-drag',
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.38)',
            zIndex: 150,
          }}
        />
      )}

      {/* ── Mobile slide-out drawer ── */}
      <div id="bl-mobile-drawer" aria-label="Navigation menu" aria-hidden={!menuOpen} style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '270px',
        background: S.drawerBg, borderRight: `1px solid ${S.border}`,
        zIndex: 160, display: 'flex', flexDirection: 'column',
        transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.24s ease',
        boxShadow: menuOpen ? '4px 0 20px rgba(26,46,28,0.14)' : 'none',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '20px 18px 14px',
          borderBottom: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="FarmFlow" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: '15px', fontWeight: '800', color: S.text }}>FarmFlow</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: S.dimColor, fontSize: '18px', padding: '4px', lineHeight: 1,
            }}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Drawer user */}
        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'rgba(58,125,68,0.12)', border: '1px solid rgba(58,125,68,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '700', color: S.activeColor, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: S.text }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: S.dimColor, marginTop: '1px' }}>{t('buyer.account')}</div>
          </div>
        </div>

        {/* Drawer nav */}
        <nav aria-label="Navigation menu" style={{
          flex: 1, padding: '10px 10px',
          display: 'flex', flexDirection: 'column', gap: '2px',
          overflowY: 'auto',
        }}>
          {LINKS.map(({ to, labelKey, icon, end, msgBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="bl-drawer-link"
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '9px',
                textDecoration: 'none', fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? S.activeColor : S.dimColor,
                background: isActive ? S.activeBg : 'transparent',
                borderLeft: `2px solid ${isActive ? S.activeColor : 'transparent'}`,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
              {t(labelKey)}
              {msgBadge && msgUnread > 0 && (
                <span style={{ marginRight: 'auto', background: '#DC2626', color: '#fff', borderRadius: '9999px', fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {msgUnread > 9 ? '9+' : msgUnread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Drawer sign out */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${S.border}` }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%', padding: '9px', borderRadius: '8px',
              border: `1px solid ${S.border}`, background: 'transparent',
              color: S.dimColor, fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.08)';
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = S.dimColor;
              e.currentTarget.style.borderColor = S.border;
            }}
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>

      {/* ── Eid Banner ── */}
      <EidCountdownBanner />

      {/* ── Page content ── */}
      <main style={{ flex: 1, background: S.mainBg }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 20px' }}>
          <Outlet />
        </div>
      </main>

      {/* ── Site Footer ── */}
      <footer style={{ background: S.navBg, borderTop: `1px solid ${S.border}` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <img src="/logo.png" alt="FarmFlow" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: S.text }}>FarmFlow</span>
            <span aria-hidden="true" style={{ color: S.border }}>·</span>
            <span style={{ fontSize: '12px', color: S.dimColor }}>🛡 {t('footer.protected')}</span>
          </div>
          <nav aria-label="Footer links" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
    </div>
  );
};

export default BuyerLayout;
