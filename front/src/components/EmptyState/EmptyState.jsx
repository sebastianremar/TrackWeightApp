import styles from './EmptyState.module.css';

export default function EmptyState({ message = 'No entries yet' }) {
  return <p className={styles.empty}>{message}</p>;
}
