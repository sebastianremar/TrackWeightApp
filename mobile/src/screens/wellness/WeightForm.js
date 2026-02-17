import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { logWeight } from '../../api/weight';
import InlineError from '../../components/InlineError';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function WeightForm({ editingEntry, onCancelEdit, onSaved }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingEntry) {
      setWeight(String(editingEntry.weight));
      setDate(editingEntry.date);
    } else {
      setWeight('');
      setDate(todayStr());
    }
    setError(null);
  }, [editingEntry]);

  const handleSubmit = async () => {
    setError(null);
    const w = parseFloat(weight);
    const min = weightUnit === 'lbs' ? 44 : 20;
    const max = weightUnit === 'lbs' ? 1100 : 500;
    if (isNaN(w) || w < min || w > max) {
      setError(`Weight must be between ${min} and ${max} ${weightUnit}`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date must be YYYY-MM-DD');
      return;
    }
    if (date > todayStr()) {
      setError('Date cannot be in the future');
      return;
    }

    setSaving(true);
    try {
      await logWeight(w, date);
      setWeight('');
      setDate(todayStr());
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingEntry;

  return (
    <View style={s.container}>
      <Text style={s.title}>{isEditing ? 'Edit Entry' : 'Log Weight'}</Text>

      <InlineError message={error} />

      <View style={s.row}>
        <View style={s.field}>
          <Text style={s.label}>Weight ({weightUnit})</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 75.5"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
          />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Date</Text>
          <TextInput
            style={s.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            maxLength={10}
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={s.actions}>
        {isEditing && (
          <TouchableOpacity style={s.cancelBtn} onPress={onCancelEdit}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.submitBtn, saving && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitText}>{isEditing ? 'Update' : 'Log'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    field: { flex: 1 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: colors.primary,
      minWidth: 80,
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });
}
