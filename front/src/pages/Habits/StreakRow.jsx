import styles from './StreakRow.module.css';

function calcBestStreak(stats, targetFrequency) {
  let best = 0;
  let current = 0;
  for (const week of stats) {
    if (week.completions >= targetFrequency) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export default function StreakRow({ habit, stats }) {
  const maxCompletions = Math.max(1, ...stats.map((s) => s.completions));
  const bestStreak = calcBestStreak(stats, habit.targetFrequency);

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: habit.color }} />
        <span className={styles.name}>{habit.name}</span>
        {bestStreak > 0 && (
          <span className={styles.bestBadge}>Best: {bestStreak}w</span>
        )}
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
