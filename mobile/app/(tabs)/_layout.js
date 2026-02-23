import { Tabs, Redirect } from 'expo-router';
import { Text, Image } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { moderateScale } from '../../src/utils/responsive';

function TabIcon({ name, color }) {
  // Simple emoji icons — replace with a proper icon library (e.g. @expo/vector-icons) later
  const icons = {
    wellness: '\u{1F4AA}',
    planner: '\u{1F4CB}',
    friends: '\u{1F465}',
    settings: '\u2699\uFE0F',
  };
  return <Text style={{ fontSize: moderateScale(22, 0.3) }}>{icons[name] || '\u2022'}</Text>;
}

export default function TabLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();

  if (!user) return <Redirect href="/signin" />;

  return (
    <Tabs
      screenOptions={{
        lazy: false,
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerLeft: () => (
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(16), marginLeft: moderateScale(16) }}
          />
        ),
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
