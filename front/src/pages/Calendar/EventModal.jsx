import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './EventModal.module.css';

const COLORS = [
  '#991B1B', '#DC2626', '#F87171', '#FECACA',
  '#9A3412', '#EA580C', '#FB923C', '#FED7AA',
  '#854D0E', '#CA8A04', '#FACC15', '#FEF08A',
  '#166534', '#16A34A', '#4ADE80', '#BBF7D0',
  '#115E59', '#0D9488', '#2DD4BF', '#99F6E4',
  '#1E3A8A', '#2563EB', '#60A5FA', '#BFDBFE',
  '#581C87', '#9333EA', '#C084FC', '#E9D5FF',
];

export default function EventModal({ open, onClose, onSave, onDelete, event, defaultDate, defaultTime }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(COLORS[17]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime || '');
      setCategory(event.category || '');
      setColor(event.color || COLORS[17]);
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate || '');
      setStartTime(defaultTime || '');
      setEndTime('');
      setCategory('');
      setColor(COLORS[17]);
    }
    setError('');
  }, [event, open, defaultDate, defaultTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!date) { setError('Date is required'); return; }
    if (!startTime) { setError('Start time is required'); return; }
    if (endTime && endTime <= startTime) { setError('End time must be after start time'); return; }

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description || undefined,
        date,
        startTime,
        endTime: endTime || undefined,
        category: category.trim() || undefined,
        color,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Edit Event' : 'New Event'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
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

        <div className={styles.field}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Start Time</label>
            <input
              type="time"
              className={styles.input}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>End Time</label>
            <input
              type="time"
              className={styles.input}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Category <span className={styles.optional}>(optional)</span></label>
          <input
            className={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Work, Personal"
            maxLength={50}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Color</label>
          <div className={styles.colorGrid}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorBtn} ${color === c ? styles.colorActive : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              >
                {color === c && (
                  <svg viewBox="0 0 12 12" width="14" height="14">
                    <path d="M2 6l3 3 5-5" fill="none" stroke="#fff" strokeWidth="2" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <InlineError message={error} />

        <div className={styles.actions}>
          {onDelete && (
            <button type="button" className={styles.deleteBtn} onClick={onDelete}>Delete</button>
          )}
          <button type="submit" className={styles.saveBtn} disabled={submitting}>
            {submitting ? 'Saving...' : event ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
