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

export const getNotifPrefs    = ()     => api.get('/auth/notif-prefs');
export const updateNotifPrefs = (data) => api.put('/auth/notif-prefs', data);

export const forgotPassword      = (identifier)        => api.post('/auth/forgot-password', { identifier });
export const resetPassword       = (token, password)   => api.post('/auth/reset-password',  { token, password });
export const verifyEmail         = (token)             => api.post('/auth/verify-email',     { token });
export const resendVerification  = ()                  => api.post('/auth/resend-verification');
export const verify2FA           = (tempToken, code)   => api.post('/auth/verify-2fa',       { tempToken, code });
