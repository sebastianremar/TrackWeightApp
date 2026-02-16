import { useState, useCallback } from 'react';
import { getExercises, createExercise, deleteExercise } from '../api/workouts';

export function useExercises() {
  const [library, setLibrary] = useState([]);
  const [custom, setCustom] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExercises();
      setLibrary(data.library || []);
      setCustom(data.custom || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCustom = useCallback(async (data) => {
    const res = await createExercise(data);
    setCustom((prev) => [...prev, res.exercise]);
    return res.exercise;
  }, []);

  const removeCustom = useCallback(async (id) => {
    await deleteExercise(id);
    setCustom((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { library, custom, loading, error, fetchExercises, addCustom, removeCustom };
}
