import HabitItem from './HabitItem';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './DayDetailPanel.module.css';

export default function DayDetailPanel({ date, habits, entries, onToggle, onEditHabit, weekEntries }) {
  if (habits.length === 0) return <EmptyState message="Create a habit to get started" />;

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <Card>
      <h3 className={styles.dayLabel}>{dayLabel}</h3>
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
            progress={weekProgress}
          />
        );
      })}
    </Card>
  );
}
