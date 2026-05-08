import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [show, setShow] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setShow(false);
    const goOffline = () => setShow(true);
    const cacheHit  = () => setShow(true);

    window.addEventListener('online',       goOnline);
    window.addEventListener('offline',      goOffline);
    window.addEventListener('ff:cache-hit', cacheHit);
    return () => {
      window.removeEventListener('online',       goOnline);
      window.removeEventListener('offline',      goOffline);
      window.removeEventListener('ff:cache-hit', cacheHit);
    };
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#f59e0b', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      padding: '7px 12px', fontSize: 13,
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    }}>
      <span>⚠️</span>
      <span>غير متصل بالإنترنت — تعرض بيانات محفوظة</span>
      <button
        onClick={() => setShow(false)}
        style={{
          position: 'absolute', left: '12px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 16, lineHeight: 1, padding: '0 4px',
        }}
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  );
}
