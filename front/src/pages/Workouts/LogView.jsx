import { useState, useCallback } from 'react';
import Card from '../../components/Card/Card';
import InlineError from '../../components/InlineError/InlineError';
import ExercisePicker from './ExercisePicker';
import { getTemplatePrefill } from '../../api/workouts';
import styles from './LogView.module.css';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function emptySet() {
  return { weight: 0, reps: 0 };
}

export default function LogView({ templates, library, custom, addLog, onCreateCustom }) {
  const [date, setDate] = useState(todayStr());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exercises, setExercises] = useState([]);
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleTemplateChange = useCallback(async (tmplId) => {
    setSelectedTemplate(tmplId);
    setSuccess(false);
    setError(null);
    setPrefillDate(null);

    if (!tmplId) {
      setExercises([]);
      return;
    }

    const tmpl = templates.find((t) => t.routineId === tmplId);
    if (!tmpl) return;

    // Start with template structure
    const baseExercises = tmpl.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: Array.from({ length: ex.sets || 3 }, () => emptySet()),
    }));

    setExercises(baseExercises);

    // Try to prefill from last session
    try {
      const prefill = await getTemplatePrefill(tmplId);
      if (prefill.exercises?.length > 0) {
        setPrefillDate(prefill.date);
        setExercises((prev) =>
          prev.map((ex) => {
            const match = prefill.exercises.find((p) => p.exerciseId === ex.exerciseId || p.name === ex.name);
            if (match?.sets?.length > 0) {
              return {
                ...ex,
                sets: match.sets.map((s) => ({ weight: s.weight || 0, reps: s.reps || 0 })),
              };
            }
            return ex;
          }),
        );
      }
    } catch {
      // prefill is optional, ignore errors
    }
  }, [templates]);

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

  const handleAddExercise = (ex) => {
    if (exercises.length < 30) {
      setExercises((prev) => [
        ...prev,
        {
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: [emptySet()],
        },
      ]);
    }
    setShowPicker(false);
  };

  const removeExercise = (exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const handleSave = async () => {
    const validExercises = exercises.filter(
      (ex) => ex.name.trim() && ex.sets.some((s) => s.weight > 0 || s.reps > 0),
    );
    if (validExercises.length === 0) {
      setError('Log at least one exercise with weight or reps');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const tmpl = templates.find((t) => t.routineId === selectedTemplate);
      const payload = {
        date,
        exercises: validExercises.map((ex) => ({
          exerciseId: ex.exerciseId || undefined,
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup || undefined,
          sets: ex.sets.filter((s) => s.weight > 0 || s.reps > 0),
        })),
      };
      if (durationMin) payload.durationMin = parseInt(durationMin);
      if (notes.trim()) payload.notes = notes.trim();
      if (tmpl) {
        payload.templateId = tmpl.routineId;
        payload.templateName = tmpl.name;
      }
      await addLog(payload);
      setSuccess(true);
      // Reset form
      setExercises([]);
      setSelectedTemplate('');
      setDurationMin('');
      setNotes('');
      setPrefillDate(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <label className={styles.label}>
          Template
          <select
            className={styles.selectInput}
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">Freestyle</option>
            {templates.map((t) => (
              <option key={t.routineId} value={t.routineId}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          Date
          <input
            className={styles.dateInput}
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => { setDate(e.target.value); setSuccess(false); }}
          />
        </label>
      </div>

      {prefillDate && (
        <p className={styles.prefillNote}>Pre-filled from session on {prefillDate}</p>
      )}

      {exercises.length > 0 && (
        <div className={styles.exerciseList}>
          {exercises.map((ex, exIdx) => (
            <Card key={exIdx} className={styles.exCard}>
              <div className={styles.exHeader}>
                <span className={styles.exName}>{ex.name}</span>
                {ex.muscleGroup && (
                  <span className={styles.exMuscle}>{ex.muscleGroup}</span>
                )}
                <button className={styles.exRemoveBtn} onClick={() => removeExercise(exIdx)} aria-label="Remove exercise">
                  &times;
                </button>
              </div>

              <div className={styles.setsHeader}>
                <span>Set</span>
                <span>Weight (lbs)</span>
                <span>Reps</span>
                <span />
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

      {exercises.length < 30 && (
        showPicker ? (
          <div className={styles.pickerWrapper}>
            <ExercisePicker
              library={library}
              custom={custom}
              onSelect={handleAddExercise}
              onCreateCustom={onCreateCustom}
            />
          </div>
        ) : (
          <button className={styles.addExBtn} onClick={() => setShowPicker(true)}>
            + Add Exercise
          </button>
        )
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
