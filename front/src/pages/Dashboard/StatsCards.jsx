import { useState } from 'react';
import Card from '../../components/Card/Card';
import Modal from '../../components/Modal/Modal';
import styles from './StatsCards.module.css';

const ALL_METRICS = [
  { key: 'current', label: 'Current' },
  { key: 'avgWeeklyChange', label: 'Avg/Week' },
  { key: 'weekOverWeek', label: 'WoW Delta' },
  { key: 'lowest', label: 'Lowest' },
  { key: 'highest', label: 'Highest' },
  { key: 'average', label: 'Average' },
];

const COLORED_KEYS = new Set(['avgWeeklyChange', 'weekOverWeek']);

function formatValue(key, val) {
  if (val === null || val === undefined) return '--';
  if (key === 'avgWeeklyChange') {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val} kg/wk`;
  }
  if (key === 'weekOverWeek') {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val} kg`;
  }
  return `${val} kg`;
}

function getColor(key, val) {
  if (!COLORED_KEYS.has(key) || val === null || val === undefined) return undefined;
  if (val > 0) return 'var(--warning)';
  if (val < 0) return 'var(--success)';
  return 'var(--text-muted)';
}

export default function StatsCards({ stats, visibleStats, onUpdateVisibleStats }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(visibleStats);

  const handleOpenModal = () => {
    setSelected(visibleStats);
    setModalOpen(true);
  };

  const handleToggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (selected.length > 0) {
      onUpdateVisibleStats(selected);
    }
    setModalOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {visibleStats.map((key) => {
          const metric = ALL_METRICS.find((m) => m.key === key);
          if (!metric) return null;
          const val = stats[key];
          return (
            <Card key={key}>
              <span className={styles.label}>{metric.label}</span>
              <span className={styles.value} style={{ color: getColor(key, val) }}>
                {formatValue(key, val)}
              </span>
            </Card>
          );
        })}
      </div>
      <button className={styles.gearBtn} onClick={handleOpenModal} aria-label="Customize stats">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M13.5 8a5.5 5.5 0 01-.3 1.2l1.2.7-.8 1.4-1.2-.7a5.5 5.5 0 01-1.1.6v1.4H9.8v-1.4a5.5 5.5 0 01-1.1-.6l-1.2.7-.8-1.4 1.2-.7A5.5 5.5 0 017.5 8a5.5 5.5 0 01.3-1.2l-1.2-.7.8-1.4 1.2.7a5.5 5.5 0 011.1-.6V3.4h1.4v1.4a5.5 5.5 0 011.1.6l1.2-.7.8 1.4-1.2.7A5.5 5.5 0 0113.5 8z" />
        </svg>
      </button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Customize Stats">
        <div className={styles.checkList}>
          {ALL_METRICS.map((m) => (
            <label key={m.key} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={selected.includes(m.key)}
                onChange={() => handleToggle(m.key)}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={selected.length === 0}
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
