import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useTodos } from '../../hooks/useTodos';
import { useCategories } from '../../hooks/useCategories';
import InlineError from '../../components/InlineError';
import ConfirmDialog from '../../components/ConfirmDialog';
import TodoItem from './TodoItem';
import TodoModal from './TodoModal';

const SORT_OPTIONS = [
  { key: 'dueDate', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'newest', label: 'Newest' },
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function TodosDashboard() {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [showCompleted, setShowCompleted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const {
    todos,
    loading,
    error,
    addTodo,
    editTodo,
    toggleTodo,
    removeTodo,
    refetch,
  } = useTodos();

  const { categories, addCategory } = useCategories();

  const handleToggleCompleted = (completed) => {
    setShowCompleted(completed);
    refetch(completed, activeCategory || undefined);
  };

  const handleSelectCategory = (cat) => {
    const next = cat === activeCategory ? null : cat;
    setActiveCategory(next);
    refetch(showCompleted, next || undefined);
  };

  const sortedTodos = useMemo(() => {
    const sorted = [...todos];
    if (sortBy === 'dueDate') {
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } else if (sortBy === 'priority') {
      sorted.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        return pa - pb;
      });
    } else {
      // newest — sort by createdAt descending
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return sorted;
  }, [todos, sortBy]);

  const handleOpenCreate = () => {
    setEditingTodo(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (todo) => {
    setEditingTodo(todo);
    setModalOpen(true);
  };

  const handleSaveTodo = async (fields, newCategoryName) => {
    if (newCategoryName) {
      await addCategory(newCategoryName);
    }
    if (editingTodo) {
      await editTodo(editingTodo.todoId, fields);
    } else {
      await addTodo(fields);
    }
  };

  const handleToggle = async (id, completed) => {
    await toggleTodo(id, completed);
    // Toggled todo moves to other list — remove from current view
    refetch(showCompleted, activeCategory || undefined);
  };

  const handleDeletePress = () => {
    if (editingTodo) {
      setDeleteTarget(editingTodo);
      setModalOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await removeTodo(deleteTarget.todoId);
      setDeleteTarget(null);
    }
  };

  const renderItem = ({ item }) => (
    <TodoItem
      todo={item}
      onToggle={handleToggle}
      onEdit={handleOpenEdit}
    />
  );

  return (
    <View style={s.container}>
      {/* Active / Completed toggle */}
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, !showCompleted && s.toggleBtnActive]}
          onPress={() => handleToggleCompleted(false)}
        >
          <Text style={[s.toggleText, !showCompleted && s.toggleTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, showCompleted && s.toggleBtnActive]}
          onPress={() => handleToggleCompleted(true)}
        >
          <Text style={[s.toggleText, showCompleted && s.toggleTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={s.chipRow}
        >
          <TouchableOpacity
            style={[s.chip, !activeCategory && s.chipActive]}
            onPress={() => handleSelectCategory(null)}
          >
            <Text style={[s.chipText, !activeCategory && s.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.chip, activeCategory === cat && s.chipActive]}
              onPress={() => handleSelectCategory(cat)}
            >
              <Text style={[s.chipText, activeCategory === cat && s.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Sort control */}
      <View style={s.segmentedControl}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[s.segment, sortBy === opt.key && s.segmentActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[s.segmentText, sortBy === opt.key && s.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <InlineError message={error} />

      {loading && todos.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedTodos.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>{showCompleted ? '🎉' : '📝'}</Text>
          <Text style={s.emptyTitle}>
            {showCompleted ? 'No completed todos' : 'No todos yet'}
          </Text>
          <Text style={s.emptyText}>
            {showCompleted
              ? 'Completed todos will appear here.'
              : 'Tap the + button to create your first todo.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedTodos}
          keyExtractor={(item) => item.todoId}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={s.list}
        />
      )}

      {/* Add button */}
      <TouchableOpacity style={s.addButton} onPress={handleOpenCreate}>
        <Text style={s.addButtonText}>+</Text>
      </TouchableOpacity>

      <TodoModal
        visible={modalOpen}
        todo={editingTodo}
        categories={categories}
        onSave={handleSaveTodo}
        onDelete={editingTodo ? handleDeletePress : null}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Todo"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    toggleTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    chipScroll: {
      flexGrow: 0,
    },
    chipRow: {
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      paddingHorizontal: 14,
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
    center: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    list: {
      gap: 8,
    },
    addButton: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    addButtonText: {
      fontSize: 28,
      fontWeight: '400',
      color: '#fff',
      marginTop: -2,
    },
  });
}
