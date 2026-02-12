import styles from './Toggle.module.css';

export default function Toggle({ checked, onChange, label }) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.input}
      />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
