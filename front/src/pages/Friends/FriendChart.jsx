import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, BarChart, AreaChart,
  Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import styles from './FriendChart.module.css';

const CHART_TYPES = [
  { key: 'line', label: 'Line' },
  { key: 'bar', label: 'Bar' },
  { key: 'area', label: 'Area' },
];

const DATA_VIEWS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'weeklyAvg', label: 'Weekly Avg' },
  { key: 'changeRate', label: 'Change Rate' },
  { key: 'compare', label: 'Compare' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeWeeklyAvg(entries) {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = {};
  for (const e of sorted) {
    const d = new Date(e.date + 'T00:00:00');
    const dow = d.getDay();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - dow);
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(e.weight);
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      date: weekStart,
      weight: Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10,
    }));
}

function computeChangeRate(entries) {
  if (entries.length < 2) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result = [];
  for (let i = 1; i < sorted.length; i++) {
    result.push({
      date: sorted[i].date,
      delta: Math.round((sorted[i].weight - sorted[i - 1].weight) * 10) / 10,
    });
  }
  return result;
}

export default function FriendChart({ friend, data }) {
  const [chartType, setChartType] = useState('line');
  const [dataView, setDataView] = useState('timeline');

  const chartData = useMemo(() => {
    if (!data) return [];
    switch (dataView) {
      case 'timeline':
        return data.miniData;
      case 'weeklyAvg':
        return computeWeeklyAvg(data.friendEntries || []);
      case 'changeRate':
        return computeChangeRate(data.friendEntries || []);
      case 'compare':
        return data.compareData;
      default:
        return data.miniData;
    }
  }, [data, dataView]);

  if (!data || (chartData.length === 0 && dataView !== 'compare')) return null;
  if (dataView === 'compare' && chartData.length === 0) return null;

  const dataKey = dataView === 'changeRate' ? 'delta' : 'weight';
  const isCompare = dataView === 'compare';
  const chartHeight = isCompare ? 200 : 160;

  const renderChart = () => {
    const xAxisProps = {
      dataKey: 'date',
      tickFormatter: dataView === 'weeklyAvg' ? getWeekLabel : formatDate,
      tick: { fontSize: 10, fill: 'var(--text-muted)' },
      interval: 'preserveStartEnd',
    };

    const yDomain = dataView === 'changeRate'
      ? ['auto', 'auto']
      : ['dataMin - 1', 'dataMax + 1'];

    const yAxisProps = {
      domain: yDomain,
      tick: { fontSize: 10, fill: 'var(--text-muted)' },
      width: 36,
    };

    const margin = { top: 5, right: 10, bottom: 5, left: 0 };

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip labelFormatter={formatDate} />
          {isCompare && <Legend />}
          {isCompare
            ? [
                <Bar key="you" dataKey="you" name="You" fill="var(--primary)" />,
                <Bar key="friend" dataKey="friend" name={friend.name} fill="var(--warning)" />,
              ]
            : <Bar dataKey={dataKey} fill="var(--warning)" radius={[2, 2, 0, 0]} />
          }
        </BarChart>
      );
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip labelFormatter={formatDate} />
          {isCompare && <Legend />}
          {isCompare
            ? [
                <Area key="you" type="monotone" dataKey="you" name="You" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} connectNulls />,
                <Area key="friend" type="monotone" dataKey="friend" name={friend.name} stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.2} connectNulls />,
              ]
            : <Area type="monotone" dataKey={dataKey} stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.2} />
          }
        </AreaChart>
      );
    }

    // Default: line
    return (
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip labelFormatter={formatDate} />
        {isCompare && <Legend />}
        {isCompare
          ? [
              <Line key="you" type="monotone" dataKey="you" name="You" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls />,
              <Line key="friend" type="monotone" dataKey="friend" name={friend.name} stroke="var(--warning)" strokeWidth={2} dot={false} connectNulls />,
            ]
          : <Line type="monotone" dataKey={dataKey} stroke="var(--warning)" strokeWidth={2} dot={false} />
        }
      </LineChart>
    );
  };

  const title = dataView === 'compare'
    ? `You vs ${friend.name}`
    : dataView === 'weeklyAvg'
    ? `${friend.name}'s Weekly Averages`
    : dataView === 'changeRate'
    ? `${friend.name}'s Change Rate`
    : `${friend.name}'s last 30 days`;

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{title}</h4>
      <div className={styles.controls}>
        <div className={styles.toggleGroup}>
          {CHART_TYPES.map((t) => (
            <button
              key={t.key}
              className={`${styles.toggleBtn} ${chartType === t.key ? styles.active : ''}`}
              onClick={() => setChartType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.toggleGroup}>
          {DATA_VIEWS.map((v) => (
            <button
              key={v.key}
              className={`${styles.toggleBtn} ${dataView === v.key ? styles.active : ''}`}
              onClick={() => setDataView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
