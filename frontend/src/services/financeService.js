import api from './api';

export const getSummary     = (params)     => api.get('/finance/summary',          { params });
export const getExpenses    = (params)     => api.get('/finance/expenses',          { params });
export const addExpense     = (data)       => api.post('/finance/expenses',         data);
export const updateExpense  = (id, data)   => api.put(`/finance/expenses/${id}`,   data);
export const deleteExpense  = (id)         => api.delete(`/finance/expenses/${id}`);
export const getIncome      = (params)     => api.get('/finance/income',            { params });
export const addIncome      = (data)       => api.post('/finance/income',           data);
export const updateIncome   = (id, data)   => api.put(`/finance/income/${id}`,     data);
export const deleteIncome   = (id)         => api.delete(`/finance/income/${id}`);
