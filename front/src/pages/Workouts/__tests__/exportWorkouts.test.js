import { describe, test, expect } from 'vitest';
import { exportScheduleRows, exportHistoryRows } from '../exportWorkouts';

describe('exportScheduleRows', () => {
  test('returns rest day rows for empty days', () => {
    const routine = {
      schedule: {
        '1': {
          label: 'Push Day',
          muscleGroups: ['Chest'],
          exercises: [{ name: 'Bench Press', sets: 4, reps: '8-10', restSec: 90 }],
        },
      },
    };
    const rows = exportScheduleRows(routine);
    expect(rows.length).toBe(7);
    // Sun (0) should be rest
    expect(rows[0].Day).toBe('Sun');
    expect(rows[0].Label).toBe('Rest');
    // Mon (1) should be Push Day
    expect(rows[1].Day).toBe('Mon');
    expect(rows[1].Label).toBe('Push Day');
    expect(rows[1].Exercise).toBe('Bench Press');
    expect(rows[1].Sets).toBe(4);
    expect(rows[1].Reps).toBe('8-10');
  });

  test('returns empty array when no routine', () => {
    expect(exportScheduleRows(null)).toEqual([]);
    expect(exportScheduleRows({})).toEqual([]);
  });

  test('handles multiple exercises per day', () => {
    const routine = {
      schedule: {
        '3': {
          label: 'Full Body',
          exercises: [
            { name: 'Squat', sets: 5, reps: '5' },
            { name: 'Press', sets: 3, reps: '8' },
          ],
        },
      },
    };
    const rows = exportScheduleRows(routine);
    const wedRows = rows.filter((r) => r.Day === 'Wed');
    expect(wedRows).toHaveLength(2);
    expect(wedRows[0].Exercise).toBe('Squat');
    expect(wedRows[1].Exercise).toBe('Press');
  });
});

describe('exportHistoryRows', () => {
  test('flattens logs into one row per set', () => {
    const logs = [
      {
        date: '2024-06-15',
        dayLabel: 'Push Day',
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
      Label: 'Push Day',
      Exercise: 'Bench Press',
      'Muscle Group': 'Chest',
      'Set #': 1,
      'Weight (lbs)': 135,
      Reps: 10,
    });
    expect(rows[1]['Set #']).toBe(2);
    expect(rows[1]['Weight (lbs)']).toBe(155);
  });

  test('returns empty array for empty logs', () => {
    expect(exportHistoryRows([])).toEqual([]);
  });

  test('handles missing dayLabel', () => {
    const logs = [
      {
        date: '2024-06-16',
        exercises: [{ name: 'Curl', sets: [{ weight: 25, reps: 12 }] }],
      },
    ];
    const rows = exportHistoryRows(logs);
    expect(rows).toHaveLength(1);
    expect(rows[0].Label).toBe('');
  });
});
