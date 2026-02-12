import { useState } from 'react';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendRequestCard.module.css';

export default function FriendRequestCard({ request, onRespond }) {
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);

  const handle = async (accept) => {
    setError('');
    setResponding(true);
    try {
      await onRespond(request.email, accept);
    } catch (err) {
      setError(err.message);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <span className={styles.avatar}>{request.name.charAt(0).toUpperCase()}</span>
        <div>
          <span className={styles.name}>{request.name}</span>
          <span className={styles.email}>{request.email}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.accept} onClick={() => handle(true)} disabled={responding}>Accept</button>
        <button className={styles.reject} onClick={() => handle(false)} disabled={responding}>Reject</button>
      </div>
      <InlineError message={error} />
    </div>
  );
}
