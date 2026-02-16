import { useState, useCallback } from 'react';
import { getLogs, createLog, updateLog, deleteLog } from '../api/workouts';

export function useWorkoutLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchLogs = useCallback(async ({ from, to, limit, cursor, append } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLogs({ from, to, limit, cursor });
      if (append) {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      } else {
        setLogs(data.logs || []);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLog = useCallback(async (data) => {
    const res = await createLog(data);
    setLogs((prev) => [res.log, ...prev]);
    return res.log;
  }, []);

  const editLog = useCallback(async (id, fields) => {
    const res = await updateLog(id, fields);
    setLogs((prev) => prev.map((l) => (l.logId === id ? res.log : l)));
    return res.log;
  }, []);

  const removeLog = useCallback(async (id) => {
    await deleteLog(id);
    setLogs((prev) => prev.filter((l) => l.logId !== id));
  }, []);

  return { logs, loading, error, nextCursor, fetchLogs, addLog, editLog, removeLog };
}
