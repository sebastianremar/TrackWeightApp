import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { NetworkProvider } from '../src/contexts/NetworkContext';
import { useNotificationSetup } from '../src/hooks/useNotificationSetup';
import { getDB } from '../src/offline/db';
import OfflineBanner from '../src/components/OfflineBanner';

function InnerLayout() {
  const { user } = useAuth();
  useNotificationSetup(user);

  return (
    <>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    getDB();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <NetworkProvider>
            <InnerLayout />
          </NetworkProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
