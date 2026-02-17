import { useState } from 'react';
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
import HabitsDashboard from '../../src/screens/planner/HabitsDashboard';

const TABS = ['Habits', 'Calendar', 'Todos'];

export default function PlannerScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Habits');
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
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
          style={s.content}
          contentContainerStyle={s.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'Habits' && <HabitsDashboard />}
          {activeTab === 'Calendar' && (
            <View style={s.placeholder}>
              <Text style={s.placeholderEmoji}>📅</Text>
              <Text style={s.placeholderTitle}>Calendar</Text>
              <Text style={s.placeholderText}>
                Day/week/month calendar with events.{'\n'}
                Coming soon:{'\n\n'}
                • Day view with events + todos + habits{'\n'}
                • Week view{'\n'}
                • Month view{'\n'}
                • Create/edit events
              </Text>
            </View>
          )}
          {activeTab === 'Todos' && (
            <View style={s.placeholder}>
              <Text style={s.placeholderEmoji}>📝</Text>
              <Text style={s.placeholderTitle}>Todos</Text>
              <Text style={s.placeholderText}>
                Task management with priorities.{'\n'}
                Coming soon:{'\n\n'}
                • Active/completed filters{'\n'}
                • Category chips{'\n'}
                • Sort by due date, priority, newest{'\n'}
                • Priority color indicators
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
    contentInner: { padding: 16, paddingBottom: 80 },
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
