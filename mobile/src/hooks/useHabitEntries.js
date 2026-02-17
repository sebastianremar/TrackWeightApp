import { useState, useCallback, useRef, useEffect } from 'react';
import { getAllHabitEntries, logHabitEntry, deleteHabitEntry, updateHabitEntryNote } from '../api/habitEntries';

export function useHabitEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimers = useRef({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchEntries = useCallback(async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllHabitEntries({ from, to });
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleEntry = useCallback(async (habitId, date, isCompleted) => {
    if (isCompleted) {
      setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
      try {
        await deleteHabitEntry(habitId, date);
      } catch (err) {
        setEntries((prev) => [...prev, { habitId, date, completed: true, note: '' }]);
        throw err;
      }
    } else {
      setEntries((prev) => [...prev, { habitId, date, completed: true, note: '' }]);
      try {
        await logHabitEntry(habitId, date);
      } catch (err) {
        setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
        throw err;
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
      updateHabitEntryNote(habitId, date, note).catch(() => {});
    }, 1000);
  }, []);

  return { entries, loading, error, fetchEntries, toggleEntry, updateNote };
}
