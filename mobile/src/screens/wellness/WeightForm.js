import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { logWeight } from '../../api/weight';
import InlineError from '../../components/InlineError';
import NumberPicker from '../../components/NumberPicker';
import CalendarPickerModal from '../../components/CalendarPickerModal';
import { ScaledSheet } from '../../utils/responsive';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default React.memo(function WeightForm({ entries, onSaved }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [weight, setWeight] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    const existing = entries?.find((e) => e.date === newDate);
    setWeight(existing ? existing.weight : null);
  };

  const handleSubmit = async () => {
    setError(null);
    const w = weight;
    const min = weightUnit === 'lbs' ? 44 : 20;
    const max = weightUnit === 'lbs' ? 1100 : 500;
    if (w === null || isNaN(w) || w < min || w > max) {
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
      setWeight(null);
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
          <TouchableOpacity style={s.input} onPress={() => setShowWeightPicker(true)}>
            <Text style={[s.inputText, !weight && s.placeholderText]}>
              {weight !== null ? `${weight} ${weightUnit}` : 'e.g. 75.5'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={s.field}>
          <Text style={s.label}>Date</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.dateBtnText} numberOfLines={1}>{formatDisplay(date)}</Text>
            <Text style={s.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <NumberPicker
        visible={showWeightPicker}
        value={weight || (weightUnit === 'lbs' ? 150 : 70)}
        min={weightUnit === 'lbs' ? 44 : 20}
        max={weightUnit === 'lbs' ? 1100 : 500}
        step={0.1}
        unit={weightUnit}
        label="Weight"
        onConfirm={(v) => { setWeight(v); setShowWeightPicker(false); }}
        onCancel={() => setShowWeightPicker(false)}
      />

      <CalendarPickerModal
        visible={showDatePicker}
        value={date}
        maxDate={todayStr()}
        label="Log Date"
        onSelect={(d) => { handleDateChange(d); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />

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
  return ScaledSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      padding: '16@ms',
      borderWidth: 1,
      borderColor: colors.border,
      gap: '12@ms',
    },
    title: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: '12@ms',
    },
    field: { flex: 1 },
    label: {
      fontSize: '13@ms0.3',
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: '6@ms',
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: '8@ms',
      paddingHorizontal: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
      height: '44@ms',
      justifyContent: 'center',
    },
    inputText: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    placeholderText: {
      color: colors.textMuted,
      fontWeight: '400',
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: '8@ms',
      paddingHorizontal: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
      height: '44@ms',
    },
    dateBtnText: {
      flex: 1,
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    dateBtnIcon: {
      fontSize: '14@ms0.3',
      marginLeft: '6@ms',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: '10@ms',
    },
    submitBtn: {
      paddingVertical: '12@ms',
      paddingHorizontal: '24@ms',
      borderRadius: '8@ms',
      backgroundColor: colors.primary,
      minWidth: '80@ms',
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: '#fff',
    },
  });
}
