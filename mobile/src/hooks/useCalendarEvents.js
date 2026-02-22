import { useState, useCallback } from 'react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/calendar';
import {
  getCachedCalendarEvents,
  cacheCalendarEvents,
  cacheCalendarEvent,
  cacheDeleteCalendarEvent,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useCalendarEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (from, to) => {
    // 1. Load from cache first
    try {
      const cached = await getCachedCalendarEvents(from, to);
      if (cached.length > 0) {
        setEvents(cached);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents(from, to);
      const fetched = data.events || [];
      setEvents(fetched);
      cacheCalendarEvents(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (fields) => {
    try {
      const data = await createCalendarEvent(fields);
      setEvents((prev) => [...prev, data.event]);
      cacheCalendarEvent(data.event, 1).catch(() => {});
      return data.event;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const event = { eventId: tempId, ...fields };
        setEvents((prev) => [...prev, event]);
        cacheCalendarEvent(event, 0).catch(() => {});
        await enqueue('POST', '/api/calendar', fields, 'calendar_events', tempId, tempId);
        return event;
      }
      throw err;
    }
  }, []);

  const editEvent = useCallback(async (id, fields) => {
    try {
      const data = await updateCalendarEvent(id, fields);
      setEvents((prev) => prev.map((e) => (e.eventId === id ? data.event : e)));
      cacheCalendarEvent(data.event, 1).catch(() => {});
      return data.event;
    } catch (err) {
      if (isOfflineError(err)) {
        setEvents((prev) => prev.map((e) => (e.eventId === id ? { ...e, ...fields } : e)));
        await enqueue('PATCH', `/api/calendar/${encodeURIComponent(id)}`, fields, 'calendar_events', id);
        return { id, ...fields };
      }
      throw err;
    }
  }, []);

  const removeEvent = useCallback(async (id) => {
    setEvents((prev) => prev.filter((e) => e.eventId !== id));
    try {
      await deleteCalendarEvent(id);
      cacheDeleteCalendarEvent(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteCalendarEvent(id).catch(() => {});
        await enqueue('DELETE', `/api/calendar/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { events, loading, error, fetchEvents, addEvent, editEvent, removeEvent };
}
