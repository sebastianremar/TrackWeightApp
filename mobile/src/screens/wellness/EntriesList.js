import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { deleteWeight } from '../../api/weight';
import ConfirmDialog from '../../components/ConfirmDialog';

const MAX_ENTRIES = 20;

export default function EntriesList({ entries, onEdit, onDeleted }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [deleting, setDeleting] = useState(null); // date string

  const sorted = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ENTRIES);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteWeight(deleting);
      onDeleted?.();
    } catch {
      // silently fail — user can retry
    } finally {
      setDeleting(null);
    }
  };

  if (sorted.length === 0) return null;

  return (
    <View>
      <Text style={s.title}>Recent Entries</Text>
      <View style={s.list}>
        {sorted.map((entry) => (
          <View key={entry.date} style={s.row}>
            <View style={s.entryInfo}>
              <Text style={s.date}>{entry.date}</Text>
              <Text style={s.weight} numberOfLines={1}>{entry.weight} {weightUnit}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => onEdit(entry)}
              >
                <Text style={s.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => setDeleting(entry.date)}
              >
                <Text style={s.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <ConfirmDialog
        visible={!!deleting}
        title="Delete Entry"
        message={`Delete the weight entry for ${deleting}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    list: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    entryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    weight: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      flexShrink: 0,
    },
    editBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    editText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.errorBg,
    },
    deleteText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
    },
  });
}
