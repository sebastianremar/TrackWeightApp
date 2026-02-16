import { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import ExercisePicker from './ExercisePicker';
import styles from './TemplateModal.module.css';

export default function TemplateModal({
  template,
  library,
  custom,
  onSave,
  onDelete,
  onCreateCustom,
  onClose,
}) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name || '');
  const [exercises, setExercises] = useState(
    template?.exercises?.map((ex) => ({ ...ex })) || [],
  );
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleAddExercise(ex) {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: 3,
        reps: '8-12',
        restSec: 90,
      },
    ]);
    setShowPicker(false);
  }

  function handleRemoveExercise(idx) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFieldChange(idx, field, value) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: parseInt(ex.sets) || 3,
          reps: String(ex.reps || '8-12'),
          restSec: parseInt(ex.restSec) || 90,
        })),
      };
      await onSave(payload, template?.routineId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(template.routineId);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Template' : 'New Template'}>
      <div className={styles.form}>
        <input
          className={styles.nameInput}
          type="text"
          placeholder="Template name (e.g. Push Day)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />

        <span className={styles.sectionLabel}>Exercises</span>

        <div className={styles.exerciseList}>
          {exercises.map((ex, idx) => (
            <div key={idx} className={styles.exRow}>
              <div className={styles.exInfo}>
                <span className={styles.exTitle}>{ex.name}</span>
                <span className={styles.exMuscle}>{ex.muscleGroup}</span>
              </div>
              <div className={styles.exFields}>
                <div>
                  <input
                    className={styles.exFieldInput}
                    type="number"
                    min={1}
                    max={20}
                    value={ex.sets}
                    onChange={(e) => handleFieldChange(idx, 'sets', e.target.value)}
                  />
                  <span className={styles.exFieldLabel}>sets</span>
                </div>
                <div>
                  <input
                    className={styles.exFieldInput}
                    type="text"
                    value={ex.reps}
                    onChange={(e) => handleFieldChange(idx, 'reps', e.target.value)}
                    maxLength={20}
                  />
                  <span className={styles.exFieldLabel}>reps</span>
                </div>
                <div>
                  <input
                    className={styles.exFieldInput}
                    type="number"
                    min={0}
                    max={600}
                    value={ex.restSec}
                    onChange={(e) => handleFieldChange(idx, 'restSec', e.target.value)}
                  />
                  <span className={styles.exFieldLabel}>rest</span>
                </div>
              </div>
              <button className={styles.exRemoveBtn} onClick={() => handleRemoveExercise(idx)}>
                &times;
              </button>
            </div>
          ))}
        </div>

        {showPicker ? (
          <div className={styles.pickerWrapper}>
            <ExercisePicker
              library={library}
              custom={custom}
              onSelect={handleAddExercise}
              onCreateCustom={onCreateCustom}
            />
          </div>
        ) : (
          <button className={styles.addBtn} onClick={() => setShowPicker(true)}>
            + Add Exercise
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          {isEdit && (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          <span className={styles.spacer} />
          <button
            className={styles.saveBtn}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this template? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
