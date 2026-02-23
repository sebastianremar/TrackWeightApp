import { View, Text } from 'react-native';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = useNetwork();
  const { colors } = useTheme();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  let message;
  let bgColor;

  if (!isOnline) {
    message = pendingCount > 0
      ? `Offline — ${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`
      : 'Offline';
    bgColor = colors.warning || '#f59e0b';
  } else if (isSyncing) {
    message = `Syncing ${pendingCount} change${pendingCount === 1 ? '' : 's'}...`;
    bgColor = colors.primary;
  } else {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = ScaledSheet.create({
  banner: {
    paddingVertical: '6@ms',
    paddingHorizontal: '16@ms',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: '13@ms0.3',
    fontWeight: '600',
  },
});
