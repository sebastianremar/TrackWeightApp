import { api } from './client';

export function createHabit(name, targetFrequency, color) {
  return api('/api/habits', {
    method: 'POST',
    body: JSON.stringify({ name, targetFrequency, color }),
  });
}

export function getHabits(includeArchived = false) {
  const qs = includeArchived ? '?archived=true' : '';
  return api(`/api/habits${qs}`);
}

export function updateHabit(id, fields) {
  return api(`/api/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function archiveHabit(id) {
  return api(`/api/habits/${id}`, { method: 'DELETE' });
}
