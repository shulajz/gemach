import { useState, useEffect, useCallback } from 'react';
import { getImportantInfoSettings } from '../firebase/importantInfo.js';

export const useImportantInfo = () => {
  const [importantInfo, setImportantInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const value = await getImportantInfoSettings();
      setImportantInfo(value);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { importantInfo, loading, error, reload: load };
};
