import { useState } from 'react';
import { deleteWeight } from '../../api/weight';
import Card from '../../components/Card/Card';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import EmptyState from '../../components/EmptyState/EmptyState';
import InlineError from '../../components/InlineError/InlineError';
import styles from './EntriesTable.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EntriesTable({ entries, onEdit, onDeleted }) {
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  const handleDelete = async (date) => {
    setError('');
    try {
      await deleteWeight(date);
      onDeleted();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card>
      <h2 className={styles.title}>Recent Entries</h2>
      <InlineError message={error} />
      {sorted.length === 0 ? (
        <EmptyState message="No entries yet" />
      ) : (
        <div className={styles.table}>
          {sorted.map((entry) => (
            <div key={entry.date} className={styles.row}>
              <span className={styles.date}>{formatDate(entry.date)}</span>
              <span className={styles.weight}>{entry.weight} kg</span>
              <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => onEdit(entry)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => setDeleting(entry.date)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting)}
        title="Delete Entry"
        message="Are you sure you want to delete this entry?"
        confirmLabel="Delete"
        danger
      />
    </Card>
  );
}
