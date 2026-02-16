import { api } from './client';

export function createHabit(name, targetFrequency, color, type, limitPeriod) {
  const body = { name, targetFrequency, color };
  if (type) body.type = type;
  if (type === 'bad' && limitPeriod) body.limitPeriod = limitPeriod;
  return api('/api/habits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getHabits(includeArchived = false) {
  const qs = includeArchived ? '?archived=true' : '';
  return api(`/api/habits${qs}`);
}

export function updateHabit(id, fields) {
  return api(`/api/habits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function archiveHabit(id) {
  return api(`/api/habits/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
