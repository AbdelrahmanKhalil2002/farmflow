import api from './api';

export const getSupplies      = (params)    => api.get('/supplies', { params });
export const getSupplyById    = (id)        => api.get(`/supplies/${id}`);
export const createSupply     = (formData)  => api.post('/supplies', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateSupply     = (id, fd)    => api.put(`/supplies/${id}`, fd,   { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteSupply     = (id)        => api.delete(`/supplies/${id}`);
export const updateSupplyStatus = (id, data) => api.patch(`/supplies/${id}/status`, data);
