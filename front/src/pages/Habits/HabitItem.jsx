import { useState, useRef, useEffect } from 'react';
import styles from './HabitItem.module.css';

export default function HabitItem({ habit, completed, onToggle, onEdit, onDelete, progress }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const pct = progress !== undefined && habit.targetFrequency
    ? Math.min(100, Math.round((progress / habit.targetFrequency) * 100))
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.colorBar} style={{ background: habit.color }} />
      <div className={styles.body}>
        <div className={styles.row}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={completed}
              onChange={onToggle}
              className={styles.hiddenInput}
            />
            <span
              className={styles.check}
              style={{ borderColor: habit.color, background: completed ? habit.color : 'transparent' }}
            >
              {completed && (
                <svg viewBox="0 0 12 12" width="12" height="12">
                  <path d="M2 6l3 3 5-5" fill="none" stroke="#fff" strokeWidth="2" />
                </svg>
              )}
            </span>
          </label>
          <div className={styles.info}>
            <span className={`${styles.name} ${completed ? styles.done : ''}`}>{habit.name}</span>
            {progress !== undefined && (
              <span className={styles.subtitle}>{progress}/{habit.targetFrequency} this week</span>
            )}
          </div>
          <div className={styles.menu} ref={menuRef}>
            <button className={styles.menuBtn} onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onEdit(); }}>Edit</button>
                {onDelete && (
                  <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={() => { setMenuOpen(false); onDelete(); }}>Delete</button>
                )}
              </div>
            )}
          </div>
        </div>
        {progress !== undefined && habit.targetFrequency > 0 && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, background: habit.color }} />
          </div>
        )}
      </div>
    </div>
  );
}
