import { useState, useEffect, useCallback, useRef } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
};

export const useDebouncedCallback = (callback, delay) => {
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef(null);
  const cb = useCallback(
    (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPending(true);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        setPending(false);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay]
  );
  return [cb, pending];
};
