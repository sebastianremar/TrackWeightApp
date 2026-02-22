import { useState, useCallback, useRef, useEffect } from 'react';
import { getAllHabitEntries, logHabitEntry, deleteHabitEntry, updateHabitEntryNote } from '../api/habitEntries';
import {
  getCachedHabitEntries,
  cacheHabitEntries,
  cacheHabitEntry,
  cacheDeleteHabitEntry,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError } from '../offline/syncEngine';

export function useHabitEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimers = useRef({});
  const lastRange = useRef({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchEntries = useCallback(async (from, to) => {
    lastRange.current = { from, to };

    // 1. Load from cache first
    try {
      const cached = await getCachedHabitEntries(from, to);
      if (cached.length > 0) {
        setEntries(cached);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setLoading(true);
    setError(null);
    try {
      const data = await getAllHabitEntries({ from, to });
      const fetched = data.entries || [];
      setEntries(fetched);
      cacheHabitEntries(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleEntry = useCallback(async (habitId, date, isCompleted) => {
    if (isCompleted) {
      // Optimistic remove
      setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
      try {
        await deleteHabitEntry(habitId, date);
        cacheDeleteHabitEntry(habitId, date).catch(() => {});
      } catch (err) {
        if (isOfflineError(err)) {
          cacheDeleteHabitEntry(habitId, date).catch(() => {});
          await enqueue(
            'DELETE',
            `/api/habits/${encodeURIComponent(habitId)}/entries/${date}`,
            null, null, null
          );
        } else {
          setEntries((prev) => [...prev, { habitId, date, completed: true, note: '' }]);
          throw err;
        }
      }
    } else {
      // Optimistic add
      setEntries((prev) => [...prev, { habitId, date, completed: true, note: '' }]);
      try {
        await logHabitEntry(habitId, date);
        cacheHabitEntry({ habitId, date, completed: true, note: '' }, 1).catch(() => {});
      } catch (err) {
        if (isOfflineError(err)) {
          cacheHabitEntry({ habitId, date, completed: true, note: '' }, 0).catch(() => {});
          await enqueue(
            'POST',
            `/api/habits/${encodeURIComponent(habitId)}/entries`,
            { date }, 'habit_entries', `${habitId}#${date}`
          );
        } else {
          setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
          throw err;
        }
      }
    }
  }, []);

  const updateNote = useCallback((habitId, date, note) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.habitId === habitId && e.date === date ? { ...e, note } : e,
      ),
    );

    const key = `${habitId}#${date}`;
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      delete debounceTimers.current[key];
      updateHabitEntryNote(habitId, date, note).catch((err) => {
        if (isOfflineError(err)) {
          cacheHabitEntry({ habitId, date, completed: true, note }, 0).catch(() => {});
          enqueue(
            'PATCH',
            `/api/habits/${encodeURIComponent(habitId)}/entries/${date}`,
            { note }, 'habit_entries', `${habitId}#${date}`
          ).catch(() => {});
        }
      });
    }, 1000);
  }, []);

  return { entries, loading, error, fetchEntries, toggleEntry, updateNote };
}
