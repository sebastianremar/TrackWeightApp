import { useState, useCallback } from 'react';
import { getAllHabitEntries, logHabitEntry, deleteHabitEntry } from '../api/habitEntries';

export function useHabitEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    // Optimistic update
    if (isCompleted) {
      setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
      try {
        await deleteHabitEntry(habitId, date);
      } catch (err) {
        setEntries((prev) => [...prev, { habitId, date, completed: true }]);
        throw err;
      }
    } else {
      setEntries((prev) => [...prev, { habitId, date, completed: true }]);
      try {
        await logHabitEntry(habitId, date);
      } catch (err) {
        setEntries((prev) => prev.filter((e) => !(e.habitId === habitId && e.date === date)));
        throw err;
      }
    }
  }, []);

  return { entries, loading, error, fetchEntries, toggleEntry };
}
