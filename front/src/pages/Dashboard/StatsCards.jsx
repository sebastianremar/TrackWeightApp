import Card from '../../components/Card/Card';
import styles from './StatsCards.module.css';

export default function StatsCards({ stats }) {
  const { current, change, lowest } = stats;

  const changeColor = change > 0 ? 'var(--warning)' : change < 0 ? 'var(--success)' : 'var(--text-muted)';
  const changePrefix = change > 0 ? '+' : '';

  return (
    <div className={styles.grid}>
      <Card>
        <span className={styles.label}>Current</span>
        <span className={styles.value}>{current != null ? `${current} kg` : '--'}</span>
      </Card>
      <Card>
        <span className={styles.label}>Change</span>
        <span className={styles.value} style={{ color: changeColor }}>
          {change != null ? `${changePrefix}${change} kg` : '--'}
        </span>
      </Card>
      <Card>
        <span className={styles.label}>Lowest</span>
        <span className={styles.value}>{lowest != null ? `${lowest} kg` : '--'}</span>
      </Card>
    </div>
  );
}
