import * as XLSX from 'xlsx';

export function exportHistoryRows(logs) {
  const rows = [];
  for (const log of logs) {
    for (const ex of log.exercises || []) {
      for (let i = 0; i < (ex.sets || []).length; i++) {
        const s = ex.sets[i];
        rows.push({
          Date: log.date,
          Template: log.templateName || 'Freestyle',
          Exercise: ex.name,
          'Muscle Group': ex.muscleGroup || '',
          'Set #': i + 1,
          'Weight (lbs)': s.weight,
          Reps: s.reps,
          Notes: log.notes || '',
        });
      }
    }
  }
  return rows;
}

export function downloadWorkbook(logs, filename) {
  const wb = XLSX.utils.book_new();

  const historyRows = exportHistoryRows(logs);
  if (historyRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Workout History');
  }

  if (wb.SheetNames.length === 0) return;

  const fname = filename || `workouts-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
}
