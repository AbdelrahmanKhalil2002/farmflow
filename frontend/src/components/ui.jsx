/**
 * FarmFlow UI Component Library
 *
 * All components are theme-aware via ThemeProvider + useTheme.
 * Wrap your layout root in <ThemeProvider theme={LIGHT|DARK}>.
 *
 * Exports:
 *   ThemeProvider, useTheme
 *   Spinner, Btn, StatusBadge
 *   Field, Select, Textarea
 *   Card, Modal
 *   Avatar, Breadcrumb
 *   EmptyState, Alert, Divider
 */

import { createContext, useContext, useState, useEffect, useRef, useId, Fragment } from 'react';
import { LIGHT } from '../utils/tokens';

// ─── Theme ───────────────────────────────────────────────────────────────────

const ThemeCtx = createContext(LIGHT);
export const useTheme = () => useContext(ThemeCtx);
export const ThemeProvider = ({ theme = LIGHT, children }) => (
  <ThemeCtx.Provider value={theme}>
    <style>{`
      .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
      @keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    `}</style>
    {children}
  </ThemeCtx.Provider>
);

// ─── useMediaQuery ───────────────────────────────────────────────────────────

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

export const Spinner = ({ size = 'md', color, style }) => {
  const C = useTheme();
  const sz = { sm: 14, md: 20, lg: 28 }[size] ?? 20;
  const col = color || C.green;
  return (
    <>
      <style>{`@keyframes ff-spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{
        display: 'inline-block',
        width: sz, height: sz,
        border: `2px solid ${col}33`,
        borderTop: `2px solid ${col}`,
        borderRadius: '50%',
        animation: 'ff-spin 0.7s linear infinite',
        flexShrink: 0,
        ...style,
      }} aria-hidden="true" />
    </>
  );
};

// ─── Btn ─────────────────────────────────────────────────────────────────────

const BTN_SIZES = {
  sm: { padding: '6px 14px',  fontSize: '13px', borderRadius: '8px',  gap: '6px' },
  md: { padding: '9px 20px',  fontSize: '14px', borderRadius: '10px', gap: '7px' },
  lg: { padding: '12px 28px', fontSize: '15px', borderRadius: '12px', gap: '8px' },
};

export const Btn = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  style,
  type = 'button',
  ...rest
}) => {
  const C = useTheme();
  const [hov, setHov] = useState(false);
  const off = disabled || loading;
  const sz = BTN_SIZES[size] ?? BTN_SIZES.md;

  const base = {
    fontFamily: 'inherit',
    fontWeight: '600',
    cursor: off ? 'not-allowed' : 'pointer',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    opacity: off ? 0.55 : 1,
    lineHeight: 1.2,
    minHeight: '44px',
    ...sz,
  };

  const varStyles = {
    primary: {
      background: hov && !off ? C.greenDark : C.green,
      color: '#fff',
      boxShadow: hov && !off ? C.shadowMd : 'none',
      transform: hov && !off ? 'translateY(-1px)' : 'none',
    },
    secondary: {
      background: hov && !off ? C.surfaceHover : C.surface,
      color: C.text,
      border: `1px solid ${C.border}`,
      boxShadow: hov && !off ? C.shadow : 'none',
    },
    danger: {
      background: hov && !off ? '#B91C1C' : C.red,
      color: '#fff',
      boxShadow: hov && !off ? C.shadowMd : 'none',
      transform: hov && !off ? 'translateY(-1px)' : 'none',
    },
    ghost: {
      background: hov && !off ? C.surfaceHover : 'transparent',
      color: C.textSub,
      border: `1px solid transparent`,
    },
  };

  return (
    <button
      type={type}
      disabled={off}
      aria-busy={loading || undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...(varStyles[variant] ?? varStyles.primary), ...style }}
      {...rest}
    >
      {loading && (
        <Spinner
          size="sm"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : C.green}
        />
      )}
      {children}
    </button>
  );
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const statusConfig = (C) => ({
  pending:      { bg: C.amberLight,  color: C.amber, border: C.amberBorder, label: 'Pending'    },
  approved:     { bg: C.greenLight,  color: C.green, border: C.border,      label: 'Approved'   },
  active:       { bg: C.greenLight,  color: C.green, border: C.border,      label: 'Active'     },
  inactive:     { bg: C.slateLight,  color: C.slate, border: C.slateBorder, label: 'Inactive'   },
  rejected:     { bg: C.redLight,    color: C.red,   border: C.redBorder,   label: 'Rejected'   },
  sold:         { bg: C.slateLight,  color: C.slate, border: C.slateBorder, label: 'Sold'       },
  cancelled:    { bg: C.redLight,    color: C.red,   border: C.redBorder,   label: 'Cancelled'  },
  confirmed:    { bg: C.blueLight,   color: C.blue,  border: C.blueBorder,  label: 'Confirmed'  },
  'in transit': { bg: C.blueLight,   color: C.blue,  border: C.blueBorder,  label: 'In Transit' },
  'in-transit': { bg: C.blueLight,   color: C.blue,  border: C.blueBorder,  label: 'In Transit' },
  delivered:    { bg: C.greenLight,  color: C.green, border: C.border,      label: 'Delivered'  },
  completed:    { bg: C.greenLight,  color: C.green, border: C.border,      label: 'Completed'  },
});

export const StatusBadge = ({ status, label, style }) => {
  const C = useTheme();
  const cfg = statusConfig(C);
  const s = cfg[status?.toLowerCase()] ?? {
    bg: C.slateLight, color: C.slate, border: C.slateBorder, label: status ?? '—',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: C.radiusFull,
      fontSize: '12px', fontWeight: '600', letterSpacing: '0.2px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {label ?? s.label}
    </span>
  );
};

// ─── Field ───────────────────────────────────────────────────────────────────

export const Field = ({
  id: idProp, label, required, type = 'text',
  placeholder, value, onChange,
  onBlur: onBlurProp, validate,
  error: errorProp, help,
  style, inputStyle,
  ...inputProps
}) => {
  const C = useTheme();
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = `${id}-err`;
  const helpId  = `${id}-help`;

  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [focused, setFocused] = useState(false);

  const error = errorProp || (touched ? validationError : '');
  const hasError = Boolean(error);

  const handleBlur = (e) => {
    setTouched(true);
    setFocused(false);
    if (validate) setValidationError(validate(e.target.value) || '');
    onBlurProp?.(e);
  };

  const describedBy = [
    hasError       ? errorId : null,
    !hasError && help ? helpId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && (
        <label htmlFor={id} style={{
          fontSize: '13px', fontWeight: '600', color: C.text,
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          {label}
          {required && <span aria-hidden="true" style={{ color: C.red, lineHeight: 1 }}> *</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        required={required || undefined}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        style={{
          padding: '9px 12px',
          borderRadius: C.radiusSm,
          border: `1px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
          background: C.surface,
          color: C.text,
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused
            ? `0 0 0 3px ${hasError ? 'rgba(220,38,38,0.12)' : C.greenBg}`
            : 'none',
          fontFamily: 'inherit',
          width: '100%',
          boxSizing: 'border-box',
          ...inputStyle,
        }}
        {...inputProps}
      />
      {hasError && (
        <span id={errorId} role="alert" style={{ fontSize: '12px', color: C.red, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
      {!hasError && help && (
        <span id={helpId} style={{ fontSize: '12px', color: C.textMuted, lineHeight: '1.5' }}>{help}</span>
      )}
    </div>
  );
};

// ─── Select ──────────────────────────────────────────────────────────────────

export const Select = ({
  id: idProp, label, required, value, onChange,
  onBlur: onBlurProp, validate,
  error: errorProp, help,
  children, style, selectStyle,
  ...selectProps
}) => {
  const C = useTheme();
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = `${id}-err`;
  const helpId  = `${id}-help`;

  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [focused, setFocused] = useState(false);

  const error = errorProp || (touched ? validationError : '');
  const hasError = Boolean(error);

  const handleBlur = (e) => {
    setTouched(true);
    setFocused(false);
    if (validate) setValidationError(validate(e.target.value) || '');
    onBlurProp?.(e);
  };

  const describedBy = [
    hasError       ? errorId : null,
    !hasError && help ? helpId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && (
        <label htmlFor={id} style={{
          fontSize: '13px', fontWeight: '600', color: C.text,
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          {label}
          {required && <span aria-hidden="true" style={{ color: C.red, lineHeight: 1 }}> *</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        required={required || undefined}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        style={{
          padding: '9px 12px',
          borderRadius: C.radiusSm,
          border: `1px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
          background: C.surface,
          color: C.text,
          fontSize: '16px',
          outline: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
          ...selectStyle,
        }}
        {...selectProps}
      >
        {children}
      </select>
      {hasError && (
        <span id={errorId} role="alert" style={{ fontSize: '12px', color: C.red, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
      {!hasError && help && (
        <span id={helpId} style={{ fontSize: '12px', color: C.textMuted, lineHeight: '1.5' }}>{help}</span>
      )}
    </div>
  );
};

// ─── Textarea ────────────────────────────────────────────────────────────────

export const Textarea = ({
  id: idProp, label, required, value, onChange,
  onBlur: onBlurProp, validate,
  error: errorProp, help,
  rows = 4, placeholder,
  style, textareaStyle,
  ...textareaProps
}) => {
  const C = useTheme();
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = `${id}-err`;
  const helpId  = `${id}-help`;

  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [focused, setFocused] = useState(false);

  const error = errorProp || (touched ? validationError : '');
  const hasError = Boolean(error);

  const handleBlur = (e) => {
    setTouched(true);
    setFocused(false);
    if (validate) setValidationError(validate(e.target.value) || '');
    onBlurProp?.(e);
  };

  const describedBy = [
    hasError       ? errorId : null,
    !hasError && help ? helpId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && (
        <label htmlFor={id} style={{
          fontSize: '13px', fontWeight: '600', color: C.text,
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          {label}
          {required && <span aria-hidden="true" style={{ color: C.red, lineHeight: 1 }}> *</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        rows={rows}
        placeholder={placeholder}
        required={required || undefined}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        style={{
          padding: '9px 12px',
          borderRadius: C.radiusSm,
          border: `1px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
          background: C.surface,
          color: C.text,
          fontSize: '16px',
          outline: 'none',
          fontFamily: 'inherit',
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          transition: 'border-color 0.15s',
          lineHeight: '1.5',
          ...textareaStyle,
        }}
        {...textareaProps}
      />
      {hasError && (
        <span id={errorId} role="alert" style={{ fontSize: '12px', color: C.red, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
      {!hasError && help && (
        <span id={helpId} style={{ fontSize: '12px', color: C.textMuted, lineHeight: '1.5' }}>{help}</span>
      )}
    </div>
  );
};

// ─── Card ────────────────────────────────────────────────────────────────────

export const Card = ({ children, style, hoverable = false, padding = '20px', onClick }) => {
  const C = useTheme();
  const [hov, setHov] = useState(false);
  const interactive = hoverable || Boolean(onClick);

  return (
    <div
      onClick={onClick}
      onMouseEnter={interactive ? () => setHov(true) : undefined}
      onMouseLeave={interactive ? () => setHov(false) : undefined}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: C.radius,
        boxShadow: hov ? C.shadowHover : C.shadow,
        padding,
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hov && interactive ? 'translateY(-2px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────

export const Modal = ({ open, onClose, title, description, children, footer, maxWidth = '520px', style }) => {
  const C = useTheme();
  const dialogRef = useRef(null);
  const titleId   = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    // Move focus into dialog on open
    const raf = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes ff-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (max-width: 640px) {
          .ff-modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .ff-modal-card {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 18px 18px 0 0 !important;
            animation: ff-sheet-up 0.28s cubic-bezier(0.32,0.72,0,1);
          }
        }
      `}</style>
      <div
        className="ff-modal-overlay"
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: C.overlay,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="ff-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: C.radiusLg,
            boxShadow: C.shadowLg,
            width: '100%', maxWidth,
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh', overflow: 'hidden',
            ...style,
          }}
        >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <div>
            <div id={titleId} style={{ fontSize: '16px', fontWeight: '700', color: C.text, lineHeight: '1.3' }}>
              {title}
            </div>
            {description && (
              <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px', lineHeight: '1.5' }}>
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textMuted, fontSize: '18px', padding: '2px 5px',
              lineHeight: 1, borderRadius: '6px', flexShrink: 0,
              fontFamily: 'inherit', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AV_SIZES = { sm: [28, 11], md: [36, 14], lg: [48, 18] };

export const Avatar = ({ name, size = 'md', src, style }) => {
  const C = useTheme();
  const [sz, fs] = AV_SIZES[size] ?? AV_SIZES.md;
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        style={{
          width: sz, height: sz, borderRadius: '50%',
          objectFit: 'cover', border: `1px solid ${C.border}`,
          flexShrink: 0, ...style,
        }}
      />
    );
  }

  return (
    <div style={{
      width: sz, height: sz, borderRadius: '50%',
      background: C.greenBg, border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: '700', color: C.green,
      flexShrink: 0, userSelect: 'none',
      ...style,
    }}>
      {initials}
    </div>
  );
};

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

export const Breadcrumb = ({ items = [], style }) => {
  const C = useTheme();
  return (
    <nav aria-label="Breadcrumb" style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '13px', flexWrap: 'wrap',
      ...style,
    }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span style={{ color: C.textMuted, fontSize: '11px', userSelect: 'none' }}>/</span>
            )}
            {isLast ? (
              <span style={{ color: C.text, fontWeight: '600' }}>{item.label}</span>
            ) : item.href ? (
              <a
                href={item.href}
                style={{ color: C.textSub, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = C.green}
                onMouseLeave={e => e.currentTarget.style.color = C.textSub}
              >
                {item.label}
              </a>
            ) : (
              <span style={{ color: C.textMuted }}>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

// ─── EmptyState ──────────────────────────────────────────────────────────────

export const EmptyState = ({ icon, title, description, action, style }) => {
  const C = useTheme();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: '12px', textAlign: 'center',
      ...style,
    }}>
      {icon && (
        <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '4px', opacity: 0.55 }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>{title}</div>
      {description && (
        <div style={{ fontSize: '14px', color: C.textMuted, maxWidth: '360px', lineHeight: '1.6' }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};

// ─── Alert ───────────────────────────────────────────────────────────────────

const alertConfig = (C) => ({
  info:    { bg: C.blueLight,  color: C.blue,  border: C.blueBorder,  icon: 'ℹ' },
  success: { bg: C.greenLight, color: C.green, border: C.border,      icon: '✓' },
  warning: { bg: C.amberLight, color: C.amber, border: C.amberBorder, icon: '⚠' },
  error:   { bg: C.redLight,   color: C.red,   border: C.redBorder,   icon: '✕' },
});

export const Alert = ({ variant = 'info', title, children, onDismiss, style }) => {
  const C = useTheme();
  const cfg = alertConfig(C);
  const v = cfg[variant] ?? cfg.info;
  const liveRole = (variant === 'error' || variant === 'warning') ? 'alert' : 'status';
  return (
    <div role={liveRole} style={{
      padding: '12px 16px',
      borderRadius: C.radius,
      background: v.bg,
      border: `1px solid ${v.border}`,
      color: v.color,
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      fontSize: '14px',
      ...style,
    }}>
      <span aria-hidden="true" style={{ fontSize: '14px', flexShrink: 0, lineHeight: '1.5', fontWeight: '700' }}>
        {v.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontWeight: '600', marginBottom: children ? '4px' : 0 }}>{title}</div>
        )}
        {children && (
          <div style={{ opacity: 0.9, lineHeight: '1.5' }}>{children}</div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: v.color, fontSize: '14px', opacity: 0.6,
            padding: 0, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
    </div>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SHIMMER_CSS = `@keyframes ff-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
const shimmerBg = 'linear-gradient(90deg,#EDE0D4 0%,#F5EDE5 50%,#EDE0D4 100%)';

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }) => (
  <>
    <style>{SHIMMER_CSS}</style>
    <div
      aria-hidden="true"
      style={{
        width, height, borderRadius,
        background: shimmerBg,
        backgroundSize: '200% 100%',
        animation: 'ff-shimmer 1.4s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  </>
);

// ─── Divider ─────────────────────────────────────────────────────────────────

export const Divider = ({ label, style }) => {
  const C = useTheme();
  if (!label) {
    return (
      <hr style={{
        border: 'none',
        borderTop: `1px solid ${C.border}`,
        margin: '16px 0',
        ...style,
      }} />
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      margin: '16px 0',
      ...style,
    }}>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
      <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: '500', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
    </div>
  );
};
