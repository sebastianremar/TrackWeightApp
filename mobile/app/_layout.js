import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useNotificationSetup } from '../src/hooks/useNotificationSetup';

function InnerLayout() {
  const { user } = useAuth();
  useNotificationSetup(user);

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <InnerLayout />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
