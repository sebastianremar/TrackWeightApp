import { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import InlineError from '../../components/InlineError/InlineError';
import styles from './DayEditorModal.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyExercise = () => ({ name: '', muscleGroup: '', sets: 3, reps: '10', restSec: 90 });

export default function DayEditorModal({ open, onClose, dayKey, dayData, onSave }) {
  const [label, setLabel] = useState('');
  const [muscleGroups, setMuscleGroups] = useState('');
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      if (dayData) {
        setLabel(dayData.label || '');
        setMuscleGroups((dayData.muscleGroups || []).join(', '));
        setExercises(
          dayData.exercises?.length > 0
            ? dayData.exercises.map((e) => ({ ...e }))
            : [emptyExercise()],
        );
      } else {
        setLabel('');
        setMuscleGroups('');
        setExercises([emptyExercise()]);
      }
      setError(null);
    }
  }, [open, dayData]);

  const updateExercise = (idx, field, value) => {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)));
  };

  const addExercise = () => {
    if (exercises.length < 20) setExercises((prev) => [...prev, emptyExercise()]);
  };

  const removeExercise = (idx) => {
    if (exercises.length > 1) setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearDay = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(dayKey, null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) {
      setError('At least one exercise is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const mg = muscleGroups
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const data = {
        label: label.trim(),
        exercises: validExercises.map((ex) => ({
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup?.trim() || undefined,
          sets: parseInt(ex.sets) || 3,
          reps: ex.reps || '10',
          restSec: parseInt(ex.restSec) || undefined,
        })),
      };
      if (mg.length > 0) data.muscleGroups = mg;
      await onSave(dayKey, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={dayKey != null ? DAY_NAMES[dayKey] : 'Edit Day'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Label
          <input
            className={styles.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={50}
            placeholder="e.g. Push Day"
          />
        </label>

        <label className={styles.label}>
          Muscle Groups (comma-separated)
          <input
            className={styles.input}
            value={muscleGroups}
            onChange={(e) => setMuscleGroups(e.target.value)}
            placeholder="e.g. Chest, Shoulders, Triceps"
          />
        </label>

        <div className={styles.exercisesHeader}>
          <span className={styles.label}>Exercises</span>
          <button type="button" className={styles.addExBtn} onClick={addExercise} disabled={exercises.length >= 20}>
            + Add
          </button>
        </div>

        <div className={styles.exerciseList}>
          {exercises.map((ex, i) => (
            <div key={i} className={styles.exerciseRow}>
              <div className={styles.exFields}>
                <input
                  className={styles.exInput}
                  value={ex.name}
                  onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  placeholder="Exercise name"
                  maxLength={100}
                />
                <input
                  className={styles.exInputSm}
                  value={ex.muscleGroup || ''}
                  onChange={(e) => updateExercise(i, 'muscleGroup', e.target.value)}
                  placeholder="Muscle"
                  maxLength={30}
                />
                <input
                  className={styles.exInputXs}
                  type="number"
                  value={ex.sets}
                  onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                  min={1}
                  max={20}
                  placeholder="Sets"
                />
                <input
                  className={styles.exInputSm}
                  value={ex.reps}
                  onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                  placeholder="Reps"
                  maxLength={20}
                />
                <input
                  className={styles.exInputXs}
                  type="number"
                  value={ex.restSec ?? ''}
                  onChange={(e) => updateExercise(i, 'restSec', e.target.value)}
                  min={0}
                  max={600}
                  placeholder="Rest(s)"
                />
              </div>
              {exercises.length > 1 && (
                <button type="button" className={styles.removeBtn} onClick={() => removeExercise(i)} aria-label="Remove exercise">
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        <InlineError message={error} />

        <div className={styles.actions}>
          {dayData && (
            <button type="button" className={styles.clearBtn} onClick={handleClearDay} disabled={saving}>
              Set Rest Day
            </button>
          )}
          <div className={styles.spacer} />
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
