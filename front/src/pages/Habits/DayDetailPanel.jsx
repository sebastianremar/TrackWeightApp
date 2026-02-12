import HabitItem from './HabitItem';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './DayDetailPanel.module.css';

function CompletionRing({ completed, total }) {
  const size = 60;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.ring}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--neutral)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--primary)" strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
    </svg>
  );
}

export default function DayDetailPanel({ date, habits, entries, onToggle, onEditHabit, onDeleteHabit, weekEntries }) {
  if (habits.length === 0) return <EmptyState message="Create a habit to get started" />;

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const completedCount = habits.filter((h) => entries.some((e) => e.habitId === h.habitId && e.date === date)).length;
  const allDone = completedCount === habits.length;
  const pct = Math.round((completedCount / habits.length) * 100);

  return (
    <div className={styles.panel}>
      <div className={styles.summary}>
        <CompletionRing completed={completedCount} total={habits.length} />
        <div className={styles.summaryText}>
          <h3 className={styles.dayLabel}>{dayLabel}</h3>
          <span className={styles.summaryLine}>
            {allDone ? 'All done!' : `${pct}% complete`}
          </span>
        </div>
      </div>
      <div className={styles.list}>
        {habits.map((habit) => {
          const completed = entries.some((e) => e.habitId === habit.habitId && e.date === date);
          const weekProgress = weekEntries
            ? weekEntries.filter((e) => e.habitId === habit.habitId).length
            : undefined;

          return (
            <HabitItem
              key={habit.habitId}
              habit={habit}
              completed={completed}
              onToggle={() => onToggle(habit.habitId, date, completed)}
              onEdit={() => onEditHabit(habit)}
              onDelete={onDeleteHabit ? () => onDeleteHabit(habit) : undefined}
              progress={weekProgress}
            />
          );
        })}
      </div>
    </div>
  );
}
