import { useState, useEffect } from 'react';
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
import InlineError from '../../components/InlineError';

const COLORS = [
  '#991B1B', '#DC2626', '#F87171', '#FECACA',
  '#9A3412', '#EA580C', '#FB923C', '#FED7AA',
  '#854D0E', '#CA8A04', '#FACC15', '#FEF08A',
  '#166534', '#16A34A', '#4ADE80', '#BBF7D0',
  '#115E59', '#0D9488', '#2DD4BF', '#99F6E4',
  '#1E3A8A', '#2563EB', '#60A5FA', '#BFDBFE',
  '#581C87', '#9333EA', '#C084FC', '#E9D5FF',
];

export default function HabitModal({ visible, habit, onSave, onDelete, onClose }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const isEdit = !!habit;

  const [name, setName] = useState('');
  const [freq, setFreq] = useState(3);
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState('good');
  const [limitPeriod, setLimitPeriod] = useState('week');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isBad = type === 'bad';
  const maxFreq = isBad && limitPeriod === 'month' ? 30 : 7;

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setFreq(habit.targetFrequency);
      setColor(habit.color || COLORS[0]);
      setType(habit.type || 'good');
      setLimitPeriod(habit.limitPeriod || 'week');
    } else {
      setName('');
      setFreq(3);
      setColor(COLORS[0]);
      setType('good');
      setLimitPeriod('week');
    }
    setError('');
  }, [habit, visible]);

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'good') {
      setLimitPeriod('week');
      if (freq > 7) setFreq(7);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setLimitPeriod(newPeriod);
    const newMax = newPeriod === 'month' ? 30 : 7;
    if (freq > newMax) setFreq(newMax);
  };

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        targetFrequency: freq,
        color,
        type,
        limitPeriod: isBad ? limitPeriod : undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Habit' : 'New Habit'}</Text>
          <TouchableOpacity onPress={handleSave} style={s.headerBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[s.headerBtnText, s.saveText]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          <InlineError message={error} />

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            placeholder={isBad ? 'e.g., Smoking' : 'e.g., Exercise'}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={100}
          />

          <Text style={s.label}>Type</Text>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, !isBad && s.toggleActive]}
              onPress={() => handleTypeChange('good')}
            >
              <Text style={[s.toggleText, !isBad && s.toggleTextActive]}>Build</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, isBad && s.toggleActive]}
              onPress={() => handleTypeChange('bad')}
            >
              <Text style={[s.toggleText, isBad && s.toggleTextActive]}>Limit</Text>
            </TouchableOpacity>
          </View>

          {isBad && (
            <>
              <Text style={s.label}>Period</Text>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, limitPeriod === 'week' && s.toggleActive]}
                  onPress={() => handlePeriodChange('week')}
                >
                  <Text style={[s.toggleText, limitPeriod === 'week' && s.toggleTextActive]}>
                    Weekly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, limitPeriod === 'month' && s.toggleActive]}
                  onPress={() => handlePeriodChange('month')}
                >
                  <Text style={[s.toggleText, limitPeriod === 'month' && s.toggleTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={s.label}>
            {isBad
              ? limitPeriod === 'month' ? 'Monthly limit' : 'Weekly limit'
              : 'Weekly target'}
          </Text>
          {maxFreq <= 7 ? (
            <View style={s.freqRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.freqBtn, freq === n && s.freqActive]}
                  onPress={() => setFreq(n)}
                >
                  <Text style={[s.freqText, freq === n && s.freqTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={s.input}
              value={String(freq)}
              onChangeText={(v) => {
                const parsed = parseInt(v) || 1;
                setFreq(Math.max(1, Math.min(maxFreq, parsed)));
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}

          <Text style={s.label}>Color</Text>
          <View style={s.colorGrid}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  s.colorBtn,
                  { backgroundColor: c },
                  color === c && s.colorActive,
                ]}
                onPress={() => setColor(c)}
              >
                {color === c && <Text style={s.colorCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {isEdit && onDelete && (
            <TouchableOpacity
              style={s.archiveBtn}
              onPress={() => {
                onDelete();
                onClose();
              }}
            >
              <Text style={s.archiveBtnText}>Archive</Text>
            </TouchableOpacity>
          )}

          <View style={s.bottomSpacer} />
        </ScrollView>
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
    body: { flex: 1, padding: 16 },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: '#fff',
    },
    freqRow: {
      flexDirection: 'row',
      gap: 6,
    },
    freqBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    freqActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    freqText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    freqTextActive: {
      color: '#fff',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    colorBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorActive: {
      borderWidth: 3,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
    },
    colorCheck: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    archiveBtn: {
      marginTop: 24,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.error,
    },
    archiveBtnText: {
      fontSize: 15,
      color: colors.error,
      fontWeight: '600',
    },
    bottomSpacer: { height: 40 },
  });
}
