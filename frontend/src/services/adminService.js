import api from './api';

// Dashboard
export const getStats          = ()   => api.get('/admin/stats');

// Users
export const getAllUsers        = (page = 1, limit = 20) => api.get(`/admin/users?page=${page}&limit=${limit}`);
export const toggleUserStatus  = (id) => api.patch(`/admin/users/${id}/toggle`);
export const deleteUser        = (id) => api.delete(`/admin/users/${id}`);

// Listings — reuses existing endpoint; admin sees all statuses
export const getAllListings     = ()   => api.get('/listings');
export const approveListing    = (id) => api.put(`/listings/${id}`, { status: 'approved' });
export const rejectListing     = (id) => api.put(`/listings/${id}`, { status: 'rejected' });
export const deleteListing     = (id) => api.delete(`/listings/${id}`);

// Orders — admin sees all
export const getAllOrders        = ()             => api.get('/orders');
export const updateOrderStatus  = (id, status)   => api.put(`/orders/${id}/status`, { status });
export const setOrderDelivery   = (id, data)     => api.patch(`/orders/${id}/delivery`, data);

// Analytics
export const getGovAnalytics        = ()           => api.get('/admin/analytics');
export const getPlatformAnalytics   = (weeks = 12) => api.get(`/admin/platform-analytics?weeks=${weeks}`);
