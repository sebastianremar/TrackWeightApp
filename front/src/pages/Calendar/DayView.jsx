import { useState, useEffect } from 'react';
import styles from './DayView.module.css';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 23;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function parseTime(t) {
  const [h, m] = t.split(':').map(Number);
  return { h, m };
}

function formatTime12(t) {
  const { h, m } = parseTime(t);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatHour12(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function DayView({ events, todos, refDate, setRefDate, onEditEvent, onCreateEvent }) {
  const d = new Date(refDate + 'T00:00:00');
  const today = todayStr();
  const isToday = refDate === today;
  const [now, setNow] = useState(new Date());

  // Update current time every minute for the time indicator
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 900000);
    return () => clearInterval(id);
  }, [isToday]);

  const dateLabel = `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const goDay = (offset) => {
    const next = new Date(d);
    next.setDate(next.getDate() + offset);
    setRefDate(fmt(next));
  };

  const goToday = () => setRefDate(today);

  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const dayTodos = todos.filter((t) => t.dueDate === refDate);
  const dayEvents = events.filter((e) => e.date === refDate);

  const handleTimeClick = (hour) => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    onCreateEvent(time);
  };

  // Current time indicator position
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const showNowLine = isToday && nowH >= START_HOUR && nowH <= END_HOUR;
  const nowTop = showNowLine ? ((nowH - START_HOUR) * 60 + nowM) / 60 * HOUR_HEIGHT : 0;

  return (
    <div>
      <div className={styles.dayNav}>
        <button className={styles.arrow} onClick={() => goDay(-1)} aria-label="Previous day">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4L6 9l5 5" />
          </svg>
        </button>
        <span className={styles.dateHeader}>{dateLabel}</span>
        <button className={styles.arrow} onClick={() => goDay(1)} aria-label="Next day">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4l5 5-5 5" />
          </svg>
        </button>
        {!isToday && (
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
        )}
      </div>

      {dayTodos.length > 0 && (
        <div className={styles.todoSection}>
          <div className={styles.todoHeader}>Tasks due today</div>
          {dayTodos.map((t) => (
            <div key={t.todoId} className={styles.todoItem}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="14" height="14" rx="2" />
              </svg>
              <span>{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {dayEvents.length === 0 && dayTodos.length === 0 && (
        <div className={styles.emptyHint}>
          <span>No events today. Tap a time slot or</span>
          <button className={styles.emptyBtn} onClick={() => onCreateEvent(null)}>+ Add event</button>
        </div>
      )}

      <div className={styles.timeline} style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }}>
        {hours.map((h) => (
          <button
            key={h}
            className={styles.hourRow}
            style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            onClick={() => handleTimeClick(h)}
            aria-label={`Create event at ${formatHour12(h)}`}
          >
            <span className={styles.hourLabel}>{formatHour12(h)}</span>
            <span className={styles.hourHint}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </span>
          </button>
        ))}

        {showNowLine && (
          <div className={styles.nowLine} style={{ top: nowTop }}>
            <span className={styles.nowDot} />
          </div>
        )}

        {dayEvents.map((event) => {
          const start = parseTime(event.startTime);
          const end = event.endTime ? parseTime(event.endTime) : { h: start.h + 1, m: start.m };
          const topMin = (start.h - START_HOUR) * 60 + start.m;
          const durationMin = (end.h - start.h) * 60 + (end.m - start.m);
          const top = (topMin / 60) * HOUR_HEIGHT;
          const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 30);

          return (
            <button
              key={event.eventId}
              className={styles.eventBlock}
              style={{
                top,
                height,
                borderLeftColor: event.color || 'var(--primary)',
              }}
              onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
            >
              <span className={styles.eventTitle}>{event.title}</span>
              <span className={styles.eventTime}>
                {formatTime12(event.startTime)}
                {event.endTime ? ` - ${formatTime12(event.endTime)}` : ''}
              </span>
              {event.category && <span className={styles.eventCategory}>{event.category}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
