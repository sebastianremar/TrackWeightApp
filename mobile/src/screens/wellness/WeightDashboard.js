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
  const { entries, initialLoading, refreshing, error, range, setRange, refetch, stats } = useWeightData();
  const s = makeStyles(colors);

  const visibleStats = user?.dashboardStats || DEFAULT_STATS;

  // Stable callback via ref so WeightForm doesn't re-render on range change
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const handleSaved = useCallback(() => {
    refetchRef.current();
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

  if (initialLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {refreshing && (
        <View style={s.refreshOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <View style={refreshing ? s.dimmed : undefined}>
        <WeightForm
          entries={entries}
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
          <View style={s.dataSection}>
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
              onDeleted={refetch}
            />
          </View>
        )}
      </View>
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
    refreshOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
      padding: 8,
    },
    dimmed: {
      opacity: 0.5,
    },
    dataSection: {
      gap: 16,
    },
  });
}
