import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { ScaledSheet } from '../../utils/responsive';
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
  return ScaledSheet.create({
    card: {
      borderRadius: '12@ms',
      padding: '12@ms',
      marginBottom: '8@ms',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkWrap: {
      marginRight: '12@ms',
    },
    checkbox: {
      width: '24@ms',
      height: '24@ms',
      borderRadius: '6@ms',
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkmark: {
      color: '#fff',
      fontSize: '14@ms0.3',
      fontWeight: '700',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    nameDone: {
      textDecorationLine: 'line-through',
      opacity: 0.6,
    },
    subtitle: {
      fontSize: '12@ms0.3',
      color: colors.textMuted,
      marginTop: '2@ms',
    },
    subtitleDanger: {
      color: colors.error,
      fontWeight: '600',
    },
    menuBtn: {
      padding: '8@ms',
    },
    menuDots: {
      fontSize: '16@ms0.3',
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: '1@ms0.3',
    },
    progressBar: {
      height: '4@ms',
      backgroundColor: colors.border,
      borderRadius: '2@ms',
      marginTop: '8@ms',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: '2@ms',
    },
    reflection: {
      marginTop: '8@ms',
    },
    reflectionInput: {
      backgroundColor: colors.surface,
      borderRadius: '8@ms',
      padding: '10@ms',
      fontSize: '13@ms0.3',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: '50@ms',
      textAlignVertical: 'top',
    },
    reflectionCount: {
      fontSize: '11@ms0.3',
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: '2@ms',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32@ms',
    },
    dropdown: {
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      padding: '4@ms',
      minWidth: '180@ms',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    dropdownItem: {
      paddingVertical: '14@ms',
      paddingHorizontal: '16@ms',
    },
    dropdownText: {
      fontSize: '16@ms0.3',
      color: colors.text,
      fontWeight: '500',
    },
    dropdownDanger: {
      color: colors.error,
    },
  });
}
