import styles from './HabitItem.module.css';

export default function HabitItem({ habit, completed, onToggle, onEdit, progress }) {
  return (
    <div className={styles.item}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={completed}
          onChange={onToggle}
          className={styles.input}
        />
        <span className={styles.check} style={{ borderColor: habit.color, background: completed ? habit.color : 'transparent' }}>
          {completed && <svg viewBox="0 0 12 12" width="12" height="12"><path d="M2 6l3 3 5-5" fill="none" stroke="#fff" strokeWidth="2" /></svg>}
        </span>
      </label>
      <div className={styles.info}>
        <button className={styles.name} onClick={onEdit}>{habit.name}</button>
        {progress !== undefined && (
          <span className={styles.progress}>{progress}/{habit.targetFrequency}</span>
        )}
      </div>
    </div>
  );
}
