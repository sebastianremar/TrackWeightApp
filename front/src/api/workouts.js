import { api } from './client';

// --- Routines ---

export function createRoutine(data) {
  return api('/api/workouts/routines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getRoutines() {
  return api('/api/workouts/routines');
}

export function getRoutine(id) {
  return api(`/api/workouts/routines/${encodeURIComponent(id)}`);
}

export function updateRoutine(id, fields) {
  return api(`/api/workouts/routines/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteRoutine(id) {
  return api(`/api/workouts/routines/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// --- Logs ---

export function createLog(data) {
  return api('/api/workouts/logs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getLogs({ from, to, limit, cursor } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  return api(`/api/workouts/logs${qs ? '?' + qs : ''}`);
}

export function getLog(id) {
  return api(`/api/workouts/logs/${encodeURIComponent(id)}`);
}

export function updateLog(id, fields) {
  return api(`/api/workouts/logs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteLog(id) {
  return api(`/api/workouts/logs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
