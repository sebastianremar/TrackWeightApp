import { describe, test, expect } from 'vitest';
import { exportHistoryRows } from '../exportWorkouts';

describe('exportHistoryRows', () => {
  test('flattens logs into one row per set', () => {
    const logs = [
      {
        date: '2024-06-15',
        templateName: 'Push Day',
        exercises: [
          {
            name: 'Bench Press',
            muscleGroup: 'Chest',
            sets: [
              { weight: 135, reps: 10 },
              { weight: 155, reps: 8 },
            ],
          },
        ],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      Date: '2024-06-15',
      Template: 'Push Day',
      Exercise: 'Bench Press',
      'Muscle Group': 'Chest',
      'Set #': 1,
      'Weight (lbs)': 135,
      Reps: 10,
      Notes: '',
    });
    expect(rows[1]['Set #']).toBe(2);
    expect(rows[1]['Weight (lbs)']).toBe(155);
  });

  test('returns empty array for empty logs', () => {
    expect(exportHistoryRows([])).toEqual([]);
  });

  test('defaults Template to Freestyle when no templateName', () => {
    const logs = [
      {
        date: '2024-06-16',
        exercises: [{ name: 'Curl', sets: [{ weight: 25, reps: 12 }] }],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows).toHaveLength(1);
    expect(rows[0].Template).toBe('Freestyle');
  });

  test('includes notes from log', () => {
    const logs = [
      {
        date: '2024-06-17',
        templateName: 'Leg Day',
        notes: 'Felt strong',
        exercises: [{ name: 'Squat', muscleGroup: 'Legs', sets: [{ weight: 225, reps: 5 }] }],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows[0].Notes).toBe('Felt strong');
  });

  test('handles exercises with no sets', () => {
    const logs = [
      {
        date: '2024-06-18',
        exercises: [{ name: 'Plank' }],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows).toHaveLength(0);
  });

  test('handles multiple exercises per log', () => {
    const logs = [
      {
        date: '2024-06-19',
        templateName: 'Full Body',
        exercises: [
          { name: 'Bench', muscleGroup: 'Chest', sets: [{ weight: 135, reps: 10 }] },
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ weight: 225, reps: 5 }] },
        ],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows).toHaveLength(2);
    expect(rows[0].Exercise).toBe('Bench');
    expect(rows[1].Exercise).toBe('Squat');
  });
});
