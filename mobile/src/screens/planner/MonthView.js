import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import DayDetailPanel from './DayDetailPanel';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default React.memo(function MonthView({
  habits,
  entries,
  refDate,
  setRefDate,
  toggleEntry,
  updateNote,
  onEditHabit,
  onDeleteHabit,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const ref = new Date(refDate + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const [selectedDate, setSelectedDate] = useState(refDate);
  const today = new Date().toISOString().split('T')[0];

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    const next = fmt(d);
    setRefDate(next);
    setSelectedDate(next);
  };

  const goToday = () => {
    const t = fmt(now);
    setRefDate(t);
    setSelectedDate(t);
  };

  // Build calendar cells
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(fmt(new Date(year, month, d)));
  }

  const goodHabits = useMemo(() => habits.filter((h) => h.type !== 'bad'), [habits]);

  function ratioToColor(ratio) {
    if (ratio >= 0.8) return colors.success || '#16A34A';
    if (ratio >= 0.4) return colors.primary;
    if (ratio > 0) return colors.textMuted;
    return 'transparent';
  }

  return (
    <View>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => goMonth(-1)} style={s.arrowBtn}>
          <Text style={s.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={() => goMonth(1)} style={s.arrowBtn}>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
        {!isCurrentMonth && (
          <TouchableOpacity onPress={goToday} style={s.todayBtn}>
            <Text style={s.todayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.grid}>
        {DAY_NAMES.map((n) => (
          <View key={n} style={s.dayHeader}>
            <Text style={s.dayHeaderText}>{n}</Text>
          </View>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return <View key={`empty-${i}`} style={s.cellEmpty} />;
          }

          const completedCount = goodHabits.filter((h) =>
            entries.some((e) => e.habitId === h.habitId && e.date === date),
          ).length;
          const total = goodHabits.length;
          const ratio = total > 0 ? completedCount / total : 0;
          const isSelected = date === selectedDate;
          const isToday = date === today;

          return (
            <TouchableOpacity
              key={date}
              style={[
                s.cell,
                isSelected && s.cellSelected,
                isToday && !isSelected && s.cellToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[s.cellNum, isSelected && s.cellNumSelected]}>
                {new Date(date + 'T00:00:00').getDate()}
              </Text>
              {total > 0 && (
                <View
                  style={[
                    s.completionDot,
                    { backgroundColor: ratioToColor(ratio) },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <DayDetailPanel
        date={selectedDate}
        habits={habits}
        entries={entries}
        onToggle={toggleEntry}
        updateNote={updateNote}
        onEditHabit={onEditHabit}
        onDeleteHabit={onDeleteHabit}
        weekEntries={entries}
      />
    </View>
  );
});

function makeStyles(colors) {
  return StyleSheet.create({
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12,
    },
    arrowBtn: { padding: 8 },
    arrow: {
      fontSize: 24,
      color: colors.primary,
      fontWeight: '600',
    },
    navLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      minWidth: 160,
      textAlign: 'center',
    },
    todayBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    todayText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayHeader: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: 6,
    },
    dayHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    cellEmpty: {
      width: '14.28%',
      aspectRatio: 1,
    },
    cell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    cellSelected: {
      backgroundColor: colors.primary,
    },
    cellToday: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    cellNum: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    cellNumSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    completionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 2,
    },
  });
}
