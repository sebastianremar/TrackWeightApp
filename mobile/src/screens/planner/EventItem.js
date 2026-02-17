import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    colorBar: {
      width: 4,
      alignSelf: 'stretch',
    },
    content: {
      flex: 1,
      padding: 12,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    time: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '600',
    },
    chevron: {
      fontSize: 22,
      color: colors.textMuted,
      paddingRight: 12,
    },
  });
}
