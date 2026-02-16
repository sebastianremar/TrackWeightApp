import { api } from './client';

export function getCalendarEvents(from, to) {
  const params = new URLSearchParams({ from, to });
  return api(`/api/calendar?${params}`);
}

export function createCalendarEvent(fields) {
  return api('/api/calendar', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export function updateCalendarEvent(id, fields) {
  return api(`/api/calendar/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteCalendarEvent(id) {
  return api(`/api/calendar/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
