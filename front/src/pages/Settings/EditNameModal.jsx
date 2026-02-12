import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './EditNameModal.module.css';

export default function EditNameModal({ open, onClose, currentName, onSave }) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(currentName);
    setError('');
  }, [currentName, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    try {
      await onSave(name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Name">
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
        <InlineError message={error} />
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}
