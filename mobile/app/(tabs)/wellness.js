import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import WeightDashboard from '../../src/screens/wellness/WeightDashboard';

const TABS = ['Weight', 'Workouts'];

export default function WellnessScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Weight');
  const scrollRef = useRef(null);
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Sub-tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={s.content}
          contentContainerStyle={s.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'Weight' ? (
            <WeightDashboard scrollRef={scrollRef} />
          ) : (
            <View style={s.placeholder}>
              <Text style={s.placeholderEmoji}>🏋️</Text>
              <Text style={s.placeholderTitle}>Workouts</Text>
              <Text style={s.placeholderText}>
                Log workouts, manage templates, view history.{'\n'}
                Coming soon — this screen will include:{'\n\n'}
                • Workout templates{'\n'}
                • Log workout (exercises + sets/reps){'\n'}
                • Auto-prefill from last session{'\n'}
                • History with infinite scroll
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
    tabTextActive: { color: colors.primary, fontWeight: '600' },
    content: { flex: 1 },
    contentInner: { padding: 16, paddingBottom: 32 },
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
