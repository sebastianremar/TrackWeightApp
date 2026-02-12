import { useState, useEffect, useCallback } from 'react';
import { getHabits, createHabit, updateHabit, archiveHabit } from '../api/habits';

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHabits();
      setHabits(data.habits || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const addHabit = useCallback(async (name, targetFrequency, color) => {
    const data = await createHabit(name, targetFrequency, color);
    setHabits((prev) => [...prev, data.habit]);
    return data.habit;
  }, []);

  const editHabit = useCallback(async (id, fields) => {
    const data = await updateHabit(id, fields);
    setHabits((prev) => prev.map((h) => (h.habitId === id ? data.habit : h)));
    return data.habit;
  }, []);

  const removeHabit = useCallback(async (id) => {
    await archiveHabit(id);
    setHabits((prev) => prev.filter((h) => h.habitId !== id));
  }, []);

  return { habits, loading, error, addHabit, editHabit, removeHabit, refetch: fetchHabits };
}
