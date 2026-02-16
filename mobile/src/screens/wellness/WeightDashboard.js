import { useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../api/auth';
import { useWeightData } from '../../hooks/useWeightData';
import InlineError from '../../components/InlineError';
import EmptyState from '../../components/EmptyState';
import WeightForm from './WeightForm';
import WeightChart from './WeightChart';
import StatsCards from './StatsCards';
import EntriesList from './EntriesList';

const DEFAULT_STATS = ['current', 'avgWeeklyChange', 'lowest'];

export default function WeightDashboard({ scrollRef }) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { entries, loading, error, range, setRange, refetch, stats } = useWeightData();
  const [editingEntry, setEditingEntry] = useState(null);
  const s = makeStyles(colors);

  const visibleStats = user?.dashboardStats || DEFAULT_STATS;

  const handleSaved = useCallback(() => {
    setEditingEntry(null);
    refetch();
  }, [refetch]);

  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    // Scroll to top so the form is visible
    scrollRef?.current?.scrollTo?.({ y: 0, animated: true });
  }, [scrollRef]);

  const handleCancelEdit = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const handleUpdateVisibleStats = useCallback(async (newStats) => {
    updateUser({ dashboardStats: newStats });
    try {
      await updateProfile({ dashboardStats: newStats });
    } catch {
      // revert on failure
      updateUser({ dashboardStats: visibleStats });
    }
  }, [updateUser, visibleStats]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <WeightForm
        editingEntry={editingEntry}
        onCancelEdit={handleCancelEdit}
        onSaved={handleSaved}
      />

      <InlineError message={error} />

      {entries.length === 0 ? (
        <EmptyState
          emoji={"\u2696\uFE0F"}
          title="No entries yet"
          message="Log your first weight above to start tracking your progress."
        />
      ) : (
        <>
          <WeightChart
            entries={entries}
            range={range}
            onRangeChange={setRange}
          />

          <StatsCards
            stats={stats}
            visibleStats={visibleStats}
            onUpdateVisibleStats={handleUpdateVisibleStats}
          />

          <EntriesList
            entries={entries}
            onEdit={handleEdit}
            onDeleted={refetch}
          />
        </>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { gap: 16 },
    center: {
      paddingVertical: 60,
      alignItems: 'center',
    },
  });
}
