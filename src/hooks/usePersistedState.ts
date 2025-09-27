import { useState, useEffect, useCallback } from 'react';

export function usePersistedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  // Debounced storage update to prevent excessive writes
  const debouncedUpdate = useCallback(
    (() => {
      let timeout: number;
      return (value: T) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // Ignore storage errors
          }
        }, 300);
      };
    })(),
    [key]
  );

  useEffect(() => {
    debouncedUpdate(state);
  }, [state, debouncedUpdate]);

  return [state, setState];
}
