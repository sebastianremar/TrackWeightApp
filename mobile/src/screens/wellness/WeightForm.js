import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { logWeight } from '../../api/weight';
import InlineError from '../../components/InlineError';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default React.memo(function WeightForm({ entries, onSaved }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    const existing = entries?.find((e) => e.date === newDate);
    setWeight(existing ? String(existing.weight) : '');
  };

  const handleSubmit = async () => {
    setError(null);
    const w = parseFloat(weight);
    const min = weightUnit === 'lbs' ? 44 : 20;
    const max = weightUnit === 'lbs' ? 1100 : 500;
    if (isNaN(w) || w < min || w > max) {
      setError(`Weight must be between ${min} and ${max} ${weightUnit}`);
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

  return (
    <View style={s.container}>
      <Text style={s.title}>Log Weight</Text>

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
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.dateBtnText}>{formatDisplay(date)}</Text>
            <Text style={s.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(date + 'T12:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) {
              handleDateChange(selected.toISOString().split('T')[0]);
            }
          }}
          themeVariant="light"
        />
      )}

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.submitBtn, saving && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitText}>Log</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    dateBtnIcon: {
      fontSize: 16,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
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
