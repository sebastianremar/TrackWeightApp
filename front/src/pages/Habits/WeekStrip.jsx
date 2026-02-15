import styles from './WeekStrip.module.css';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_DOTS = 5;

export default function WeekStrip({ weekStart, selectedDate, onSelectDate, habits, entries }) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    days.push(fmt(d));
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.strip}>
      {days.map((date) => {
        const dayNum = (new Date(date + 'T00:00:00').getDay() + 6) % 7;
        const isSelected = date === selectedDate;
        const isToday = date === today;

        // Build per-habit dots
        const habitDots = habits.slice(0, MAX_DOTS).map((h) => {
          const completed = entries.some((e) => e.habitId === h.habitId && e.date === date);
          return { color: completed ? h.color : 'var(--neutral-dark)', key: h.habitId };
        });
        const extra = habits.length > MAX_DOTS ? habits.length - MAX_DOTS : 0;

        return (
          <button
            key={date}
            className={`${styles.day} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
            onClick={() => onSelectDate(date)}
          >
            <span className={styles.dayName}>{DAY_NAMES[dayNum]}</span>
            <span className={styles.dayNum}>{new Date(date + 'T00:00:00').getDate()}</span>
            {habits.length > 0 && (
              <div className={styles.dots}>
                {habitDots.map((dot) => (
                  <span key={dot.key} className={styles.dot} style={{ background: dot.color }} />
                ))}
                {extra > 0 && <span className={styles.dotExtra}>+{extra}</span>}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
