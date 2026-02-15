import { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getHabitStats, getHabitStatsSummary } from '../../api/habitEntries';
import Card from '../../components/Card/Card';
import Spinner from '../../components/Spinner/Spinner';
import StreakRow from './StreakRow';
import styles from './StatsView.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateRange(period, from, to) {
  if (period === 'week') {
    const f = new Date(from + 'T00:00:00');
    const t = new Date(to + 'T00:00:00');
    const fmtShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmtShort(f)} - ${fmtShort(t)}`;
  }
  const d = new Date(from + 'T00:00:00');
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function StatsView({ habits }) {
  const [period, setPeriod] = useState('week');
  const [summary, setSummary] = useState(null);
  const [streakMap, setStreakMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (habits.length === 0) { setLoading(false); return; }
    setLoading(true);

    const streakWeeks = period === 'week' ? 4 : 16;

    Promise.all([
      getHabitStatsSummary(period),
      ...habits.map((h) =>
        getHabitStats(h.habitId, streakWeeks).then((data) => ({ habitId: h.habitId, stats: data.stats }))
      ),
    ]).then(([summaryData, ...streakResults]) => {
      setSummary(summaryData);
      const map = {};
      streakResults.forEach((r) => { map[r.habitId] = r.stats; });
      setStreakMap(map);
    }).finally(() => setLoading(false));
  }, [habits, period]);

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const badHabits = habits.filter((h) => h.type === 'bad');

  // Compute overall completion (good habits only)
  let completionRate = 0;
  let totalCompletions = 0;
  let totalTarget = 0;
  if (summary && goodHabits.length > 0) {
    const goodIds = new Set(goodHabits.map((h) => h.habitId));
    totalCompletions = Object.entries(summary.counts || {})
      .filter(([id]) => goodIds.has(id))
      .reduce((s, [, c]) => s + c, 0);
    const daysInPeriod = summary.totalDays || 7;
    const weeksInPeriod = Math.max(1, daysInPeriod / 7);
    totalTarget = goodHabits.reduce((s, h) => s + h.targetFrequency * weeksInPeriod, 0);
    completionRate = totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;
  }

  const donutData = [
    { name: 'Done', value: completionRate },
    { name: 'Remaining', value: Math.max(0, 100 - completionRate) },
  ];

  return (
    <div>
      <div className={styles.toggleRow}>
        <button
          className={`${styles.toggleBtn} ${period === 'week' ? styles.toggleActive : ''}`}
          onClick={() => setPeriod('week')}
        >
          Week
        </button>
        <button
          className={`${styles.toggleBtn} ${period === 'month' ? styles.toggleActive : ''}`}
          onClick={() => setPeriod('month')}
        >
          Month
        </button>
      </div>

      {summary && (
        <p className={styles.dateLabel}>{formatDateRange(period, summary.from, summary.to)}</p>
      )}

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
            <p className={styles.subtext}>{totalCompletions} / {Math.round(totalTarget)} completions</p>
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
                  stats={streakMap[habit.habitId] || []}
                />
              ))
            )}
          </Card>

          {badHabits.length > 0 && summary && (
            <Card>
              <h3 className={styles.cardTitle}>Bad Habits</h3>
              {badHabits.map((habit) => {
                const count = (summary.counts || {})[habit.habitId] || 0;
                const habitPeriod = habit.limitPeriod || 'week';
                const matchesPeriod = period === habitPeriod;
                const exceeded = matchesPeriod && count > habit.targetFrequency;

                return (
                  <div key={habit.habitId} className={styles.badHabitRow}>
                    <span className={styles.badHabitDot} style={{ background: habit.color }} />
                    <span className={styles.badHabitName}>{habit.name}</span>
                    <span className={`${styles.badHabitCount} ${exceeded ? styles.badHabitExceeded : ''}`}>
                      {matchesPeriod
                        ? `${count}/${habit.targetFrequency} this ${habitPeriod}`
                        : `${count} this ${period}`}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
