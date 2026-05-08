import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMyFarms, migrateLegacy } from '../services/farmService';
import { useAuth } from './AuthContext';

const FarmContext = createContext(null);

const STORAGE_KEY = 'farmflow_active_farm';

export const FarmProvider = ({ children }) => {
  const { user } = useAuth();
  const [farms, setFarms]             = useState([]);
  const [activeFarm, setActiveFarm]   = useState(null);
  const [loading, setLoading]         = useState(false);

  const loadFarms = useCallback(async () => {
    if (!user || user.role !== 'seller') return;

    setLoading(true);
    try {
      const { data } = await getMyFarms();

      if (data.length === 0) {
        // Legacy seller with no Farm document yet — auto-migrate
        const { data: migrateRes } = await migrateLegacy();
        const migrated = [migrateRes.farm];
        setFarms(migrated);
        setActiveFarm(migrated[0]);
        localStorage.setItem(STORAGE_KEY, migrated[0]._id);
      } else {
        setFarms(data);

        // Restore last-used farm, or default to first
        const saved = localStorage.getItem(STORAGE_KEY);
        const found = data.find(f => f._id === saved) || data[0];
        setActiveFarm(found);
        localStorage.setItem(STORAGE_KEY, found._id);
      }
    } catch {
      // Non-fatal — seller can still use the app without farm context
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const switchFarm = (farm) => {
    setActiveFarm(farm);
    localStorage.setItem(STORAGE_KEY, farm._id);
  };

  const refreshFarms = () => loadFarms();

  const addFarm = (farm) => {
    setFarms(prev => [...prev, farm]);
  };

  const updateFarmInList = (updated) => {
    setFarms(prev => prev.map(f => f._id === updated._id ? updated : f));
    if (activeFarm?._id === updated._id) setActiveFarm(updated);
  };

  const removeFarm = (id) => {
    setFarms(prev => {
      const next = prev.filter(f => f._id !== id);
      if (activeFarm?._id === id && next.length > 0) {
        setActiveFarm(next[0]);
        localStorage.setItem(STORAGE_KEY, next[0]._id);
      }
      return next;
    });
  };

  return (
    <FarmContext.Provider value={{
      farms,
      activeFarm,
      loading,
      switchFarm,
      refreshFarms,
      addFarm,
      updateFarmInList,
      removeFarm,
    }}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => useContext(FarmContext);
