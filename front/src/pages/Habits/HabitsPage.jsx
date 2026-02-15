import { useState, useEffect } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { useHabitEntries } from '../../hooks/useHabitEntries';
import WeekView from './WeekView';
import MonthView from './MonthView';
import StatsView from './StatsView';
import HabitModal from './HabitModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './HabitsPage.module.css';

const TABS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'stats', label: 'Stats' },
];

function getDateRange(tab, refDate) {
  const d = new Date(refDate + 'T00:00:00');
  if (tab === 'week') {
    const dow = (d.getDay() + 6) % 7; // Monday=0
    const start = new Date(d);
    start.setDate(start.getDate() - dow);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (tab === 'month' || tab === 'stats') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: fmt(start), to: fmt(end) };
  }
  return { from: refDate, to: refDate };
}

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function HabitsPage() {
  const [tab, setTab] = useState('week');
  const [refDate, setRefDate] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { habits, loading: habitsLoading, error: habitsError, addHabit, editHabit, removeHabit } = useHabits();
  const { entries, loading: entriesLoading, fetchEntries, toggleEntry } = useHabitEntries();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { from, to } = getDateRange(tab, refDate);
    fetchEntries(from, to);
  }, [tab, refDate]);

  const loading = habitsLoading || entriesLoading;

  const handleOpenCreate = () => { setEditingHabit(null); setModalOpen(true); };
  const handleOpenEdit = (habit) => { setEditingHabit(habit); setModalOpen(true); };

  const handleSaveHabit = async (data) => {
    if (editingHabit) {
      await editHabit(editingHabit.habitId, data);
    } else {
      await addHabit(data.name, data.targetFrequency, data.color, data.type, data.limitPeriod);
    }
    setModalOpen(false);
  };

  const handleDeleteHabit = (habit) => {
    setDeleteTarget(habit);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      removeHabit(deleteTarget.habitId);
    }
  };

  const renderView = () => {
    const props = {
      habits, entries, refDate, setRefDate, toggleEntry,
      onEditHabit: handleOpenEdit,
      onDeleteHabit: handleDeleteHabit,
    };
    switch (tab) {
      case 'week': return <WeekView {...props} />;
      case 'month': return <MonthView {...props} />;
      case 'stats': return <StatsView habits={habits} />;
      default: return null;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className={styles.addBtn} onClick={handleOpenCreate}>+ New Habit</button>
      </div>

      {habitsError && <InlineError message={habitsError} />}

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        renderView()
      )}

      <HabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveHabit}
        onDelete={editingHabit ? () => { removeHabit(editingHabit.habitId); setModalOpen(false); } : null}
        habit={editingHabit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Habit"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? It will be removed from your active habits.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
