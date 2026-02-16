import { useState } from 'react';
import { useWorkoutRoutines } from '../../hooks/useWorkoutRoutines';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';
import ScheduleView from './ScheduleView';
import LogView from './LogView';
import HistoryView from './HistoryView';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './WorkoutsPage.module.css';

const TABS = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'log', label: 'Log' },
  { key: 'history', label: 'History' },
];

export default function WorkoutsPage() {
  const [tab, setTab] = useState('schedule');
  const tabIndex = TABS.findIndex((t) => t.key === tab);

  const {
    routines, activeRoutine, loading: routinesLoading, error: routinesError,
    addRoutine, editRoutine, removeRoutine, refetch: refetchRoutines,
  } = useWorkoutRoutines();

  const logState = useWorkoutLogs();

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

      {routinesError && <InlineError message={routinesError} />}

      {routinesLoading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        <>
          {tab === 'schedule' && (
            <ScheduleView
              routines={routines}
              activeRoutine={activeRoutine}
              addRoutine={addRoutine}
              editRoutine={editRoutine}
              removeRoutine={removeRoutine}
              refetchRoutines={refetchRoutines}
            />
          )}
          {tab === 'log' && (
            <LogView
              activeRoutine={activeRoutine}
              addLog={logState.addLog}
            />
          )}
          {tab === 'history' && (
            <HistoryView
              activeRoutine={activeRoutine}
              {...logState}
            />
          )}
        </>
      )}
    </div>
  );
}
