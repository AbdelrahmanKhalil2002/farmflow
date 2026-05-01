import api from './api';

export const getAnimals        = ()          => api.get('/animals');
export const getAnimalSummary  = ()          => api.get('/animals/summary');
export const getWeighingDue    = ()          => api.get('/animals/weighing-due');
export const getFollowUpsDue   = ()          => api.get('/animals/follow-ups-due');
export const getAnimalById    = (id)         => api.get(`/animals/${id}`);
export const createAnimal     = (formData)   => api.post('/animals', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAnimal     = (id, formData) => api.put(`/animals/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteAnimal     = (id)         => api.delete(`/animals/${id}`);

export const addWeightEntry    = (id, data)      => api.post(`/animals/${id}/weight`, data);
export const deleteWeightEntry = (id, entryId)   => api.delete(`/animals/${id}/weight/${entryId}`);

export const addVaccinationEntry    = (id, data)    => api.post(`/animals/${id}/vaccination`, data);
export const deleteVaccinationEntry = (id, entryId) => api.delete(`/animals/${id}/vaccination/${entryId}`);

export const getMedicalRecords    = (id)              => api.get(`/animals/${id}/medical`);
export const addMedicalRecord     = (id, data)        => api.post(`/animals/${id}/medical`, data);
export const updateMedicalRecord  = (id, recId, data) => api.patch(`/animals/${id}/medical/${recId}`, data);
export const deleteMedicalRecord  = (id, recId)       => api.delete(`/animals/${id}/medical/${recId}`);
