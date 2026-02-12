import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import styles from './FriendItem.module.css';

export default function FriendItem({ friend, onViewProgress, onRemove }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className={styles.item}>
        <div className={styles.info}>
          <span className={styles.avatar}>{friend.name.charAt(0).toUpperCase()}</span>
          <div>
            <span className={styles.name}>{friend.name}</span>
            <span className={styles.email}>{friend.email}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.viewBtn} onClick={onViewProgress}>View Progress</button>
          <button className={styles.removeBtn} onClick={() => setConfirmOpen(true)}>Remove</button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onRemove}
        title="Remove Friend"
        message={`Remove ${friend.name} from your friends list?`}
        confirmLabel="Remove"
        danger
      />
    </>
  );
}
