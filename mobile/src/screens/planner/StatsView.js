import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getHabitStats, getHabitStatsSummary } from '../../api/habitEntries';
import Card from '../../components/Card';
import StreakRow from './StreakRow';

export default function StatsView({ habits }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [period, setPeriod] = useState('week');
  const [summary, setSummary] = useState(null);
  const [streakMap, setStreakMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (habits.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const streakWeeks = period === 'week' ? 4 : 16;

    Promise.all([
      getHabitStatsSummary(period),
      ...habits.map((h) =>
        getHabitStats(h.habitId, streakWeeks).then((data) => ({
          habitId: h.habitId,
          stats: data.stats,
        })),
      ),
    ])
      .then(([summaryData, ...streakResults]) => {
        setSummary(summaryData);
        const map = {};
        streakResults.forEach((r) => {
          map[r.habitId] = r.stats;
        });
        setStreakMap(map);
      })
      .finally(() => setLoading(false));
  }, [habits, period]);

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const badHabits = habits.filter((h) => h.type === 'bad');

  let completionRate = 0;
  let totalCompletions = 0;
  let totalTarget = 0;
  if (summary && goodHabits.length > 0) {
    const goodIds = new Set(goodHabits.map((h) => h.habitId));
    totalCompletions = Object.entries(summary.counts || {})
      .filter(([id]) => goodIds.has(id))
      .reduce((sum, [, c]) => sum + c, 0);
    const daysInPeriod = summary.totalDays || 7;
    const weeksInPeriod = Math.max(1, daysInPeriod / 7);
    totalTarget = goodHabits.reduce(
      (sum, h) => sum + h.targetFrequency * weeksInPeriod,
      0,
    );
    completionRate =
      totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;
  }

  // Breakdown bar data
  const habitBreakdown =
    summary && goodHabits.length > 0
      ? goodHabits
          .map((h) => ({
            habitId: h.habitId,
            name: h.name,
            color: h.color,
            count: (summary.counts || {})[h.habitId] || 0,
          }))
          .filter((h) => h.count > 0)
      : [];
  const breakdownTotal = habitBreakdown.reduce((sum, h) => sum + h.count, 0);

  return (
    <View>
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, period === 'week' && s.toggleActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[s.toggleText, period === 'week' && s.toggleTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, period === 'month' && s.toggleActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[s.toggleText, period === 'month' && s.toggleTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={s.content}>
          <Card>
            <Text style={s.cardTitle}>Overall Completion</Text>
            <View style={s.completionRow}>
              <Text style={s.completionPct}>{completionRate}%</Text>
              <Text style={s.completionSub}>
                {totalCompletions} / {Math.round(totalTarget)} completions
              </Text>
            </View>
            <View style={s.progressBar}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${Math.min(100, completionRate)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>

            {habitBreakdown.length > 0 && (
              <View style={s.breakdownBar}>
                {habitBreakdown.map((h) => (
                  <View
                    key={h.habitId}
                    style={{
                      flex: h.count / breakdownTotal,
                      height: 8,
                      backgroundColor: h.color,
                    }}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card style={s.cardSpacing}>
            <Text style={s.cardTitle}>Habit Streaks</Text>
            {habits.length === 0 ? (
              <Text style={s.muted}>No habits yet</Text>
            ) : (
              habits.map((habit) => (
                <StreakRow
                  key={habit.habitId}
                  habit={habit}
                  stats={streakMap[habit.habitId] || []}
                />
              ))
            )}
          </Card>

          {badHabits.length > 0 && summary && (
            <Card style={s.cardSpacing}>
              <Text style={s.cardTitle}>Bad Habits</Text>
              {badHabits.map((habit) => {
                const count = (summary.counts || {})[habit.habitId] || 0;
                const habitPeriod = habit.limitPeriod || 'week';
                const matchesPeriod = period === habitPeriod;
                const exceeded =
                  matchesPeriod && count > habit.targetFrequency;

                return (
                  <View key={habit.habitId} style={s.badRow}>
                    <View
                      style={[s.badDot, { backgroundColor: habit.color }]}
                    />
                    <Text style={s.badName} numberOfLines={1}>
                      {habit.name}
                    </Text>
                    <Text
                      style={[s.badCount, exceeded && s.badCountExceeded]}
                    >
                      {matchesPeriod
                        ? `${count}/${habit.targetFrequency} this ${habitPeriod}`
                        : `${count} this ${period}`}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: '#fff',
    },
    center: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    content: {
      gap: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    cardSpacing: {
      marginTop: 12,
    },
    completionRow: {
      marginBottom: 8,
    },
    completionPct: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primary,
    },
    completionSub: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    breakdownBar: {
      flexDirection: 'row',
      borderRadius: 4,
      overflow: 'hidden',
    },
    muted: {
      fontSize: 14,
      color: colors.textMuted,
    },
    badRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    badDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    badName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    badCount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
    },
    badCountExceeded: {
      color: colors.error,
      fontWeight: '700',
    },
  });
}
