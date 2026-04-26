import api from './api';

// Dashboard
export const getStats          = ()   => api.get('/admin/stats');

// Users
export const getAllUsers        = ()   => api.get('/admin/users');
export const toggleUserStatus  = (id) => api.patch(`/admin/users/${id}/toggle`);

// Listings — reuses existing endpoint; admin sees all statuses
export const getAllListings     = ()   => api.get('/listings');
export const approveListing    = (id) => api.put(`/listings/${id}`, { status: 'approved' });
export const rejectListing     = (id) => api.put(`/listings/${id}`, { status: 'rejected' });

// Orders — admin sees all
export const getAllOrders       = ()   => api.get('/orders');
