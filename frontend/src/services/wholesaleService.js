import api from './api';

export const generateWholesaleCode   = (farmId)           => api.post('/wholesale/generate-code', { farmId });
export const enterWholesaleCode      = (code)              => api.post('/wholesale/enter-code', { code });
export const requestWholesaleAccess  = (sellerId)          => api.post('/wholesale/request', { sellerId });
export const getWholesaleRequests    = ()                  => api.get('/wholesale/requests');
export const updateWholesaleRequest  = (id, status)        => api.patch(`/wholesale/requests/${id}`, { status });
export const checkWholesaleAccess    = (sellerId)          => api.get(`/wholesale/check/${sellerId}`);
