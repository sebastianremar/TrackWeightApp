import { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './AddFriendModal.module.css';

export default function AddFriendModal({ open, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!email.trim()) { setError('Email is required'); return; }
    setSubmitting(true);
    try {
      await onAdd(email.trim());
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Friend">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Friend's email</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSuccess(false); }}
            placeholder="friend@example.com"
            required
          />
        </div>
        <InlineError message={error} />
        {success && <p className={styles.success}>Friend request sent!</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Request'}
        </button>
      </form>
    </Modal>
  );
}
