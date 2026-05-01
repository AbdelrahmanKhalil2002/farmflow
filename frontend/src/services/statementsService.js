import api from './api';

export const getStatements = (year, quarter) => {
  const params = new URLSearchParams({ year });
  if (quarter) params.append('quarter', quarter);
  return api.get(`/statements?${params}`);
};

export const getDrillDown = (year, month, category) =>
  api.get(`/statements/transactions?year=${year}&month=${month}&category=${category}`);
