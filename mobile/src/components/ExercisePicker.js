import { useState, useMemo } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Core', 'Cardio', 'Full Body',
];

const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUPS.slice(1);

export default function ExercisePicker({ visible, library, custom, onSelect, onCreateCustom, onClose }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('Chest');
  const [saving, setSaving] = useState(false);

  const allExercises = useMemo(() => [...library, ...custom], [library, custom]);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (filter !== 'All') {
      list = list.filter((e) => e.muscleGroup === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [allExercises, filter, search]);

  function handleSelect(ex) {
    setSearch('');
    setFilter('All');
    onSelect(ex);
  }

  async function handleCreateCustom() {
    if (!newName.trim() || !onCreateCustom) return;
    setSaving(true);
    try {
      const ex = await onCreateCustom({ name: newName.trim(), muscleGroup: newMuscle });
      setShowCreate(false);
      setNewName('');
      handleSelect(ex);
    } catch {
      // error handled by parent hook
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSearch('');
    setFilter('All');
    setShowCreate(false);
    setNewName('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Select Exercise</Text>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={s.chipsContent}>
          {MUSCLE_GROUPS.map((mg) => (
            <TouchableOpacity
              key={mg}
              style={[s.chip, filter === mg && s.chipActive]}
              onPress={() => setFilter(mg)}
            >
              <Text style={[s.chipText, filter === mg && s.chipTextActive]}>{mg}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 && (
            <Text style={s.noResults}>No exercises found</Text>
          )}
          {filtered.map((ex) => (
            <TouchableOpacity key={ex.id} style={s.exerciseRow} onPress={() => handleSelect(ex)}>
              <View style={s.exerciseInfo}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exMeta}>{ex.muscleGroup}</Text>
              </View>
              {ex.custom && (
                <View style={s.customBadge}>
                  <Text style={s.customBadgeText}>Custom</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showCreate ? (
          <View style={s.createForm}>
            <TextInput
              style={s.createInput}
              placeholder="Exercise name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              maxLength={100}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.muscleRow} contentContainerStyle={s.muscleContent}>
              {MUSCLE_GROUP_OPTIONS.map((mg) => (
                <TouchableOpacity
                  key={mg}
                  style={[s.chip, newMuscle === mg && s.chipActive]}
                  onPress={() => setNewMuscle(mg)}
                >
                  <Text style={[s.chipText, newMuscle === mg && s.chipTextActive]}>{mg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.createActions}>
              <TouchableOpacity style={s.createCancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={s.createCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createSaveBtn, (!newName.trim() || saving) && s.btnDisabled]}
                onPress={handleCreateCustom}
                disabled={!newName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.createSaveText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ Create Custom Exercise</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16@ms',
      paddingTop: '60@vs',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: '18@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    closeBtn: {
      padding: '4@ms',
    },
    closeBtnText: {
      fontSize: '16@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
    searchInput: {
      margin: '16@ms',
      marginBottom: '8@ms',
      backgroundColor: colors.surface,
      borderRadius: '10@ms',
      padding: '12@ms',
      fontSize: '15@ms0.3',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipsRow: {
      maxHeight: '44@ms',
      marginBottom: '8@ms',
    },
    chipsContent: {
      paddingHorizontal: '16@ms',
      gap: '8@ms',
    },
    chip: {
      paddingHorizontal: '14@ms',
      paddingVertical: '7@ms',
      borderRadius: '20@ms',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: '13@ms0.3',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: {
      color: '#fff',
    },
    list: {
      flex: 1,
    },
    noResults: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: '14@ms0.3',
      paddingVertical: '24@ms',
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: '12@ms',
      paddingHorizontal: '16@ms',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    exerciseInfo: {
      flex: 1,
    },
    exName: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    exMeta: {
      fontSize: '13@ms0.3',
      color: colors.textMuted,
      marginTop: '2@ms',
    },
    customBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: '8@ms',
      paddingVertical: '3@ms',
      borderRadius: '8@ms',
    },
    customBadgeText: {
      fontSize: '11@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
    createForm: {
      padding: '16@ms',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    createInput: {
      backgroundColor: colors.background,
      borderRadius: '10@ms',
      padding: '12@ms',
      fontSize: '15@ms0.3',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: '10@ms',
    },
    muscleRow: {
      maxHeight: '40@ms',
      marginBottom: '10@ms',
    },
    muscleContent: {
      gap: '8@ms',
    },
    createActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: '12@ms',
    },
    createCancelBtn: {
      paddingVertical: '10@ms',
      paddingHorizontal: '16@ms',
    },
    createCancelText: {
      fontSize: '15@ms0.3',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    createSaveBtn: {
      backgroundColor: colors.primary,
      paddingVertical: '10@ms',
      paddingHorizontal: '20@ms',
      borderRadius: '8@ms',
    },
    createSaveText: {
      fontSize: '15@ms0.3',
      color: '#fff',
      fontWeight: '600',
    },
    btnDisabled: {
      opacity: 0.5,
    },
    createBtn: {
      padding: '16@ms',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      paddingBottom: '32@ms',
    },
    createBtnText: {
      fontSize: '15@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
