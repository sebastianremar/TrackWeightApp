import { useState, useEffect } from 'react';
import { logWeight } from '../../api/weight';
import Card from '../../components/Card/Card';
import InlineError from '../../components/InlineError/InlineError';
import styles from './WeightForm.module.css';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function WeightForm({ editingEntry, onCancelEdit, onSaved }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setWeight(String(editingEntry.weight));
      setDate(editingEntry.date);
    }
  }, [editingEntry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const w = parseFloat(weight);
    if (isNaN(w) || w < 20 || w > 500) {
      setError('Weight must be between 20 and 500');
      return;
    }
    setSubmitting(true);
    try {
      await logWeight(w, date);
      setWeight('');
      setDate(todayStr());
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className={styles.title}>Log Weight</h2>
      {editingEntry && (
        <p className={styles.editing}>
          Editing entry for {new Date(editingEntry.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          <button className={styles.cancelEdit} onClick={onCancelEdit}>Cancel</button>
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputWrap}>
            <input
              type="number"
              step="0.1"
              min="20"
              max="500"
              className={styles.input}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="72.5"
              required
              aria-label="Weight in kg"
            />
            <span className={styles.unit}>kg</span>
          </div>
          <input
            type="date"
            className={styles.dateInput}
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Entry date"
          />
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Saving...' : editingEntry ? 'Update' : 'Log'}
          </button>
        </div>
        <InlineError message={error} />
      </form>
    </Card>
  );
}
