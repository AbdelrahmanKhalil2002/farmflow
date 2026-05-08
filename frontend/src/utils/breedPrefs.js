// Persistent breed preferences per farm, stored in localStorage.
// Keys: { [farmId]: { [subtypeId]: string[] } }
const STORAGE_KEY = 'farmflow_breed_prefs_v1';

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

const save = (prefs) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }
  catch {}
};

/**
 * Get the breeds the farmer has configured for a given farm + subtype.
 * Returns null if the farmer hasn't configured preferences yet (show all defaults).
 */
export const getConfiguredBreeds = (farmId, subtypeId) => {
  if (!farmId || !subtypeId) return null;
  const prefs = load();
  const selected = prefs[farmId]?.[subtypeId];
  return Array.isArray(selected) && selected.length > 0 ? selected : null;
};

/**
 * Resolve which breeds to show: configured list if set, otherwise all defaults.
 */
export const resolveBreeds = (farmId, subtypeId, allBreeds = []) => {
  const configured = getConfiguredBreeds(farmId, subtypeId);
  return configured ?? allBreeds;
};

/**
 * Save breed preferences for a farm + subtype.
 */
export const saveBreedPrefs = (farmId, subtypeId, breeds) => {
  if (!farmId || !subtypeId) return;
  const prefs = load();
  if (!prefs[farmId]) prefs[farmId] = {};
  prefs[farmId][subtypeId] = breeds;
  save(prefs);
};

/**
 * Get all breed prefs for a farm (returns { subtypeId: string[] }).
 */
export const getFarmBreedPrefs = (farmId) => {
  if (!farmId) return {};
  return load()[farmId] || {};
};
