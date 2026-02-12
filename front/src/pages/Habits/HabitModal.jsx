import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './HabitModal.module.css';

const COLORS = ['#667eea', '#f56565', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac', '#e53e3e', '#4299e1'];

export default function HabitModal({ open, onClose, onSave, onDelete, habit }) {
  const [name, setName] = useState('');
  const [freq, setFreq] = useState(3);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setFreq(habit.targetFrequency);
      setColor(habit.color || COLORS[0]);
    } else {
      setName('');
      setFreq(3);
      setColor(COLORS[0]);
    }
    setError('');
  }, [habit, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), targetFrequency: freq, color });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Edit Habit' : 'New Habit'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Exercise"
            maxLength={100}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Weekly target</label>
          <div className={styles.freqRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.freqBtn} ${freq === n ? styles.freqActive : ''}`}
                onClick={() => setFreq(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Color</label>
          <div className={styles.colorRow}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorBtn} ${color === c ? styles.colorActive : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <InlineError message={error} />
        <div className={styles.actions}>
          {onDelete && (
            <button type="button" className={styles.deleteBtn} onClick={onDelete}>Archive</button>
          )}
          <button type="submit" className={styles.saveBtn} disabled={submitting}>
            {submitting ? 'Saving...' : habit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
