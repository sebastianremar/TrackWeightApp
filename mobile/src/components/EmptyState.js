import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

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
  return ScaledSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: '32@vs',
      paddingHorizontal: '24@ms',
    },
    emoji: { fontSize: '48@ms0.3', marginBottom: '12@ms' },
    title: {
      fontSize: '18@ms0.3',
      fontWeight: '700',
      color: colors.text,
      marginBottom: '8@ms',
      textAlign: 'center',
    },
    message: {
      fontSize: '14@ms0.3',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: '20@ms0.3',
    },
  });
}
