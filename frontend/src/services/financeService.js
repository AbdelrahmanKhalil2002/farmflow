import api from './api';

export const getSummary  = (params) => api.get('/finance/summary',  { params });
export const getExpenses = (params) => api.get('/finance/expenses', { params });
export const addExpense  = (data)   => api.post('/finance/expenses', data);
export const getIncome   = (params) => api.get('/finance/income',   { params });
export const addIncome   = (data)   => api.post('/finance/income',  data);
