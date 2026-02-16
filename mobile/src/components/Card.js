import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return <View style={[s.card, style]}>{children}</View>;
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
