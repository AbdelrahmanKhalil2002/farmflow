import api from './api';
export const getBudgets = (year) => api.get('/budget', { params: { year } });
export const setBudget  = (data) => api.put('/budget', data);
