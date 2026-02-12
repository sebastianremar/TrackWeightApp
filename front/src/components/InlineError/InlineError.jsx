import styles from './InlineError.module.css';

export default function InlineError({ message }) {
  if (!message) return null;
  return <p className={styles.error} role="alert">{message}</p>;
}
