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
import CalendarDashboard from '../../src/screens/planner/CalendarDashboard';
import TodosDashboard from '../../src/screens/planner/TodosDashboard';

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
          <View style={activeTab === 'Habits' ? undefined : s.hidden}>
            <HabitsDashboard />
          </View>
          <View style={activeTab === 'Calendar' ? undefined : s.hidden}>
            <CalendarDashboard />
          </View>
          <View style={activeTab === 'Todos' ? undefined : s.hidden}>
            <TodosDashboard />
          </View>
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
    hidden: { display: 'none' },
  });
}
