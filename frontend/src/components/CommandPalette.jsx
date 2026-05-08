import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

// ── Command definitions per role ──────────────────────────────────────────────
const SELLER_COMMANDS = [
  { id: 'dashboard',      icon: '▦',  labelAr: 'لوحة التحكم',        labelEn: 'Dashboard',          path: '/seller',                  group: 'nav'    },
  { id: 'listings',       icon: '🐄', labelAr: 'الإعلانات',           labelEn: 'My Listings',         path: '/seller/listings',         group: 'nav'    },
  { id: 'add-listing',    icon: '＋', labelAr: 'إعلان جديد',          labelEn: 'Add Listing',         path: '/seller/add-listing',      group: 'action' },
  { id: 'herd',           icon: '🐾', labelAr: 'القطيع',              labelEn: 'My Herd',             path: '/seller/herd',             group: 'nav'    },
  { id: 'add-animal',     icon: '🐄', labelAr: 'إضافة حيوان',         labelEn: 'Add Animal',          path: '/seller/herd/add',         group: 'action' },
  { id: 'dairy',          icon: '🥛', labelAr: 'منتجات الألبان',      labelEn: 'Dairy Products',      path: '/seller/dairy',            group: 'nav'    },
  { id: 'add-dairy',      icon: '🥛', labelAr: 'إضافة منتج ألبان',   labelEn: 'Add Dairy Product',   path: '/seller/add-dairy',        group: 'action' },
  { id: 'orders',         icon: '📦', labelAr: 'الطلبات',             labelEn: 'Orders',              path: '/seller/orders',           group: 'nav'    },
  { id: 'expenses',       icon: '📉', labelAr: 'المصروفات',           labelEn: 'Expenses',            path: '/seller/expenses',         group: 'nav'    },
  { id: 'income',         icon: '💰', labelAr: 'الإيرادات',           labelEn: 'Income',              path: '/seller/income',           group: 'nav'    },
  { id: 'statements',     icon: '📊', labelAr: 'كشف الحساب',         labelEn: 'Statements',          path: '/seller/statements',       group: 'nav'    },
  { id: 'analytics',      icon: '📈', labelAr: 'التحليلات',           labelEn: 'Analytics',           path: '/seller/analytics',        group: 'nav'    },
  { id: 'budget',         icon: '🎯', labelAr: 'الميزانية',           labelEn: 'Budget',              path: '/seller/budget',           group: 'nav'    },
  { id: 'supplies',       icon: '🛒', labelAr: 'المستلزمات',          labelEn: 'Supplies',            path: '/seller/supplies',         group: 'nav'    },
  { id: 'add-supply',     icon: '📦', labelAr: 'إضافة مستلزم',       labelEn: 'Add Supply',          path: '/seller/supplies/add',     group: 'action' },
  { id: 'messages',       icon: '💬', labelAr: 'الرسائل',             labelEn: 'Messages',            path: '/seller/messages',         group: 'nav'    },
  { id: 'settings',       icon: '⚙️', labelAr: 'الإعدادات',           labelEn: 'Settings',            path: '/seller/settings',         group: 'nav'    },
];

const BUYER_COMMANDS = [
  { id: 'browse',         icon: '🏠', labelAr: 'تصفح المزارع',        labelEn: 'Browse Farms',        path: '/buyer',                   group: 'nav'    },
  { id: 'orders',         icon: '📦', labelAr: 'طلباتي',              labelEn: 'My Orders',           path: '/buyer/orders',            group: 'nav'    },
  { id: 'favorites',      icon: '❤️', labelAr: 'المفضلة',             labelEn: 'Favorites',           path: '/buyer/favorites',         group: 'nav'    },
  { id: 'cart',           icon: '🛒', labelAr: 'سلة المشتريات',       labelEn: 'Cart',                path: '/buyer/cart',              group: 'nav'    },
  { id: 'messages',       icon: '💬', labelAr: 'الرسائل',             labelEn: 'Messages',            path: '/buyer/messages',          group: 'nav'    },
  { id: 'settings',       icon: '⚙️', labelAr: 'الإعدادات',           labelEn: 'Settings',            path: '/buyer/settings',          group: 'nav'    },
];

const ADMIN_COMMANDS = [
  { id: 'dashboard',      icon: '▦',  labelAr: 'لوحة الإدارة',        labelEn: 'Admin Dashboard',     path: '/admin',                   group: 'nav'    },
  { id: 'users',          icon: '👥', labelAr: 'المستخدمون',          labelEn: 'Users',               path: '/admin/users',             group: 'nav'    },
  { id: 'listings',       icon: '🐄', labelAr: 'الإعلانات',           labelEn: 'Listings',            path: '/admin/listings',          group: 'nav'    },
  { id: 'orders',         icon: '📦', labelAr: 'الطلبات',             labelEn: 'Orders',              path: '/admin/orders',            group: 'nav'    },
  { id: 'dairy',          icon: '🥛', labelAr: 'منتجات الألبان',      labelEn: 'Dairy',               path: '/admin/dairy',             group: 'nav'    },
  { id: 'supplies',       icon: '🛒', labelAr: 'المستلزمات',          labelEn: 'Supplies',            path: '/admin/supplies',          group: 'nav'    },
  { id: 'reviews',        icon: '⭐', labelAr: 'التقييمات',           labelEn: 'Reviews',             path: '/admin/reviews',           group: 'nav'    },
  { id: 'analytics',      icon: '📈', labelAr: 'التحليلات',           labelEn: 'Analytics',           path: '/admin/analytics',         group: 'nav'    },
];

const COMMANDS_BY_ROLE = { seller: SELLER_COMMANDS, buyer: BUYER_COMMANDS, admin: ADMIN_COMMANDS };

// ── Component ─────────────────────────────────────────────────────────────────
const CommandPalette = () => {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [active,  setActive]  = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { lang }  = useLang();
  const isAr      = lang === 'ar';

  const commands = COMMANDS_BY_ROLE[user?.role] || [];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.labelAr.includes(query) ||
        c.labelEn.toLowerCase().includes(query.toLowerCase()) ||
        c.id.includes(query.toLowerCase())
      )
    : commands;

  // Keyboard listener — Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setActive(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setActive(0);
    }
  }, [open]);

  // Arrow key navigation
  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(p => Math.min(p + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(p => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = filtered[active];
      if (cmd) { navigate(cmd.path); setOpen(false); setQuery(''); }
    }
  }, [active, filtered, navigate]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[active];
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const GROUP_LABELS = {
    nav:    isAr ? 'تنقل'    : 'Navigate',
    action: isAr ? 'إجراءات' : 'Actions',
  };

  // Group the filtered results
  const groups = filtered.reduce((acc, cmd) => {
    (acc[cmd.group] = acc[cmd.group] || []).push(cmd);
    return acc;
  }, {});

  let itemIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'cp-fade-in 0.12s ease',
        }}
      />

      {/* Palette */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', top: '18vh', left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(560px, 92vw)',
          zIndex: 9999,
          background: 'var(--bg-card, #FFFFFF)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          animation: 'cp-slide-in 0.15s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: "var(--font-family, 'Cairo', sans-serif)",
        }}
      >
        <style>{`
          @keyframes cp-fade-in  { from { opacity: 0; } to { opacity: 1; } }
          @keyframes cp-slide-in { from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.97); }
                                   to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); } }
        `}</style>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border, #E8D5C0)',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={handleKey}
            placeholder={isAr ? 'ابحث أو انتقل إلى…' : 'Search or navigate to…'}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '15px',
              background: 'transparent',
              color: 'var(--text-primary, #2C1810)',
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: '10px', fontWeight: '700', color: 'var(--text-muted, #8B6B5A)',
            background: 'var(--bg-subtle, #F9FAFB)',
            border: '1px solid var(--border, #E8D5C0)',
            padding: '2px 6px', borderRadius: '5px', flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px' }}
        >
          {filtered.length === 0 ? (
            <div style={{
              padding: '32px', textAlign: 'center',
              color: 'var(--text-muted, #8B6B5A)', fontSize: '13px',
            }}>
              {isAr ? 'لا توجد نتائج' : 'No results found'}
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div style={{
                  fontSize: '10px', fontWeight: '700',
                  color: 'var(--text-dim, #9CA3AF)',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  padding: '8px 10px 4px',
                }}>
                  {GROUP_LABELS[group] || group}
                </div>
                {items.map(cmd => {
                  const idx = itemIndex++;
                  const isActive = active === idx;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => { navigate(cmd.path); setOpen(false); setQuery(''); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: '12px', padding: '9px 10px',
                        borderRadius: '9px', border: 'none', cursor: 'pointer',
                        background: isActive ? 'var(--primary-light, #F0F7F1)' : 'transparent',
                        color: isActive ? 'var(--primary, #3A7D44)' : 'var(--text-primary, #2C1810)',
                        fontFamily: 'inherit', fontSize: '14px', fontWeight: isActive ? '700' : '500',
                        transition: 'background 0.1s, color 0.1s',
                        textAlign: isAr ? 'right' : 'left',
                      }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>{cmd.icon}</span>
                      <span style={{ flex: 1 }}>{isAr ? cmd.labelAr : cmd.labelEn}</span>
                      {isActive && (
                        <kbd style={{
                          fontSize: '10px', fontWeight: '700',
                          color: 'var(--primary, #3A7D44)',
                          background: 'var(--bg-card, #fff)',
                          border: '1px solid var(--primary-light, #BBF7D0)',
                          padding: '2px 6px', borderRadius: '5px', flexShrink: 0,
                        }}>↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', gap: '16px', padding: '8px 14px',
          borderTop: '1px solid var(--border, #E8D5C0)',
          fontSize: '11px', color: 'var(--text-dim, #9CA3AF)',
        }}>
          {[
            ['↑↓', isAr ? 'تنقل' : 'Navigate'],
            ['↵',  isAr ? 'فتح'  : 'Open'],
            ['Esc',isAr ? 'إغلاق': 'Close'],
          ].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{
                background: 'var(--bg-subtle, #F9FAFB)',
                border: '1px solid var(--border, #E8D5C0)',
                borderRadius: '4px', padding: '1px 5px',
                fontFamily: 'monospace', fontSize: '10px',
              }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
