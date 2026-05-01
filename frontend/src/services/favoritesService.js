import api from './api';

export const getFavorites      = ()         => api.get('/favorites');
export const addFavorite       = (sellerId) => api.post(`/favorites/${sellerId}`);
export const removeFavorite    = (sellerId) => api.delete(`/favorites/${sellerId}`);
