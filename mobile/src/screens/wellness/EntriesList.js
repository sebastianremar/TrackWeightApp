import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { logWeight, deleteWeight } from '../../api/weight';
import ConfirmDialog from '../../components/ConfirmDialog';
import NumberPicker from '../../components/NumberPicker';
import { ScaledSheet } from '../../utils/responsive';

const MAX_ENTRIES = 20;

function SwipeableRow({ entry, onRequestDelete, onSaved, onRequestEdit, colors }) {
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
        onLongPress={() => onRequestEdit(entry)}
        android_ripple={{ color: colors.border }}
      >
        <Text style={s.date}>{entry.date}</Text>
        <Text style={s.weight} numberOfLines={1}>{entry.weight} {entry._unit}</Text>
      </Pressable>
    </Swipeable>
  );
}

export default React.memo(function EntriesList({ entries, onDeleted }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [deleting, setDeleting] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_ENTRIES),
    [entries],
  );

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

  const handleEditConfirm = async (newWeight) => {
    if (!editingEntry || newWeight === editingEntry.weight) {
      setEditingEntry(null);
      return;
    }
    try {
      await logWeight(newWeight, editingEntry.date);
      onDeleted?.();
    } catch {
      // silently fail
    } finally {
      setEditingEntry(null);
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
            onRequestDelete={setDeleting}
            onRequestEdit={setEditingEntry}
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

      <NumberPicker
        visible={!!editingEntry}
        value={editingEntry?.weight || 70}
        min={weightUnit === 'lbs' ? 44 : 20}
        max={weightUnit === 'lbs' ? 1100 : 500}
        step={0.1}
        unit={weightUnit}
        label="Edit Weight"
        onConfirm={(v) => handleEditConfirm(v)}
        onCancel={() => setEditingEntry(null)}
      />
    </View>
  );
});

function makeStyles(colors) {
  return ScaledSheet.create({
    title: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
      marginBottom: '2@ms',
    },
    hint: {
      fontSize: '12@ms0.3',
      color: colors.textMuted,
      marginBottom: '10@ms',
    },
    list: {
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: '14@ms',
      paddingHorizontal: '16@ms',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    date: {
      fontSize: '14@ms0.3',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    weight: {
      fontSize: '16@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: '80@ms',
    },
    deleteActionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: '14@ms0.3',
    },
  });
}
