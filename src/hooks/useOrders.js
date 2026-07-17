import { useState, useEffect, useCallback } from 'react';
import { getOrders } from '../firebase/orders.js';

export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getOrders(filters);
      setOrders(list);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.eventType, filters.searchName, filters.searchPhone, filters.searchDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, error, reload: load };
};
