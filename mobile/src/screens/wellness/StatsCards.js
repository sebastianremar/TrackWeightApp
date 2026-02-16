import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';

const ALL_METRICS = [
  { key: 'current', label: 'Current' },
  { key: 'avgWeeklyChange', label: 'Avg/Week' },
  { key: 'weekOverWeek', label: 'WoW Delta' },
  { key: 'lowest', label: 'Lowest' },
  { key: 'highest', label: 'Highest' },
  { key: 'average', label: 'Average' },
];

const COLORED_KEYS = new Set(['avgWeeklyChange', 'weekOverWeek']);

function formatValue(key, val) {
  if (val === null || val === undefined) return '--';
  if (key === 'avgWeeklyChange') {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val} kg/wk`;
  }
  if (key === 'weekOverWeek') {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val} kg`;
  }
  return `${val} kg`;
}

function getColor(key, val, colors) {
  if (!COLORED_KEYS.has(key) || val === null || val === undefined) return colors.text;
  if (val > 0) return colors.warning;
  if (val < 0) return colors.success;
  return colors.textMuted;
}

export default function StatsCards({ stats, visibleStats, onUpdateVisibleStats }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(visibleStats);

  const handleOpen = () => {
    setSelected(visibleStats);
    setModalOpen(true);
  };

  const handleToggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (selected.length > 0) {
      onUpdateVisibleStats(selected);
    }
    setModalOpen(false);
  };

  return (
    <View>
      <View style={s.header}>
        <Text style={s.title}>Your Stats</Text>
        <TouchableOpacity onPress={handleOpen} style={s.gearBtn}>
          <Text style={s.gearIcon}>&#9881;</Text>
        </TouchableOpacity>
      </View>

      <View style={s.grid}>
        {visibleStats.map((key) => {
          const metric = ALL_METRICS.find((m) => m.key === key);
          if (!metric) return null;
          const val = stats[key];
          return (
            <Card key={key} style={s.statCard}>
              <Text style={s.statLabel}>{metric.label}</Text>
              <Text style={[s.statValue, { color: getColor(key, val, colors) }]}>
                {formatValue(key, val)}
              </Text>
            </Card>
          );
        })}
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Customize Stats</Text>
            {ALL_METRICS.map((m) => (
              <View key={m.key} style={s.toggleRow}>
                <Text style={s.toggleLabel}>{m.label}</Text>
                <Switch
                  value={selected.includes(m.key)}
                  onValueChange={() => handleToggle(m.key)}
                  trackColor={{ true: colors.primary, false: colors.neutral }}
                  thumbColor="#fff"
                />
              </View>
            ))}
            <View style={s.dialogActions}>
              <TouchableOpacity style={s.dialogCancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={s.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dialogSaveBtn, selected.length === 0 && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={selected.length === 0}
              >
                <Text style={s.dialogSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    gearBtn: { padding: 4 },
    gearIcon: { fontSize: 20, color: colors.textMuted },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCard: {
      width: '47%',
      padding: 14,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    // Modal styles
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    dialog: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.text,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 16,
    },
    dialogCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    dialogCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dialogSaveBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    dialogSaveText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });
}
