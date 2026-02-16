import { useState, useEffect } from 'react';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import LogDetailModal from './LogDetailModal';
import styles from './HistoryView.module.css';

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function HistoryView({ activeRoutine, logs, loading, error, nextCursor, fetchLogs, editLog, removeLog }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayStr);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs({ from, to, limit: 20 });
  }, [from, to, fetchLogs]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchLogs({ from, to, limit: 20, cursor: nextCursor, append: true });
    }
  };

  const handleExport = async () => {
    const { downloadWorkbook } = await import('./exportWorkouts');
    downloadWorkbook(activeRoutine, logs);
  };

  const handleDeleteLog = async (logId) => {
    await removeLog(logId);
    setSelectedLog(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <label className={styles.label}>
          From
          <input
            className={styles.dateInput}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className={styles.label}>
          To
          <input
            className={styles.dateInput}
            type="date"
            value={to}
            max={todayStr()}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button className={styles.exportBtn} onClick={handleExport} disabled={logs.length === 0}>
          Export
        </button>
      </div>

      {error && <InlineError message={error} />}

      {loading && logs.length === 0 && (
        <div className={styles.center}><Spinner size={28} /></div>
      )}

      {!loading && logs.length === 0 && (
        <EmptyState message="No workout logs in this date range" />
      )}

      <div className={styles.list}>
        {logs.map((log) => (
          <Card key={log.logId} className={styles.logCard}>
            <button className={styles.logBtn} onClick={() => setSelectedLog(log)}>
              <div className={styles.logTop}>
                <span className={styles.logDate}>{log.date}</span>
                {log.dayLabel && <span className={styles.logLabel}>{log.dayLabel}</span>}
              </div>
              <span className={styles.logMeta}>
                {log.exercises?.length || 0} exercise{log.exercises?.length !== 1 ? 's' : ''}
                {log.durationMin ? ` \u00B7 ${log.durationMin} min` : ''}
              </span>
            </button>
          </Card>
        ))}
      </div>

      {nextCursor && (
        <button className={styles.loadMoreBtn} onClick={handleLoadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      <LogDetailModal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
        onDelete={handleDeleteLog}
        onEdit={editLog}
      />
    </div>
  );
}
