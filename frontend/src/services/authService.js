import api from './api';

/**
 * Login with email OR phone number.
 * Backend accepts `identifier` and resolves to whichever field matches.
 */
export const loginUser = (identifier, password) =>
  api.post('/auth/login', { identifier, password });

/**
 * Register a new user.
 * `payload` is the full form object — different keys for buyer vs seller.
 */
export const registerUser = (payload) =>
  api.post('/auth/register', payload);

/** Get the authenticated user's profile. */
export const getMe = () =>
  api.get('/auth/me');

/** Verify an Egyptian National ID (format + mock Civil Registry). */
export const verifyNationalId = (nationalId) =>
  api.post('/auth/verify-id', { nationalId });

export const updateProfile = (data) => {
  const isFormData = data instanceof FormData;
  return api.put('/auth/profile', data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
};
export const updatePassword = (data) => api.put('/auth/password',  data);
