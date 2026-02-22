import { useState, useCallback } from 'react';
import { getExercises, createExercise, deleteExercise } from '../api/workouts';
import {
  getCachedExercises,
  cacheExercises,
  cacheExercise,
  cacheDeleteExercise,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useExercises() {
  const [library, setLibrary] = useState([]);
  const [custom, setCustom] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExercises = useCallback(async () => {
    // 1. Load from cache first
    try {
      const cached = await getCachedExercises();
      if (cached.library.length > 0 || cached.custom.length > 0) {
        setLibrary(cached.library);
        setCustom(cached.custom);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setLoading(true);
    setError(null);
    try {
      const data = await getExercises();
      const lib = data.library || [];
      const cust = data.custom || [];
      setLibrary(lib);
      setCustom(cust);
      cacheExercises(lib, cust).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCustom = useCallback(async (data) => {
    try {
      const res = await createExercise(data);
      setCustom((prev) => [...prev, res.exercise]);
      cacheExercise(res.exercise, 'custom').catch(() => {});
      return res.exercise;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const exercise = { id: tempId, ...data };
        setCustom((prev) => [...prev, exercise]);
        cacheExercise(exercise, 'custom').catch(() => {});
        await enqueue('POST', '/api/workouts/exercises', data, 'exercises', tempId, tempId);
        return exercise;
      }
      throw err;
    }
  }, []);

  const removeCustom = useCallback(async (id) => {
    setCustom((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExercise(id);
      cacheDeleteExercise(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteExercise(id).catch(() => {});
        await enqueue('DELETE', `/api/workouts/exercises/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { library, custom, loading, error, fetchExercises, addCustom, removeCustom };
}
