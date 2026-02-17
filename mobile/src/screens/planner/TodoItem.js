import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

export default function TodoItem({ todo, onToggle, onEdit }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const isOverdue = todo.dueDate && todo.dueDate < todayStr() && !todo.completed;
  const priorityColor = PRIORITY_COLORS[todo.priority] || colors.textMuted;

  return (
    <View style={s.card}>
      {/* Checkbox */}
      <TouchableOpacity
        style={[s.checkbox, todo.completed && s.checkboxChecked]}
        onPress={() => onToggle(todo.todoId, !todo.completed)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {todo.completed && <Text style={s.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={s.content} onPress={() => onEdit(todo)} activeOpacity={0.7}>
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
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '600',
    },
    dueDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    overdue: {
      color: '#DC2626',
      fontWeight: '600',
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}
