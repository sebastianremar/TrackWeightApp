import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import InlineError from '../../components/InlineError';
import ExercisePicker from '../../components/ExercisePicker';
import { getTemplatePrefill } from '../../api/workouts';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function emptySet() {
  return { weight: 0, reps: 0 };
}

export default function LogView({ templates, library, custom, addLog, onCreateCustom, initialTemplate, onTemplateConsumed }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [date, setDate] = useState(todayStr());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exercises, setExercises] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

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

  const updateSet = (exIdx, setIdx, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((st, j) =>
                j === setIdx ? { ...st, [field]: parseFloat(value) || 0 } : st,
              ),
            }
          : ex,
      ),
    );
  };

  const addSet = (exIdx) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx && ex.sets.length < 20
          ? { ...ex, sets: [...ex.sets, emptySet()] }
          : ex,
      ),
    );
  };

  const removeSet = (exIdx, setIdx) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx && ex.sets.length > 1
          ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
          : ex,
      ),
    );
  };

  const handleAddExercise = (ex) => {
    if (exercises.length < 30) {
      setExercises((prev) => [
        ...prev,
        {
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: [emptySet()],
        },
      ]);
    }
    setShowPicker(false);
  };

  const removeExercise = (exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

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

  return (
    <View>
      {/* Template Selector */}
      <Text style={s.label}>Template</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.templateRow} contentContainerStyle={s.templateContent}>
        <TouchableOpacity
          style={[s.templateChip, !selectedTemplate && s.templateChipActive]}
          onPress={() => handleTemplateChange('')}
        >
          <Text style={[s.templateChipText, !selectedTemplate && s.templateChipTextActive]}>Freestyle</Text>
        </TouchableOpacity>
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

      {/* Date */}
      <Text style={s.label}>Date</Text>
      <TextInput
        style={s.dateInput}
        value={date}
        onChangeText={(v) => { setDate(v); setSuccess(false); }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        maxLength={10}
      />

      {prefillDate && (
        <Text style={s.prefillNote}>Pre-filled from session on {prefillDate}</Text>
      )}

      {/* Exercise Cards */}
      {exercises.map((ex, exIdx) => (
        <Card key={exIdx} style={s.exCard}>
          <View style={s.exHeader}>
            <View style={s.exInfo}>
              <Text style={s.exName}>{ex.name}</Text>
              {ex.muscleGroup && <Text style={s.exMuscle}>{ex.muscleGroup}</Text>}
            </View>
            <TouchableOpacity onPress={() => removeExercise(exIdx)} style={s.exRemoveBtn}>
              <Text style={s.exRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.setsHeader}>
            <Text style={[s.setHeaderText, s.setNumCol]}>Set</Text>
            <Text style={[s.setHeaderText, s.setInputCol]}>Weight</Text>
            <Text style={[s.setHeaderText, s.setInputCol]}>Reps</Text>
            <View style={s.setActionCol} />
          </View>

          {ex.sets.map((st, sIdx) => (
            <View key={sIdx} style={s.setRow}>
              <Text style={[s.setNum, s.setNumCol]}>{sIdx + 1}</Text>
              <TextInput
                style={[s.setInput, s.setInputCol]}
                value={st.weight ? String(st.weight) : ''}
                onChangeText={(v) => updateSet(exIdx, sIdx, 'weight', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[s.setInput, s.setInputCol]}
                value={st.reps ? String(st.reps) : ''}
                onChangeText={(v) => updateSet(exIdx, sIdx, 'reps', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={s.setActionCol}
                onPress={() => removeSet(exIdx, sIdx)}
                disabled={ex.sets.length <= 1}
              >
                <Text style={[s.setRemoveText, ex.sets.length <= 1 && s.setRemoveDisabled]}>−</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(exIdx)} disabled={ex.sets.length >= 20}>
            <Text style={s.addSetText}>+ Add Set</Text>
          </TouchableOpacity>
        </Card>
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

function makeStyles(colors) {
  return StyleSheet.create({
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    templateRow: {
      maxHeight: 44,
      marginBottom: 4,
    },
    templateContent: {
      gap: 8,
    },
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
    templateChipTextActive: {
      color: '#fff',
    },
    dateInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prefillNote: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 6,
    },
    exCard: {
      marginTop: 12,
      padding: 12,
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
    setsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
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
      width: 32,
      textAlign: 'center',
    },
    setInputCol: {
      flex: 1,
      marginHorizontal: 4,
    },
    setActionCol: {
      width: 32,
      alignItems: 'center',
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 3,
    },
    setNum: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
      textAlign: 'center',
    },
    setInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'center',
    },
    setRemoveText: {
      fontSize: 20,
      color: colors.error,
      fontWeight: '600',
    },
    setRemoveDisabled: {
      color: colors.textMuted,
      opacity: 0.3,
    },
    addSetBtn: {
      marginTop: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    addSetText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
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
    addExBtnText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    },
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
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 16,
      color: '#fff',
      fontWeight: '700',
    },
  });
}
