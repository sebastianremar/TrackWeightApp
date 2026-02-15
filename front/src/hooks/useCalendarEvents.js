import { useState, useCallback } from 'react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/calendar';

export function useCalendarEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents(from, to);
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (fields) => {
    const data = await createCalendarEvent(fields);
    setEvents((prev) => [...prev, data.event]);
    return data.event;
  }, []);

  const editEvent = useCallback(async (id, fields) => {
    const data = await updateCalendarEvent(id, fields);
    setEvents((prev) => prev.map((e) => (e.eventId === id ? data.event : e)));
    return data.event;
  }, []);

  const removeEvent = useCallback(async (id) => {
    await deleteCalendarEvent(id);
    setEvents((prev) => prev.filter((e) => e.eventId !== id));
  }, []);

  return { events, loading, error, fetchEvents, addEvent, editEvent, removeEvent };
}
