import api from './api';

export const getMyFarms    = ()           => api.get('/farms');
export const getFarmById   = (id)         => api.get(`/farms/${id}`);
export const createFarm    = (formData)   => api.post('/farms', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateFarm    = (id, formData) => api.put(`/farms/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteFarm    = (id)         => api.delete(`/farms/${id}`);
export const migrateLegacy = ()           => api.post('/farms/migrate/self');
