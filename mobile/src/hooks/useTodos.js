import { useState, useEffect, useCallback } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';
import { getCachedTodos, cacheTodos, cacheTodo, cacheDeleteTodo } from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError, generateTempId } from '../offline/syncEngine';

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ completed: false, category: undefined });

  const fetchTodos = useCallback(async (completed, category) => {
    // 1. Load from cache first
    try {
      const cached = await getCachedTodos(completed, category);
      if (cached.length > 0) {
        setTodos(cached);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setError(null);
    try {
      const data = await getTodos(completed, category);
      const fetched = data.todos || [];
      setTodos(fetched);
      cacheTodos(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos(filters.completed, filters.category);
  }, [fetchTodos, filters.completed, filters.category]);

  const refetch = useCallback((completed, category) => {
    setFilters({ completed, category });
  }, []);

  const addTodo = useCallback(async (fields) => {
    try {
      const data = await createTodo(fields);
      setTodos((prev) => [...prev, data.todo]);
      cacheTodo(data.todo, 1).catch(() => {});
      return data.todo;
    } catch (err) {
      if (isOfflineError(err)) {
        const tempId = generateTempId();
        const todo = { todoId: tempId, ...fields, completed: false };
        setTodos((prev) => [...prev, todo]);
        cacheTodo(todo, 0).catch(() => {});
        await enqueue('POST', '/api/todos', fields, 'todos', tempId, tempId);
        return todo;
      }
      throw err;
    }
  }, []);

  const editTodo = useCallback(async (id, fields) => {
    try {
      const data = await updateTodo(id, fields);
      setTodos((prev) => prev.map((t) => (t.todoId === id ? data.todo : t)));
      cacheTodo(data.todo, 1).catch(() => {});
      return data.todo;
    } catch (err) {
      if (isOfflineError(err)) {
        setTodos((prev) => prev.map((t) => (t.todoId === id ? { ...t, ...fields } : t)));
        await enqueue('PATCH', `/api/todos/${encodeURIComponent(id)}`, fields, 'todos', id);
        return { id, ...fields };
      }
      throw err;
    }
  }, []);

  const toggleTodo = useCallback(async (id, completed) => {
    // Optimistic update
    setTodos((prev) => prev.map((t) => (t.todoId === id ? { ...t, completed } : t)));
    try {
      const data = await updateTodo(id, { completed });
      setTodos((prev) => prev.map((t) => (t.todoId === id ? data.todo : t)));
      cacheTodo(data.todo, 1).catch(() => {});
      return data.todo;
    } catch (err) {
      if (isOfflineError(err)) {
        const updated = todos.find((t) => t.todoId === id);
        if (updated) cacheTodo({ ...updated, completed }, 0).catch(() => {});
        await enqueue('PATCH', `/api/todos/${encodeURIComponent(id)}`, { completed }, 'todos', id);
        return { ...updated, completed };
      }
      // Rollback
      setTodos((prev) => prev.map((t) => (t.todoId === id ? { ...t, completed: !completed } : t)));
      throw err;
    }
  }, [todos]);

  const removeTodo = useCallback(async (id) => {
    setTodos((prev) => prev.filter((t) => t.todoId !== id));
    try {
      await deleteTodo(id);
      cacheDeleteTodo(id).catch(() => {});
    } catch (err) {
      if (isOfflineError(err)) {
        cacheDeleteTodo(id).catch(() => {});
        await enqueue('DELETE', `/api/todos/${encodeURIComponent(id)}`, null, null, null);
      } else {
        throw err;
      }
    }
  }, []);

  return { todos, loading, error, addTodo, editTodo, toggleTodo, removeTodo, refetch };
}
