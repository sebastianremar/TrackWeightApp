import styles from './TodoItem.module.css';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }) {
  const isOverdue = todo.dueDate && !todo.completed && todo.dueDate < todayStr();

  return (
    <div className={styles.item}>
      <button
        className={`${styles.checkbox} ${todo.completed ? styles.checkboxChecked : ''}`}
        onClick={() => onToggle(todo.todoId, !todo.completed)}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && (
          <svg viewBox="0 0 12 12" width="14" height="14">
            <path d="M2 6l3 3 5-5" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
        )}
      </button>

      <div className={styles.content} onClick={() => onEdit(todo)}>
        <div className={`${styles.title} ${todo.completed ? styles.titleCompleted : ''}`}>
          {todo.title}
        </div>
        {todo.description && (
          <div className={styles.description}>{todo.description}</div>
        )}
        <div className={styles.meta}>
          {todo.category && (
            <span className={styles.categoryBadge}>{todo.category}</span>
          )}
          {todo.dueDate && (
            <span className={`${styles.dueDate} ${isOverdue ? styles.overdue : ''}`}>
              {todo.dueDate}
            </span>
          )}
          <span className={`${styles.priorityDot} ${
            todo.priority === 'high' ? styles.priorityHigh :
            todo.priority === 'medium' ? styles.priorityMedium :
            styles.priorityLow
          }`} title={`${todo.priority} priority`} />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(todo)} aria-label="Delete todo">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
