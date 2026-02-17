import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile } from '../api/auth';

const DEFAULT_SETTINGS = {
  weight: { enabled: true, hour: 20 },
  habits: { enabled: true, hour: 20 },
  calendar: { enabled: true, hour: 21 },
};

const LABELS = {
  weight: 'Weight Reminder',
  habits: 'Habits Reminder',
  calendar: 'Calendar Reminder',
};

function formatHour(hour) {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

export default function NotificationSettings() {
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const enabled = user?.notificationsEnabled || false;
  const settings = user?.notificationSettings || DEFAULT_SETTINGS;
  const [pickerType, setPickerType] = useState(null);
  const [saving, setSaving] = useState(false);

  async function requestPermissionAndGetToken() {
    if (!Device.isDevice) {
      Alert.alert('Device Required', 'Push notifications only work on physical devices.');
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Enable notifications in your device settings to use this feature.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  }

  async function toggleMaster(value) {
    if (saving) return;
    setSaving(true);

    try {
      if (value) {
        const token = await requestPermissionAndGetToken();
        if (!token) {
          setSaving(false);
          return;
        }

        const timezone = getTimezone();
        const newSettings = settings || DEFAULT_SETTINGS;

        await updateProfile({
          notificationsEnabled: true,
          pushToken: token,
          notificationSettings: newSettings,
          ...(timezone ? { timezone } : {}),
        });
        updateUser({
          notificationsEnabled: true,
          pushToken: token,
          notificationSettings: newSettings,
          ...(timezone ? { timezone } : {}),
        });
      } else {
        await updateProfile({ notificationsEnabled: false });
        updateUser({ notificationsEnabled: false });
      }
    } catch {
      Alert.alert('Error', 'Failed to update notification settings.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleType(type) {
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      [type]: {
        ...DEFAULT_SETTINGS[type],
        ...settings[type],
        enabled: !(settings[type]?.enabled ?? DEFAULT_SETTINGS[type].enabled),
      },
    };

    updateUser({ notificationSettings: newSettings });
    try {
      await updateProfile({ notificationSettings: newSettings });
    } catch {
      // Revert on failure
      updateUser({ notificationSettings: settings });
    }
  }

  function openTimePicker(type) {
    setPickerType(type);
  }

  async function onTimeChange(event, date) {
    if (Platform.OS === 'android') setPickerType(null);
    if (event.type === 'dismissed') {
      setPickerType(null);
      return;
    }
    if (!date || !pickerType) return;

    const hour = date.getHours();
    const type = pickerType;

    if (Platform.OS === 'ios') setPickerType(null);

    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      [type]: {
        ...DEFAULT_SETTINGS[type],
        ...settings[type],
        hour,
      },
    };

    updateUser({ notificationSettings: newSettings });
    try {
      await updateProfile({ notificationSettings: newSettings });
    } catch {
      updateUser({ notificationSettings: settings });
    }
  }

  return (
    <View>
      <View style={s.row}>
        <Text style={s.label}>Push Notifications</Text>
        <Switch
          value={enabled}
          onValueChange={toggleMaster}
          disabled={saving}
          trackColor={{ true: colors.primary, false: colors.neutral }}
          thumbColor="#fff"
        />
      </View>

      {enabled && (
        <View style={s.rules}>
          {['weight', 'habits', 'calendar'].map((type) => {
            const rule = settings[type] || DEFAULT_SETTINGS[type];
            return (
              <View key={type} style={s.ruleRow}>
                <Text style={s.ruleLabel}>{LABELS[type]}</Text>
                <TouchableOpacity onPress={() => openTimePicker(type)} style={s.timeButton}>
                  <Text style={s.timeText}>{formatHour(rule.hour)}</Text>
                </TouchableOpacity>
                <Switch
                  value={rule.enabled}
                  onValueChange={() => toggleType(type)}
                  trackColor={{ true: colors.primary, false: colors.neutral }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </View>
      )}

      {pickerType && (
        <DateTimePicker
          value={(() => {
            const d = new Date();
            d.setHours((settings[pickerType] || DEFAULT_SETTINGS[pickerType]).hour, 0, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour={false}
          minuteInterval={60}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    rules: { marginTop: 16, gap: 12 },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    ruleLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    timeButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.background,
      borderRadius: 6,
      marginRight: 10,
    },
    timeText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
    },
  });
}
