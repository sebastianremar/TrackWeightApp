import { useState } from 'react';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import RoutineModal from './RoutineModal';
import DayEditorModal from './DayEditorModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import styles from './ScheduleView.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleView({ routines, activeRoutine, addRoutine, editRoutine, removeRoutine, refetchRoutines }) {
  const [routineModal, setRoutineModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);

  const displayRoutine = selectedRoutineId
    ? routines.find((r) => r.routineId === selectedRoutineId) || activeRoutine
    : activeRoutine;

  const schedule = displayRoutine?.schedule || {};

  const handleCreateRoutine = () => {
    setEditingRoutine(null);
    setRoutineModal(true);
  };

  const handleEditRoutine = () => {
    setEditingRoutine(displayRoutine);
    setRoutineModal(true);
  };

  const handleSaveRoutine = async (data) => {
    if (editingRoutine) {
      await editRoutine(editingRoutine.routineId, data);
    } else {
      const created = await addRoutine(data);
      setSelectedRoutineId(created.routineId);
    }
    setRoutineModal(false);
  };

  const handleDeleteRoutine = () => {
    setDeleteTarget(displayRoutine);
    setRoutineModal(false);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await removeRoutine(deleteTarget.routineId);
      setSelectedRoutineId(null);
    }
  };

  const handleDayClick = (dayKey) => {
    setEditingDay(dayKey);
    setDayEditorOpen(true);
  };

  const handleSaveDay = async (dayKey, dayData) => {
    if (!displayRoutine) return;
    const newSchedule = { ...displayRoutine.schedule };
    if (dayData) {
      newSchedule[dayKey] = dayData;
    } else {
      delete newSchedule[dayKey];
    }
    await editRoutine(displayRoutine.routineId, { schedule: newSchedule });
    setDayEditorOpen(false);
  };

  if (routines.length === 0) {
    return (
      <>
        <EmptyState
          message="No workout routines yet"
          action={{ label: 'Create Routine', onClick: handleCreateRoutine }}
        />
        <RoutineModal
          open={routineModal}
          onClose={() => setRoutineModal(false)}
          onSave={handleSaveRoutine}
          routine={null}
        />
      </>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        {routines.length > 1 && (
          <select
            className={styles.select}
            value={displayRoutine?.routineId || ''}
            onChange={(e) => setSelectedRoutineId(e.target.value)}
          >
            {routines.map((r) => (
              <option key={r.routineId} value={r.routineId}>
                {r.name}{r.isActive ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        )}
        {routines.length === 1 && <h3 className={styles.routineName}>{displayRoutine?.name}</h3>}
        <div className={styles.toolbarActions}>
          <button className={styles.iconBtn} onClick={handleEditRoutine} aria-label="Edit routine">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className={styles.addBtn} onClick={handleCreateRoutine}>+ New</button>
        </div>
      </div>

      <div className={styles.grid}>
        {DAY_NAMES.map((name, i) => {
          const day = schedule[String(i)];
          return (
            <Card key={i} className={styles.dayCard}>
              <button className={styles.dayBtn} onClick={() => handleDayClick(String(i))}>
                <span className={styles.dayName}>{name}</span>
                {day ? (
                  <>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <span className={styles.dayMeta}>
                      {day.exercises?.length || 0} exercise{day.exercises?.length !== 1 ? 's' : ''}
                    </span>
                    {day.muscleGroups?.length > 0 && (
                      <div className={styles.tags}>
                        {day.muscleGroups.map((mg) => (
                          <span key={mg} className={styles.tag}>{mg}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className={styles.restLabel}>Rest Day</span>
                )}
              </button>
            </Card>
          );
        })}
      </div>

      <RoutineModal
        open={routineModal}
        onClose={() => setRoutineModal(false)}
        onSave={handleSaveRoutine}
        onDelete={editingRoutine ? handleDeleteRoutine : null}
        routine={editingRoutine}
      />

      <DayEditorModal
        open={dayEditorOpen}
        onClose={() => setDayEditorOpen(false)}
        dayKey={editingDay}
        dayData={editingDay ? schedule[editingDay] : null}
        onSave={handleSaveDay}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Routine"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
