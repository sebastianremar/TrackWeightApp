import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import Toggle from '../../components/Toggle/Toggle';
import InlineError from '../../components/InlineError/InlineError';
import styles from './RoutineModal.module.css';

export default function RoutineModal({ open, onClose, onSave, onDelete, routine }) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName(routine?.name || '');
      setIsActive(routine?.isActive ?? true);
      setError(null);
    }
  }, [open, routine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = { name: name.trim(), isActive };
      if (!routine) {
        data.schedule = {
          '1': {
            label: 'Day 1',
            exercises: [{ name: 'Exercise 1', sets: 3, reps: '10' }],
          },
        };
      }
      await onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={routine ? 'Edit Routine' : 'New Routine'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Name
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Push Pull Legs"
          />
        </label>

        <Toggle checked={isActive} onChange={setIsActive} label="Active routine" />

        <InlineError message={error} />

        <div className={styles.actions}>
          {onDelete && (
            <button type="button" className={styles.deleteBtn} onClick={onDelete}>
              Delete
            </button>
          )}
          <div className={styles.spacer} />
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
