import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

vi.mock('../../api/auth', () => ({
  updateProfile: vi.fn(() => Promise.resolve()),
}));

import { updateProfile } from '../../api/auth';

const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.classList.remove('dark');
  document.documentElement.dataset.palette = '';
});

describe('ThemeContext', () => {
  test('toggleDark toggles dark mode and updates DOM', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.dark).toBe(false);

    act(() => {
      result.current.toggleDark();
    });

    expect(result.current.dark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('toggleDark saves to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleDark();
    });

    expect(localStorage.getItem('darkMode')).toBe('true');
  });

  test('setPalette updates palette and saves to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setPalette('midnight-bloom');
    });

    expect(result.current.palette).toBe('midnight-bloom');
    expect(document.documentElement.dataset.palette).toBe('midnight-bloom');
    expect(localStorage.getItem('palette')).toBe('midnight-bloom');
    expect(updateProfile).toHaveBeenCalledWith({ palette: 'midnight-bloom' });
  });

  test('syncFromProfile applies settings', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.syncFromProfile({ darkMode: true, palette: 'midnight-bloom' });
    });

    expect(result.current.dark).toBe(true);
    expect(result.current.palette).toBe('midnight-bloom');
  });

  test('useTheme throws outside provider', () => {
    // Suppress console.error from React for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within ThemeProvider');

    spy.mockRestore();
  });
});
