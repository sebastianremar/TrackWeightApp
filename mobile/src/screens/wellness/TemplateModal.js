import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import InlineError from '../../components/InlineError';
import ExercisePicker from '../../components/ExercisePicker';

export default function TemplateModal({
  visible,
  template,
  library,
  custom,
  onSave,
  onDelete,
  onCreateCustom,
  onClose,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const isEdit = !!template;
  const [name, setName] = useState(template?.name || '');
  const [exercises, setExercises] = useState(
    template?.exercises?.map((ex) => ({ ...ex })) || [],
  );
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleAddExercise(ex) {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: 3,
        reps: '8-12',
        restSec: 90,
      },
    ]);
    setShowPicker(false);
  }

  function handleRemoveExercise(idx) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFieldChange(idx, field, value) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: parseInt(ex.sets) || 3,
          reps: String(ex.reps || '8-12'),
          restSec: parseInt(ex.restSec) || 90,
        })),
      };
      await onSave(payload, template?.routineId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(template.routineId);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Template' : 'New Template'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={s.headerBtn}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[s.headerBtnText, s.saveText]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          <InlineError message={error} />

          <Text style={s.label}>Template Name</Text>
          <TextInput
            style={s.nameInput}
            placeholder="e.g. Push Day"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={100}
          />

          <Text style={s.sectionLabel}>Exercises</Text>

          {exercises.map((ex, idx) => (
            <View key={idx} style={s.exCard}>
              <View style={s.exHeader}>
                <View style={s.exInfo}>
                  <Text style={s.exName}>{ex.name}</Text>
                  <Text style={s.exMuscle}>{ex.muscleGroup}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(idx)} style={s.exRemoveBtn}>
                  <Text style={s.exRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={s.exFields}>
                <View style={s.exField}>
                  <Text style={s.exFieldLabel}>Sets</Text>
                  <TextInput
                    style={s.exFieldInput}
                    value={String(ex.sets)}
                    onChangeText={(v) => handleFieldChange(idx, 'sets', v)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={s.exField}>
                  <Text style={s.exFieldLabel}>Reps</Text>
                  <TextInput
                    style={s.exFieldInput}
                    value={String(ex.reps)}
                    onChangeText={(v) => handleFieldChange(idx, 'reps', v)}
                    maxLength={20}
                  />
                </View>
                <View style={s.exField}>
                  <Text style={s.exFieldLabel}>Rest (s)</Text>
                  <TextInput
                    style={s.exFieldInput}
                    value={String(ex.restSec)}
                    onChangeText={(v) => handleFieldChange(idx, 'restSec', v)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
            <Text style={s.addBtnText}>+ Add Exercise</Text>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)}>
              <Text style={s.deleteBtnText}>Delete Template</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <ExercisePicker
          visible={showPicker}
          library={library}
          custom={custom}
          onSelect={handleAddExercise}
          onCreateCustom={onCreateCustom}
          onClose={() => setShowPicker(false)}
        />

        <ConfirmDialog
          visible={confirmDelete}
          title="Delete Template"
          message="Delete this template? This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
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
    },
    saveText: {
      fontWeight: '700',
      textAlign: 'right',
    },
    body: {
      flex: 1,
      padding: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 8,
    },
    nameInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
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
    exInfo: {
      flex: 1,
    },
    exName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    exMuscle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    exRemoveBtn: {
      padding: 6,
    },
    exRemoveText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '600',
    },
    exFields: {
      flexDirection: 'row',
      gap: 10,
    },
    exField: {
      flex: 1,
    },
    exFieldLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    exFieldInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'center',
    },
    addBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginTop: 4,
    },
    addBtnText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    },
    deleteBtn: {
      marginTop: 24,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteBtnText: {
      fontSize: 15,
      color: colors.error,
      fontWeight: '600',
    },
  });
}
