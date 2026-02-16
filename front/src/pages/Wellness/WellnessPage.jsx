import { useState } from 'react';
import DashboardPage from '../Dashboard/DashboardPage';
import WorkoutsPage from '../Workouts/WorkoutsPage';
import styles from './WellnessPage.module.css';

const TABS = [
  { key: 'weight', label: 'Weight' },
  { key: 'workouts', label: 'Workouts' },
];

export default function WellnessPage() {
  const [tab, setTab] = useState('weight');
  const tabIndex = TABS.findIndex((t) => t.key === tab);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.segmentedControl} role="tablist">
          <div
            className={styles.segmentIndicator}
            style={{ transform: `translateX(${tabIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.segment} ${tab === t.key ? styles.segmentActive : ''}`}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'weight' && <DashboardPage />}
      {tab === 'workouts' && <WorkoutsPage />}
    </div>
  );
}
