import api from './api';

export const getConversations    = ()                      => api.get('/messages');
export const getUnreadCount      = ()                      => api.get('/messages/unread-count');
export const getOrCreate         = (data)                  => api.post('/messages', data);
export const getMessages         = (convId, params = {})   => api.get(`/messages/${convId}`, { params });
export const sendMessage         = (convId, body)          => api.post(`/messages/${convId}`, { body });
export const markRead            = (convId)                => api.patch(`/messages/${convId}/read`);
export const sendOffer           = (convId, offerAmount)   => api.post(`/messages/${convId}`, { type: 'offer', offerAmount });
export const respondToOffer      = (convId, msgId, data)   => api.patch(`/messages/${convId}/offers/${msgId}`, data);
