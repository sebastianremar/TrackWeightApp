import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function HabitItem({
  habit,
  completed,
  onToggle,
  onEdit,
  onDelete,
  progress,
  note,
  onNoteChange,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [menuOpen, setMenuOpen] = useState(false);

  const isBad = habit.type === 'bad';
  const period = habit.limitPeriod || 'week';
  const exceeded = isBad && progress !== undefined && progress > habit.targetFrequency;

  const pct =
    progress !== undefined && habit.targetFrequency
      ? isBad
        ? Math.round((progress / habit.targetFrequency) * 100)
        : Math.min(100, Math.round((progress / habit.targetFrequency) * 100))
      : 0;

  const tintOpacity = completed ? '26' : '12';
  const cardBg = habit.color ? `${habit.color}${tintOpacity}` : colors.surface;

  return (
    <View style={[s.card, { backgroundColor: cardBg }]}>
      <View style={s.row}>
        <TouchableOpacity onPress={onToggle} style={s.checkWrap}>
          <View
            style={[
              s.checkbox,
              { borderColor: habit.color },
              completed && { backgroundColor: habit.color },
            ]}
          >
            {completed && <Text style={s.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={s.info}>
          <Text style={[s.name, completed && s.nameDone]}>{habit.name}</Text>
          {progress !== undefined && (
            <Text style={[s.subtitle, exceeded && s.subtitleDanger]}>
              {progress}/{habit.targetFrequency} this {period}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.menuBtn}>
          <Text style={s.menuDots}>•••</Text>
        </TouchableOpacity>
      </View>

      {progress !== undefined && habit.targetFrequency > 0 && (
        <View style={s.progressBar}>
          <View
            style={[
              s.progressFill,
              {
                width: `${Math.min(100, pct)}%`,
                backgroundColor: exceeded ? colors.error : habit.color,
              },
            ]}
          />
        </View>
      )}

      {isBad && completed && onNoteChange && (
        <View style={s.reflection}>
          <TextInput
            style={s.reflectionInput}
            placeholder="Why did this happen? (optional)"
            placeholderTextColor={colors.textMuted}
            value={note || ''}
            onChangeText={onNoteChange}
            maxLength={500}
            multiline
            numberOfLines={2}
          />
          {note ? (
            <Text style={s.reflectionCount}>{note.length}/500</Text>
          ) : null}
        </View>
      )}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setMenuOpen(false)}>
          <View style={s.dropdown}>
            <TouchableOpacity
              style={s.dropdownItem}
              onPress={() => { setMenuOpen(false); onEdit(); }}
            >
              <Text style={s.dropdownText}>Edit</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity
                style={s.dropdownItem}
                onPress={() => { setMenuOpen(false); onDelete(); }}
              >
                <Text style={[s.dropdownText, s.dropdownDanger]}>Archive</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkWrap: {
      marginRight: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkmark: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    nameDone: {
      textDecorationLine: 'line-through',
      opacity: 0.6,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    subtitleDanger: {
      color: colors.error,
      fontWeight: '600',
    },
    menuBtn: {
      padding: 8,
    },
    menuDots: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 1,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    reflection: {
      marginTop: 8,
    },
    reflectionInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      fontSize: 13,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 50,
      textAlignVertical: 'top',
    },
    reflectionCount: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: 2,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    dropdown: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      minWidth: 180,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    dropdownItem: {
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dropdownText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    dropdownDanger: {
      color: colors.error,
    },
  });
}
