import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

vi.mock('../../api/weight', () => ({
  getWeightHistory: vi.fn(),
}));

import { getWeightHistory } from '../../api/weight';
import { useWeightData } from '../useWeightData';

const mockEntries = [
  { date: '2024-01-01', weight: 180 },
  { date: '2024-01-08', weight: 178 },
  { date: '2024-01-15', weight: 176 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useWeightData', () => {
  test('returns null stats when entries is empty', async () => {
    getWeightHistory.mockResolvedValueOnce({ entries: [] });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.current).toBeNull();
    expect(result.current.stats.avgWeeklyChange).toBeNull();
    expect(result.current.stats.weekOverWeek).toBeNull();
    expect(result.current.stats.lowest).toBeNull();
    expect(result.current.stats.highest).toBeNull();
    expect(result.current.stats.average).toBeNull();
  });

  test('calculates current weight correctly', async () => {
    // Provide entries out of chronological order to verify sorting
    const unordered = [
      { date: '2024-01-15', weight: 176 },
      { date: '2024-01-01', weight: 180 },
      { date: '2024-01-08', weight: 178 },
    ];
    getWeightHistory.mockResolvedValueOnce({ entries: unordered });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Current should be the most recent by date, not by array index
    expect(result.current.stats.current).toBe(176);
  });

  test('calculates lowest and highest', async () => {
    getWeightHistory.mockResolvedValueOnce({ entries: mockEntries });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.lowest).toBe(176);
    expect(result.current.stats.highest).toBe(180);
  });

  test('calculates average correctly', async () => {
    getWeightHistory.mockResolvedValueOnce({ entries: mockEntries });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // (180 + 178 + 176) / 3 = 178.0
    expect(result.current.stats.average).toBe(178);
  });

  test('calculates avgWeeklyChange', async () => {
    // Entries span exactly 2 weeks (Jan 1 to Jan 15 = 14 days = 2 weeks)
    getWeightHistory.mockResolvedValueOnce({ entries: mockEntries });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // avgWeeklyChange = (current - first) / weeks = (176 - 180) / 2 = -2.00
    expect(result.current.stats.avgWeeklyChange).toBe(-2);
  });

  test('single entry returns current = that weight, avgWeeklyChange = 0', async () => {
    getWeightHistory.mockResolvedValueOnce({
      entries: [{ date: '2024-01-01', weight: 185 }],
    });

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.current).toBe(185);
    // weeks = Math.max(1, 0) = 1, avgWeeklyChange = (185 - 185) / 1 = 0
    expect(result.current.stats.avgWeeklyChange).toBe(0);
    // Only one entry, weekOverWeek requires entries in both this and last week
    expect(result.current.stats.weekOverWeek).toBeNull();
  });

  test('sets loading to true during fetch, false after', async () => {
    let resolvePromise;
    getWeightHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useWeightData());

    // Initially loading is true
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({ entries: [] });
    });

    expect(result.current.loading).toBe(false);
  });

  test('sets error on API failure', async () => {
    getWeightHistory.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWeightData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.entries).toEqual([]);
  });
});
