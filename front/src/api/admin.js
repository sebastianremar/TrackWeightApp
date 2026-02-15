import { api } from './client';

export function getAdminMetrics(period = '24h') {
  return api(`/api/admin/metrics?period=${period}`);
}

export function getUsersCount() {
  return api('/api/admin/users/count');
}
