import { View, Text, TouchableOpacity } from 'react-native';
import { ScaledSheet } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_DOTS = 3;

function fmt(d) {
  return d.toISOString().split('T')[0];
}

export default function CalendarMonthView({ events, refDate, setRefDate, onDayClick }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const ref = new Date(refDate + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const today = new Date().toISOString().split('T')[0];

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    setRefDate(fmt(d));
  };

  const goToday = () => setRefDate(fmt(now));

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(fmt(new Date(year, month, d)));
  }

  // Build date -> event colors map
  const dateEventsMap = {};
  for (const e of events) {
    if (!dateEventsMap[e.date]) dateEventsMap[e.date] = [];
    dateEventsMap[e.date].push(e.color || colors.primary);
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

          const isToday = date === today;
          const dayNum = new Date(date + 'T00:00:00').getDate();
          const eventColors = dateEventsMap[date] || [];
          const dotsToShow = eventColors.slice(0, MAX_DOTS);
          const overflow = eventColors.length - MAX_DOTS;

          return (
            <TouchableOpacity
              key={date}
              style={[
                s.cell,
                isToday && s.cellToday,
              ]}
              onPress={() => onDayClick(date)}
            >
              <Text style={[s.cellNum, isToday && s.cellNumToday]}>
                {dayNum}
              </Text>
              {dotsToShow.length > 0 && (
                <View style={s.dots}>
                  {dotsToShow.map((c, j) => (
                    <View key={j} style={[s.dot, { backgroundColor: c }]} />
                  ))}
                  {overflow > 0 && (
                    <Text style={s.overflowText}>+{overflow}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
      minWidth: '160@ms',
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayHeader: {
      width: '14.28%',
      alignItems: 'center',
      paddingVertical: '6@ms',
    },
    dayHeaderText: {
      fontSize: '12@ms0.3',
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
      borderRadius: '8@ms',
    },
    cellToday: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    cellNum: {
      fontSize: '14@ms0.3',
      fontWeight: '500',
      color: colors.text,
    },
    cellNumToday: {
      color: colors.primary,
      fontWeight: '700',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: '2@ms',
      marginTop: '2@ms',
    },
    dot: {
      width: '5@ms',
      height: '5@ms',
      borderRadius: '2.5@ms',
    },
    overflowText: {
      fontSize: '7@ms0.3',
      color: colors.textMuted,
    },
  });
}
