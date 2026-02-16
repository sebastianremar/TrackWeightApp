import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHabitEntries } from '../useHabitEntries';
import {
  getAllHabitEntries,
  logHabitEntry,
  deleteHabitEntry,
  updateHabitEntryNote,
} from '../../api/habitEntries';

vi.mock('../../api/habitEntries', () => ({
  getAllHabitEntries: vi.fn(),
  logHabitEntry: vi.fn(),
  deleteHabitEntry: vi.fn(),
  updateHabitEntryNote: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useHabitEntries', () => {
  test('fetchEntries loads entries and sets loading', async () => {
    const mockEntries = [
      { habitId: 'h1', date: '2026-02-10', completed: true, note: '' },
      { habitId: 'h2', date: '2026-02-11', completed: true, note: 'good' },
    ];
    getAllHabitEntries.mockResolvedValueOnce({ entries: mockEntries });

    const { result } = renderHook(() => useHabitEntries());

    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toEqual([]);

    await act(async () => {
      await result.current.fetchEntries('2026-02-01', '2026-02-28');
    });

    expect(getAllHabitEntries).toHaveBeenCalledWith({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(result.current.entries).toEqual(mockEntries);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('fetchEntries sets error on API failure', async () => {
    getAllHabitEntries.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHabitEntries());

    await act(async () => {
      await result.current.fetchEntries('2026-02-01', '2026-02-28');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.entries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  test('toggleEntry (uncomplete -> complete) adds entry optimistically', async () => {
    logHabitEntry.mockResolvedValueOnce({});

    const { result } = renderHook(() => useHabitEntries());

    await act(async () => {
      await result.current.toggleEntry('h1', '2026-02-15', false);
    });

    expect(result.current.entries).toEqual([
      { habitId: 'h1', date: '2026-02-15', completed: true, note: '' },
    ]);
    expect(logHabitEntry).toHaveBeenCalledWith('h1', '2026-02-15');
  });

  test('toggleEntry (complete -> uncomplete) removes entry optimistically', async () => {
    const mockEntries = [
      { habitId: 'h1', date: '2026-02-15', completed: true, note: '' },
      { habitId: 'h2', date: '2026-02-15', completed: true, note: '' },
    ];
    getAllHabitEntries.mockResolvedValueOnce({ entries: mockEntries });
    deleteHabitEntry.mockResolvedValueOnce({});

    const { result } = renderHook(() => useHabitEntries());

    // Load initial entries
    await act(async () => {
      await result.current.fetchEntries('2026-02-01', '2026-02-28');
    });

    expect(result.current.entries).toHaveLength(2);

    await act(async () => {
      await result.current.toggleEntry('h1', '2026-02-15', true);
    });

    expect(result.current.entries).toEqual([
      { habitId: 'h2', date: '2026-02-15', completed: true, note: '' },
    ]);
    expect(deleteHabitEntry).toHaveBeenCalledWith('h1', '2026-02-15');
  });

  test('toggleEntry rolls back on API failure', async () => {
    logHabitEntry.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useHabitEntries());

    expect(result.current.entries).toEqual([]);

    await act(async () => {
      await expect(
        result.current.toggleEntry('h1', '2026-02-15', false),
      ).rejects.toThrow('Server error');
    });

    // Entry should be rolled back (removed) after failure
    expect(result.current.entries).toEqual([]);
  });

  describe('updateNote', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('debounces API call and updates local state immediately', async () => {
      const mockEntries = [
        { habitId: 'h1', date: '2026-02-15', completed: true, note: '' },
      ];
      getAllHabitEntries.mockResolvedValueOnce({ entries: mockEntries });
      updateHabitEntryNote.mockResolvedValue({});

      const { result } = renderHook(() => useHabitEntries());

      // Load initial entries
      await act(async () => {
        await result.current.fetchEntries('2026-02-01', '2026-02-28');
      });

      // Call updateNote - local state should update immediately
      act(() => {
        result.current.updateNote('h1', '2026-02-15', 'first note');
      });

      expect(result.current.entries[0].note).toBe('first note');
      expect(updateHabitEntryNote).not.toHaveBeenCalled();

      // Call updateNote again before timer fires - should cancel previous
      act(() => {
        result.current.updateNote('h1', '2026-02-15', 'second note');
      });

      expect(result.current.entries[0].note).toBe('second note');
      expect(updateHabitEntryNote).not.toHaveBeenCalled();

      // Advance timer by 1000ms - only the last call should go through
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(updateHabitEntryNote).toHaveBeenCalledTimes(1);
      expect(updateHabitEntryNote).toHaveBeenCalledWith(
        'h1',
        '2026-02-15',
        'second note',
      );
    });
  });
});
