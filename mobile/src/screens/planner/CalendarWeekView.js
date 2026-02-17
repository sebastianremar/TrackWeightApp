import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import EventItem from './EventItem';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_DOTS = 3;

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

export default function CalendarWeekView({ events, refDate, setRefDate, onEditEvent, onDayClick }) {
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

  const selectedEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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

          const dayEvents = events.filter((e) => e.date === date);
          const dots = dayEvents.slice(0, MAX_DOTS).map((e) => ({
            color: e.color || colors.primary,
            key: e.eventId,
          }));
          const extra = dayEvents.length > MAX_DOTS ? dayEvents.length - MAX_DOTS : 0;

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
              {dayEvents.length > 0 && (
                <View style={s.dots}>
                  {dots.map((dot) => (
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

      <View style={s.eventList}>
        {selectedEvents.length === 0 ? (
          <View style={s.emptyDay}>
            <Text style={s.emptyText}>No events on this day</Text>
          </View>
        ) : (
          <View style={s.eventCards}>
            {selectedEvents.map((event) => (
              <EventItem key={event.eventId} event={event} onPress={onEditEvent} />
            ))}
          </View>
        )}
      </View>
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
    eventList: {
      marginTop: 12,
    },
    emptyDay: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    eventCards: {
      gap: 8,
    },
  });
}
