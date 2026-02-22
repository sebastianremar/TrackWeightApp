import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import InlineError from '../../components/InlineError';
import ExercisePicker from '../../components/ExercisePicker';
import { getTemplatePrefill } from '../../api/workouts';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function emptySet() {
  return { weight: 0, reps: 0 };
}

/* ── Swipeable set row for detail view ── */

function SetRow({ set, index, editing, onDelete, onEdit, colors }) {
  const s = makeStyles(colors);
  const swipeableRef = useRef(null);

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
          onDelete(index);
        }}
      >
        <Animated.Text style={[s.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        style={[s.setListRow, editing && s.setListRowEditing]}
        onLongPress={() => onEdit(index)}
        android_ripple={{ color: colors.border }}
      >
        <Text style={[s.setListText, s.setListNumCol]}>{index + 1}</Text>
        <Text style={[s.setListText, s.setListValCol]}>{set.weight} lb</Text>
        <Text style={[s.setListText, s.setListValCol]}>{set.reps} reps</Text>
      </Pressable>
    </Swipeable>
  );
}

/* ── Main component ── */

export default function LogView({ templates, library, custom, addLog, onCreateCustom, initialTemplate, onTemplateConsumed }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  // Shared state
  const [date, setDate] = useState(todayStr());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exercises, setExercises] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Detail mode state
  const [activeExercise, setActiveExercise] = useState(null);
  const [stepperWeight, setStepperWeight] = useState(0);
  const [stepperReps, setStepperReps] = useState(0);
  const [editingSetIdx, setEditingSetIdx] = useState(null);

  /* ── Template handling ── */

  const handleTemplateChange = useCallback(async (tmplId) => {
    setSelectedTemplate(tmplId);
    setSuccess(false);
    setError(null);
    setPrefillDate(null);

    if (!tmplId) {
      setExercises([]);
      return;
    }

    const tmpl = templates.find((t) => t.routineId === tmplId);
    if (!tmpl) return;

    const baseExercises = tmpl.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: Array.from({ length: ex.sets || 3 }, () => emptySet()),
    }));

    setExercises(baseExercises);

    try {
      const prefill = await getTemplatePrefill(tmplId);
      if (prefill.exercises?.length > 0) {
        setPrefillDate(prefill.date);
        setExercises((prev) =>
          prev.map((ex) => {
            const match = prefill.exercises.find((p) => p.exerciseId === ex.exerciseId || p.name === ex.name);
            if (match?.sets?.length > 0) {
              return {
                ...ex,
                sets: match.sets.map((st) => ({ weight: st.weight || 0, reps: st.reps || 0 })),
              };
            }
            return ex;
          }),
        );
      }
    } catch {
      // prefill is optional
    }
  }, [templates]);

  useEffect(() => {
    if (initialTemplate?.routineId) {
      handleTemplateChange(initialTemplate.routineId);
      onTemplateConsumed?.();
    }
  }, [initialTemplate]);

  /* ── Exercise CRUD ── */

  const handleAddExercise = (ex) => {
    if (exercises.length < 30) {
      setExercises((prev) => [
        ...prev,
        {
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: [],
        },
      ]);
    }
    setShowPicker(false);
  };

  const removeExercise = (exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  /* ── Save workout ── */

  const handleSave = async () => {
    const validExercises = exercises.filter(
      (ex) => ex.name.trim() && ex.sets.some((st) => st.weight > 0 || st.reps > 0),
    );
    if (validExercises.length === 0) {
      setError('Log at least one exercise with weight or reps');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const tmpl = templates.find((t) => t.routineId === selectedTemplate);
      const payload = {
        date,
        exercises: validExercises.map((ex) => ({
          exerciseId: ex.exerciseId || undefined,
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup || undefined,
          sets: ex.sets.filter((st) => st.weight > 0 || st.reps > 0),
        })),
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (tmpl) {
        payload.templateId = tmpl.routineId;
        payload.templateName = tmpl.name;
      }
      await addLog(payload);
      setSuccess(true);
      setExercises([]);
      setSelectedTemplate('');
      setNotes('');
      setPrefillDate(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Detail mode handlers ── */

  const openDetail = (exIdx) => {
    const ex = exercises[exIdx];
    const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : null;
    setActiveExercise(exIdx);
    setStepperWeight(lastSet?.weight || 0);
    setStepperReps(lastSet?.reps || 0);
    setEditingSetIdx(null);
  };

  const closeDetail = () => {
    setActiveExercise(null);
    setEditingSetIdx(null);
  };

  const saveSet = () => {
    if (activeExercise === null) return;
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== activeExercise) return ex;
        if (editingSetIdx !== null) {
          return {
            ...ex,
            sets: ex.sets.map((st, j) =>
              j === editingSetIdx ? { weight: stepperWeight, reps: stepperReps } : st,
            ),
          };
        }
        if (ex.sets.length >= 20) return ex;
        return { ...ex, sets: [...ex.sets, { weight: stepperWeight, reps: stepperReps }] };
      }),
    );
    setEditingSetIdx(null);
  };

  const clearStepper = () => {
    setStepperWeight(0);
    setStepperReps(0);
    setEditingSetIdx(null);
  };

  const deleteSet = (setIdx) => {
    if (activeExercise === null) return;
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === activeExercise ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex,
      ),
    );
    if (editingSetIdx === setIdx) {
      setEditingSetIdx(null);
    }
  };

  const editSet = (setIdx) => {
    if (activeExercise === null) return;
    const st = exercises[activeExercise].sets[setIdx];
    setStepperWeight(st.weight);
    setStepperReps(st.reps);
    setEditingSetIdx(setIdx);
  };

  /* ════════════════════════════════════════
     DETAIL MODE
     ════════════════════════════════════════ */

  if (activeExercise !== null && exercises[activeExercise]) {
    const ex = exercises[activeExercise];

    return (
      <View>
        {/* Header */}
        <TouchableOpacity style={s.backBtn} onPress={closeDetail}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.detailTitle}>{ex.name}</Text>
        {ex.muscleGroup && <Text style={s.detailMuscle}>{ex.muscleGroup}</Text>}

        {/* Weight Stepper */}
        <Text style={s.stepperLabel}>Weight (lb)</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => setStepperWeight((w) => Math.max(0, +(w - 2.5).toFixed(1)))}
          >
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={s.stepperValue}
            value={String(stepperWeight)}
            onChangeText={(v) => setStepperWeight(parseFloat(v) || 0)}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => setStepperWeight((w) => +(w + 2.5).toFixed(1))}
          >
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Reps Stepper */}
        <Text style={s.stepperLabel}>Reps</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => setStepperReps((r) => Math.max(0, r - 1))}
          >
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={s.stepperValue}
            value={String(stepperReps)}
            onChangeText={(v) => setStepperReps(parseInt(v, 10) || 0)}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => setStepperReps((r) => r + 1)}
          >
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Save / Clear / +1 */}
        <View style={s.stepperActions}>
          <TouchableOpacity style={s.clearBtn} onPress={clearStepper}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.plusOneBtn, ex.sets.length === 0 && s.btnDisabled]}
            disabled={ex.sets.length === 0}
            onPress={() => {
              setExercises((prev) =>
                prev.map((e, i) =>
                  i === activeExercise
                    ? { ...e, sets: e.sets.map((st) => ({ ...st, reps: st.reps + 1 })) }
                    : e,
                ),
              );
            }}
          >
            <Text style={s.plusOneBtnText}>+1 Rep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveSetBtn} onPress={saveSet}>
            <Text style={s.saveSetBtnText}>
              {editingSetIdx !== null ? 'Update Set' : 'Save Set'}
            </Text>
          </TouchableOpacity>
        </View>

        {editingSetIdx !== null && (
          <TouchableOpacity onPress={() => setEditingSetIdx(null)} style={s.cancelEditBtn}>
            <Text style={s.cancelEditText}>Cancel edit</Text>
          </TouchableOpacity>
        )}

        {/* Set list */}
        <Text style={[s.label, { marginTop: 20 }]}>Sets ({ex.sets.length})</Text>

        {ex.sets.length === 0 ? (
          <Text style={s.emptyText}>No sets yet. Use the controls above to add sets.</Text>
        ) : (
          <>
            <View style={s.setListHeaderRow}>
              <Text style={[s.setListHeaderText, s.setListNumCol]}>#</Text>
              <Text style={[s.setListHeaderText, s.setListValCol]}>Weight</Text>
              <Text style={[s.setListHeaderText, s.setListValCol]}>Reps</Text>
            </View>
            {ex.sets.map((st, idx) => (
              <SetRow
                key={idx}
                set={st}
                index={idx}
                editing={editingSetIdx === idx}
                onDelete={deleteSet}
                onEdit={editSet}
                colors={colors}
              />
            ))}
            <Text style={s.setListHint}>Swipe left to delete · Long press to edit</Text>
          </>
        )}
      </View>
    );
  }

  /* ════════════════════════════════════════
     OVERVIEW MODE
     ════════════════════════════════════════ */

  return (
    <View>
      {/* Template Selector */}
      {templates.length > 0 && (
        <>
          <Text style={s.label}>Template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.templateRow} contentContainerStyle={s.templateContent}>
            {templates.map((t) => (
              <TouchableOpacity
                key={t.routineId}
                style={[s.templateChip, selectedTemplate === t.routineId && s.templateChipActive]}
                onPress={() => handleTemplateChange(t.routineId)}
              >
                <Text style={[s.templateChipText, selectedTemplate === t.routineId && s.templateChipTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Date */}
      <Text style={s.label}>Date</Text>
      <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={s.dateBtnText}>{formatDisplay(date)}</Text>
        <Text style={s.dateBtnIcon}>📅</Text>
      </TouchableOpacity>
      {date !== todayStr() && (
        <TouchableOpacity onPress={() => { setDate(todayStr()); setSuccess(false); }}>
          <Text style={s.todayLink}>Reset to today</Text>
        </TouchableOpacity>
      )}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(date + 'T12:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) {
              setDate(selected.toISOString().split('T')[0]);
              setSuccess(false);
            }
          }}
          themeVariant="light"
        />
      )}

      {prefillDate && (
        <Text style={s.prefillNote}>Pre-filled from session on {prefillDate}</Text>
      )}

      {/* Exercise Cards — compact read-only */}
      {exercises.map((ex, exIdx) => (
        <TouchableOpacity key={exIdx} activeOpacity={0.7} onPress={() => openDetail(exIdx)}>
          <Card style={s.exCard}>
            <View style={s.exHeader}>
              <View style={s.exInfo}>
                <Text style={s.exName}>{ex.name}</Text>
                {ex.muscleGroup && <Text style={s.exMuscle}>{ex.muscleGroup}</Text>}
              </View>
              <TouchableOpacity
                onPress={() => removeExercise(exIdx)}
                style={s.exRemoveBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.exRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>

            {ex.sets.length > 0 ? (
              <View style={s.overviewSets}>
                <View style={s.overviewSetRow}>
                  <Text style={[s.overviewSetHeader, s.overviewSetNumCol]}>Set</Text>
                  <Text style={[s.overviewSetHeader, s.overviewSetValCol]}>Weight</Text>
                  <Text style={[s.overviewSetHeader, s.overviewSetValCol]}>Reps</Text>
                </View>
                {ex.sets.map((st, sIdx) => (
                  <View key={sIdx} style={s.overviewSetRow}>
                    <Text style={[s.overviewSetText, s.overviewSetNumCol]}>{sIdx + 1}</Text>
                    <Text style={[s.overviewSetText, s.overviewSetValCol]}>{st.weight} lb</Text>
                    <Text style={[s.overviewSetText, s.overviewSetValCol]}>{st.reps} reps</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.noSetsText}>Tap to add sets</Text>
            )}
          </Card>
        </TouchableOpacity>
      ))}

      {/* Add Exercise */}
      {exercises.length < 30 && (
        <TouchableOpacity style={s.addExBtn} onPress={() => setShowPicker(true)}>
          <Text style={s.addExBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>
      )}

      {/* Notes */}
      <Text style={[s.label, { marginTop: 16 }]}>Notes</Text>
      <TextInput
        style={s.notesInput}
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        multiline
        numberOfLines={2}
        placeholder="Optional notes..."
        placeholderTextColor={colors.textMuted}
      />

      <InlineError message={error} />
      {success && (
        <View style={s.successBox}>
          <Text style={s.successText}>Workout logged!</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={s.saveBtnText}>Save Workout</Text>
        )}
      </TouchableOpacity>

      <ExercisePicker
        visible={showPicker}
        library={library}
        custom={custom}
        onSelect={handleAddExercise}
        onCreateCustom={onCreateCustom}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

/* ── Styles ── */

function makeStyles(colors) {
  return StyleSheet.create({
    /* Shared */
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },

    /* Template chips */
    templateRow: { maxHeight: 44, marginBottom: 4 },
    templateContent: { gap: 8 },
    templateChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    templateChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    templateChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    templateChipTextActive: { color: '#fff' },

    /* Date */
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    dateBtnIcon: {
      fontSize: 18,
    },
    todayLink: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 6,
    },
    prefillNote: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 6,
    },

    /* Overview exercise card */
    exCard: { marginTop: 12, padding: 12 },
    exHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    exInfo: { flex: 1 },
    exName: { fontSize: 15, fontWeight: '600', color: colors.text },
    exMuscle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    exRemoveBtn: { padding: 6 },
    exRemoveText: { fontSize: 16, color: colors.error, fontWeight: '600' },

    overviewSets: { marginTop: 10 },
    overviewSetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
    },
    overviewSetHeader: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    overviewSetText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    overviewSetNumCol: { width: 36, textAlign: 'center' },
    overviewSetValCol: { flex: 1, textAlign: 'center' },
    noSetsText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 8,
    },

    /* Add exercise button */
    addExBtn: {
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addExBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

    /* Notes */
    notesInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlignVertical: 'top',
      minHeight: 60,
    },

    /* Success / Save */
    successBox: {
      backgroundColor: colors.successBg,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.success,
    },
    successText: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    saveBtn: {
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    saveBtnDisabled: { opacity: 0.5 },
    btnDisabled: { opacity: 0.4 },
    saveBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },

    /* ── Detail mode ── */
    backBtn: { marginBottom: 4 },
    backBtnText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
    detailTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    detailMuscle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 8,
    },

    /* Steppers */
    stepperLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperBtn: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
    },
    stepperValue: {
      flex: 1,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
    },

    /* Save / Clear actions */
    stepperActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    clearBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plusOneBtn: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    plusOneBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    saveSetBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    saveSetBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    cancelEditBtn: { alignItems: 'center', marginTop: 8 },
    cancelEditText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },

    /* Set list in detail */
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 8,
    },
    setListHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    setListHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    setListRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    setListRowEditing: {
      backgroundColor: colors.primaryLight + '18',
      borderLeftColor: colors.primary,
    },
    setListText: {
      fontSize: 15,
      color: colors.text,
    },
    setListNumCol: { width: 36, textAlign: 'center', fontWeight: '600' },
    setListValCol: { flex: 1, textAlign: 'center' },
    setListHint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
    },

    /* Swipeable delete action */
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
    },
    deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
