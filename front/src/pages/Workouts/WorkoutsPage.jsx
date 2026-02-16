import { useState, useEffect } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import { useExercises } from '../../hooks/useExercises';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';
import TemplatesView from './TemplatesView';
import LogView from './LogView';
import HistoryView from './HistoryView';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './WorkoutsPage.module.css';

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'log', label: 'Log' },
  { key: 'history', label: 'History' },
];

export default function WorkoutsPage() {
  const [tab, setTab] = useState('templates');
  const tabIndex = TABS.findIndex((t) => t.key === tab);

  const {
    templates, loading: templatesLoading, error: templatesError,
    fetchTemplates, addTemplate, editTemplate, removeTemplate,
  } = useTemplates();

  const {
    library, custom, loading: exercisesLoading, error: exercisesError,
    fetchExercises, addCustom,
  } = useExercises();

  const logState = useWorkoutLogs();

  useEffect(() => {
    fetchTemplates();
    fetchExercises();
  }, [fetchTemplates, fetchExercises]);

  const loading = templatesLoading || exercisesLoading;
  const error = templatesError || exercisesError;

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

      {error && <InlineError message={error} />}

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        <>
          {tab === 'templates' && (
            <TemplatesView
              templates={templates}
              library={library}
              custom={custom}
              onAddTemplate={addTemplate}
              onEditTemplate={editTemplate}
              onDeleteTemplate={removeTemplate}
              onCreateCustom={addCustom}
            />
          )}
          {tab === 'log' && (
            <LogView
              templates={templates}
              library={library}
              custom={custom}
              addLog={logState.addLog}
              onCreateCustom={addCustom}
            />
          )}
          {tab === 'history' && (
            <HistoryView
              templates={templates}
              {...logState}
            />
          )}
        </>
      )}
    </div>
  );
}
