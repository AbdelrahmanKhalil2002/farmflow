import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from '../services/notificationService';
import { isDesktop } from '../utils/platform';

import { C } from '../tokens';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} ي`;
};

const NotificationBell = ({ iconColor = '#4B6B4E' }) => {
  const [open,          setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]       = useState(0);
  const [loading,       setLoading]      = useState(false);
  const panelRef  = useRef(null);
  const prevCount = useRef(null);  // tracks last known count for delta detection
  const navigate  = useNavigate();

  // Poll unread count every 30 seconds
  const fetchCount = useCallback(async () => {
    try {
      const res   = await getUnreadCount();
      const count = res.data.count ?? 0;
      setUnread(count);

      if (isDesktop) {
        // Sync dock / taskbar badge
        window.electron.setBadge(count);

        // Fire OS notification only when count genuinely increases
        if (prevCount.current !== null && count > prevCount.current) {
          const delta = count - prevCount.current;
          window.electron.notify(
            'FarmFlow — إشعارات جديدة',
            delta === 1 ? 'لديك إشعار جديد' : `لديك ${delta} إشعارات جديدة`
          );
        }
      }

      prevCount.current = count;
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      clearInterval(interval);
      // Clear badge when component unmounts (user logged out)
      if (isDesktop) window.electron.setBadge(0);
    };
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open) {
      setLoading(true);
      try {
        const res = await getNotifications();
        setNotifications(res.data);
      } catch {}
      setLoading(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setUnread(0);
      prevCount.current = 0;
      setNotifications(n => n.map(x => ({ ...x, read: true })));
      if (isDesktop) window.electron.setBadge(0);
    } catch {}
  };

  const handleClickNotif = async (notif) => {
    if (!notif.read) {
      try {
        await markOneRead(notif._id);
        setNotifications(n => n.map(x => x._id === notif._id ? { ...x, read: true } : x));
        setUnread(u => {
          const next = Math.max(0, u - 1);
          prevCount.current = next;
          if (isDesktop) window.electron.setBadge(next);
          return next;
        });
      } catch {}
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="الإشعارات"
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 6px', fontSize: 22, lineHeight: 1,
          color: iconColor, transition: 'color 0.15s',
        }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: C.red, color: '#fff',
            fontSize: 10, fontWeight: 800,
            minWidth: 17, height: 17, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0,
          width: 320, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 14,
          boxShadow: C.shadow, zIndex: 9999,
          overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease',
        }}>
          <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Panel header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.text }}>الإشعارات</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{ background:'none', border:'none', fontSize:12, color:C.green, cursor:'pointer', fontWeight:600, fontFamily:'inherit', padding:0 }}>
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding:'24px', textAlign:'center', color:C.muted, fontSize:13 }}>جاري التحميل…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔕</div>
                <p style={{ margin:0, fontSize:13, color:C.muted }}>لا توجد إشعارات</p>
              </div>
            )}
            {!loading && notifications.map(n => (
              <div
                key={n._id}
                onClick={() => handleClickNotif(n)}
                style={{
                  display:'flex', gap:10, padding:'11px 16px',
                  borderBottom:`1px solid ${C.border}`,
                  background: n.read ? C.card : '#FFF7ED',
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}>
                {/* Unread dot */}
                <div style={{ flexShrink:0, marginTop:4 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: n.read ? 'transparent' : C.green }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 2px', fontSize:13, fontWeight: n.read ? 500 : 700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {n.title}
                  </p>
                  <p style={{ margin:'0 0 4px', fontSize:12, color:C.muted, lineHeight:1.4 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize:11, color:C.muted }}>{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
