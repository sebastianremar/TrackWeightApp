import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import EmptyState from '../../components/EmptyState';
import HabitItem from './HabitItem';

function CompletionRing({ completed, total, pct, colors }) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (total > 0 ? completed / total : 0));
  const allDone = total > 0 && completed === total;

  return (
    <View style={ringStyles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={allDone ? colors.success || '#16A34A' : colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[ringStyles.label, { color: allDone ? (colors.success || '#16A34A') : colors.text }]}>
        {pct}%
      </Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  label: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default function DayDetailPanel({
  date,
  habits,
  entries,
  onToggle,
  updateNote,
  onEditHabit,
  onDeleteHabit,
  weekEntries,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  if (habits.length === 0) {
    return (
      <EmptyState
        emoji="✅"
        title="No habits yet"
        message="Tap + to create your first habit"
      />
    );
  }

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const goodHabits = habits.filter((h) => h.type !== 'bad');
  const goodCompletedCount = goodHabits.filter((h) =>
    entries.some((e) => e.habitId === h.habitId && e.date === date),
  ).length;
  const pct = goodHabits.length > 0
    ? Math.round((goodCompletedCount / goodHabits.length) * 100)
    : 0;

  return (
    <View style={s.panel}>
      <View style={s.summary}>
        <CompletionRing
          completed={goodCompletedCount}
          total={goodHabits.length}
          pct={pct}
          colors={colors}
        />
        <View style={s.summaryText}>
          <Text style={s.dayLabel}>{dayLabel}</Text>
          <Text style={s.summaryLine}>
            {goodCompletedCount === goodHabits.length && goodHabits.length > 0
              ? 'All done!'
              : `${pct}% complete`}
          </Text>
        </View>
      </View>

      {habits.map((habit) => {
        const entry = entries.find(
          (e) => e.habitId === habit.habitId && e.date === date,
        );
        const completed = !!entry;
        const note = entry?.note || '';
        const weekProgress = weekEntries
          ? weekEntries.filter((e) => e.habitId === habit.habitId).length
          : undefined;

        return (
          <HabitItem
            key={habit.habitId}
            habit={habit}
            completed={completed}
            onToggle={() => onToggle(habit.habitId, date, completed)}
            onEdit={() => onEditHabit(habit)}
            onDelete={onDeleteHabit ? () => onDeleteHabit(habit) : undefined}
            progress={weekProgress}
            note={note}
            onNoteChange={
              updateNote ? (val) => updateNote(habit.habitId, date, val) : undefined
            }
          />
        );
      })}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    panel: {
      marginTop: 12,
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryText: {
      flex: 1,
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    summaryLine: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
