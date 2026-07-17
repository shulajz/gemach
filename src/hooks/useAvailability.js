import { useState, useEffect, useMemo } from 'react';
import { getItems } from '../firebase/items.js';
import { getReservationsForDate } from '../firebase/reservations.js';

/**
 * Returns a map itemId -> { available, reserved, maxQuantity } for the given date.
 * @param {string|null} dateStr - YYYY-MM-DD or null
 */
export const useAvailability = (dateStr) => {
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [itemsList, reserved] = await Promise.all([
          getItems(),
          dateStr ? getReservationsForDate(dateStr) : Promise.resolve({}),
        ]);
        if (!cancelled) {
          setItems(itemsList);
          setReservations(reserved);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[useAvailability]', e?.code || e?.message, e);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [dateStr]);

  const availabilityMap = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const reserved = Number(reservations[item.id]) || 0;
      const max = Number(item.maxQuantity) || 0;
      map[item.id] = { available: Math.max(0, max - reserved), reserved, maxQuantity: max };
    });
    return map;
  }, [items, reservations]);

  return { availabilityMap, items, loading, error };
};
