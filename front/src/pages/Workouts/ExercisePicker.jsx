import { useState, useMemo } from 'react';
import styles from './ExercisePicker.module.css';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Core', 'Cardio', 'Full Body',
];

const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUPS.slice(1);

export default function ExercisePicker({ library, custom, onSelect, onCreateCustom }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('Chest');
  const [saving, setSaving] = useState(false);

  const allExercises = useMemo(() => [...library, ...custom], [library, custom]);

  const filtered = useMemo(() => {
    let list = allExercises;
    if (filter !== 'All') {
      list = list.filter((e) => e.muscleGroup === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [allExercises, filter, search]);

  async function handleCreateCustom() {
    if (!newName.trim() || !onCreateCustom) return;
    setSaving(true);
    try {
      const ex = await onCreateCustom({ name: newName.trim(), muscleGroup: newMuscle });
      setShowCreate(false);
      setNewName('');
      onSelect(ex);
    } catch {
      // error handled by parent hook
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.picker}>
      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.chips}>
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            className={`${styles.chip} ${filter === mg ? styles.chipActive : ''}`}
            onClick={() => setFilter(mg)}
          >
            {mg}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <p className={styles.noResults}>No exercises found</p>
        )}
        {filtered.map((ex) => (
          <button
            key={ex.id}
            className={styles.exerciseBtn}
            onClick={() => onSelect(ex)}
          >
            <span className={styles.exName}>{ex.name}</span>
            <span className={styles.exMeta}>{ex.muscleGroup}</span>
            {ex.custom && <span className={styles.customBadge}>Custom</span>}
          </button>
        ))}
      </div>

      {showCreate ? (
        <div className={styles.customForm}>
          <input
            className={styles.customInput}
            type="text"
            placeholder="Exercise name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
          />
          <select
            className={styles.customSelect}
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value)}
          >
            {MUSCLE_GROUP_OPTIONS.map((mg) => (
              <option key={mg} value={mg}>{mg}</option>
            ))}
          </select>
          <div className={styles.customActions}>
            <button className={styles.customCancelBtn} onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button
              className={styles.customSaveBtn}
              disabled={!newName.trim() || saving}
              onClick={handleCreateCustom}
            >
              {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          + Create Custom Exercise
        </button>
      )}
    </div>
  );
}
