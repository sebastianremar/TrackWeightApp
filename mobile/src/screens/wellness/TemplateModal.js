import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import InlineError from '../../components/InlineError';
import ExercisePicker from '../../components/ExercisePicker';

function ExerciseRow({ item, index, drag, isActive, onRemove, colors }) {
  const s = makeStyles(colors);
  const swipeableRef = { current: null };

  const renderRightActions = (_progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <Pressable
        style={s.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onRemove(index);
        }}
      >
        <Animated.Text style={[s.deleteActionText, { transform: [{ scale }] }]}>
          Remove
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <ScaleDecorator>
      <Swipeable
        ref={(ref) => { swipeableRef.current = ref; }}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        enabled={!isActive}
      >
        <Pressable
          style={[s.exCard, isActive && s.exCardDragging]}
          onLongPress={drag}
          disabled={isActive}
        >
          {/* Drag handle + exercise info */}
          <View style={s.exHeader}>
            <Text style={s.dragHandle}>⠿</Text>
            <View style={s.exInfo}>
              <Text style={s.exName}>{item.name}</Text>
              <Text style={s.exMuscle}>{item.muscleGroup}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(index)}
              style={s.exRemoveBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.exRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Swipeable>
    </ScaleDecorator>
  );
}

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
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(template?.name || '');
      setExercises(template?.exercises?.map((ex) => ({ ...ex })) || []);
      setError(null);
      setShowPicker(false);
      setConfirmDelete(false);
    }
  }, [visible, template]);

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

  const handleRemoveExercise = useCallback((idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDragEnd = useCallback(({ data }) => {
    setExercises(data);
  }, []);

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

  const renderItem = useCallback(({ item, getIndex, drag, isActive }) => {
    const index = getIndex();
    return (
      <ExerciseRow
        item={item}
        index={index}
        drag={drag}
        isActive={isActive}
        onRemove={handleRemoveExercise}
        colors={colors}
      />
    );
  }, [colors, handleRemoveExercise]);

  const keyExtractor = useCallback((item, index) =>
    `${item.exerciseId || item.name}-${index}`, [],
  );

  const ListHeader = (
    <View style={s.listHeader}>
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

      <Text style={s.sectionLabel}>
        Exercises ({exercises.length})
      </Text>
    </View>
  );

  const ListFooter = (
    <View style={s.listFooter}>
      <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
        <Text style={s.addBtnText}>+ Add Exercise</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)}>
          <Text style={s.deleteBtnText}>Delete Template</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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

        <DraggableFlatList
          data={exercises}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onDragEnd={handleDragEnd}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          activationDistance={10}
        />

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
    headerBtn: { minWidth: 60 },
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
    saveText: { fontWeight: '700', textAlign: 'right' },
    listContent: { padding: 16 },
    listHeader: { marginBottom: 4 },
    listFooter: { marginTop: 4 },

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
      marginBottom: 4,
    },
    /* Exercise card */
    exCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exCardDragging: {
      borderColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    exHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dragHandle: {
      fontSize: 20,
      color: colors.textMuted,
      marginRight: 10,
      lineHeight: 22,
    },
    exInfo: { flex: 1 },
    exName: { fontSize: 15, fontWeight: '600', color: colors.text },
    exMuscle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    exRemoveBtn: { padding: 6 },
    exRemoveText: { fontSize: 16, color: colors.error, fontWeight: '600' },

    /* Add exercise */
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
    addBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

    /* Delete template */
    deleteBtn: {
      marginTop: 24,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteBtnText: { fontSize: 15, color: colors.error, fontWeight: '600' },

    /* Swipeable delete action */
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      borderRadius: 10,
      marginBottom: 10,
    },
    deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
