import { useState, useCallback } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/workouts';

export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTemplate = useCallback(async (data) => {
    const res = await createTemplate(data);
    setTemplates((prev) => [...prev, res.template]);
    return res.template;
  }, []);

  const editTemplate = useCallback(async (id, fields) => {
    const res = await updateTemplate(id, fields);
    setTemplates((prev) => prev.map((t) => (t.routineId === id ? res.template : t)));
    return res.template;
  }, []);

  const removeTemplate = useCallback(async (id) => {
    await deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.routineId !== id));
  }, []);

  return { templates, loading, error, fetchTemplates, addTemplate, editTemplate, removeTemplate };
}
