import { useState } from 'react';
import CalendarGrid from './CalendarGrid';
import DayDetailPanel from './DayDetailPanel';
import styles from './MonthView.module.css';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthView({ habits, entries, refDate, setRefDate, toggleEntry, onEditHabit, onDeleteHabit }) {
  const ref = new Date(refDate + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const [selectedDate, setSelectedDate] = useState(refDate);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    const next = fmt(d);
    setRefDate(next);
    setSelectedDate(next);
  };

  const goToday = () => {
    const today = fmt(now);
    setRefDate(today);
    setSelectedDate(today);
  };

  return (
    <div>
      <div className={styles.nav}>
        <button className={styles.arrow} onClick={() => goMonth(-1)} aria-label="Previous month">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4L6 9l5 5" />
          </svg>
        </button>
        <span className={styles.label}>{MONTH_NAMES[month]} {year}</span>
        <button className={styles.arrow} onClick={() => goMonth(1)} aria-label="Next month">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4l5 5-5 5" />
          </svg>
        </button>
        {!isCurrentMonth && (
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
        )}
      </div>
      <CalendarGrid
        year={year}
        month={month}
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
          onOpenCreate={null}
        />
      </div>
    </div>
  );
}
