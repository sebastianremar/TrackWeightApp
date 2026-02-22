import { useState, useCallback } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/workouts';
import {
  getCachedTemplates,
  cacheTemplates,
  cacheTemplate,
  cacheDeleteTemplate,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    // 1. Load from cache first
    try {
      const cached = await getCachedTemplates();
      if (cached.length > 0) {
        setTemplates(cached);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplates();
      const fetched = data.templates || [];
      setTemplates(fetched);
      cacheTemplates(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTemplate = useCallback(async (data) => {
    try {
      const res = await createTemplate(data);
      setTemplates((prev) => [...prev, res.template]);
      cacheTemplate(res.template, 1).catch(() => {});
      return res.template;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const template = { routineId: tempId, ...data };
        setTemplates((prev) => [...prev, template]);
        cacheTemplate(template, 0).catch(() => {});
        await enqueue('POST', '/api/workouts/templates', data, 'templates', tempId, tempId);
        return template;
      }
      throw err;
    }
  }, []);

  const editTemplate = useCallback(async (id, fields) => {
    try {
      const res = await updateTemplate(id, fields);
      setTemplates((prev) => prev.map((t) => (t.routineId === id ? res.template : t)));
      cacheTemplate(res.template, 1).catch(() => {});
      return res.template;
    } catch (err) {
      if (isOfflineError(err)) {
        setTemplates((prev) => prev.map((t) => (t.routineId === id ? { ...t, ...fields } : t)));
        await enqueue('PATCH', `/api/workouts/templates/${encodeURIComponent(id)}`, fields, 'templates', id);
        return { id, ...fields };
      }
      throw err;
    }
  }, []);

  const removeTemplate = useCallback(async (id) => {
    setTemplates((prev) => prev.filter((t) => t.routineId !== id));
    try {
      await deleteTemplate(id);
      cacheDeleteTemplate(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteTemplate(id).catch(() => {});
        await enqueue('DELETE', `/api/workouts/templates/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { templates, loading, error, fetchTemplates, addTemplate, editTemplate, removeTemplate };
}
