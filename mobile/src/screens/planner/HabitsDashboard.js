import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useHabits } from '../../hooks/useHabits';
import { useHabitEntries } from '../../hooks/useHabitEntries';
import InlineError from '../../components/InlineError';
import ConfirmDialog from '../../components/ConfirmDialog';
import WeekView from './WeekView';
import MonthView from './MonthView';
import StatsView from './StatsView';
import HabitModal from './HabitModal';

const TABS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'stats', label: 'Stats' },
];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(tab, refDate) {
  const d = new Date(refDate + 'T00:00:00');
  if (tab === 'week') {
    const dow = (d.getDay() + 6) % 7;
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

export default function HabitsDashboard() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [tab, setTab] = useState('week');
  const [refDate, setRefDate] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    addHabit,
    editHabit,
    removeHabit,
  } = useHabits();

  const {
    entries,
    loading: entriesLoading,
    fetchEntries,
    toggleEntry,
    updateNote,
  } = useHabitEntries();

  useEffect(() => {
    const { from, to } = getDateRange(tab, refDate);
    fetchEntries(from, to);
  }, [tab, refDate, fetchEntries]);

  const loading = habitsLoading || entriesLoading;

  const handleOpenCreate = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const handleSaveHabit = async (data) => {
    if (editingHabit) {
      await editHabit(editingHabit.habitId, data);
    } else {
      await addHabit(data.name, data.targetFrequency, data.color, data.type, data.limitPeriod);
    }
  };

  const handleDeleteHabit = (habit) => {
    setDeleteTarget(habit);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await removeHabit(deleteTarget.habitId);
      setDeleteTarget(null);
    }
  };

  const viewProps = {
    habits,
    entries,
    refDate,
    setRefDate,
    toggleEntry,
    updateNote,
    onEditHabit: handleOpenEdit,
    onDeleteHabit: handleDeleteHabit,
  };

  return (
    <View style={s.container}>
      {/* Segmented Control */}
      <View style={s.segmentedControl}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.segment, tab === t.key && s.segmentActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.segmentText, tab === t.key && s.segmentTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <InlineError message={habitsError} />

      {loading && habits.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {tab === 'week' && <WeekView {...viewProps} />}
          {tab === 'month' && <MonthView {...viewProps} />}
          {tab === 'stats' && <StatsView habits={habits} />}
        </>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={handleOpenCreate}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <HabitModal
        visible={modalOpen}
        habit={editingHabit}
        onSave={handleSaveHabit}
        onDelete={
          editingHabit
            ? () => {
                removeHabit(editingHabit.habitId);
                setModalOpen(false);
              }
            : null
        }
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Archive Habit"
        message={
          deleteTarget
            ? `Archive "${deleteTarget.name}"? It will be removed from your active habits.`
            : ''
        }
        confirmLabel="Archive"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    center: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    fab: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
    fabText: {
      fontSize: 28,
      fontWeight: '400',
      color: '#fff',
      marginTop: -2,
    },
  });
}
