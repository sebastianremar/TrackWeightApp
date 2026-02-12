import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getFriendWeight } from '../../api/friends';
import { getWeightHistory } from '../../api/weight';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendCard.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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

  const today = new Date();
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

export default function FriendCard({ friend, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (data) return; // already loaded

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

      setData({ stats: friendStats, miniData, compareData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

                {data.miniData.length > 0 && (
                  <div className={styles.chartSection}>
                    <h4 className={styles.chartTitle}>{friend.name}'s last 30 days</h4>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={data.miniData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
                        <Tooltip labelFormatter={formatDate} />
                        <Line type="monotone" dataKey="weight" stroke="var(--warning)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {data.compareData.length > 0 && (
                  <div className={styles.chartSection}>
                    <h4 className={styles.chartTitle}>You vs {friend.name}</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.compareData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
                        <Tooltip labelFormatter={formatDate} />
                        <Legend />
                        <Line type="monotone" dataKey="you" name="You" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" dataKey="friend" name={friend.name} stroke="var(--warning)" strokeWidth={2} dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {!data.stats && data.miniData.length === 0 && (
                  <p className={styles.emptyText}>No weight data yet</p>
                )}
              </>
            ) : null}
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
