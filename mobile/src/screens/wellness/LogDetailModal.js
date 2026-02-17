import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/ConfirmDialog';

function calcVolume(sets) {
  return (sets || []).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
}

export default function LogDetailModal({ visible, log, onDelete, onClose }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!log) return null;

  const title = log.templateName || 'Freestyle';
  const totalVolume = (log.exercises || []).reduce(
    (sum, ex) => sum + calcVolume(ex.sets), 0,
  );

  async function handleDelete() {
    await onDelete(log.logId);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>Close</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={() => setConfirmOpen(true)} style={s.headerBtn}>
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body}>
          <View style={s.metaRow}>
            <Text style={s.date}>{log.date}</Text>
            {totalVolume > 0 && (
              <Text style={s.totalVolume}>Total: {totalVolume.toLocaleString()} lbs</Text>
            )}
          </View>

          {log.exercises?.map((ex, i) => {
            const vol = calcVolume(ex.sets);
            return (
              <View key={i} style={s.exCard}>
                <View style={s.exHeader}>
                  <Text style={s.exName}>{ex.name}</Text>
                  {ex.muscleGroup && <Text style={s.exMuscle}>{ex.muscleGroup}</Text>}
                </View>

                <View style={s.setsHeader}>
                  <Text style={[s.setHeaderText, s.setNumCol]}>Set</Text>
                  <Text style={[s.setHeaderText, s.setValCol]}>Weight</Text>
                  <Text style={[s.setHeaderText, s.setValCol]}>Reps</Text>
                </View>

                {ex.sets?.map((set, j) => (
                  <View key={j} style={s.setRow}>
                    <Text style={[s.setText, s.setNumCol]}>{j + 1}</Text>
                    <Text style={[s.setText, s.setValCol]}>{set.weight} lbs</Text>
                    <Text style={[s.setText, s.setValCol]}>{set.reps}</Text>
                  </View>
                ))}

                {vol > 0 && (
                  <Text style={s.volume}>Volume: {vol.toLocaleString()} lbs</Text>
                )}
              </View>
            );
          })}

          {log.notes ? (
            <View style={s.notesCard}>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{log.notes}</Text>
            </View>
          ) : null}
        </ScrollView>

        <ConfirmDialog
          visible={confirmOpen}
          title="Delete Log"
          message={`Delete the workout log from ${log.date}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: {
      minWidth: 60,
    },
    headerBtnText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    deleteText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '500',
      textAlign: 'right',
    },
    body: {
      flex: 1,
      padding: 16,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    date: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    totalVolume: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    exCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    exName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    exMuscle: {
      fontSize: 13,
      color: colors.textMuted,
    },
    setsHeader: {
      flexDirection: 'row',
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: 4,
    },
    setHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    setNumCol: {
      width: 40,
    },
    setValCol: {
      flex: 1,
    },
    setRow: {
      flexDirection: 'row',
      paddingVertical: 5,
    },
    setText: {
      fontSize: 14,
      color: colors.text,
    },
    volume: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'right',
    },
    notesCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
    },
    notesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });
}
