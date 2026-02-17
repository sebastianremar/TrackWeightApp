import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { updateProfile } from '../api/auth';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function getExpoPushToken() {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id', // Will be auto-resolved from app.json
  });
  return tokenData.data;
}

export function useNotificationSetup(user) {
  const lastToken = useRef(null);

  useEffect(() => {
    if (!user?.notificationsEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await getExpoPushToken();
        if (cancelled || !token) return;

        // Only update if token changed
        if (token !== user.pushToken && token !== lastToken.current) {
          lastToken.current = token;
          await updateProfile({ pushToken: token });
        }
      } catch {
        // Silent fail — token refresh is best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.notificationsEnabled, user?.pushToken]);
}
