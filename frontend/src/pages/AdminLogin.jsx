import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, verify2FA } from '../services/authService';
import { C as _C } from '../tokens';

// ─── Design tokens — dark, corporate, secure ────────────────────────────────
const C = {
  ..._C,
  pageBg:       '#07100A',
  cardBg:       '#0D1610',
  cardBorder:   'rgba(34,197,94,0.11)',
  inputBg:      '#111C13',
  inputBorder:  'rgba(255,255,255,0.07)',
  inputFocusBg: '#131F15',
  accent:       '#22C55E',
  accentDark:   '#16A34A',
  accentDeep:   '#0F766E',
  accentMuted:  'rgba(34,197,94,0.12)',
  textSub:      '#7DA88A',
  textGhost:    '#2E4535',
  warnBg:       'rgba(251,191,36,0.07)',
  warnBorder:   'rgba(251,191,36,0.22)',
  warnText:     '#FDE68A',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseError = (err) => {
  const d = err?.response?.data;
  if (!d) return 'Network error. Check your connection and try again.';
  if (d.errors?.length) return d.errors[0].msg;
  return d.message || 'Authentication failed.';
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const ShieldCheck = () => (
  <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z"
      fill="rgba(34,197,94,0.14)" stroke="#22C55E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="#22C55E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = () => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ─── OTP digit input ─────────────────────────────────────────────────────────
const OTPInput = ({ values, onChange }) => {
  const r0 = useRef(null); const r1 = useRef(null); const r2 = useRef(null);
  const r3 = useRef(null); const r4 = useRef(null); const r5 = useRef(null);
  const refs = [r0, r1, r2, r3, r4, r5];

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!values[i] && i > 0) {
        onChange(i - 1, '');
        refs[i - 1].current?.focus();
      } else {
        onChange(i, '');
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs[i - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs[i + 1].current?.focus();
    }
  };

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    onChange(i, val);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((ch, i) => onChange(i, ch));
    const next = Math.min(digits.length, 5);
    refs[next].current?.focus();
  };

  return (
    <div role="group" aria-label="Verification code" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          aria-label={`Digit ${i + 1} of 6`}
          autoFocus={i === 0}
          onKeyDown={e => handleKeyDown(i, e)}
          onChange={e => handleChange(i, e)}
          onPaste={handlePaste}
          style={{
            width: '50px', height: '58px', textAlign: 'center',
            fontSize: '24px', fontWeight: '700', fontFamily: 'monospace',
            background: v ? 'rgba(34,197,94,0.08)' : C.inputBg,
            border: `1.5px solid ${v ? C.accent : C.inputBorder}`,
            borderRadius: '12px', color: C.text,
            transition: 'all 0.15s',
            boxShadow: v ? `0 0 0 3px ${C.accentMuted}` : 'none',
          }}
          onFocus={e => {
            e.target.style.borderColor = C.accent;
            e.target.style.boxShadow   = `0 0 0 3px ${C.accentMuted}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = v ? C.accent : C.inputBorder;
            e.target.style.boxShadow   = v ? `0 0 0 3px ${C.accentMuted}` : 'none';
          }}
        />
      ))}
    </div>
  );
};

// ─── Custom checkbox ──────────────────────────────────────────────────────────
const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', userSelect: 'none' }}>
    <div style={{ position: 'relative', width: '18px', height: '18px', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ opacity: 0, position: 'absolute', inset: 0, margin: 0, cursor: 'pointer' }} />
      <div style={{
        width: '18px', height: '18px', borderRadius: '5px', pointerEvents: 'none',
        border: `1.5px solid ${checked ? C.accent : C.inputBorder}`,
        background: checked ? C.accent : C.inputBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        boxShadow: checked ? `0 0 0 3px ${C.accentMuted}` : 'none',
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
    </div>
    <span style={{ fontSize: '13px', color: C.textSub }}>{label}</span>
  </label>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminLogin = () => {
  const navigate       = useNavigate();
  const { user, login } = useAuth();

  // Stage: 'credentials' | '2fa'
  const [stage, setStage]       = useState('credentials');

  // Credential form
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [fieldFocus,  setFieldFocus]  = useState('');
  const [showForgot,  setShowForgot]  = useState(false);

  // 2FA stage state (stored for when backend adds 2FA support)
  const [otp,       setOtp]       = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState(null);
  const [tempUser,  setTempUser]  = useState(null);

  // Shared
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true });
    else if (user)              navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // ── Credential submit ───────────────────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setShowForgot(false);
    setSubmitting(true);
    try {
      const { data } = await loginUser(email, password);

      if (data.user?.role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        return;
      }

      // Future: if backend returns requires2FA, show OTP screen
      if (data.requires2FA && data.tempToken) {
        setTempToken(data.tempToken);
        setTempUser(data.user);
        setStage('2fa');
        return;
      }

      login(data.user, data.token, rememberMe);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── OTP submit ──────────────────────────────────────────────────────────────
  const handleOTP = async (e) => {
    e.preventDefault();
    if (otp.join('').length < 6) { setError('Enter the complete 6-digit code.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { data } = await verify2FA(tempToken, otp.join(''));
      login(data.user, data.token, rememberMe);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const setOtpDigit = (i, val) => {
    setOtp(prev => { const n = [...prev]; n[i] = val; return n; });
  };

  const canSubmit = !submitting && email.trim() && password;

  // ── Shared input style factory ──────────────────────────────────────────────
  const IS = (name, extra = {}) => ({
    width: '100%', boxSizing: 'border-box', padding: '12px 15px',
    background: fieldFocus === name ? C.inputFocusBg : C.inputBg,
    border: `1.5px solid ${fieldFocus === name ? C.accent : C.inputBorder}`,
    borderRadius: '10px', color: C.text, fontSize: '15px',
    fontFamily: 'inherit', caretColor: C.accent,
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    boxShadow: fieldFocus === name ? `0 0 0 3px ${C.accentMuted}` : 'none',
    ...extra,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: C.pageBg,
      backgroundImage: 'radial-gradient(rgba(34,197,94,0.025) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::placeholder { color: #2E4535 !important; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #111C13 inset !important; -webkit-text-fill-color: #EEF9F1 !important; }
      `}</style>

      {/* ── Brand above card ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '28px', animation: 'fadeIn 0.4s ease' }}>
        <span aria-hidden="true" style={{ fontSize: '22px', lineHeight: 1 }}>🌾</span>
        <span style={{ fontSize: '17px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>FarmFlow</span>
        <span style={{
          fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px',
          color: C.accent, background: C.accentMuted,
          border: `1px solid rgba(34,197,94,0.2)`,
          padding: '2px 8px', borderRadius: '6px', marginLeft: '2px',
        }}>Admin</span>
      </div>

      {/* ── Card ── */}
      <div style={{
        width: '100%', maxWidth: '408px',
        background: C.cardBg,
        borderRadius: '20px',
        border: `1px solid ${C.cardBorder}`,
        boxShadow: '0 0 0 1px rgba(34,197,94,0.04), 0 32px 80px rgba(0,0,0,0.75)',
        overflow: 'hidden',
        animation: 'fadeIn 0.4s ease 0.05s both',
      }}>

        {/* Gradient cap */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.accentDeep}, ${C.accentDark} 40%, ${C.accent} 70%, ${C.accentDark})` }} />

        <div style={{ padding: '36px 32px 28px' }}>

          {/* ── STAGE: CREDENTIALS ───────────────────────────────────────────── */}
          {stage === 'credentials' && (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 18px',
                  background: 'rgba(34,197,94,0.07)',
                  border: '1px solid rgba(34,197,94,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(34,197,94,0.08)',
                }}>
                  <ShieldCheck />
                </div>
                <h1 style={{ margin: '0 0 7px', fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.4px' }}>
                  Admin Portal
                </h1>
                <p style={{ margin: 0, fontSize: '13px', color: C.textSub, letterSpacing: '0.1px' }}>
                  Authorized personnel only
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCredentials} autoComplete="on"
                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Email */}
                <div>
                  <label htmlFor="admin-email" style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.textSub, marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Email Address
                  </label>
                  <input
                    id="admin-email"
                    type="email" name="email" autoComplete="email" autoFocus required
                    value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="admin@farmflow.com"
                    onFocus={() => setFieldFocus('email')}
                    onBlur={() => setFieldFocus('')}
                    style={IS('email')}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="admin-password" style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.textSub, marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="admin-password"
                      type={showPw ? 'text' : 'password'} name="password"
                      autoComplete="current-password" required
                      value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••••••"
                      onFocus={() => setFieldFocus('password')}
                      onBlur={() => setFieldFocus('')}
                      style={IS('password', { paddingRight: '48px' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: C.textSub, padding: '4px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = C.accent}
                      onMouseLeave={e => e.currentTarget.style.color = C.textSub}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot password */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-2px' }}>
                  <Checkbox checked={rememberMe} onChange={() => setRememberMe(p => !p)} label="Remember this device" />
                  <button
                    type="button"
                    onClick={() => { setShowForgot(p => !p); setError(''); }}
                    style={{ background: 'none', border: 'none', color: showForgot ? C.accentDark : C.accent, fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    Forgot password?
                  </button>
                </div>

                {/* Forgot password notice */}
                {showForgot && (
                  <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                    <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '14px', marginTop: '1px' }}>🔑</span>
                    <p style={{ margin: 0, fontSize: '13px', color: C.warnText, lineHeight: 1.55 }}>
                      Password resets for admin accounts must be initiated by your system administrator. Contact them directly or check your organization's access management procedures.
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '14px', marginTop: '1px' }}>⚠</span>
                    <span style={{ fontSize: '13px', color: C.errorText, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  aria-busy={submitting || undefined}
                  style={{
                    padding: '13px', borderRadius: '10px', border: 'none',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    background: canSubmit
                      ? `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`
                      : 'rgba(34,197,94,0.18)',
                    color: canSubmit ? '#fff' : 'rgba(34,197,94,0.4)',
                    fontSize: '15px', fontWeight: '700', letterSpacing: '0.2px',
                    boxShadow: canSubmit ? '0 4px 18px rgba(34,197,94,0.28)' : 'none',
                    transition: 'all 0.2s', marginTop: '2px',
                  }}
                  onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 7px 24px rgba(34,197,94,0.38)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; if (canSubmit) e.currentTarget.style.boxShadow = '0 4px 18px rgba(34,197,94,0.28)'; }}>
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Authenticating…
                    </span>
                  ) : 'Access Admin Panel →'}
                </button>
              </form>

              {/* Divider + link */}
              <div style={{ margin: '24px 0 18px', height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: C.textSub }}>
                Not an admin?{' '}
                <Link to="/login"
                  style={{ color: C.accent, fontWeight: '600', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  Sign in here
                </Link>
              </p>
            </>
          )}

          {/* ── STAGE: 2FA ─────────────────────────────────────────────────── */}
          {stage === '2fa' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ position: 'relative', width: '56px', margin: '0 auto 18px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(34,197,94,0.08)',
                  }}>
                    <ShieldCheck />
                  </div>
                  <div style={{
                    position: 'absolute', top: -6, right: -6, width: '22px', height: '22px',
                    borderRadius: '50%', background: C.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '800', color: '#fff',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                  }}>2</div>
                </div>
                <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: C.text, letterSpacing: '-0.3px' }}>
                  Two-Factor Authentication
                </h1>
                <p style={{ margin: 0, fontSize: '13px', color: C.textSub, lineHeight: 1.55 }}>
                  A 6-digit verification code was sent to your email address
                </p>
              </div>

              <form onSubmit={handleOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <OTPInput values={otp} onChange={setOtpDigit} />

                {error && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, fontSize: '14px' }}>⚠</span>
                    <span style={{ fontSize: '13px', color: C.errorText, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || otp.join('').length < 6}
                  style={{
                    padding: '13px', borderRadius: '10px', border: 'none',
                    cursor: (submitting || otp.join('').length < 6) ? 'not-allowed' : 'pointer',
                    background: (submitting || otp.join('').length < 6)
                      ? 'rgba(34,197,94,0.18)'
                      : `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
                    color: (submitting || otp.join('').length < 6) ? 'rgba(34,197,94,0.4)' : '#fff',
                    fontSize: '15px', fontWeight: '700',
                    boxShadow: (submitting || otp.join('').length < 6) ? 'none' : '0 4px 18px rgba(34,197,94,0.28)',
                    transition: 'all 0.2s',
                  }}>
                  {submitting ? 'Verifying…' : 'Verify Code →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button"
                    onClick={() => { setStage('credentials'); setOtp(['','','','','','']); setError(''); setTempToken(null); setTempUser(null); }}
                    style={{ background: 'none', border: 'none', color: C.textSub, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.text}
                    onMouseLeave={e => e.currentTarget.style.color = C.textSub}>
                    ← Use different account
                  </button>
                  <button type="button"
                    style={{ background: 'none', border: 'none', color: C.accent, fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    Use backup code
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* ── Security strip ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '12px 24px', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', label: 'SSL Secured'        },
            { icon: '⏱',  label: 'Auto-Expiring Session' },
            { icon: '🛡',  label: '2FA Ready'          },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.textGhost }}>
              <span aria-hidden="true">{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Below-card note ── */}
      <p style={{ margin: '18px 0 0', fontSize: '12px', color: C.textGhost, textAlign: 'center', animation: 'fadeIn 0.4s ease 0.15s both' }}>
        All access attempts are logged and monitored.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLogin;
