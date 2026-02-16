import { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import styles from './LogDetailModal.module.css';

export default function LogDetailModal({ open, onClose, log, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!log) return null;

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDeleteAction = async () => {
    await onDelete(log.logId);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={log.dayLabel || log.date}>
        <div className={styles.content}>
          <div className={styles.meta}>
            <span className={styles.date}>{log.date}</span>
            {log.durationMin && <span className={styles.duration}>{log.durationMin} min</span>}
          </div>

          <div className={styles.exerciseList}>
            {log.exercises?.map((ex, i) => (
              <div key={i} className={styles.exercise}>
                <div className={styles.exName}>
                  {ex.name}
                  {ex.muscleGroup && <span className={styles.exMuscle}>{ex.muscleGroup}</span>}
                </div>
                <div className={styles.sets}>
                  {ex.sets?.map((s, j) => (
                    <div key={j} className={styles.set}>
                      <span className={styles.setNum}>Set {j + 1}:</span>
                      <span>{s.weight} lbs x {s.reps}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {log.notes && <p className={styles.notes}>{log.notes}</p>}

          <div className={styles.actions}>
            <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
            <div className={styles.spacer} />
            <button className={styles.closeBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteAction}
        title="Delete Log"
        message={`Delete the workout log from ${log.date}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}
