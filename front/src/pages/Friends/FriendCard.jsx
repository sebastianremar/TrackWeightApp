import { useState, useEffect, useRef } from 'react';
import { getFriendWeight } from '../../api/friends';
import { getWeightHistory } from '../../api/weight';
import FriendChart from './FriendChart';
import FriendHabitsPanel from './FriendHabitsPanel';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendCard.module.css';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function computeStats(entries) {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1].weight;
  const weights = sorted.map((e) => e.weight);
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
  const lowest = Math.min(...weights);

  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const closestTo = (target) => {
    let best = null;
    let bestDiff = Infinity;
    for (const e of sorted) {
      const diff = Math.abs(new Date(e.date + 'T00:00:00') - new Date(target + 'T00:00:00'));
      if (diff < bestDiff) { bestDiff = diff; best = e; }
    }
    return best;
  };

  const weekEntry = closestTo(weekAgo);
  const monthEntry = closestTo(monthAgo);

  const weeklyChange = weekEntry ? Math.round((current - weekEntry.weight) * 10) / 10 : null;
  const monthlyChange = monthEntry ? Math.round((current - monthEntry.weight) * 10) / 10 : null;

  return { current, weeklyChange, monthlyChange, avg, lowest };
}

function StatBox({ label, value, colored }) {
  let className = styles.statValue;
  if (colored && value !== null && value !== undefined) {
    if (value > 0) className += ` ${styles.statUp}`;
    else if (value < 0) className += ` ${styles.statDown}`;
  }
  const display = value === null || value === undefined ? '--'
    : colored && value > 0 ? `+${value}`
    : String(value);

  return (
    <div className={styles.statBox}>
      <span className={styles.statLabel}>{label}</span>
      <span className={className}>{display}</span>
    </div>
  );
}

const BODY_TABS = [
  { key: 'weight', label: 'Weight' },
  { key: 'habits', label: 'Habits' },
];

export default function FriendCard({ friend, onRemove, onToggleFavorite, initialExpanded }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [bodyTab, setBodyTab] = useState('weight');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const loadedRef = useRef(false);

  const bodyTabIndex = BODY_TABS.findIndex((t) => t.key === bodyTab);

  const loadData = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setError('');
    try {
      const [myData, friendData] = await Promise.all([
        getWeightHistory({ from: daysAgo(90) }),
        getFriendWeight(friend.email),
      ]);

      const friendEntries = friendData.entries || [];
      const myEntries = myData.entries || [];
      const friendStats = computeStats(friendEntries);

      // Mini chart: friend's last 30 days
      const thirtyAgo = daysAgo(30);
      const miniData = friendEntries
        .filter((e) => e.date >= thirtyAgo)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({ date: e.date, weight: e.weight }));

      // Comparison chart: merge last 90 days
      const myMap = {};
      myEntries.forEach((e) => { myMap[e.date] = e.weight; });
      const friendMap = {};
      friendEntries.forEach((e) => { friendMap[e.date] = e.weight; });
      const allDates = [...new Set([...Object.keys(myMap), ...Object.keys(friendMap)])].sort();
      const compareData = allDates.map((date) => ({
        date,
        you: myMap[date] || null,
        friend: friendMap[date] || null,
      }));

      setData({ stats: friendStats, miniData, compareData, friendEntries, myEntries });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when initially expanded
  useEffect(() => {
    if (initialExpanded) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    loadData();
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header} onClick={handleToggle}>
          <div className={styles.info}>
            <span className={styles.avatar}>{friend.name.charAt(0).toUpperCase()}</span>
            <div className={styles.nameBlock}>
              <span className={styles.name}>{friend.name}</span>
              <span className={styles.email}>{friend.email}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.starBtn} ${friend.favorite ? styles.starred : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(!friend.favorite); }}
              aria-label={friend.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill={friend.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <button
              className={styles.removeBtn}
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            >
              Remove
            </button>
            <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </span>
          </div>
        </div>

        {expanded && (
          <div className={styles.body}>
            <div className={styles.bodyTabs}>
              <div
                className={styles.bodyTabIndicator}
                style={{ transform: `translateX(${bodyTabIndex * 100}%)` }}
              />
              {BODY_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.bodyTab} ${bodyTab === t.key ? styles.bodyTabActive : ''}`}
                  onClick={() => setBodyTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {bodyTab === 'weight' && (
              <>
                {loading ? (
                  <div className={styles.center}><Spinner size={24} /></div>
                ) : error ? (
                  <InlineError message={error} />
                ) : data ? (
                  <>
                    {data.stats && (
                      <div className={styles.statsGrid}>
                        <StatBox label="Current" value={data.stats.current} />
                        <StatBox label="Weekly" value={data.stats.weeklyChange} colored />
                        <StatBox label="Monthly" value={data.stats.monthlyChange} colored />
                        <StatBox label="Average" value={data.stats.avg} />
                        <StatBox label="Lowest" value={data.stats.lowest} />
                      </div>
                    )}

                    <FriendChart friend={friend} data={data} />

                    {!data.stats && data.miniData.length === 0 && (
                      <p className={styles.emptyText}>No weight data yet</p>
                    )}
                  </>
                ) : null}
              </>
            )}

            {bodyTab === 'habits' && (
              <FriendHabitsPanel friendEmail={friend.email} />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onRemove}
        title="Remove Friend"
        message={`Remove ${friend.name} from your friends list?`}
        confirmLabel="Remove"
        danger
      />
    </>
  );
}
