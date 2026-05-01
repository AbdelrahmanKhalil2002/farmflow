import api from './api';

export const getNotifications = ()   => api.get('/notifications');
export const getUnreadCount   = ()   => api.get('/notifications/unread-count');
export const markAllRead      = ()   => api.patch('/notifications/read-all');
export const markOneRead      = (id) => api.patch(`/notifications/${id}/read`);
