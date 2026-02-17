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

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function TodoModal({ visible, todo, categories, onSave, onDelete, onClose }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const isEdit = !!todo;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setDueDate(todo.dueDate || '');
      setHasDueDate(!!todo.dueDate);
      setPriority(todo.priority || 'medium');
      setCategory(todo.category || '');
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setHasDueDate(false);
      setPriority('medium');
      setCategory('');
    }
    setNewCategory('');
    setShowNewCategory(false);
    setError('');
    setShowDatePicker(false);
  }, [todo, visible]);

  const onDateChange = (_, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDueDate(fmtDate(selected));
  };

  const toggleDueDate = () => {
    if (hasDueDate) {
      setDueDate('');
      setHasDueDate(false);
      setShowDatePicker(false);
    } else {
      setDueDate(fmtDate(new Date()));
      setHasDueDate(true);
    }
  };

  const handleSelectCategory = (cat) => {
    setCategory(category === cat ? '' : cat);
    setShowNewCategory(false);
    setNewCategory('');
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed) {
      setCategory(trimmed);
      setShowNewCategory(false);
      setNewCategory('');
    }
  };

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }

    setSaving(true);
    try {
      // If a new category was typed, pass it along for the dashboard to persist
      const finalCategory = category.trim() || undefined;
      const isNewCategory = finalCategory && !categories.includes(finalCategory);

      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: hasDueDate && dueDate ? dueDate : undefined,
          priority,
          category: finalCategory,
        },
        isNewCategory ? finalCategory : null,
      );
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
          <Text style={s.headerTitle}>{isEdit ? 'Edit Todo' : 'New Todo'}</Text>
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
            placeholder="What needs to be done?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <Text style={s.label}>Description <Text style={s.optional}>(optional)</Text></Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Additional details..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            numberOfLines={3}
          />

          {/* Priority */}
          <Text style={s.label}>Priority</Text>
          <View style={s.segmentedControl}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.segment, priority === p && s.segmentActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[s.segmentText, priority === p && s.segmentTextActive]}>
                  {PRIORITY_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Due Date */}
          <View style={s.dueDateHeader}>
            <Text style={s.label}>Due Date</Text>
            <TouchableOpacity onPress={toggleDueDate} style={s.dueDateToggle}>
              <Text style={s.dueDateToggleText}>{hasDueDate ? 'Remove' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          {hasDueDate && (
            <>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={s.pickerBtnText}>
                  {dueDate ? formatDateDisplay(dueDate) : 'Select date'}
                </Text>
                <Text style={s.pickerChevron}>{showDatePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ? parseDateStr(dueDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
                />
              )}
            </>
          )}

          {/* Category */}
          <Text style={s.label}>Category <Text style={s.optional}>(optional)</Text></Text>
          <View style={s.chipRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, category === cat && s.chipActive]}
                onPress={() => handleSelectCategory(cat)}
              >
                <Text style={[s.chipText, category === cat && s.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.chip, showNewCategory && s.chipActive]}
              onPress={() => {
                setShowNewCategory(!showNewCategory);
                if (showNewCategory) setNewCategory('');
              }}
            >
              <Text style={[s.chipText, showNewCategory && s.chipTextActive]}>
                + New
              </Text>
            </TouchableOpacity>
          </View>
          {showNewCategory && (
            <View style={s.newCategoryRow}>
              <TextInput
                style={[s.input, s.newCategoryInput]}
                placeholder="Category name"
                placeholderTextColor={colors.textMuted}
                value={newCategory}
                onChangeText={setNewCategory}
                maxLength={50}
                autoFocus
                onSubmitEditing={handleAddNewCategory}
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAddNewCategory}>
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

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
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    dueDateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dueDateToggle: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '18',
      marginTop: 12,
    },
    dueDateToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    newCategoryRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    newCategoryInput: {
      flex: 1,
    },
    addBtn: {
      paddingHorizontal: 16,
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
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
