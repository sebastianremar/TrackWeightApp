import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAdminMetrics, getUsersCount } from '../../api/admin';
import Card from '../../components/Card/Card';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './AdminPage.module.css';

const PERIODS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
];

function formatTime(isoStr, period) {
  const d = new Date(isoStr);
  if (period === '24h') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminPage() {
  const [period, setPeriod] = useState('24h');
  const [data, setData] = useState(null);
  const [usersCount, setUsersCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metrics, users] = await Promise.all([
        getAdminMetrics(period),
        getUsersCount(),
      ]);
      setData(metrics);
      setUsersCount(users.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return <InlineError message={error} />;
  }

  if (!data) return null;

  const { timeSeries, summary } = data;

  const chartData = timeSeries.map((item) => ({
    ...item,
    label: formatTime(item.time, period),
  }));

  const totalActiveUsers = timeSeries.reduce((sum, item) => sum + item.uniqueUsers, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={styles.periodToggle}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`${styles.periodBtn} ${period === p.key ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Requests</span>
            <span className={styles.statValue}>{summary.totalRequests.toLocaleString()}</span>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg Response</span>
            <span className={styles.statValue}>{summary.avgResponseMs}ms</span>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Users</span>
            <span className={styles.statValue}>{usersCount != null ? usersCount.toLocaleString() : '-'}</span>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>New Signups</span>
            <span className={styles.statValue}>{summary.newSignups}</span>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Error Rate</span>
            <span className={styles.statValue}>{summary.errorRate}%</span>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Active Users</span>
            <span className={styles.statValue}>{totalActiveUsers}</span>
          </div>
        </Card>
      </div>

      {chartData.length > 0 && (
        <>
          <Card>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Requests Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Line type="monotone" dataKey="requests" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Errors Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Line type="monotone" dataKey="errors" stroke="var(--error)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {summary.topEndpoints.length > 0 && (
        <Card>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Top Endpoints</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, summary.topEndpoints.length * 36)}>
              <BarChart data={summary.topEndpoints} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  tick={{ fontSize: 11 }}
                  stroke="var(--text-muted)"
                  width={110}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
