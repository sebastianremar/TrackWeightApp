import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './EditNameModal.module.css';

export default function EditNameModal({ open, onClose, currentFirstName, currentLastName, onSave }) {
  const [firstName, setFirstName] = useState(currentFirstName);
  const [lastName, setLastName] = useState(currentLastName);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFirstName(currentFirstName);
    setLastName(currentLastName);
    setError('');
  }, [currentFirstName, currentLastName, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim()) { setError('First name is required'); return; }
    setSubmitting(true);
    try {
      await onSave(firstName.trim(), lastName.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Name">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.nameRow}>
          <div className={styles.field}>
            <label className={styles.label}>First Name</label>
            <input
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={50}
              required
              autoComplete="given-name"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Last Name</label>
            <input
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={50}
              autoComplete="family-name"
            />
          </div>
        </div>
        <InlineError message={error} />
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}
