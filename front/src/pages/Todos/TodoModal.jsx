import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './TodoModal.module.css';

export default function TodoModal({ open, onClose, onSave, onDelete, todo, categories }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setDueDate(todo.dueDate || '');
      setPriority(todo.priority || 'medium');
      setCategory(todo.category || '');
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('');
    }
    setNewCategory('');
    setShowNewCat(false);
    setError('');
  }, [todo, open]);

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setShowNewCat(true);
      setCategory('');
    } else {
      setShowNewCat(false);
      setCategory(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }

    const finalCategory = showNewCat ? newCategory.trim() : category;

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description || undefined,
        dueDate: dueDate || undefined,
        priority,
        category: finalCategory || undefined,
      }, showNewCat && newCategory.trim() ? newCategory.trim() : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={todo ? 'Edit Todo' : 'New Todo'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            maxLength={200}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            maxLength={1000}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Due Date</label>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select
              className={styles.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Category</label>
          <select
            className={styles.select}
            value={showNewCat ? '__new__' : category}
            onChange={handleCategoryChange}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__new__">+ New category...</option>
          </select>
          {showNewCat && (
            <input
              className={styles.input}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              maxLength={50}
              autoFocus
            />
          )}
        </div>

        <InlineError message={error} />

        <div className={styles.actions}>
          {onDelete && (
            <button type="button" className={styles.deleteBtn} onClick={onDelete}>Delete</button>
          )}
          <button type="submit" className={styles.saveBtn} disabled={submitting}>
            {submitting ? 'Saving...' : todo ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
