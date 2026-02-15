import { useState, useEffect, useRef } from 'react';
import { getFriendHabits, getFriendHabitsStats } from '../../api/friends';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendHabitsPanel.module.css';

export default function FriendHabitsPanel({ friendEmail }) {
  const [habits, setHabits] = useState([]);
  const [counts, setCounts] = useState({});
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current && period === 'week') return;
    loadedRef.current = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [habitsData, statsData] = await Promise.all([
          getFriendHabits(friendEmail),
          getFriendHabitsStats(friendEmail, period),
        ]);
        setHabits(habitsData.habits || []);
        setCounts(statsData.counts || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [friendEmail, period]);

  // Re-fetch stats when period changes (habits are cached)
  useEffect(() => {
    if (!loadedRef.current) return;
    const loadStats = async () => {
      try {
        const statsData = await getFriendHabitsStats(friendEmail, period);
        setCounts(statsData.counts || {});
      } catch {
        // silently fail, habits still shown
      }
    };
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return <div className={styles.center}><Spinner size={24} /></div>;
  }

  if (error) {
    return <InlineError message={error} />;
  }

  if (habits.length === 0) {
    return <p className={styles.empty}>No habits yet</p>;
  }

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const badHabits = habits.filter((h) => h.type === 'bad');

  // Overall completion for good habits
  let totalCompletions = 0;
  let totalTarget = 0;
  for (const h of goodHabits) {
    totalCompletions += counts[h.habitId] || 0;
    totalTarget += h.targetFrequency;
  }
  const overallPct = totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;

  return (
    <div className={styles.panel}>
      <div className={styles.periodToggle}>
        <button
          className={`${styles.periodBtn} ${period === 'week' ? styles.periodActive : ''}`}
          onClick={() => setPeriod('week')}
        >
          Week
        </button>
        <button
          className={`${styles.periodBtn} ${period === 'month' ? styles.periodActive : ''}`}
          onClick={() => setPeriod('month')}
        >
          Month
        </button>
      </div>

      <div className={styles.overallRow}>
        <span className={styles.overallLabel}>Overall</span>
        <span className={styles.overallPct}>{overallPct}%</span>
      </div>

      <div className={styles.list}>
        {goodHabits.map((habit) => {
          const count = counts[habit.habitId] || 0;
          const pct = habit.targetFrequency > 0 ? Math.min(100, Math.round((count / habit.targetFrequency) * 100)) : 0;
          return (
            <div key={habit.habitId} className={styles.habitRow}>
              <span className={styles.habitDot} style={{ background: habit.color }} />
              <span className={styles.habitName}>{habit.name}</span>
              <span className={styles.habitTypeBadge}>Build</span>
              <div className={styles.habitBar}>
                <div className={styles.habitBarFill} style={{ width: `${pct}%`, background: habit.color }} />
              </div>
              <span className={styles.habitCount}>{count}/{habit.targetFrequency}</span>
            </div>
          );
        })}

        {badHabits.map((habit) => {
          const count = counts[habit.habitId] || 0;
          const exceeded = count > habit.targetFrequency;
          const pct = habit.targetFrequency > 0 ? Math.min(100, Math.round((count / habit.targetFrequency) * 100)) : 0;
          return (
            <div key={habit.habitId} className={styles.habitRow}>
              <span className={styles.habitDot} style={{ background: habit.color }} />
              <span className={styles.habitName}>{habit.name}</span>
              <span className={`${styles.habitTypeBadge} ${styles.habitTypeBadgeBad}`}>Limit</span>
              <div className={`${styles.habitBar} ${exceeded ? styles.habitBarDanger : ''}`}>
                <div
                  className={styles.habitBarFill}
                  style={{ width: `${pct}%`, background: exceeded ? 'var(--error)' : habit.color }}
                />
              </div>
              <span className={`${styles.habitCount} ${exceeded ? styles.habitCountDanger : ''}`}>
                {count}/{habit.targetFrequency}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
