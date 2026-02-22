import { useState, useEffect, useCallback } from 'react';
import { getHabits, createHabit, updateHabit, archiveHabit } from '../api/habits';
import { getCachedHabits, cacheHabits, cacheHabit, cacheDeleteHabit } from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHabits = useCallback(async () => {
    // 1. Load from cache first
    try {
      const cached = await getCachedHabits();
      if (cached.length > 0) {
        setHabits(cached);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API in background
    setError(null);
    try {
      const data = await getHabits();
      const fetched = data.habits || [];
      setHabits(fetched);
      cacheHabits(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const addHabit = useCallback(async (name, targetFrequency, color, type, limitPeriod) => {
    try {
      const data = await createHabit(name, targetFrequency, color, type, limitPeriod);
      setHabits((prev) => [...prev, data.habit]);
      cacheHabit(data.habit, 1).catch(() => {});
      return data.habit;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const habit = { habitId: tempId, name, targetFrequency, color, type, limitPeriod };
        setHabits((prev) => [...prev, habit]);
        cacheHabit(habit, 0).catch(() => {});
        const body = { name, targetFrequency, color };
        if (type) body.type = type;
        if (type === 'bad' && limitPeriod) body.limitPeriod = limitPeriod;
        await enqueue('POST', '/api/habits', body, 'habits', tempId, tempId);
        return habit;
      }
      throw err;
    }
  }, []);

  const editHabit = useCallback(async (id, fields) => {
    try {
      const data = await updateHabit(id, fields);
      setHabits((prev) => prev.map((h) => (h.habitId === id ? data.habit : h)));
      cacheHabit(data.habit, 1).catch(() => {});
      return data.habit;
    } catch (err) {
      if (isOfflineError(err)) {
        setHabits((prev) =>
          prev.map((h) => (h.habitId === id ? { ...h, ...fields } : h))
        );
        const updated = habits.find((h) => h.habitId === id);
        if (updated) cacheHabit({ ...updated, ...fields }, 0).catch(() => {});
        await enqueue('PATCH', `/api/habits/${encodeURIComponent(id)}`, fields, 'habits', id);
        return { ...updated, ...fields };
      }
      throw err;
    }
  }, [habits]);

  const removeHabit = useCallback(async (id) => {
    setHabits((prev) => prev.filter((h) => h.habitId !== id));
    try {
      await archiveHabit(id);
      cacheDeleteHabit(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteHabit(id).catch(() => {});
        await enqueue('DELETE', `/api/habits/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { habits, loading, error, addHabit, editHabit, removeHabit, refetch: fetchHabits };
}
