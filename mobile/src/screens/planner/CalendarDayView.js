import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScaledSheet, moderateScale } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const HOUR_HEIGHT = moderateScale(60);
const START_HOUR = 6;
const END_HOUR = 23;
const MIN_EVENT_HEIGHT = moderateScale(30);
const LABEL_WIDTH = moderateScale(56);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function parseTime(t) {
  const [h, m] = t.split(':').map(Number);
  return { h, m };
}

function formatTime12(t) {
  const { h, m } = parseTime(t);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatHour12(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function CalendarDayView({ events, refDate, setRefDate, onEditEvent, onCreateEvent }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const d = new Date(refDate + 'T00:00:00');
  const today = todayStr();
  const isToday = refDate === today;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 900000);
    return () => clearInterval(id);
  }, [isToday]);

  const dateLabel = `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;

  const goDay = (offset) => {
    const next = new Date(d);
    next.setDate(next.getDate() + offset);
    setRefDate(fmt(next));
  };

  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const dayEvents = events.filter((e) => e.date === refDate);

  const handleTimeClick = (hour) => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    onCreateEvent(time);
  };

  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const showNowLine = isToday && nowH >= START_HOUR && nowH <= END_HOUR;
  const nowTop = showNowLine ? ((nowH - START_HOUR) * 60 + nowM) / 60 * HOUR_HEIGHT : 0;

  return (
    <View>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => goDay(-1)} style={s.arrowBtn}>
          <Text style={s.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navLabel}>{dateLabel}</Text>
        <TouchableOpacity onPress={() => goDay(1)} style={s.arrowBtn}>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={() => setRefDate(today)} style={s.todayBtn}>
            <Text style={s.todayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {dayEvents.length === 0 && (
        <View style={s.emptyHint}>
          <Text style={s.emptyText}>No events today. Tap a time slot or + to add one.</Text>
        </View>
      )}

      <ScrollView style={s.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[s.timeline, { height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }]}>
          {hours.map((h) => (
            <TouchableOpacity
              key={h}
              style={[s.hourRow, { top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }]}
              onPress={() => handleTimeClick(h)}
              activeOpacity={0.6}
            >
              <Text style={s.hourLabel}>{formatHour12(h)}</Text>
              <View style={s.hourLine} />
            </TouchableOpacity>
          ))}

          {showNowLine && (
            <View style={[s.nowLine, { top: nowTop }]} pointerEvents="none">
              <View style={s.nowDot} />
              <View style={s.nowLineBar} />
            </View>
          )}

          {dayEvents.map((event) => {
            const start = parseTime(event.startTime);
            const end = event.endTime ? parseTime(event.endTime) : { h: start.h + 1, m: start.m };
            const topMin = (start.h - START_HOUR) * 60 + start.m;
            const durationMin = (end.h - start.h) * 60 + (end.m - start.m);
            const top = (topMin / 60) * HOUR_HEIGHT;
            const height = Math.max((durationMin / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
            const eventColor = event.color || colors.primary;

            return (
              <TouchableOpacity
                key={event.eventId}
                style={[
                  s.eventBlock,
                  {
                    top,
                    height,
                    borderLeftColor: eventColor,
                    backgroundColor: eventColor + '20',
                  },
                ]}
                onPress={() => onEditEvent(event)}
                activeOpacity={0.7}
              >
                <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={s.eventTime}>
                  {formatTime12(event.startTime)}
                  {event.endTime ? ` - ${formatTime12(event.endTime)}` : ''}
                </Text>
                {event.category ? <Text style={s.eventCategory}>{event.category}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8@ms',
      marginBottom: '12@ms',
    },
    arrowBtn: { padding: '8@ms' },
    arrow: {
      fontSize: '24@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
    navLabel: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
      minWidth: '180@ms',
      textAlign: 'center',
    },
    todayBtn: {
      paddingHorizontal: '12@ms',
      paddingVertical: '6@ms',
      borderRadius: '16@ms',
      backgroundColor: colors.primary,
    },
    todayText: {
      fontSize: '12@ms0.3',
      fontWeight: '600',
      color: '#fff',
    },
    emptyHint: {
      backgroundColor: colors.surface,
      borderRadius: '10@ms',
      padding: '16@ms',
      alignItems: 'center',
      marginBottom: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontSize: '14@ms0.3',
      color: colors.textMuted,
    },
    scrollContainer: {
      maxHeight: '500@ms',
    },
    timeline: {
      position: 'relative',
    },
    hourRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    hourLabel: {
      width: LABEL_WIDTH,
      fontSize: '11@ms0.3',
      color: colors.textMuted,
      textAlign: 'right',
      paddingRight: '8@ms',
      marginTop: '-6@ms',
    },
    hourLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    nowLine: {
      position: 'absolute',
      left: LABEL_WIDTH,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 10,
    },
    nowDot: {
      width: '8@ms',
      height: '8@ms',
      borderRadius: '4@ms',
      backgroundColor: '#DC2626',
      marginLeft: '-4@ms',
    },
    nowLineBar: {
      flex: 1,
      height: 2,
      backgroundColor: '#DC2626',
    },
    eventBlock: {
      position: 'absolute',
      left: LABEL_WIDTH + moderateScale(4),
      right: '8@ms',
      borderLeftWidth: 4,
      borderRadius: '6@ms',
      padding: '6@ms',
      zIndex: 5,
    },
    eventTitle: {
      fontSize: '13@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    eventTime: {
      fontSize: '11@ms0.3',
      color: colors.textSecondary,
      marginTop: '1@ms',
    },
    eventCategory: {
      fontSize: '10@ms0.3',
      color: colors.textMuted,
      marginTop: '2@ms',
    },
  });
}
