import * as SQLite from 'expo-sqlite';

let _db = null;

export async function getDB() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('sarapeso.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await createTables(_db);
  return _db;
}

async function createTables(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weight_entries (
      date TEXT PRIMARY KEY,
      weight REAL NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habits (
      habitId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habit_entries (
      habitId TEXT NOT NULL,
      date TEXT NOT NULL,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1,
      PRIMARY KEY (habitId, date)
    );

    CREATE TABLE IF NOT EXISTS todos (
      todoId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      eventId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'library'
    );

    CREATE TABLE IF NOT EXISTS templates (
      routineId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      logId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS friends (
      email TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      email TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_mutations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      body TEXT,
      temp_id TEXT,
      entity_table TEXT,
      entity_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retries INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function clearAllData() {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM weight_entries;
    DELETE FROM habits;
    DELETE FROM habit_entries;
    DELETE FROM todos;
    DELETE FROM calendar_events;
    DELETE FROM exercises;
    DELETE FROM templates;
    DELETE FROM workout_logs;
    DELETE FROM friends;
    DELETE FROM friend_requests;
    DELETE FROM pending_mutations;
    DELETE FROM sync_meta;
  `);
}

export async function cleanupOldData(daysToKeep = 90) {
  const db = await getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  await db.execAsync(`
    DELETE FROM weight_entries WHERE date < '${cutoffStr}' AND synced = 1;
    DELETE FROM habit_entries WHERE date < '${cutoffStr}' AND synced = 1;
    DELETE FROM workout_logs WHERE synced = 1 AND json_extract(data, '$.date') < '${cutoffStr}';
  `);
}
