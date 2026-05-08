import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUnreadCount } from '../services/messageService';

const MsgUnreadCtx = createContext({ msgUnread: 0, setMsgUnread: () => {}, refreshUnread: () => {} });

export const MsgUnreadProvider = ({ children }) => {
  const { user } = useAuth();
  const [msgUnread, setMsgUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    getUnreadCount().then(r => setMsgUnread(r.data.count ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setMsgUnread(0); return; }
    refreshUnread();
    const id = setInterval(refreshUnread, 30_000);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  return (
    <MsgUnreadCtx.Provider value={{ msgUnread, setMsgUnread, refreshUnread }}>
      {children}
    </MsgUnreadCtx.Provider>
  );
};

export const useMsgUnread = () => useContext(MsgUnreadCtx);
