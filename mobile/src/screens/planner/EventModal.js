import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseTimeStr(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function EventModal({ visible, event, onSave, onDelete, onClose, defaultDate, defaultTime }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const isEdit = !!event;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hasEndTime, setHasEndTime] = useState(false);
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(COLORS[17]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Picker visibility state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime || '');
      setHasEndTime(!!event.endTime);
      setCategory(event.category || '');
      setColor(event.color || COLORS[17]);
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate || fmtDate(new Date()));
      setStartTime(defaultTime || '');
      setEndTime('');
      setHasEndTime(false);
      setCategory('');
      setColor(COLORS[17]);
    }
    setError('');
    setShowDatePicker(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, [event, visible, defaultDate, defaultTime]);

  const onDateChange = (_, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(fmtDate(selected));
  };

  const onStartTimeChange = (_, selected) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selected) setStartTime(fmtTime(selected));
  };

  const onEndTimeChange = (_, selected) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selected) setEndTime(fmtTime(selected));
  };

  const toggleEndTime = () => {
    if (hasEndTime) {
      setEndTime('');
      setHasEndTime(false);
      setShowEndPicker(false);
    } else {
      // Default end time = start + 1 hour
      if (startTime) {
        const d = parseTimeStr(startTime);
        d.setHours(d.getHours() + 1);
        setEndTime(fmtTime(d));
      }
      setHasEndTime(true);
    }
  };

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!date) { setError('Date is required'); return; }
    if (!startTime) { setError('Start time is required'); return; }
    if (hasEndTime && endTime && endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime: (hasEndTime && endTime) ? endTime : undefined,
        category: category.trim() || undefined,
        color,
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
          <Text style={s.headerTitle}>{isEdit ? 'Edit Event' : 'New Event'}</Text>
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

          <Text style={s.label}>Title</Text>
          <TextInput
            style={s.input}
            placeholder="Event title"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Optional details..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            numberOfLines={3}
          />

          {/* Date Picker */}
          <Text style={s.label}>Date</Text>
          <TouchableOpacity
            style={s.pickerBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={s.pickerBtnText}>
              {date ? formatDateDisplay(date) : 'Select date'}
            </Text>
            <Text style={s.pickerChevron}>{showDatePicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date ? parseDateStr(date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
            />
          )}

          {/* Start Time Picker */}
          <Text style={s.label}>Start Time</Text>
          <TouchableOpacity
            style={s.pickerBtn}
            onPress={() => setShowStartPicker(!showStartPicker)}
          >
            <Text style={s.pickerBtnText}>
              {startTime ? formatTime12(startTime) : 'Select start time'}
            </Text>
            <Text style={s.pickerChevron}>{showStartPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startTime ? parseTimeStr(startTime) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartTimeChange}
              minuteInterval={5}
              themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
            />
          )}

          {/* End Time Toggle + Picker */}
          <View style={s.endTimeHeader}>
            <Text style={s.label}>End Time</Text>
            <TouchableOpacity onPress={toggleEndTime} style={s.endToggle}>
              <Text style={s.endToggleText}>{hasEndTime ? 'Remove' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          {hasEndTime && (
            <>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setShowEndPicker(!showEndPicker)}
              >
                <Text style={s.pickerBtnText}>
                  {endTime ? formatTime12(endTime) : 'Select end time'}
                </Text>
                <Text style={s.pickerChevron}>{showEndPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endTime ? parseTimeStr(endTime) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndTimeChange}
                  minuteInterval={5}
                  themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
                />
              )}
            </>
          )}

          <Text style={s.label}>Category <Text style={s.optional}>(optional)</Text></Text>
          <TextInput
            style={s.input}
            placeholder="e.g., Work, Personal"
            placeholderTextColor={colors.textMuted}
            value={category}
            onChangeText={setCategory}
            maxLength={50}
          />

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
            <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
              <Text style={s.deleteBtnText}>Delete</Text>
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
    optional: {
      fontWeight: '400',
      color: colors.textMuted,
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
    textarea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    pickerBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerBtnText: {
      fontSize: 15,
      color: colors.text,
    },
    pickerChevron: {
      fontSize: 10,
      color: colors.textMuted,
    },
    endTimeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    endToggle: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '18',
      marginTop: 12,
    },
    endToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
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
    bottomSpacer: { height: 40 },
  });
}
