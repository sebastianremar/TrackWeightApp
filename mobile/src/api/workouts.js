import { api } from './client';

// --- Exercises ---

export function getExercises() {
  return api('/api/workouts/exercises');
}

export function createExercise(data) {
  return api('/api/workouts/exercises', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteExercise(id) {
  return api(`/api/workouts/exercises/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- Templates ---

export function getTemplates() {
  return api('/api/workouts/templates');
}

export function createTemplate(data) {
  return api('/api/workouts/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getTemplate(id) {
  return api(`/api/workouts/templates/${encodeURIComponent(id)}`);
}

export function updateTemplate(id, fields) {
  return api(`/api/workouts/templates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteTemplate(id) {
  return api(`/api/workouts/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getTemplatePrefill(id) {
  return api(`/api/workouts/templates/${encodeURIComponent(id)}/prefill`);
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
  return api(`/api/workouts/logs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
