import styles from './CalendarMonthView.module.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_DOTS = 3;

function fmt(d) {
  return d.toISOString().split('T')[0];
}

export default function CalendarMonthView({ events, todos, refDate, setRefDate, onDayClick }) {
  const ref = new Date(refDate + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const today = new Date().toISOString().split('T')[0];
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(fmt(new Date(year, month, d)));
  }

  const goMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    setRefDate(fmt(d));
  };

  const goToday = () => setRefDate(fmt(new Date()));

  // Build a map of date -> event colors for dots
  const dateEventsMap = {};
  for (const e of events) {
    if (!dateEventsMap[e.date]) dateEventsMap[e.date] = [];
    dateEventsMap[e.date].push(e.color || 'var(--primary)');
  }

  // Build a map of date -> todo count
  const dateTodoMap = {};
  for (const t of todos) {
    if (t.dueDate) {
      dateTodoMap[t.dueDate] = (dateTodoMap[t.dueDate] || 0) + 1;
    }
  }

  return (
    <div>
      <div className={styles.monthNav}>
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

      <div className={styles.grid}>
        {DAY_NAMES.map((n) => (
          <div key={n} className={styles.dayHeader}>{n}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className={styles.empty} />;

          const isToday = date === today;
          const isSelected = date === refDate;
          const dayNum = new Date(date + 'T00:00:00').getDate();
          const eventColors = dateEventsMap[date] || [];
          const todoCount = dateTodoMap[date] || 0;
          const totalItems = eventColors.length + todoCount;
          const dotsToShow = eventColors.slice(0, MAX_DOTS);
          const overflow = totalItems - MAX_DOTS;

          return (
            <button
              key={date}
              className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
              onClick={() => onDayClick(date)}
            >
              <span className={styles.dayNumber}>{dayNum}</span>
              {(dotsToShow.length > 0 || todoCount > 0) && (
                <div className={styles.dots}>
                  {dotsToShow.map((c, j) => (
                    <span key={j} className={styles.dot} style={{ background: c }} />
                  ))}
                  {overflow > 0 && (
                    <span className={styles.countBadge}>+{overflow}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
