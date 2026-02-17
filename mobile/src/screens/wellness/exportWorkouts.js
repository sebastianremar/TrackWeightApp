import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function exportHistoryRows(logs) {
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

export async function shareWorkbook(logs) {
  const wb = XLSX.utils.book_new();

  const historyRows = exportHistoryRows(logs);
  if (historyRows.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(historyRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Workout History');

  const wbOut = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `workouts-${new Date().toISOString().split('T')[0]}.xlsx`;
  const fileUri = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, wbOut, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Workout History',
  });
}
