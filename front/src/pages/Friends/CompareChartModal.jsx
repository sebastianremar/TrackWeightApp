import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getFriendWeight } from '../../api/friends';
import { getWeightHistory } from '../../api/weight';
import Modal from '../../components/Modal/Modal';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './CompareChartModal.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function CompareChartModal({ open, onClose, friend }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !friend) return;
    setLoading(true);
    setError('');

    Promise.all([
      getWeightHistory({ from: daysAgo(90) }),
      getFriendWeight(friend.email),
    ])
      .then(([myData, friendData]) => {
        const myMap = {};
        (myData.entries || []).forEach((e) => { myMap[e.date] = e.weight; });
        const friendMap = {};
        (friendData.entries || []).forEach((e) => { friendMap[e.date] = e.weight; });

        const allDates = [...new Set([...Object.keys(myMap), ...Object.keys(friendMap)])].sort();
        const merged = allDates.map((date) => ({
          date,
          you: myMap[date] || null,
          friend: friendMap[date] || null,
        }));
        setData(merged);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, friend]);

  return (
    <Modal open={open} onClose={onClose} title={friend ? `You vs ${friend.name}` : 'Compare'}>
      {loading ? (
        <div className={styles.center}><Spinner size={28} /></div>
      ) : error ? (
        <InlineError message={error} />
      ) : data.length === 0 ? (
        <EmptyState message="No weight data to compare" />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={40} />
              <Tooltip labelFormatter={formatDate} />
              <Legend />
              <Line type="monotone" dataKey="you" name="You" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="friend" name={friend?.name || 'Friend'} stroke="var(--warning)" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Modal>
  );
}
