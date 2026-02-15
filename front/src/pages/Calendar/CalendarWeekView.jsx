import styles from './CalendarWeekView.module.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE = 3;

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return fmt(d);
}

function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function CalendarWeekView({ events, todos, refDate, setRefDate, onEditEvent, onDayClick }) {
  const weekStart = getWeekStart(refDate);
  const today = todayStr();
  const currentWeekStart = getWeekStart(today);
  const showTodayBtn = weekStart !== currentWeekStart;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    days.push(fmt(d));
  }

  const goWeek = (offset) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + offset * 7);
    setRefDate(fmt(d));
  };

  const goToday = () => setRefDate(today);

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  })();

  return (
    <div>
      <div className={styles.weekNav}>
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

      <div className={styles.weekGrid}>
        {days.map((date, i) => {
          const isToday = date === today;
          const dayEvents = events.filter((e) => e.date === date);
          const dayTodos = todos.filter((t) => t.dueDate === date);
          const allItems = [...dayEvents.map((e) => ({ type: 'event', item: e })), ...dayTodos.map((t) => ({ type: 'todo', item: t }))];
          const visible = allItems.slice(0, MAX_VISIBLE);
          const overflow = allItems.length - MAX_VISIBLE;
          const dayNum = new Date(date + 'T00:00:00').getDate();

          return (
            <div key={date} className={styles.dayColumn}>
              <button
                className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}
                onClick={() => onDayClick(date)}
              >
                <span className={styles.dayName}>{DAY_NAMES[i]}</span>
                <span className={styles.dayNum}>{dayNum}</span>
              </button>
              <div className={styles.dayContent}>
                {visible.map((entry) => {
                  if (entry.type === 'event') {
                    const e = entry.item;
                    return (
                      <button key={e.eventId} className={styles.eventCard} onClick={() => onEditEvent(e)}>
                        <span className={styles.eventDot} style={{ background: e.color || 'var(--primary)' }} />
                        <div className={styles.eventInfo}>
                          <span className={styles.eventCardTime}>{formatTime12(e.startTime)}</span>
                          <span className={styles.eventCardTitle}>{e.title}</span>
                        </div>
                      </button>
                    );
                  }
                  const t = entry.item;
                  return (
                    <div key={t.todoId} className={styles.todoCard}>
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="1" width="14" height="14" rx="2" />
                      </svg>
                      <span className={styles.todoCardTitle}>{t.title}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <button className={styles.overflow} onClick={() => onDayClick(date)}>
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
