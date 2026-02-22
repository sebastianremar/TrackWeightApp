import { getDB } from './db';

// ─── Weight ───

export async function cacheWeightEntries(entries) {
  const db = await getDB();
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO weight_entries (date, weight, synced) VALUES ($date, $weight, $synced)'
  );
  try {
    for (const e of entries) {
      await stmt.executeAsync({ $date: e.date, $weight: e.weight, $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedWeightEntries(from, to) {
  const db = await getDB();
  let sql = 'SELECT date, weight, synced FROM weight_entries';
  const conditions = [];
  if (from) conditions.push(`date >= '${from}'`);
  if (to) conditions.push(`date <= '${to}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY date ASC';
  return db.getAllAsync(sql);
}

export async function cacheWeightEntry(entry) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO weight_entries (date, weight, synced) VALUES (?, ?, ?)',
    [entry.date, entry.weight, entry.synced ?? 1]
  );
}

export async function cacheDeleteWeight(date) {
  const db = await getDB();
  await db.runAsync('DELETE FROM weight_entries WHERE date = ?', [date]);
}

// ─── Habits ───

export async function cacheHabits(habits) {
  const db = await getDB();
  await db.runAsync('DELETE FROM habits WHERE synced = 1');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO habits (habitId, data, synced) VALUES ($id, $data, $synced)'
  );
  try {
    for (const h of habits) {
      await stmt.executeAsync({ $id: h.habitId, $data: JSON.stringify(h), $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedHabits() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT data, synced FROM habits');
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheHabit(habit, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO habits (habitId, data, synced) VALUES (?, ?, ?)',
    [habit.habitId, JSON.stringify(habit), synced]
  );
}

export async function cacheDeleteHabit(habitId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM habits WHERE habitId = ?', [habitId]);
}

// ─── Habit Entries ───

export async function cacheHabitEntries(entries) {
  const db = await getDB();
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO habit_entries (habitId, date, data, synced) VALUES ($hid, $date, $data, $synced)'
  );
  try {
    for (const e of entries) {
      await stmt.executeAsync({
        $hid: e.habitId,
        $date: e.date,
        $data: JSON.stringify(e),
        $synced: 1,
      });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedHabitEntries(from, to) {
  const db = await getDB();
  let sql = 'SELECT data, synced FROM habit_entries';
  const conditions = [];
  if (from) conditions.push(`date >= '${from}'`);
  if (to) conditions.push(`date <= '${to}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY date ASC';
  const rows = await db.getAllAsync(sql);
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheHabitEntry(entry, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO habit_entries (habitId, date, data, synced) VALUES (?, ?, ?, ?)',
    [entry.habitId, entry.date, JSON.stringify(entry), synced]
  );
}

export async function cacheDeleteHabitEntry(habitId, date) {
  const db = await getDB();
  await db.runAsync('DELETE FROM habit_entries WHERE habitId = ? AND date = ?', [habitId, date]);
}

// ─── Todos ───

export async function cacheTodos(todos) {
  const db = await getDB();
  await db.runAsync('DELETE FROM todos WHERE synced = 1');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO todos (todoId, data, synced) VALUES ($id, $data, $synced)'
  );
  try {
    for (const t of todos) {
      await stmt.executeAsync({ $id: t.todoId, $data: JSON.stringify(t), $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedTodos(completed, category) {
  const db = await getDB();
  let sql = 'SELECT data, synced FROM todos';
  const conditions = [];
  if (completed !== undefined) {
    conditions.push(`json_extract(data, '$.completed') = ${completed ? 1 : 0}`);
  }
  if (category) {
    conditions.push(`json_extract(data, '$.category') = '${category}'`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await db.getAllAsync(sql);
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheTodo(todo, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO todos (todoId, data, synced) VALUES (?, ?, ?)',
    [todo.todoId, JSON.stringify(todo), synced]
  );
}

export async function cacheDeleteTodo(todoId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM todos WHERE todoId = ?', [todoId]);
}

// ─── Calendar Events ───

export async function cacheCalendarEvents(events) {
  const db = await getDB();
  await db.runAsync('DELETE FROM calendar_events WHERE synced = 1');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO calendar_events (eventId, data, synced) VALUES ($id, $data, $synced)'
  );
  try {
    for (const e of events) {
      await stmt.executeAsync({ $id: e.eventId, $data: JSON.stringify(e), $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedCalendarEvents(from, to) {
  const db = await getDB();
  let sql = 'SELECT data, synced FROM calendar_events';
  const conditions = [];
  if (from) conditions.push(`json_extract(data, '$.date') >= '${from}'`);
  if (to) conditions.push(`json_extract(data, '$.date') <= '${to}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await db.getAllAsync(sql);
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheCalendarEvent(event, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO calendar_events (eventId, data, synced) VALUES (?, ?, ?)',
    [event.eventId, JSON.stringify(event), synced]
  );
}

export async function cacheDeleteCalendarEvent(eventId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM calendar_events WHERE eventId = ?', [eventId]);
}

// ─── Exercises ───

export async function cacheExercises(library, custom) {
  const db = await getDB();
  await db.runAsync('DELETE FROM exercises');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO exercises (id, data, source) VALUES ($id, $data, $source)'
  );
  try {
    for (const e of library) {
      await stmt.executeAsync({ $id: e.id, $data: JSON.stringify(e), $source: 'library' });
    }
    for (const e of custom) {
      await stmt.executeAsync({ $id: e.id, $data: JSON.stringify(e), $source: 'custom' });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedExercises() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT data, source FROM exercises');
  const library = [];
  const custom = [];
  for (const r of rows) {
    const parsed = JSON.parse(r.data);
    if (r.source === 'custom') custom.push(parsed);
    else library.push(parsed);
  }
  return { library, custom };
}

export async function cacheExercise(exercise, source = 'custom') {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO exercises (id, data, source) VALUES (?, ?, ?)',
    [exercise.id, JSON.stringify(exercise), source]
  );
}

export async function cacheDeleteExercise(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

// ─── Templates ───

export async function cacheTemplates(templates) {
  const db = await getDB();
  await db.runAsync('DELETE FROM templates WHERE synced = 1');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO templates (routineId, data, synced) VALUES ($id, $data, $synced)'
  );
  try {
    for (const t of templates) {
      await stmt.executeAsync({ $id: t.routineId, $data: JSON.stringify(t), $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedTemplates() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT data, synced FROM templates');
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheTemplate(template, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO templates (routineId, data, synced) VALUES (?, ?, ?)',
    [template.routineId, JSON.stringify(template), synced]
  );
}

export async function cacheDeleteTemplate(routineId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM templates WHERE routineId = ?', [routineId]);
}

// ─── Workout Logs ───

export async function cacheWorkoutLogs(logs) {
  const db = await getDB();
  await db.runAsync('DELETE FROM workout_logs WHERE synced = 1');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO workout_logs (logId, data, synced) VALUES ($id, $data, $synced)'
  );
  try {
    for (const l of logs) {
      await stmt.executeAsync({ $id: l.logId, $data: JSON.stringify(l), $synced: 1 });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedWorkoutLogs(from, to) {
  const db = await getDB();
  let sql = 'SELECT data, synced FROM workout_logs';
  const conditions = [];
  if (from) conditions.push(`json_extract(data, '$.date') >= '${from}'`);
  if (to) conditions.push(`json_extract(data, '$.date') <= '${to}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += " ORDER BY json_extract(data, '$.date') DESC";
  const rows = await db.getAllAsync(sql);
  return rows.map((r) => ({ ...JSON.parse(r.data), _synced: r.synced }));
}

export async function cacheWorkoutLog(log, synced = 1) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO workout_logs (logId, data, synced) VALUES (?, ?, ?)',
    [log.logId, JSON.stringify(log), synced]
  );
}

export async function cacheDeleteWorkoutLog(logId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM workout_logs WHERE logId = ?', [logId]);
}

// ─── Friends (read-only cache) ───

export async function cacheFriends(friends) {
  const db = await getDB();
  await db.runAsync('DELETE FROM friends');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO friends (email, data) VALUES ($email, $data)'
  );
  try {
    for (const f of friends) {
      await stmt.executeAsync({ $email: f.email, $data: JSON.stringify(f) });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedFriends() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT data FROM friends');
  return rows.map((r) => JSON.parse(r.data));
}

export async function cacheFriendRequests(requests) {
  const db = await getDB();
  await db.runAsync('DELETE FROM friend_requests');
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO friend_requests (email, data) VALUES ($email, $data)'
  );
  try {
    for (const r of requests) {
      await stmt.executeAsync({ $email: r.email, $data: JSON.stringify(r) });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getCachedFriendRequests() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT data FROM friend_requests');
  return rows.map((r) => JSON.parse(r.data));
}
