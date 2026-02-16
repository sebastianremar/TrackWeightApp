import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function InlineError({ message }) {
  const { colors } = useTheme();
  if (!message) return null;
  const s = makeStyles(colors);
  return (
    <View style={s.container}>
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.errorBg,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.error,
    },
    text: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}
