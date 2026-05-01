/**
 * EidCountdownBanner — shown to all users when:
 *  • eidMode is active (admin-toggled), OR
 *  • eidDate is set and within 30 days
 *
 * Fetches config from /api/eid/config on mount, then re-checks every 5 minutes.
 */
import { useEffect, useState } from 'react';
import { getEidConfig } from '../services/eidService';

const msToCountdown = (ms) => {
  if (ms <= 0) return null;
  const days  = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins  = Math.floor((ms % 3600000)  / 60000);
  return { days, hours, mins };
};

const Pad = ({ n }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 }}>
    <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
      {String(n).padStart(2, '0')}
    </span>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }} />
  </div>
);

const EidCountdownBanner = () => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const load = () => getEidConfig().then(r => setConfig(r.data)).catch(() => {});
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!config) return null;

  const { eidMode, eidDate } = config;

  // Determine if banner should show
  let countdown = null;
  if (eidDate) {
    const ms = new Date(eidDate).getTime() - Date.now();
    if (ms > 0 && ms <= 30 * 24 * 3600 * 1000) countdown = msToCountdown(ms);
  }

  if (!eidMode && !countdown) return null;

  const cd = countdown;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #14532D 0%, #166534 45%, #15803D 100%)',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background crescent */}
      <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: -20, fontSize: 100, opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🌙</div>

      <span style={{ fontSize: 22, lineHeight: 1 }}>🌙</span>
      <div style={{ color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>
          {cd ? `موسم عيد الأضحى قادم!` : 'موسم عيد الأضحى — شوف أضاحي العيد الآن'}
        </div>
        {cd && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            باقي على العيد: {cd.days} يوم · {cd.hours} ساعة · {cd.mins} دقيقة
          </div>
        )}
      </div>

      {cd && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Pad n={cd.days} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: 900 }}>:</span>
          <Pad n={cd.hours} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: 900 }}>:</span>
          <Pad n={cd.mins} />
        </div>
      )}

      <a
        href="/buyer?eid=1"
        style={{
          padding: '7px 16px', background: '#FEF08A', color: '#713F12',
          borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: 'none',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
        عروض العيد ✦
      </a>
    </div>
  );
};

export default EidCountdownBanner;
