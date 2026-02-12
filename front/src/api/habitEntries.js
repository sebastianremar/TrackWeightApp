import { api } from './client';

export function logHabitEntry(habitId, date) {
  return api(`/api/habits/${habitId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export function deleteHabitEntry(habitId, date) {
  return api(`/api/habits/${habitId}/entries/${date}`, { method: 'DELETE' });
}

export function getHabitEntries(habitId, params = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.limit) qs.set('limit', params.limit);
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return api(`/api/habits/${habitId}/entries${query ? '?' + query : ''}`);
}

export function getAllHabitEntries(params = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.limit) qs.set('limit', params.limit);
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return api(`/api/habits/entries/all${query ? '?' + query : ''}`);
}

export function getHabitStats(habitId, weeks = 4) {
  return api(`/api/habits/${habitId}/stats?weeks=${weeks}`);
}
