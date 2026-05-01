import api from './api';

export const createReview       = (data)      => api.post('/reviews', data);
export const getSellerReviews   = (sellerId)  => api.get(`/reviews/seller/${sellerId}`);
export const deleteReview       = (id)        => api.delete(`/reviews/${id}`);
