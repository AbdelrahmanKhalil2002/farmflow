import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const C = {
  pageBg:       '#F8F4EE',
  cardBg:       '#FFFFFF',
  border:       '#E5E5DC',
  text:         '#1A2E1A',
  sub:          '#6B7280',
  accent:       '#3A7D44',
  accentDark:   '#2D6135',
  accentLight:  '#F0FBF0',
  error:        '#DC2626',
  errorBg:      '#FEF2F2',
  errorBorder:  '#FECACA',
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  successBorder:'#BBF7D0',
};


const ResetPassword = () => {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const token           = params.get('token') || '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token)                       { setError('الرابط غير صالح. اطلب رابطًا جديدًا.'); return; }
    if (password.length < 8)          { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (password !== confirm)         { setError('كلمتا المرور غير متطابقتين'); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", direction: 'rtl' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: C.error }}>رابط غير صالح</h2>
          <p style={{ color: C.sub }}>هذا الرابط غير صالح أو منتهي الصلاحية.</p>
          <Link to="/forgot-password" style={{ color: C.accent, fontWeight: '700' }}>طلب رابط جديد</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
      direction: 'rtl',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: C.cardBg, borderRadius: '20px',
        border: `1px solid ${C.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '36px 32px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
            background: C.accentLight, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
          }}>🔒</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: C.text }}>
            تعيين كلمة مرور جديدة
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: C.sub }}>
            اختر كلمة مرور قوية لحسابك
          </p>
        </div>

        {done ? (
          <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>✅</div>
            <p style={{ margin: '0 0 6px', fontWeight: '700', color: C.success, fontSize: '15px' }}>
              تم تغيير كلمة المرور
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: C.sub }}>
              سيتم توجيهك لصفحة تسجيل الدخول خلال ثوانٍ…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '7px' }}>
                كلمة المرور الجديدة
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="8 أحرف على الأقل"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingTop: '12px', paddingBottom: '12px',
                    paddingInlineStart: '14px', paddingInlineEnd: '44px',
                    borderRadius: '10px',
                    border: `1.5px solid ${C.border}`,
                    fontSize: '14px', color: C.text,
                    background: '#fff', fontFamily: 'inherit', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.sub, display: 'flex',
                  }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {password && password.length < 8 && (
                <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.error }}>
                  {8 - password.length} أحرف أخرى مطلوبة
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '7px' }}>
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="أعد كتابة كلمة المرور"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: '10px',
                  border: `1.5px solid ${confirm && confirm !== password ? C.errorBorder : C.border}`,
                  fontSize: '14px', color: C.text,
                  background: '#fff', fontFamily: 'inherit', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = (confirm && confirm !== password) ? C.errorBorder : C.border}
              />
            </div>

            {error && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.error }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '13px', borderRadius: '10px', border: 'none',
                background: loading ? '#ccc' : `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
                color: '#fff', fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(58,125,68,0.3)',
                transition: 'all 0.2s',
              }}>
              {loading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور الجديدة'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: C.sub }}>
              <Link to="/login" style={{ color: C.accent, fontWeight: '600', textDecoration: 'none' }}>
                ← العودة لتسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
