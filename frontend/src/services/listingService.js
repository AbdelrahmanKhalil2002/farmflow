import api from './api';

// Buyer: backend returns only approved listings when role = buyer
export const getAvailableListings = ()   => api.get('/listings');
// Seller: backend returns only their own listings
export const getMyListings  = ()         => api.get('/listings');
export const getListingById = (id)       => api.get(`/listings/${id}`);
// data must be FormData when images are included
export const createListing  = (data)    => api.post('/listings', data);
export const updateListing  = (id, data) => api.put(`/listings/${id}`, data);
export const deleteListing  = (id)       => api.delete(`/listings/${id}`);
