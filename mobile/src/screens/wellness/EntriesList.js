import { useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { deleteWeight } from '../../api/weight';
import ConfirmDialog from '../../components/ConfirmDialog';

const MAX_ENTRIES = 20;

function SwipeableRow({ entry, onEdit, onRequestDelete, colors }) {
  const s = makeStyles(colors);
  const swipeableRef = useRef(null);

  const renderRightActions = (_progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <Pressable
        style={s.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onRequestDelete(entry.date);
        }}
      >
        <Animated.Text style={[s.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        style={s.row}
        onLongPress={() => onEdit(entry)}
        android_ripple={{ color: colors.border }}
      >
        <Text style={s.date}>{entry.date}</Text>
        <Text style={s.weight} numberOfLines={1}>{entry.weight} {entry._unit}</Text>
      </Pressable>
    </Swipeable>
  );
}

export default function EntriesList({ entries, onEdit, onDeleted }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [deleting, setDeleting] = useState(null);

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
      <Text style={s.hint}>Long press to edit, swipe left to delete</Text>
      <View style={s.list}>
        {sorted.map((entry) => (
          <SwipeableRow
            key={entry.date}
            entry={{ ...entry, _unit: weightUnit }}
            onEdit={onEdit}
            onRequestDelete={setDeleting}
            colors={colors}
          />
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
      marginBottom: 2,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
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
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
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
    },
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
    },
    deleteActionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
  });
}
