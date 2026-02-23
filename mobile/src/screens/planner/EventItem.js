import { View, Text, TouchableOpacity } from 'react-native';
import { ScaledSheet } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function EventItem({ event, onPress }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const eventColor = event.color || colors.primary;

  const timeLabel = formatTime12(event.startTime) +
    (event.endTime ? ` - ${formatTime12(event.endTime)}` : '');

  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(event)} activeOpacity={0.7}>
      <View style={[s.colorBar, { backgroundColor: eventColor }]} />
      <View style={s.content}>
        <Text style={s.title} numberOfLines={1}>{event.title}</Text>
        <Text style={s.time}>{timeLabel}</Text>
        {event.category ? (
          <View style={[s.categoryTag, { backgroundColor: eventColor + '20' }]}>
            <Text style={[s.categoryText, { color: eventColor }]}>{event.category}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: '10@ms',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    colorBar: {
      width: '4@ms',
      alignSelf: 'stretch',
    },
    content: {
      flex: 1,
      padding: '12@ms',
      gap: '2@ms',
    },
    title: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    time: {
      fontSize: '13@ms0.3',
      color: colors.textSecondary,
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: '8@ms',
      paddingVertical: '2@ms',
      borderRadius: '4@ms',
      marginTop: '4@ms',
    },
    categoryText: {
      fontSize: '11@ms0.3',
      fontWeight: '600',
    },
    chevron: {
      fontSize: '22@ms0.3',
      color: colors.textMuted,
      paddingRight: '12@ms',
    },
  });
}
