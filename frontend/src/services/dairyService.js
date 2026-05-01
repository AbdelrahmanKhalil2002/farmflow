import api from './api';

export const getApprovedDairy = (params) => api.get('/dairy',        { params });
export const getMyDairy        = ()        => api.get('/dairy/my');
export const getDairyById      = (id)      => api.get(`/dairy/${id}`);
export const createDairy       = (data)    => api.post('/dairy',      data);
export const updateDairy       = (id, data) => api.put(`/dairy/${id}`, data);
export const deleteDairy       = (id)      => api.delete(`/dairy/${id}`);

export const getSellers        = ()        => api.get('/sellers');
export const getFarmById       = (id)      => api.get(`/sellers/${id}`);
export const updateDairyStock  = (id, data) => api.post(`/dairy/${id}/stock`, data);
