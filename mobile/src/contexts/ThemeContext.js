import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { updateProfile } from '../api/auth';
import palettes from '../theme/palettes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [dark, setDark] = useState(systemScheme === 'dark');
  const [palette, setPaletteState] = useState('ethereal-ivory');
  const [weightUnit, setWeightUnitState] = useState('kg');

  const colors = useMemo(() => {
    const mode = dark ? 'dark' : 'light';
    return palettes[palette]?.[mode] ?? palettes['ethereal-ivory'][mode];
  }, [dark, palette]);

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

  const setWeightUnit = useCallback((value) => {
    setWeightUnitState(value);
    updateProfile({ weightUnit: value }).catch(() => {});
  }, []);

  const syncFromProfile = useCallback((profile) => {
    if (profile.darkMode !== undefined) setDark(profile.darkMode);
    if (profile.palette) setPaletteState(profile.palette);
    if (profile.weightUnit) setWeightUnitState(profile.weightUnit);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ dark, toggleDark, setDarkMode, palette, setPalette, weightUnit, setWeightUnit, syncFromProfile, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
