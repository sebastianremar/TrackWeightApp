import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        <View style={s.placeholder}>
          <Text style={s.placeholderEmoji}>👥</Text>
          <Text style={s.placeholderTitle}>Friends</Text>
          <Text style={s.placeholderText}>
            Connect with friends and compare progress.{'\n'}
            Coming soon:{'\n\n'}
            • Pending friend requests{'\n'}
            • Expandable friend cards{'\n'}
            • Weight comparison charts{'\n'}
            • Friend habit stats{'\n'}
            • Favorite friends{'\n'}
            • Add friend by email
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    contentInner: { padding: 16 },
    placeholder: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 24,
    },
    placeholderEmoji: { fontSize: 48, marginBottom: 12 },
    placeholderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    placeholderText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
}
