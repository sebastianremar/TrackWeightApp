import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './WeightChart.module.css';

const RANGES = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 'all', label: 'All' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, weight } = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <span>{formatDate(date)}</span>
      <strong>{weight} kg</strong>
    </div>
  );
}

export default function WeightChart({ entries, range, setRange }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <div className={styles.header}>
        <h2 className={styles.title}>Weight Over Time</h2>
        <div className={styles.controls} role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              className={`${styles.rangeBtn} ${range === r.value ? styles.active : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState message="No weight data for this range" />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sorted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
