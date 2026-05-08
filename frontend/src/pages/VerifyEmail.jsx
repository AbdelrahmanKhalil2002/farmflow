import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

const C = {
  pageBg:       '#F8F4EE',
  cardBg:       '#FFFFFF',
  border:       '#E5E5DC',
  text:         '#1A2E1A',
  sub:          '#6B7280',
  accent:       '#3A7D44',
  error:        '#DC2626',
  errorBg:      '#FEF2F2',
  errorBorder:  '#FECACA',
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  successBorder:'#BBF7D0',
};

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const token    = params.get('token') || '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('رابط التحقق غير صالح.');
      return;
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية.');
      });
  }, [token]);

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
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.7s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: C.sub, fontSize: '15px' }}>جارٍ التحقق…</p>
          </>
        )}

        {status === 'success' && (
          <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: '12px', padding: '24px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px', color: C.success, fontSize: '20px', fontWeight: '800' }}>
              تم تأكيد البريد الإلكتروني
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: C.sub, lineHeight: 1.6 }}>
              بريدك الإلكتروني مؤكد الآن. يمكنك تسجيل الدخول للمتابعة.
            </p>
            <Link to="/login" style={{
              display: 'inline-block', padding: '11px 24px',
              background: C.accent, color: '#fff',
              borderRadius: '10px', textDecoration: 'none',
              fontWeight: '700', fontSize: '14px',
            }}>
              تسجيل الدخول
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '12px', padding: '24px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
            <h2 style={{ margin: '0 0 8px', color: C.error, fontSize: '20px', fontWeight: '800' }}>
              فشل التحقق
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: C.sub, lineHeight: 1.6 }}>
              {message}
            </p>
            <Link to="/login" style={{ color: C.accent, fontWeight: '700', fontSize: '14px' }}>
              العودة لتسجيل الدخول
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VerifyEmail;
