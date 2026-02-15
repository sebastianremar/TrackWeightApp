import styles from './CalendarGrid.module.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function ratioToColor(ratio) {
  if (ratio >= 0.8) return 'var(--success)';
  if (ratio >= 0.4) return 'var(--primary)';
  if (ratio > 0) return 'var(--neutral-dark)';
  return 'transparent';
}

export default function CalendarGrid({ year, month, selectedDate, onSelectDate, habits, entries }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = lastDay.getDate();
  const today = new Date().toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(fmt(new Date(year, month, d)));
  }

  return (
    <div className={styles.grid}>
      {DAY_NAMES.map((n) => (
        <div key={n} className={styles.dayHeader}>{n}</div>
      ))}
      {cells.map((date, i) => {
        if (!date) return <div key={`empty-${i}`} className={styles.empty} />;

        const goodHabits = habits.filter((h) => h.type !== 'bad');
        const completedCount = goodHabits.filter((h) =>
          entries.some((e) => e.habitId === h.habitId && e.date === date)
        ).length;
        const totalHabits = goodHabits.length;
        const isSelected = date === selectedDate;
        const isToday = date === today;
        const ratio = totalHabits > 0 ? completedCount / totalHabits : 0;

        return (
          <button
            key={date}
            className={`${styles.cell} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
            onClick={() => onSelectDate(date)}
          >
            <span className={styles.num}>{new Date(date + 'T00:00:00').getDate()}</span>
            {totalHabits > 0 && (
              <span
                className={styles.completionDot}
                style={{ background: ratioToColor(ratio) }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
