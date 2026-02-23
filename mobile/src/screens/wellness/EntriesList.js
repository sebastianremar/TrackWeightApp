import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, Animated, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { logWeight, deleteWeight } from '../../api/weight';
import ConfirmDialog from '../../components/ConfirmDialog';
import NumberPicker from '../../components/NumberPicker';
import { ScaledSheet } from '../../utils/responsive';

const INITIAL_COUNT = 5;
const LOAD_MORE_COUNT = 10;

function formatDate(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function SwipeableRow({ entry, prevEntry, onRequestDelete, onRequestEdit, colors }) {
  const s = makeStyles(colors);
  const swipeableRef = useRef(null);

  const diff = prevEntry ? +(entry.weight - prevEntry.weight).toFixed(1) : null;

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
        <View style={s.leftCol}>
          <Text style={s.dateLabel}>{formatDate(entry.date)}</Text>
          <Text style={s.weekday}>{formatWeekday(entry.date)}</Text>
        </View>
        <View style={s.rightCol}>
          <Text style={s.weightVal}>
            {entry.weight}
            <Text style={s.weightUnit}> {entry._unit}</Text>
          </Text>
          {diff !== null && diff !== 0 && (
            <Text style={[s.diff, diff > 0 ? s.diffUp : s.diffDown]}>
              {diff > 0 ? '+' : ''}{diff}
            </Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default React.memo(function EntriesList({ entries, onDeleted }) {
  const { colors, weightUnit } = useTheme();
  const s = makeStyles(colors);
  const [deleting, setDeleting] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showCount, setShowCount] = useState(INITIAL_COUNT);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  const visible = sorted.slice(0, showCount);
  const hasMore = sorted.length > showCount;

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
      <View style={s.headerRow}>
        <Text style={s.title}>Recent Entries</Text>
        <Text style={s.hint}>Long press to edit</Text>
      </View>
      <View style={s.list}>
        {visible.map((entry, idx) => (
          <SwipeableRow
            key={entry.date}
            entry={{ ...entry, _unit: weightUnit }}
            prevEntry={idx < visible.length - 1 ? visible[idx + 1] : (sorted[showCount] || null)}
            onRequestDelete={setDeleting}
            onRequestEdit={setEditingEntry}
            colors={colors}
          />
        ))}
      </View>

      {hasMore && (
        <TouchableOpacity
          style={s.seeMoreBtn}
          onPress={() => setShowCount((c) => c + LOAD_MORE_COUNT)}
        >
          <Text style={s.seeMoreText}>
            See more
          </Text>
        </TouchableOpacity>
      )}

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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '10@ms',
    },
    title: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    hint: {
      fontSize: '12@ms0.3',
      color: colors.textMuted,
    },
    list: {
      gap: '8@ms',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: '14@ms',
      paddingHorizontal: '16@ms',
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
    },
    leftCol: {
      flex: 1,
    },
    dateLabel: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    weekday: {
      fontSize: '12@ms0.3',
      color: colors.textMuted,
      marginTop: '2@ms',
    },
    rightCol: {
      alignItems: 'flex-end',
    },
    weightVal: {
      fontSize: '18@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    weightUnit: {
      fontSize: '13@ms0.3',
      fontWeight: '500',
      color: colors.textMuted,
    },
    diff: {
      fontSize: '12@ms0.3',
      fontWeight: '600',
      marginTop: '2@ms',
    },
    diffUp: {
      color: colors.error,
    },
    diffDown: {
      color: colors.success,
    },
    seeMoreBtn: {
      marginTop: '10@ms',
      paddingVertical: '12@ms',
      alignItems: 'center',
      borderRadius: '12@ms',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    seeMoreText: {
      fontSize: '14@ms0.3',
      fontWeight: '600',
      color: colors.primary,
    },
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: '80@ms',
      borderRadius: '12@ms',
    },
    deleteActionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: '14@ms0.3',
    },
  });
}
