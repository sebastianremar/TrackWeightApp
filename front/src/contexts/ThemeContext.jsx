import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { updateProfile } from '../api/auth';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

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

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
