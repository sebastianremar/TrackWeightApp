import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../api/auth', () => ({
  getProfile: vi.fn(),
  signout: vi.fn(),
}));

import { getProfile, signout as apiSignout } from '../../api/auth';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  test('fetches profile on mount and sets user', async () => {
    const mockUser = { email: 'test@example.com', firstName: 'Sara' };
    getProfile.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // loading starts true
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  test('sets user to null when profile fetch fails', async () => {
    getProfile.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  test('login() sets user state', async () => {
    getProfile.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();

    const userData = { email: 'sara@example.com', firstName: 'Sara' };
    act(() => {
      result.current.login(userData);
    });

    expect(result.current.user).toEqual(userData);
  });

  test('logout() clears user and calls apiSignout', async () => {
    const mockUser = { email: 'test@example.com', firstName: 'Sara' };
    getProfile.mockResolvedValueOnce(mockUser);
    apiSignout.mockResolvedValueOnce({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      await result.current.logout();
    });

    expect(apiSignout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  test('updateUser() merges fields into existing user', async () => {
    const mockUser = { email: 'test@example.com', firstName: 'Test' };
    getProfile.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);

    act(() => {
      result.current.updateUser({ firstName: 'Updated' });
    });

    expect(result.current.user).toEqual({
      email: 'test@example.com',
      firstName: 'Updated',
    });
  });

  test('useAuth throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
