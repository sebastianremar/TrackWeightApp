import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function EmptyState({ emoji = '', title, message }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <View style={s.container}>
      {emoji ? <Text style={s.emoji}>{emoji}</Text> : null}
      {title ? <Text style={s.title}>{title}</Text> : null}
      {message ? <Text style={s.message}>{message}</Text> : null}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    emoji: { fontSize: 48, marginBottom: 12 },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
