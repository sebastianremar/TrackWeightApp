import { api } from './client';

export function createTodo({ title, description, dueDate, priority, category }) {
  return api('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title, description, dueDate, priority, category }),
  });
}

export function getTodos(completed, category) {
  const params = new URLSearchParams();
  if (completed !== undefined) params.set('completed', String(completed));
  if (category) params.set('category', category);
  const qs = params.toString();
  return api(`/api/todos${qs ? '?' + qs : ''}`);
}

export function updateTodo(id, fields) {
  return api(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteTodo(id) {
  return api(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
