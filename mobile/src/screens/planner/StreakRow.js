import { View, Text } from 'react-native';
import { ScaledSheet } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

function calcBestStreak(stats, targetFrequency) {
  let best = 0;
  let current = 0;
  for (const week of stats) {
    if (week.completions >= targetFrequency) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export default function StreakRow({ habit, stats }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const maxCompletions = Math.max(1, ...stats.map((w) => w.completions));
  const bestStreak = calcBestStreak(stats, habit.targetFrequency);

  return (
    <View style={s.row}>
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: habit.color }]} />
        <Text style={s.name} numberOfLines={1}>{habit.name}</Text>
        {bestStreak > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>Best: {bestStreak}w</Text>
          </View>
        )}
      </View>
      <View style={s.heatmap}>
        {stats.map((week) => {
          const intensity = week.completions / maxCompletions;
          return (
            <View
              key={week.weekStart}
              style={[
                s.cell,
                {
                  backgroundColor: habit.color,
                  opacity: week.completions > 0 ? 0.2 + intensity * 0.8 : 0.1,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    row: {
      marginBottom: '14@ms',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: '6@ms',
    },
    dot: {
      width: '10@ms',
      height: '10@ms',
      borderRadius: '5@ms',
      marginRight: '8@ms',
    },
    name: {
      flex: 1,
      fontSize: '14@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    badge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: '8@ms',
      paddingVertical: '3@ms',
      borderRadius: '10@ms',
    },
    badgeText: {
      fontSize: '11@ms0.3',
      fontWeight: '600',
      color: colors.primary,
    },
    heatmap: {
      flexDirection: 'row',
      gap: '3@ms',
    },
    cell: {
      flex: 1,
      height: '14@ms',
      borderRadius: '3@ms',
    },
  });
}
