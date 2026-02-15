import { useState } from 'react';
import WeekStrip from './WeekStrip';
import DayDetailPanel from './DayDetailPanel';
import styles from './WeekView.module.css';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return fmt(d);
}

export default function WeekView({ habits, entries, refDate, setRefDate, toggleEntry, onEditHabit, onDeleteHabit }) {
  const weekStart = getWeekStart(refDate);
  const [selectedDate, setSelectedDate] = useState(refDate);

  const goWeek = (offset) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + offset * 7);
    const newStart = fmt(d);
    setRefDate(newStart);
    setSelectedDate(newStart);
  };

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  })();

  return (
    <div>
      <div className={styles.nav}>
        <button className={styles.arrow} onClick={() => goWeek(-1)}>&larr;</button>
        <span className={styles.label}>{weekLabel}</span>
        <button className={styles.arrow} onClick={() => goWeek(1)}>&rarr;</button>
      </div>
      <WeekStrip
        weekStart={weekStart}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        habits={habits}
        entries={entries}
      />
      <div className={styles.detail}>
        <DayDetailPanel
          date={selectedDate}
          habits={habits}
          entries={entries}
          onToggle={toggleEntry}
          onEditHabit={onEditHabit}
          onDeleteHabit={onDeleteHabit}
          weekEntries={entries}
        />
      </div>
    </div>
  );
}
