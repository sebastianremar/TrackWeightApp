import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import DayDetailPanel from './DayDetailPanel';

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return fmt(d);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_DOTS = 5;

export default function WeekView({
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
  const weekStart = getWeekStart(refDate);
  const [selectedDate, setSelectedDate] = useState(refDate);
  const today = todayStr();
  const currentWeekStart = getWeekStart(today);
  const showTodayBtn = weekStart !== currentWeekStart;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    days.push(fmt(d));
  }

  const goWeek = (offset) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + offset * 7);
    const newStart = fmt(d);
    setRefDate(newStart);
    setSelectedDate(newStart);
  };

  const goToday = () => {
    setRefDate(today);
    setSelectedDate(today);
  };

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  })();

  return (
    <View>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => goWeek(-1)} style={s.arrowBtn}>
          <Text style={s.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navLabel}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => goWeek(1)} style={s.arrowBtn}>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
        {showTodayBtn && (
          <TouchableOpacity onPress={goToday} style={s.todayBtn}>
            <Text style={s.todayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.strip}>
        {days.map((date) => {
          const dayNum = (new Date(date + 'T00:00:00').getDay() + 6) % 7;
          const isSelected = date === selectedDate;
          const isToday = date === today;

          const habitDots = habits.slice(0, MAX_DOTS).map((h) => {
            const completed = entries.some((e) => e.habitId === h.habitId && e.date === date);
            return { color: completed ? h.color : colors.border, key: h.habitId };
          });
          const extra = habits.length > MAX_DOTS ? habits.length - MAX_DOTS : 0;

          return (
            <TouchableOpacity
              key={date}
              style={[
                s.day,
                isSelected && s.daySelected,
                isToday && !isSelected && s.dayToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[s.dayName, isSelected && s.dayNameSelected]}>
                {DAY_NAMES[dayNum]}
              </Text>
              <Text style={[s.dayNum, isSelected && s.dayNumSelected]}>
                {new Date(date + 'T00:00:00').getDate()}
              </Text>
              {habits.length > 0 && (
                <View style={s.dots}>
                  {habitDots.map((dot) => (
                    <View
                      key={dot.key}
                      style={[s.dot, { backgroundColor: dot.color }]}
                    />
                  ))}
                  {extra > 0 && (
                    <Text style={s.dotExtra}>+{extra}</Text>
                  )}
                </View>
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
}

function makeStyles(colors) {
  return StyleSheet.create({
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12,
    },
    arrowBtn: {
      padding: 8,
    },
    arrow: {
      fontSize: 24,
      color: colors.primary,
      fontWeight: '600',
    },
    navLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      minWidth: 140,
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
    strip: {
      flexDirection: 'row',
      gap: 4,
    },
    day: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    daySelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayToday: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    dayName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 2,
    },
    dayNameSelected: {
      color: '#fff',
    },
    dayNum: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    dayNumSelected: {
      color: '#fff',
    },
    dots: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 2,
      marginTop: 4,
      maxWidth: 36,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    dotExtra: {
      fontSize: 8,
      color: colors.textMuted,
    },
  });
}
