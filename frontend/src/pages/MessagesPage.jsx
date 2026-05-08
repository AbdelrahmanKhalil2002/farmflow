import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMsgUnread } from '../context/MsgUnreadContext';
import {
  getConversations,
  getMessages,
  sendMessage,
  sendOffer,
  respondToOffer,
  markRead,
  getOrCreate,
} from '../services/messageService';
import { C as _C } from '../tokens';

const C = { ..._C, bubble: '#DCFCE7', bubbleMe: '#3A7D44' };

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

// ─── ConvItem ─────────────────────────────────────────────────────────────────
const ConvItem = ({ conv, myId, active, onClick }) => {
  const other    = conv.participants?.find(p => p._id !== myId) || {};
  const name     = other.farmName || other.name || 'مستخدم';
  const lastBody = conv.lastMessage?.body || 'ابدأ المحادثة…';
  const lastAt   = conv.lastMessage?.at;
  const unread   = conv.unread || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'right', border: 'none', cursor: 'pointer',
        background: active ? C.greenBg : 'transparent',
        borderLeft: `3px solid ${active ? C.green : 'transparent'}`,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        transition: 'background 0.15s',
        borderBottom: `1px solid ${C.border}`,
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.greenLt; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: avatarColor(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
        position: 'relative',
      }}>
        {initials(name)}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#DC2626', color: '#fff',
            borderRadius: '9999px', fontSize: 9, fontWeight: 800,
            minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: unread > 0 ? 800 : 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {lastAt && (
            <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginRight: 4 }}>{timeAgo(lastAt)}</span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: unread > 0 ? C.text : C.muted,
          fontWeight: unread > 0 ? 600 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lastBody.length > 50 ? lastBody.slice(0, 50) + '…' : lastBody}
        </div>
        {conv.context?.label && (
          <div style={{ fontSize: 10, color: C.green, marginTop: 2, fontWeight: 600 }}>
            {conv.context.type === 'listing' ? '🐄' : conv.context.type === 'order' ? '📦' : '💬'} {conv.context.label}
          </div>
        )}
      </div>
    </button>
  );
};

// ─── OfferBubble ─────────────────────────────────────────────────────────────
const OFFER_STATUS_LABEL = {
  pending:   null,
  accepted:  '✅ تم قبول العرض',
  rejected:  '❌ تم رفض العرض',
  countered: '↩️ تم تقديم عرض مضاد',
};

const OfferBubble = ({ msg, isMe, onRespond }) => {
  const [countering, setCountering] = useState(false);
  const [counterAmt, setCounterAmt] = useState('');
  const [acting, setActing] = useState(false);

  const statusLabel = OFFER_STATUS_LABEL[msg.offerStatus];

  const act = async (action) => {
    setActing(true);
    try {
      await onRespond(msg._id, action, action === 'countered' ? Number(counterAmt) : undefined);
      setCountering(false);
    } finally {
      setActing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
      {!isMe && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: avatarColor(msg.sender?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
          {initials(msg.sender?.farmName || msg.sender?.name || '?')}
        </div>
      )}
      <div style={{ maxWidth: '75%' }}>
        <div style={{ background: isMe ? '#2D6235' : '#FFFBEB', border: `2px solid ${isMe ? '#3A7D44' : '#F59E0B'}`, borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '12px 16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isMe ? 'rgba(255,255,255,0.7)' : '#D97706', marginBottom: 4 }}>💰 عرض سعر</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: isMe ? '#fff' : '#92400E', letterSpacing: '-0.5px' }}>
            {Number(msg.offerAmount).toLocaleString('ar-EG')} ج.م
          </div>
          {statusLabel && (
            <div style={{ marginTop: 8, padding: '4px 10px', background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: isMe ? '#fff' : '#374151', display: 'inline-block' }}>
              {statusLabel}
            </div>
          )}
          {/* Actions for the receiver when pending */}
          {!isMe && msg.offerStatus === 'pending' && onRespond && !countering && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" disabled={acting} onClick={() => act('accepted')}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ✅ قبول
              </button>
              <button type="button" disabled={acting} onClick={() => setCountering(true)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #D97706', background: '#FFF', color: '#D97706', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ↩️ تفاوض
              </button>
              <button type="button" disabled={acting} onClick={() => act('rejected')}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ❌ رفض
              </button>
            </div>
          )}
          {countering && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={counterAmt} onChange={e => setCounterAmt(e.target.value)} placeholder="العرض المضاد (ج.م)"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #D97706', fontSize: 13, fontFamily: 'inherit', minWidth: 0 }} />
              <button type="button" disabled={acting || !counterAmt} onClick={() => act('countered')}
                style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#D97706', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                إرسال
              </button>
              <button type="button" onClick={() => setCountering(false)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                إلغاء
              </button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textAlign: isMe ? 'left' : 'right' }}>
          {fmtTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
};

// ─── ChatBubble ───────────────────────────────────────────────────────────────
const ChatBubble = ({ msg, isMe, onRespondToOffer }) => {
  if (msg.type === 'offer') {
    return <OfferBubble msg={msg} isMe={isMe} onRespond={onRespondToOffer} />;
  }
  return (
  <div style={{
    display: 'flex',
    flexDirection: isMe ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  }}>
    {!isMe && (
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: avatarColor(msg.sender?.name || ''),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#fff',
      }}>
        {initials(msg.sender?.farmName || msg.sender?.name || '?')}
      </div>
    )}
    <div style={{ maxWidth: '68%' }}>
      <div style={{
        padding: '9px 13px',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isMe ? C.bubbleMe : C.white,
        color: isMe ? '#fff' : C.text,
        fontSize: 13, lineHeight: 1.55,
        boxShadow: C.shadow,
        border: isMe ? 'none' : `1px solid ${C.border}`,
        wordBreak: 'break-word',
      }}>
        {msg.body}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textAlign: isMe ? 'left' : 'right' }}>
        {fmtTime(msg.createdAt)}
        {isMe && msg.read && <span style={{ marginRight: 4, color: C.green }}>✓✓</span>}
        {isMe && !msg.read && <span style={{ marginRight: 4 }}>✓</span>}
      </div>
    </div>
  </div>
  );
};

// ─── EmptyInbox ───────────────────────────────────────────────────────────────
const EmptyInbox = ({ role }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
    <div style={{ fontSize: 52, marginBottom: 14 }}>💬</div>
    <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>لا توجد رسائل بعد</h3>
    <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 280, lineHeight: 1.7 }}>
      {role === 'buyer'
        ? 'تواصل مع البائعين من خلال صفحة المزرعة أو تفاصيل الإعلان.'
        : 'سيظهر هنا تواصل المشترين معك عبر إعلاناتك.'}
    </p>
  </div>
);

// ─── MessagesPage ─────────────────────────────────────────────────────────────
const MessagesPage = ({ basePath }) => {
  const { user }         = useAuth();
  const { setMsgUnread } = useMsgUnread();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [convs,      setConvs]      = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [offerMode,  setOfferMode]  = useState(false);
  const [offerAmt,   setOfferAmt]   = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [mobileView,   setMobileView]   = useState('list'); // 'list' | 'chat'

  const bottomRef    = useRef(null);
  const pollRef      = useRef(null);
  const textareaRef  = useRef(null);
  const myId         = user?._id || user?.id;

  // ── Load inbox ──────────────────────────────────────────────────────────────
  const loadConvs = useCallback(async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const res = await getConversations();
      setConvs(res.data);
    } catch {}
    if (!silent) setLoadingConvs(false);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // ── Open conversation by URL param (e.g. ?with=<userId>&label=...&type=...) ─
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || !myId) return;

    const contextType  = searchParams.get('contextType') || 'general';
    const contextRefId = searchParams.get('contextRefId') || null;
    const contextLabel = searchParams.get('contextLabel') || '';

    getOrCreate({ recipientId: withId, contextType, contextRefId, contextLabel })
      .then(res => {
        const conv = res.data;
        setConvs(prev => {
          const exists = prev.find(c => c._id === conv._id);
          return exists ? prev : [{ ...conv, unread: 0 }, ...prev];
        });
        openConv(conv);
        // Remove query params without re-navigating
        navigate(basePath + '/messages', { replace: true });
      })
      .catch(() => {});
  }, [searchParams, myId]); // eslint-disable-line

  // ── Open a conversation ─────────────────────────────────────────────────────
  const openConv = useCallback(async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    setMobileView('chat');
    setLoadingMsgs(true);

    // Immediately decrement the nav badge by this conversation's unread count
    if (conv.unread > 0) {
      setMsgUnread(prev => Math.max(0, prev - conv.unread));
    }

    try {
      const res = await getMessages(conv._id);
      setMessages(res.data);
      // Mark as read
      markRead(conv._id).then(() => {
        setConvs(prev => prev.map(c => c._id === conv._id ? { ...c, unread: 0 } : c));
      });
    } catch {}
    setLoadingMsgs(false);
  }, [setMsgUnread]);

  // ── Poll messages every 5s when a conversation is open ──────────────────────
  useEffect(() => {
    if (!activeConv) return;

    const poll = async () => {
      try {
        const res = await getMessages(activeConv._id);
        setMessages(res.data);
        // Mark newly received messages read
        const hasUnread = res.data.some(m => m.sender?._id !== myId && !m.read);
        if (hasUnread) {
          markRead(activeConv._id);
          setConvs(prev => prev.map(c => c._id === activeConv._id ? { ...c, unread: 0 } : c));
        }
      } catch {}
    };

    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConv, myId]);

  // ── Scroll to bottom when messages change ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConv || sending) return;
    setSending(true);
    setInput('');

    try {
      const res = await sendMessage(activeConv._id, text);
      setMessages(prev => [...prev, res.data]);
      // Update last message in inbox list
      setConvs(prev => prev.map(c =>
        c._id === activeConv._id
          ? { ...c, lastMessage: { body: text, sender: myId, at: new Date() } }
          : c
      ));
    } catch {}
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSendOffer = async () => {
    const amount = Number(offerAmt);
    if (!amount || amount <= 0 || !activeConv || sending) return;
    setSending(true);
    try {
      const res = await sendOffer(activeConv._id, amount);
      setMessages(prev => [...prev, res.data]);
      setConvs(prev => prev.map(c =>
        c._id === activeConv._id
          ? { ...c, lastMessage: { body: `💰 عرض سعر: ${amount.toLocaleString('ar-EG')} ج.م`, sender: myId, at: new Date() } }
          : c
      ));
      setOfferAmt('');
      setOfferMode(false);
    } catch {}
    setSending(false);
  };

  const handleRespondToOffer = async (msgId, action, counterAmount) => {
    if (!activeConv) return;
    try {
      const res = await respondToOffer(activeConv._id, msgId, { action, counterAmount });
      // Update the offer message status in place, and append counter if any
      setMessages(prev => {
        const updated = prev.map(m => m._id === msgId ? { ...m, offerStatus: action } : m);
        return res.data.counter ? [...updated, res.data.counter] : updated;
      });
    } catch {}
  };

  const activeOther = activeConv?.participants?.find(p => p._id !== myId);
  const activeName  = activeOther?.farmName || activeOther?.name || 'محادثة';

  // ── Responsive: on mobile show either list or chat ──────────────────────────
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div dir="rtl" style={{
      margin: '-24px', height: 'calc(100vh - 62px)',
      display: 'flex', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      background: C.bg, overflow: 'hidden',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .msg-sidebar { ${mobileView === 'chat' ? 'display:none!important;' : 'width:100%!important;'} }
          .msg-chat    { ${mobileView === 'list' ? 'display:none!important;' : 'flex:1!important;'} }
        }
      `}</style>

      {/* ── Conversation list ── */}
      <div className="msg-sidebar" style={{
        width: 320, flexShrink: 0,
        background: C.white,
        borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>💬 الرسائل</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>
            {loadingConvs ? 'جاري التحميل…' : `${convs.length} محادثة`}
          </p>
        </div>

        {/* List */}
        {loadingConvs ? (
          <div style={{ padding: 20, color: C.muted, fontSize: 13, textAlign: 'center' }}>جاري التحميل…</div>
        ) : convs.length === 0 ? (
          <EmptyInbox role={user?.role} />
        ) : (
          convs.map(conv => (
            <ConvItem
              key={conv._id}
              conv={conv}
              myId={myId}
              active={activeConv?._id === conv._id}
              onClick={() => openConv(conv)}
            />
          ))
        )}
      </div>

      {/* ── Chat panel ── */}
      <div className="msg-chat" style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 14, margin: 0 }}>اختر محادثة لعرض الرسائل</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
              background: C.white, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            }}>
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                style={{
                  display: 'none', background: 'none', border: 'none', cursor: 'pointer',
                  color: C.green, fontSize: 18, padding: 0,
                  // shown via CSS on mobile
                }}
                className="msg-back-btn"
              >
                →
              </button>
              <style>{`@media(max-width:640px){.msg-back-btn{display:block!important;}}`}</style>

              <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(activeName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(activeName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{activeName}</div>
                {activeConv.context?.label && (
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>
                    {activeConv.context.type === 'listing' ? '🐄' : activeConv.context.type === 'order' ? '📦' : '💬'} {activeConv.context.label}
                  </div>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', background: C.bg }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, paddingTop: 40 }}>جاري التحميل…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, paddingTop: 40 }}>
                  لا توجد رسائل. ابدأ المحادثة!
                </div>
              ) : (
                messages.map(msg => (
                  <ChatBubble
                    key={msg._id}
                    msg={msg}
                    isMe={msg.sender?._id === myId || msg.sender === myId}
                    onRespondToOffer={handleRespondToOffer}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding: '12px 16px',
              borderTop: `1px solid ${C.border}`,
              background: C.white,
              display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
              flexDirection: 'column',
            }}>
              {/* Offer mode */}
              {offerMode ? (
                <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', flexShrink: 0 }}>💰 عرض سعر (ج.م)</div>
                  <input
                    type="number" min="1" value={offerAmt}
                    onChange={e => setOfferAmt(e.target.value)}
                    placeholder="أدخل مبلغ العرض…"
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #F59E0B', fontSize: 13, fontFamily: 'inherit', background: '#FFFBEB', outline: 'none', minWidth: 0 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendOffer(); }}
                    autoFocus
                  />
                  <button type="button" onClick={handleSendOffer} disabled={!offerAmt || sending}
                    style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: offerAmt && !sending ? '#D97706' : '#E5E7EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: offerAmt && !sending ? 'pointer' : 'not-allowed', flexShrink: 0, fontFamily: 'inherit' }}>
                    {sending ? '…' : 'إرسال ←'}
                  </button>
                  <button type="button" onClick={() => { setOfferMode(false); setOfferAmt(''); }}
                    style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 13, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', color: C.muted }}>
                    إلغاء
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {/* Offer trigger — visible to buyers in listing-context conversations */}
                  {user?.role === 'buyer' && activeConv?.context?.type === 'listing' && (
                    <button type="button" onClick={() => setOfferMode(true)} title="عرض سعر"
                      style={{ padding: '10px 12px', borderRadius: 12, border: `1.5px solid #F59E0B`, background: '#FFFBEB', color: '#D97706', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                      💰
                    </button>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالة… (Enter للإرسال)"
                    rows={1}
                    maxLength={1000}
                    style={{
                      flex: 1, resize: 'none', border: `1.5px solid ${C.border}`,
                      borderRadius: 12, padding: '10px 13px', fontSize: 13,
                      color: C.text, fontFamily: 'inherit', outline: 'none',
                      background: C.bg, lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = C.green; }}
                    onBlur={e => { e.target.style.borderColor = C.border; }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                      padding: '10px 18px', borderRadius: 12, border: 'none',
                      background: input.trim() && !sending ? C.green : '#C9D8CC',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s', flexShrink: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    {sending ? '…' : 'إرسال ←'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
