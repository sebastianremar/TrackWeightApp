import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './HabitModal.module.css';

const COLORS = ['#667eea', '#f56565', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac', '#e53e3e', '#4299e1'];

export default function HabitModal({ open, onClose, onSave, onDelete, habit }) {
  const [name, setName] = useState('');
  const [freq, setFreq] = useState(3);
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState('good');
  const [limitPeriod, setLimitPeriod] = useState('week');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBad = type === 'bad';
  const maxFreq = isBad && limitPeriod === 'month' ? 30 : 7;

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setFreq(habit.targetFrequency);
      setColor(habit.color || COLORS[0]);
      setType(habit.type || 'good');
      setLimitPeriod(habit.limitPeriod || 'week');
    } else {
      setName('');
      setFreq(3);
      setColor(COLORS[0]);
      setType('good');
      setLimitPeriod('week');
    }
    setError('');
  }, [habit, open]);

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'good') {
      setLimitPeriod('week');
      if (freq > 7) setFreq(7);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setLimitPeriod(newPeriod);
    const newMax = newPeriod === 'month' ? 30 : 7;
    if (freq > newMax) setFreq(newMax);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), targetFrequency: freq, color, type, limitPeriod: isBad ? limitPeriod : undefined });
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
          <label className={styles.label}>Type</label>
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${!isBad ? styles.toggleActive : ''}`}
              onClick={() => handleTypeChange('good')}
            >
              Build
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${isBad ? styles.toggleActive : ''}`}
              onClick={() => handleTypeChange('bad')}
            >
              Limit
            </button>
          </div>
        </div>
        {isBad && (
          <div className={styles.field}>
            <label className={styles.label}>Period</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${limitPeriod === 'week' ? styles.toggleActive : ''}`}
                onClick={() => handlePeriodChange('week')}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${limitPeriod === 'month' ? styles.toggleActive : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Monthly
              </button>
            </div>
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label}>
            {isBad
              ? limitPeriod === 'month' ? 'Monthly limit' : 'Weekly limit'
              : 'Weekly target'}
          </label>
          {maxFreq <= 7 ? (
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
          ) : (
            <input
              type="number"
              className={styles.input}
              value={freq}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                setFreq(Math.max(1, Math.min(maxFreq, v)));
              }}
              min={1}
              max={maxFreq}
            />
          )}
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
