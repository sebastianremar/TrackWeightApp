import { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getHabitStats } from '../../api/habitEntries';
import { useHabits } from '../../hooks/useHabits';
import Card from '../../components/Card/Card';
import Spinner from '../../components/Spinner/Spinner';
import StreakRow from './StreakRow';
import styles from './StatsView.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

export default function StatsView({ habits: propsHabits, refDate, setRefDate }) {
  const ref = new Date(refDate + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const habits = propsHabits;

  useEffect(() => {
    if (habits.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      habits.map((h) => getHabitStats(h.habitId, 8).then((data) => ({ habitId: h.habitId, stats: data.stats })))
    ).then((results) => {
      const map = {};
      results.forEach((r) => { map[r.habitId] = r.stats; });
      setStatsMap(map);
    }).finally(() => setLoading(false));
  }, [habits]);

  const goMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    setRefDate(fmt(d));
  };

  // Overall completion donut
  const totalCompletions = Object.values(statsMap).reduce((sum, stats) =>
    sum + stats.reduce((s, w) => s + w.completions, 0), 0
  );
  const totalTarget = habits.reduce((sum, h) => sum + h.targetFrequency * 8, 0);
  const completionRate = totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;
  const donutData = [
    { name: 'Done', value: completionRate },
    { name: 'Remaining', value: 100 - completionRate },
  ];

  return (
    <div>
      <div className={styles.nav}>
        <button className={styles.arrow} onClick={() => goMonth(-1)}>&larr;</button>
        <span className={styles.label}>{MONTH_NAMES[month]} {year}</span>
        <button className={styles.arrow} onClick={() => goMonth(1)}>&rarr;</button>
      </div>

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        <div className={styles.content}>
          <Card>
            <h3 className={styles.cardTitle}>Overall Completion</h3>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={45}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="var(--primary)" />
                    <Cell fill="var(--neutral)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span className={styles.donutLabel}>{completionRate}%</span>
            </div>
          </Card>

          <Card>
            <h3 className={styles.cardTitle}>Habit Streaks</h3>
            {habits.length === 0 ? (
              <p className={styles.muted}>No habits yet</p>
            ) : (
              habits.map((habit) => (
                <StreakRow
                  key={habit.habitId}
                  habit={habit}
                  stats={statsMap[habit.habitId] || []}
                />
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
