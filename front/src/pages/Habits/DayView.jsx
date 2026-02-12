import DayDetailPanel from './DayDetailPanel';
import styles from './DayView.module.css';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

export default function DayView({ habits, entries, refDate, setRefDate, toggleEntry, onEditHabit, onDeleteHabit }) {
  const goDay = (offset) => {
    const d = new Date(refDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setRefDate(fmt(d));
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = refDate === today;

  // Week entries for progress (last 7 days)
  const weekStart = new Date(refDate + 'T00:00:00');
  weekStart.setDate(weekStart.getDate() - 6);
  const weekFromStr = fmt(weekStart);
  const weekEntries = entries.filter((e) => e.date >= weekFromStr && e.date <= refDate);

  return (
    <div>
      <div className={styles.nav}>
        <button className={styles.arrow} onClick={() => goDay(-1)}>&larr;</button>
        <span className={styles.date}>
          {isToday ? 'Today' : new Date(refDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
        <button className={styles.arrow} onClick={() => goDay(1)} disabled={isToday}>&rarr;</button>
      </div>
      <DayDetailPanel
        date={refDate}
        habits={habits}
        entries={entries}
        weekEntries={weekEntries}
        onToggle={toggleEntry}
        onEditHabit={onEditHabit}
        onDeleteHabit={onDeleteHabit}
      />
    </div>
  );
}
