import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';

const C = {
  pageBg:      '#F8F4EE',
  cardBg:      '#FFFFFF',
  border:      '#E5E5DC',
  text:        '#1A2E1A',
  sub:         '#6B7280',
  accent:      '#3A7D44',
  accentDark:  '#2D6135',
  accentLight: '#F0FBF0',
  error:       '#DC2626',
  errorBg:     '#FEF2F2',
  errorBorder: '#FECACA',
  success:     '#16A34A',
  successBg:   '#F0FDF4',
  successBorder:'#BBF7D0',
};

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('أدخل بريدك الإلكتروني أو رقم هاتفك'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(identifier.trim());
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
            background: C.accentLight, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
          }}>🔑</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: C.text }}>
            نسيت كلمة المرور؟
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: C.sub, lineHeight: 1.55 }}>
            أدخل بريدك الإلكتروني أو رقم هاتفك وسنرسل لك رابط استعادة
          </p>
        </div>

        {sent ? (
          <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📧</div>
            <p style={{ margin: '0 0 6px', fontWeight: '700', color: C.success, fontSize: '15px' }}>
              تم الإرسال
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: C.sub, lineHeight: 1.6 }}>
              إذا كان الحساب موجودًا وله بريد إلكتروني، ستصل رسالة إليك خلال دقائق. تحقق من مجلد الرسائل غير المرغوب فيها إن لم تجد الرسالة.
            </p>
            <Link to="/login" style={{
              display: 'inline-block', marginTop: '16px',
              color: C.accent, fontWeight: '700', fontSize: '14px', textDecoration: 'none',
            }}>
              ← العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '7px' }}>
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError(''); }}
                placeholder="example@email.com أو 01xxxxxxxxx"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: '10px',
                  border: `1.5px solid ${error ? C.errorBorder : C.border}`,
                  fontSize: '14px', color: C.text,
                  background: '#fff', fontFamily: 'inherit',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = error ? C.errorBorder : C.border}
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
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(58,125,68,0.3)',
              }}>
              {loading ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: C.sub }}>
              تذكرت كلمة المرور؟{' '}
              <Link to="/login" style={{ color: C.accent, fontWeight: '600', textDecoration: 'none' }}>
                تسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
