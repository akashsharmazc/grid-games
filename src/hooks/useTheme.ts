import { useEffect } from 'react';
import type { Theme } from '../types';
import { THEME_CONFIGS } from '../constants';
import { usePersistedState } from './usePersistedState';

export function useTheme() {
  const [theme, setTheme] = usePersistedState<Theme>("grid-games.theme", "light");

  // Apply theme CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    const vars = THEME_CONFIGS[theme];
    
    // Batch DOM updates
    requestAnimationFrame(() => {
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    });
  }, [theme]);

  return { theme, setTheme };
}
