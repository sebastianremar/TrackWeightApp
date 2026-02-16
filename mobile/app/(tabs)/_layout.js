import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

function TabIcon({ name, color }) {
  // Simple emoji icons — replace with a proper icon library (e.g. @expo/vector-icons) later
  const icons = {
    wellness: '💪',
    planner: '📋',
    friends: '👥',
    settings: '⚙️',
  };
  return <Text style={{ fontSize: 22 }}>{icons[name] || '•'}</Text>;
}

export default function TabLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();

  if (!user) return <Redirect href="/signin" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color }) => <TabIcon name="wellness" color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color }) => <TabIcon name="planner" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => <TabIcon name="friends" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
