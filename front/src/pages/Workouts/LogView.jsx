import { useState, useMemo } from 'react';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import InlineError from '../../components/InlineError/InlineError';
import styles from './LogView.module.css';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function emptySet() {
  return { weight: 0, reps: 0 };
}

export default function LogView({ activeRoutine, addLog }) {
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [durationMin, setDurationMin] = useState('');

  const dayOfWeek = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    return d.getDay();
  }, [date]);

  const templateDay = activeRoutine?.schedule?.[String(dayOfWeek)];

  const [exercises, setExercises] = useState(() => initExercises(templateDay));

  function initExercises(day) {
    if (!day?.exercises?.length) return [];
    return day.exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup || '',
      sets: Array.from({ length: ex.sets || 3 }, () => emptySet()),
    }));
  }

  const handleDateChange = (newDate) => {
    setDate(newDate);
    setSuccess(false);
    const dow = new Date(newDate + 'T00:00:00').getDay();
    const day = activeRoutine?.schedule?.[String(dow)];
    setExercises(initExercises(day));
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: parseFloat(value) || 0 } : s,
              ),
            }
          : ex,
      ),
    );
  };

  const addSet = (exIdx) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx && ex.sets.length < 20
          ? { ...ex, sets: [...ex.sets, emptySet()] }
          : ex,
      ),
    );
  };

  const removeSet = (exIdx, setIdx) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx && ex.sets.length > 1
          ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
          : ex,
      ),
    );
  };

  const addExercise = () => {
    if (exercises.length < 30) {
      setExercises((prev) => [...prev, { name: '', muscleGroup: '', sets: [emptySet()] }]);
    }
  };

  const updateExerciseName = (exIdx, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === exIdx ? { ...ex, [field]: value } : ex)),
    );
  };

  const removeExercise = (exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const handleSave = async () => {
    const validExercises = exercises.filter((ex) => ex.name.trim() && ex.sets.some((s) => s.weight > 0 || s.reps > 0));
    if (validExercises.length === 0) {
      setError('Log at least one exercise with weight or reps');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        date,
        exercises: validExercises.map((ex) => ({
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup?.trim() || undefined,
          sets: ex.sets.filter((s) => s.weight > 0 || s.reps > 0),
        })),
      };
      if (durationMin) payload.durationMin = parseInt(durationMin);
      if (notes.trim()) payload.notes = notes.trim();
      if (activeRoutine) {
        payload.routineId = activeRoutine.routineId;
        if (templateDay) payload.dayLabel = templateDay.label;
      }
      await addLog(payload);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isRestDay = activeRoutine && !templateDay;

  return (
    <div className={styles.wrapper}>
      <div className={styles.dateRow}>
        <label className={styles.label}>Date</label>
        <input
          className={styles.dateInput}
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      {templateDay && (
        <div className={styles.dayInfo}>
          <span className={styles.dayLabel}>{templateDay.label}</span>
          {templateDay.muscleGroups?.length > 0 && (
            <span className={styles.dayMuscles}>{templateDay.muscleGroups.join(', ')}</span>
          )}
        </div>
      )}

      {isRestDay && exercises.length === 0 && (
        <EmptyState
          message="Rest day - no exercises scheduled"
          action={{ label: 'Add Exercise Anyway', onClick: addExercise }}
        />
      )}

      {!activeRoutine && exercises.length === 0 && (
        <EmptyState
          message="No active routine. Add exercises manually."
          action={{ label: 'Add Exercise', onClick: addExercise }}
        />
      )}

      {exercises.length > 0 && (
        <div className={styles.exerciseList}>
          {exercises.map((ex, exIdx) => (
            <Card key={exIdx} className={styles.exCard}>
              <div className={styles.exHeader}>
                <input
                  className={styles.exNameInput}
                  value={ex.name}
                  onChange={(e) => updateExerciseName(exIdx, 'name', e.target.value)}
                  placeholder="Exercise name"
                  maxLength={100}
                />
                <button className={styles.exRemoveBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove exercise">
                  &times;
                </button>
              </div>

              <div className={styles.setsHeader}>
                <span className={styles.setLabel}>Set</span>
                <span className={styles.setLabel}>Weight (lbs)</span>
                <span className={styles.setLabel}>Reps</span>
                <span className={styles.setAction} />
              </div>

              {ex.sets.map((s, sIdx) => (
                <div key={sIdx} className={styles.setRow}>
                  <span className={styles.setNum}>{sIdx + 1}</span>
                  <input
                    className={styles.setInput}
                    type="number"
                    value={s.weight || ''}
                    onChange={(e) => updateSet(exIdx, sIdx, 'weight', e.target.value)}
                    min={0}
                    max={2000}
                    placeholder="0"
                  />
                  <input
                    className={styles.setInput}
                    type="number"
                    value={s.reps || ''}
                    onChange={(e) => updateSet(exIdx, sIdx, 'reps', e.target.value)}
                    min={0}
                    max={999}
                    placeholder="0"
                  />
                  <button
                    className={styles.setRemoveBtn}
                    onClick={() => removeSet(exIdx, sIdx)}
                    disabled={ex.sets.length <= 1}
                    aria-label="Remove set"
                  >
                    &minus;
                  </button>
                </div>
              ))}

              <button className={styles.addSetBtn} onClick={() => addSet(exIdx)} disabled={ex.sets.length >= 20}>
                + Add Set
              </button>
            </Card>
          ))}
        </div>
      )}

      {exercises.length > 0 && exercises.length < 30 && (
        <button className={styles.addExBtn} onClick={addExercise}>+ Add Exercise</button>
      )}

      <div className={styles.extras}>
        <label className={styles.label}>
          Duration (min)
          <input
            className={styles.smallInput}
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            min={1}
            max={600}
            placeholder="Optional"
          />
        </label>
        <label className={styles.label}>
          Notes
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Optional notes..."
          />
        </label>
      </div>

      <InlineError message={error} />
      {success && <p className={styles.success}>Workout logged!</p>}

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
    </div>
  );
}
