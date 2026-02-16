import { useState } from 'react';
import HabitsPage from '../Habits/HabitsPage';
import CalendarPage from '../Calendar/CalendarPage';
import TodosPage from '../Todos/TodosPage';
import styles from './PlannerPage.module.css';

const TABS = [
  { key: 'habits', label: 'Habits' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'todos', label: 'Todos' },
];

export default function PlannerPage() {
  const [tab, setTab] = useState('habits');
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

      {tab === 'habits' && <HabitsPage />}
      {tab === 'calendar' && <CalendarPage />}
      {tab === 'todos' && <TodosPage />}
    </div>
  );
}
