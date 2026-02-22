import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { clearFailed } from '../../src/offline/mutationQueue';
import NotificationSettings from '../../src/components/NotificationSettings';

const PALETTES = [
  { id: 'ethereal-ivory', label: 'Ethereal Ivory' },
  { id: 'serene-coastline', label: 'Serene Coastline' },
  { id: 'midnight-bloom', label: 'Midnight Bloom' },
  { id: 'warm-sand', label: 'Warm Sand' },
  { id: 'ocean-breeze', label: 'Ocean Breeze' },
];

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors, dark, toggleDark, palette, setPalette, weightUnit, setWeightUnit } = useTheme();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetwork();
  const [clearing, setClearing] = useState(false);
  const s = makeStyles(colors);

  const handleClearFailed = async () => {
    setClearing(true);
    try {
      await clearFailed();
    } catch {}
    setClearing(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {/* Profile Section */}
        <Text style={s.sectionTitle}>Profile</Text>
        <View style={s.card}>
          <Text style={s.label}>Name</Text>
          <Text style={s.value}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
          <Text style={s.value}>{user?.email}</Text>
        </View>

        {/* Appearance Section */}
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Dark Mode</Text>
            <Switch
              value={dark}
              onValueChange={toggleDark}
              trackColor={{ true: colors.primary, false: colors.neutral }}
              thumbColor="#fff"
            />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Color Palette</Text>
          <View style={s.paletteList}>
            {PALETTES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  s.paletteItem,
                  palette === p.id && s.paletteItemActive,
                ]}
                onPress={() => setPalette(p.id)}
              >
                <Text
                  style={[
                    s.paletteText,
                    palette === p.id && s.paletteTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Units Section */}
        <Text style={s.sectionTitle}>Units</Text>
        <View style={s.card}>
          <Text style={s.label}>Body Weight</Text>
          <View style={s.segmentedControl}>
            {['kg', 'lbs'].map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[s.segment, weightUnit === unit && s.segmentActive]}
                onPress={() => setWeightUnit(unit)}
              >
                <Text style={[s.segmentText, weightUnit === unit && s.segmentTextActive]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={s.sectionTitle}>Notifications</Text>
        <View style={s.card}>
          <NotificationSettings />
        </View>

        {/* Sync Section */}
        <Text style={s.sectionTitle}>Sync</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Status</Text>
            <Text style={[s.value, { marginTop: 0 }]}>
              {!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online'}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={[s.row, { marginTop: 12 }]}>
              <Text style={s.label}>Pending changes</Text>
              <Text style={[s.value, { marginTop: 0 }]}>{pendingCount}</Text>
            </View>
          )}
          <View style={{ marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              style={[s.syncButton, { backgroundColor: colors.primary, opacity: (!isOnline || isSyncing) ? 0.5 : 1 }]}
              onPress={triggerSync}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.syncButtonText}>Sync Now</Text>
              )}
            </TouchableOpacity>
            {pendingCount > 0 && (
              <TouchableOpacity
                style={[s.syncButton, { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error }]}
                onPress={handleClearFailed}
                disabled={clearing}
              >
                <Text style={[s.syncButtonText, { color: colors.error }]}>Clear Failed</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Security Section */}
        <Text style={s.sectionTitle}>Security</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.linkButton}>
            <Text style={s.linkButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.logoutButton} onPress={logout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    contentInner: { padding: 16, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    value: { fontSize: 16, color: colors.text, marginTop: 4 },
    paletteList: { marginTop: 8, gap: 6 },
    paletteItem: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    paletteItemActive: {
      backgroundColor: colors.primary,
    },
    paletteText: { fontSize: 14, color: colors.text },
    paletteTextActive: { color: '#fff', fontWeight: '600' },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 2,
      marginTop: 8,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
    },
    syncButton: {
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    syncButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    linkButton: { paddingVertical: 4 },
    linkButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
    logoutButton: {
      marginTop: 32,
      backgroundColor: colors.errorBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.error,
    },
    logoutText: { color: colors.error, fontSize: 16, fontWeight: '600' },
  });
}
