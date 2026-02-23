import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

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
  return ScaledSheet.create({
    container: {
      backgroundColor: colors.errorBg,
      borderRadius: '8@ms',
      padding: '12@ms',
      borderWidth: 1,
      borderColor: colors.error,
    },
    text: {
      color: colors.error,
      fontSize: '14@ms0.3',
      fontWeight: '500',
    },
  });
}
