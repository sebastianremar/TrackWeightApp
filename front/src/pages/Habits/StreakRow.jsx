import styles from './StreakRow.module.css';

export default function StreakRow({ habit, stats }) {
  const maxCompletions = Math.max(1, ...stats.map((s) => s.completions));

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: habit.color }} />
        <span className={styles.name}>{habit.name}</span>
      </div>
      <div className={styles.heatmap}>
        {stats.map((week) => {
          const intensity = week.completions / maxCompletions;
          return (
            <div
              key={week.weekStart}
              className={styles.cell}
              style={{
                background: habit.color,
                opacity: week.completions > 0 ? 0.2 + intensity * 0.8 : 0.1,
              }}
              title={`${week.weekStart}: ${week.completions} completions`}
            />
          );
        })}
      </div>
    </div>
  );
}
