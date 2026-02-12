import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { updateProfile } from '../api/auth';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const [palette, setPaletteState] = useState(() => {
    return document.documentElement.dataset.palette || 'ethereal-ivory';
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('palette', palette);
  }, [palette]);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      updateProfile({ darkMode: next }).catch(() => {});
      return next;
    });
  }, []);

  const setDarkMode = useCallback((value) => {
    setDark(value);
  }, []);

  const setPalette = useCallback((value) => {
    setPaletteState(value);
    updateProfile({ palette: value }).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, setDarkMode, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
