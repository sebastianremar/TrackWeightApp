import { View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return <View style={[s.card, style]}>{children}</View>;
}

function makeStyles(colors) {
  return ScaledSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      padding: '16@ms',
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
