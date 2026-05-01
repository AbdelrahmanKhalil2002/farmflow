/**
 * FarmFlow Toast Notification System
 *
 * Usage:
 *   1. Wrap app in <ToastProvider>
 *   2. const toast = useToast();
 *   3. toast.success('Done!') | toast.error('Oops') | toast.warning('...') | toast.info('...')
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANTS = {
  success: { bg: '#F0FFF4', color: '#166534', border: '#BBF7D0', icon: '✓', bar: '#22C55E', ariaLive: 'polite'    },
  error:   { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', icon: '✕', bar: '#EF4444', ariaLive: 'assertive' },
  warning: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', icon: '⚠', bar: '#F59E0B', ariaLive: 'polite'    },
  info:    { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: 'ℹ', bar: '#3B82F6', ariaLive: 'polite'    },
};

// Error toasts stay until manually dismissed; others auto-dismiss after 5s
const DURATION = { success: 5000, error: null, warning: 5000, info: 5000 };

let _nextId = 1;

// ─── ToastItem ────────────────────────────────────────────────────────────────

const ToastItem = ({ id, variant, message, onRemove }) => {
  const v        = VARIANTS[variant] ?? VARIANTS.info;
  const duration = DURATION[variant];
  const [visible,  setVisible]  = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const startedAt   = useRef(Date.now());

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    if (duration) {
      const tick = 50;
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt.current;
        const pct = Math.max(0, 100 - (elapsed / duration * 100));
        setProgress(pct);
        if (elapsed >= duration) {
          clearInterval(intervalRef.current);
          dismiss();
        }
      }, tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div
      role={v.ariaLive === 'assertive' ? 'alert' : 'status'}
      aria-live={v.ariaLive}
      aria-atomic="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '360px',
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.175,0.885,0.32,1.1), opacity 0.3s ease',
        pointerEvents: 'all',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* Content row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 14px 12px' }}>
        <span
          aria-hidden="true"
          style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: v.bar, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '800', flexShrink: 0, lineHeight: 1,
          }}
        >
          {v.icon}
        </span>

        <span style={{
          flex: 1, fontSize: '14px', color: v.color,
          fontWeight: '600', lineHeight: '1.4', paddingTop: '2px',
        }}>
          {message}
        </span>

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: v.color, opacity: 0.6, fontSize: '16px',
            lineHeight: 1, padding: '2px', flexShrink: 0,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* Progress bar (only for auto-dismissing toasts) */}
      {duration && (
        <div style={{ height: '3px', background: `${v.border}` }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: v.bar,
            transition: 'width 0.05s linear',
          }} />
        </div>
      )}
    </div>
  );
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastCtx = createContext(null);

// ─── ToastProvider ────────────────────────────────────────────────────────────

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (variant, message) => {
    const id = _nextId++;
    setToasts(prev => {
      const next = [...prev, { id, variant, message }];
      // Keep max 5 stacked; drop oldest if over
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error',   msg),
    warning: (msg) => addToast('warning', msg),
    info:    (msg) => addToast('info',    msg),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          maxWidth: '360px',
          width: 'calc(100vw - 48px)',
        }}
      >
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            id={t.id}
            variant={t.variant}
            message={t.message}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = () => useContext(ToastCtx);
