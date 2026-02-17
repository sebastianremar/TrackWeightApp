import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getFriendHabits, getFriendHabitsStats } from '../../api/friends';
import { useTheme } from '../../contexts/ThemeContext';
import InlineError from '../../components/InlineError';

export default function FriendHabitsPanel({ friendEmail }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [habits, setHabits] = useState([]);
  const [counts, setCounts] = useState({});
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current && period === 'week') return;
    loadedRef.current = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [habitsData, statsData] = await Promise.all([
          getFriendHabits(friendEmail),
          getFriendHabitsStats(friendEmail, period),
        ]);
        setHabits(habitsData.habits || []);
        setCounts(statsData.counts || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [friendEmail, period]);

  // Re-fetch stats when period changes
  useEffect(() => {
    if (!loadedRef.current) return;
    const loadStats = async () => {
      try {
        const statsData = await getFriendHabitsStats(friendEmail, period);
        setCounts(statsData.counts || {});
      } catch {
        // silently fail
      }
    };
    loadStats();
  }, [friendEmail, period]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) return <InlineError message={error} />;

  if (habits.length === 0) {
    return <Text style={s.empty}>No habits yet</Text>;
  }

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const badHabits = habits.filter((h) => h.type === 'bad');

  let totalCompletions = 0;
  let totalTarget = 0;
  for (const h of goodHabits) {
    totalCompletions += counts[h.habitId] || 0;
    totalTarget += h.targetFrequency;
  }
  const overallPct = totalTarget > 0 ? Math.round((totalCompletions / totalTarget) * 100) : 0;

  return (
    <View style={s.panel}>
      <View style={s.periodToggle}>
        <TouchableOpacity
          style={[s.periodBtn, period === 'week' && s.periodActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[s.periodText, period === 'week' && s.periodTextActive]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.periodBtn, period === 'month' && s.periodActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[s.periodText, period === 'month' && s.periodTextActive]}>Month</Text>
        </TouchableOpacity>
      </View>

      <View style={s.overallRow}>
        <Text style={s.overallLabel}>Overall</Text>
        <Text style={s.overallPct}>{overallPct}%</Text>
      </View>

      {goodHabits.map((habit) => {
        const count = counts[habit.habitId] || 0;
        const pct = habit.targetFrequency > 0 ? Math.min(100, Math.round((count / habit.targetFrequency) * 100)) : 0;
        return (
          <View key={habit.habitId} style={s.habitRow}>
            <View style={s.habitHeader}>
              <View style={[s.habitDot, { backgroundColor: habit.color }]} />
              <Text style={s.habitName} numberOfLines={1}>{habit.name}</Text>
              <View style={s.buildBadge}>
                <Text style={s.buildBadgeText}>Build</Text>
              </View>
              <Text style={s.habitCount}>{count}/{habit.targetFrequency}</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${pct}%`, backgroundColor: habit.color }]} />
            </View>
          </View>
        );
      })}

      {badHabits.map((habit) => {
        const count = counts[habit.habitId] || 0;
        const exceeded = count > habit.targetFrequency;
        const pct = habit.targetFrequency > 0 ? Math.min(100, Math.round((count / habit.targetFrequency) * 100)) : 0;
        return (
          <View key={habit.habitId} style={s.habitRow}>
            <View style={s.habitHeader}>
              <View style={[s.habitDot, { backgroundColor: habit.color }]} />
              <Text style={s.habitName} numberOfLines={1}>{habit.name}</Text>
              <View style={s.limitBadge}>
                <Text style={s.limitBadgeText}>Limit</Text>
              </View>
              <Text style={[s.habitCount, exceeded && { color: colors.error }]}>
                {count}/{habit.targetFrequency}
              </Text>
            </View>
            <View style={[s.barBg, exceeded && { backgroundColor: colors.errorBg }]}>
              <View
                style={[
                  s.barFill,
                  { width: `${pct}%`, backgroundColor: exceeded ? colors.error : habit.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    panel: { marginTop: 8 },
    center: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    empty: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 14,
      paddingVertical: 20,
    },
    periodToggle: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 2,
      marginBottom: 12,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 6,
    },
    periodActive: {
      backgroundColor: colors.primary,
    },
    periodText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    periodTextActive: {
      color: '#fff',
    },
    overallRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    overallLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    overallPct: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    habitRow: {
      marginBottom: 10,
    },
    habitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    habitDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    habitName: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    buildBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.successBg,
      marginRight: 8,
    },
    buildBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.success,
    },
    limitBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.warningBg,
      marginRight: 8,
    },
    limitBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.warning,
    },
    habitCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    barBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: 3,
    },
  });
}
