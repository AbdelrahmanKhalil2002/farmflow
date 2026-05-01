import api from './api';

export const getEidConfig    = ()     => api.get('/eid/config');
export const updateEidConfig = (data) => api.patch('/eid/config', data);
export const getEidListings  = ()     => api.get('/eid/listings');
