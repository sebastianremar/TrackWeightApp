import { useState } from 'react';
import WeekStrip from './WeekStrip';
import DayDetailPanel from './DayDetailPanel';
import styles from './WeekView.module.css';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - dow);
  return fmt(d);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function WeekView({ habits, entries, refDate, setRefDate, toggleEntry, updateNote, onEditHabit, onDeleteHabit }) {
  const weekStart = getWeekStart(refDate);
  const [selectedDate, setSelectedDate] = useState(refDate);
  const today = todayStr();
  const currentWeekStart = getWeekStart(today);
  const showTodayBtn = weekStart !== currentWeekStart;

  const goWeek = (offset) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + offset * 7);
    const newStart = fmt(d);
    setRefDate(newStart);
    setSelectedDate(newStart);
  };

  const goToday = () => {
    setRefDate(today);
    setSelectedDate(today);
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
        <button className={styles.arrow} onClick={() => goWeek(-1)} aria-label="Previous week">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4L6 9l5 5" />
          </svg>
        </button>
        <span className={styles.label}>{weekLabel}</span>
        <button className={styles.arrow} onClick={() => goWeek(1)} aria-label="Next week">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4l5 5-5 5" />
          </svg>
        </button>
        {showTodayBtn && (
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
        )}
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
          updateNote={updateNote}
          onEditHabit={onEditHabit}
          onDeleteHabit={onDeleteHabit}
          weekEntries={entries}
          onOpenCreate={null}
        />
      </div>
    </div>
  );
}
