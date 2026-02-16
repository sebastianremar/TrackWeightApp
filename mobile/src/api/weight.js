import { api } from './client';

export function logWeight(weight, date) {
  return api('/api/weight', {
    method: 'POST',
    body: JSON.stringify({ weight, date }),
  });
}

export function getWeightHistory(params = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.limit) qs.set('limit', params.limit);
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return api(`/api/weight${query ? '?' + query : ''}`);
}

export function getLatestWeight() {
  return api('/api/weight/latest');
}

export function deleteWeight(date) {
  return api(`/api/weight/${date}`, { method: 'DELETE' });
}
