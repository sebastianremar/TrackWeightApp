import HabitItem from './HabitItem';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './DayDetailPanel.module.css';

function CompletionRing({ completed, total, pct }) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (total > 0 ? completed / total : 0));
  const allDone = total > 0 && completed === total;

  return (
    <div className={styles.ringWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.ring}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--neutral)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={allDone ? 'var(--success)' : 'var(--primary)'} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className={`${styles.ringLabel} ${allDone ? styles.ringLabelDone : ''}`}>{pct}%</span>
    </div>
  );
}

export default function DayDetailPanel({ date, habits, entries, onToggle, updateNote, onEditHabit, onDeleteHabit, weekEntries, onOpenCreate }) {
  if (habits.length === 0) {
    return (
      <EmptyState
        message="Create a habit to get started"
        icon={
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="24" cy="24" r="20" />
            <path d="M16 24l6 6 10-10" />
          </svg>
        }
        action={onOpenCreate ? { label: 'Create Habit', onClick: onOpenCreate } : undefined}
      />
    );
  }

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const goodCompletedCount = goodHabits.filter((h) => entries.some((e) => e.habitId === h.habitId && e.date === date)).length;
  const allDone = goodHabits.length > 0 && goodCompletedCount === goodHabits.length;
  const pct = goodHabits.length > 0 ? Math.round((goodCompletedCount / goodHabits.length) * 100) : 0;

  return (
    <div className={styles.panel}>
      <div className={`${styles.summary} ${allDone ? styles.allDone : ''}`}>
        <CompletionRing completed={goodCompletedCount} total={goodHabits.length} pct={pct} />
        <div className={styles.summaryText}>
          <h3 className={styles.dayLabel}>{dayLabel}</h3>
          <span className={`${styles.summaryLine} ${allDone ? styles.summaryLineDone : ''}`}>
            {allDone ? 'All done!' : `${pct}% complete`}
          </span>
        </div>
      </div>
      <div className={styles.list}>
        {habits.map((habit, index) => {
          const entry = entries.find((e) => e.habitId === habit.habitId && e.date === date);
          const completed = !!entry;
          const note = entry?.note || '';
          const weekProgress = weekEntries
            ? weekEntries.filter((e) => e.habitId === habit.habitId).length
            : undefined;

          return (
            <div
              key={habit.habitId}
              className={styles.listItem}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <HabitItem
                habit={habit}
                completed={completed}
                onToggle={() => onToggle(habit.habitId, date, completed)}
                onEdit={() => onEditHabit(habit)}
                onDelete={onDeleteHabit ? () => onDeleteHabit(habit) : undefined}
                progress={weekProgress}
                note={note}
                onNoteChange={updateNote ? (val) => updateNote(habit.habitId, date, val) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
