import Modal from '../Modal/Modal';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button className={styles.cancel} onClick={onClose}>Cancel</button>
        <button
          className={`${styles.confirm} ${danger ? styles.danger : ''}`}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
