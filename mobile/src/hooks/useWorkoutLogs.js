import { useState, useCallback } from 'react';
import { getLogs, createLog, updateLog, deleteLog } from '../api/workouts';
import {
  getCachedWorkoutLogs,
  cacheWorkoutLogs,
  cacheWorkoutLog,
  cacheDeleteWorkoutLog,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useWorkoutLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchLogs = useCallback(async ({ from, to, limit, cursor, append } = {}) => {
    // 1. Load from cache first (only on initial load, not pagination)
    if (!cursor && !append) {
      try {
        const cached = await getCachedWorkoutLogs(from, to);
        if (cached.length > 0) {
          setLogs(cached);
          setLoading(false);
        }
      } catch {}
    }

    // 2. Fetch from API
    setLoading(true);
    setError(null);
    try {
      const data = await getLogs({ from, to, limit, cursor });
      if (append) {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      } else {
        setLogs(data.logs || []);
        // Cache the full result set (not appended pages)
        cacheWorkoutLogs(data.logs || []).catch(() => {});
      }
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLog = useCallback(async (data) => {
    try {
      const res = await createLog(data);
      setLogs((prev) => [res.log, ...prev]);
      cacheWorkoutLog(res.log, 1).catch(() => {});
      return res.log;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const log = { logId: tempId, ...data, date: data.date || new Date().toISOString().split('T')[0] };
        setLogs((prev) => [log, ...prev]);
        cacheWorkoutLog(log, 0).catch(() => {});
        await enqueue('POST', '/api/workouts/logs', data, 'workout_logs', tempId, tempId);
        return log;
      }
      throw err;
    }
  }, []);

  const editLog = useCallback(async (id, fields) => {
    try {
      const res = await updateLog(id, fields);
      setLogs((prev) => prev.map((l) => (l.logId === id ? res.log : l)));
      cacheWorkoutLog(res.log, 1).catch(() => {});
      return res.log;
    } catch (err) {
      if (isOfflineError(err)) {
        setLogs((prev) => prev.map((l) => (l.logId === id ? { ...l, ...fields } : l)));
        await enqueue('PATCH', `/api/workouts/logs/${encodeURIComponent(id)}`, fields, 'workout_logs', id);
        return { id, ...fields };
      }
      throw err;
    }
  }, []);

  const removeLog = useCallback(async (id) => {
    setLogs((prev) => prev.filter((l) => l.logId !== id));
    try {
      await deleteLog(id);
      cacheDeleteWorkoutLog(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteWorkoutLog(id).catch(() => {});
        await enqueue('DELETE', `/api/workouts/logs/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { logs, loading, error, nextCursor, fetchLogs, addLog, editLog, removeLog };
}
