import * as XLSX from 'xlsx';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function exportScheduleRows(routine) {
  if (!routine?.schedule) return [];
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const day = routine.schedule[String(i)];
    if (!day) {
      rows.push({ Day: DAY_NAMES[i], Label: 'Rest', 'Muscle Groups': '', Exercise: '', Sets: '', Reps: '', 'Rest (sec)': '' });
      continue;
    }
    const mg = (day.muscleGroups || []).join(', ');
    for (const ex of day.exercises || []) {
      rows.push({
        Day: DAY_NAMES[i],
        Label: day.label,
        'Muscle Groups': mg,
        Exercise: ex.name,
        Sets: ex.sets,
        Reps: ex.reps,
        'Rest (sec)': ex.restSec ?? '',
      });
    }
  }
  return rows;
}

export function exportHistoryRows(logs) {
  const rows = [];
  for (const log of logs) {
    for (const ex of log.exercises || []) {
      for (let i = 0; i < (ex.sets || []).length; i++) {
        const s = ex.sets[i];
        rows.push({
          Date: log.date,
          Label: log.dayLabel || '',
          Exercise: ex.name,
          'Muscle Group': ex.muscleGroup || '',
          'Set #': i + 1,
          'Weight (lbs)': s.weight,
          Reps: s.reps,
        });
      }
    }
  }
  return rows;
}

export function downloadWorkbook(routine, logs, filename) {
  const wb = XLSX.utils.book_new();

  const scheduleRows = exportScheduleRows(routine);
  if (scheduleRows.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(scheduleRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Schedule');
  }

  const historyRows = exportHistoryRows(logs);
  if (historyRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Workout History');
  }

  if (wb.SheetNames.length === 0) return;

  const fname = filename || `workouts-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
}
