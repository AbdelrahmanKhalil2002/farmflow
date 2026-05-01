import api from './api';

export const getMarketPrices = (governorate) => {
  const params = governorate ? `?governorate=${encodeURIComponent(governorate)}` : '';
  return api.get(`/market-prices${params}`);
};
