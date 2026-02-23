import { useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ScaledSheet } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const PRIORITY_COLORS = {
  high: '#DC2626',
  medium: '#CA8A04',
  low: null, // uses textMuted
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const swipeableRef = useRef(null);

  const isOverdue = todo.dueDate && todo.dueDate < todayStr() && !todo.completed;
  const priorityColor = PRIORITY_COLORS[todo.priority] || colors.textMuted;

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
          onDelete?.(todo);
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
      <View style={s.card}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[s.checkbox, todo.completed && s.checkboxChecked]}
          onPress={() => onToggle(todo.todoId, !todo.completed)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {todo.completed && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Content — long press to edit */}
        <Pressable
          style={s.content}
          onLongPress={() => onEdit(todo)}
          android_ripple={{ color: colors.border }}
        >
          <Text
            style={[s.title, todo.completed && s.titleCompleted]}
            numberOfLines={1}
          >
            {todo.title}
          </Text>

          {todo.description ? (
            <Text style={s.description} numberOfLines={1}>
              {todo.description}
            </Text>
          ) : null}

          <View style={s.meta}>
            {todo.category ? (
              <View style={[s.categoryTag, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.categoryText, { color: colors.primary }]}>
                  {todo.category}
                </Text>
              </View>
            ) : null}

            {todo.dueDate ? (
              <Text style={[s.dueDate, isOverdue && s.overdue]}>
                {formatDate(todo.dueDate)}
              </Text>
            ) : null}

            <View style={[s.priorityDot, { backgroundColor: priorityColor }]} />
          </View>
        </Pressable>
      </View>
    </Swipeable>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: '10@ms',
      borderWidth: 1,
      borderColor: colors.border,
      padding: '12@ms',
      gap: '12@ms',
    },
    checkbox: {
      width: '24@ms',
      height: '24@ms',
      borderRadius: '12@ms',
      borderWidth: 2,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '2@ms',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: '#fff',
      fontSize: '14@ms0.3',
      fontWeight: '700',
    },
    content: {
      flex: 1,
      gap: '2@ms',
    },
    title: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    description: {
      fontSize: '13@ms0.3',
      color: colors.textSecondary,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8@ms',
      marginTop: '4@ms',
    },
    categoryTag: {
      paddingHorizontal: '8@ms',
      paddingVertical: '2@ms',
      borderRadius: '4@ms',
    },
    categoryText: {
      fontSize: '11@ms0.3',
      fontWeight: '600',
    },
    dueDate: {
      fontSize: '12@ms0.3',
      color: colors.textSecondary,
    },
    overdue: {
      color: '#DC2626',
      fontWeight: '600',
    },
    priorityDot: {
      width: '8@ms',
      height: '8@ms',
      borderRadius: '4@ms',
    },
    deleteAction: {
      backgroundColor: '#DC2626',
      justifyContent: 'center',
      alignItems: 'center',
      width: '80@ms',
      borderRadius: '10@ms',
      marginLeft: '8@ms',
    },
    deleteActionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: '14@ms0.3',
    },
  });
}
