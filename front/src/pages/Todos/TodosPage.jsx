import { useState, useMemo } from 'react';
import { useTodos } from '../../hooks/useTodos';
import { useCategories } from '../../hooks/useCategories';
import TodoItem from './TodoItem';
import TodoModal from './TodoModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './TodosPage.module.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function sortTodos(todos, sortBy) {
  return [...todos].sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortBy === 'priority') {
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    }
    // newest
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

export default function TodosPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { todos, loading, error, addTodo, editTodo, toggleTodo, removeTodo, refetch } = useTodos();
  const { categories, addCategory } = useCategories();

  // Filter + sort
  const filtered = useMemo(() => {
    let list = todos.filter((t) => t.completed === showCompleted);
    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }
    return sortTodos(list, sortBy);
  }, [todos, showCompleted, categoryFilter, sortBy]);

  const handleToggleView = (completed) => {
    setShowCompleted(completed);
    refetch(completed, categoryFilter || undefined);
  };

  const handleCategoryFilter = (cat) => {
    setCategoryFilter(cat);
    refetch(showCompleted, cat || undefined);
  };

  const handleOpenCreate = () => { setEditingTodo(null); setModalOpen(true); };
  const handleOpenEdit = (todo) => { setEditingTodo(todo); setModalOpen(true); };

  const handleSave = async (data, newCategoryName) => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      await addCategory(newCategoryName);
    }
    if (editingTodo) {
      await editTodo(editingTodo.todoId, data);
    } else {
      await addTodo(data);
    }
    setModalOpen(false);
  };

  const handleToggle = async (id, completed) => {
    await toggleTodo(id, completed);
  };

  const handleDelete = (todo) => {
    setDeleteTarget(todo);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await removeTodo(deleteTarget.todoId);
      setDeleteTarget(null);
      // Close edit modal if we deleted from there
      if (editingTodo?.todoId === deleteTarget.todoId) {
        setModalOpen(false);
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Todos</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.chipBar}>
          <button
            className={`${styles.chip} ${!categoryFilter ? styles.chipActive : ''}`}
            onClick={() => handleCategoryFilter('')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`${styles.chip} ${categoryFilter === c ? styles.chipActive : ''}`}
              onClick={() => handleCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className={styles.sortBar}>
          <div className={styles.toggleRow}>
            <button
              className={`${styles.toggleBtn} ${!showCompleted ? styles.toggleActive : ''}`}
              onClick={() => handleToggleView(false)}
            >
              Active
            </button>
            <button
              className={`${styles.toggleBtn} ${showCompleted ? styles.toggleActive : ''}`}
              onClick={() => handleToggleView(true)}
            >
              Completed
            </button>
          </div>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {error && <InlineError message={error} />}

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            message={showCompleted ? 'No completed todos' : 'No active todos'}
            action={!showCompleted ? { label: 'Add Todo', onClick: handleOpenCreate } : undefined}
          />
        </div>
      ) : (
        <div className={styles.todoList}>
          {filtered.map((todo) => (
            <TodoItem
              key={todo.todoId}
              todo={todo}
              onToggle={handleToggle}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <button className={styles.fab} onClick={handleOpenCreate} aria-label="New todo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <TodoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={editingTodo ? () => { handleDelete(editingTodo); setModalOpen(false); } : null}
        todo={editingTodo}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Todo"
        message={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
