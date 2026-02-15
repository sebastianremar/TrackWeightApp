import { useState, useEffect, useCallback } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ completed: false, category: undefined });

  const fetchTodos = useCallback(async (completed, category) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodos(completed, category);
      setTodos(data.todos || []);
    } catch (err) {
      setError(err.message);
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
    const data = await createTodo(fields);
    setTodos((prev) => [...prev, data.todo]);
    return data.todo;
  }, []);

  const editTodo = useCallback(async (id, fields) => {
    const data = await updateTodo(id, fields);
    setTodos((prev) => prev.map((t) => (t.todoId === id ? data.todo : t)));
    return data.todo;
  }, []);

  const toggleTodo = useCallback(async (id, completed) => {
    const data = await updateTodo(id, { completed });
    setTodos((prev) => prev.map((t) => (t.todoId === id ? data.todo : t)));
    return data.todo;
  }, []);

  const removeTodo = useCallback(async (id) => {
    await deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.todoId !== id));
  }, []);

  return { todos, loading, error, addTodo, editTodo, toggleTodo, removeTodo, refetch };
}
