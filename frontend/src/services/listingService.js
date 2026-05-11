import api from './api';

// Buyer: backend returns only approved listings when role = buyer
// Accepts optional params: { type, minPrice, maxPrice, minWeight, maxWeight, location, delivery, q, sort, page, limit }
export const getAvailableListings = (params = {}) => api.get('/listings', { params });
// Seller: backend returns only their own listings; pass farmId to scope to a single farm
export const getMyListings  = (farmId)   => api.get('/listings', { params: farmId ? { farmId } : {} });
export const getListingById = (id)       => api.get(`/listings/${id}`);
// data must be FormData when images are included
export const createListing  = (data)    => api.post('/listings', data);
export const updateListing  = (id, data) => api.put(`/listings/${id}`, data);
export const deleteListing  = (id)       => api.delete(`/listings/${id}`);
export const getListedAnimalIds = ()     => api.get('/listings/my/listed-animal-ids');
