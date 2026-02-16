import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRoutines, createRoutine, updateRoutine, deleteRoutine } from '../api/workouts';

export function useWorkoutRoutines() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutines();
      setRoutines(data.routines || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  const activeRoutine = useMemo(() => routines.find((r) => r.isActive), [routines]);

  const addRoutine = useCallback(async (data) => {
    const res = await createRoutine(data);
    if (data.isActive) {
      setRoutines((prev) => [...prev.map((r) => ({ ...r, isActive: false })), res.routine]);
    } else {
      setRoutines((prev) => [...prev, res.routine]);
    }
    return res.routine;
  }, []);

  const editRoutine = useCallback(async (id, fields) => {
    const res = await updateRoutine(id, fields);
    if (fields.isActive) {
      setRoutines((prev) =>
        prev.map((r) => (r.routineId === id ? res.routine : { ...r, isActive: false })),
      );
    } else {
      setRoutines((prev) => prev.map((r) => (r.routineId === id ? res.routine : r)));
    }
    return res.routine;
  }, []);

  const removeRoutine = useCallback(async (id) => {
    await deleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.routineId !== id));
  }, []);

  return { routines, activeRoutine, loading, error, addRoutine, editRoutine, removeRoutine, refetch: fetchRoutines };
}
