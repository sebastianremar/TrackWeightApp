import { getDB } from './db';

export async function enqueue(method, endpoint, body, entityTable, entityKey, tempId) {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO pending_mutations (method, endpoint, body, temp_id, entity_table, entity_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [method, endpoint, body ? JSON.stringify(body) : null, tempId || null, entityTable || null, entityKey || null]
  );
}

export async function dequeue(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM pending_mutations WHERE id = ?', [id]);
}

export async function getQueue() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT * FROM pending_mutations WHERE status IN ('pending', 'failed') ORDER BY id ASC"
  );
}

export async function markInFlight(id) {
  const db = await getDB();
  await db.runAsync("UPDATE pending_mutations SET status = 'in_flight' WHERE id = ?", [id]);
}

export async function markFailed(id) {
  const db = await getDB();
  await db.runAsync(
    "UPDATE pending_mutations SET status = 'failed', retries = retries + 1 WHERE id = ?",
    [id]
  );
}

export async function markPending(id) {
  const db = await getDB();
  await db.runAsync("UPDATE pending_mutations SET status = 'pending' WHERE id = ?", [id]);
}

export async function getPendingCount() {
  const db = await getDB();
  const row = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM pending_mutations WHERE status IN ('pending', 'failed', 'in_flight')"
  );
  return row?.count || 0;
}

export async function getFailedMutations() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT * FROM pending_mutations WHERE status = 'failed' AND retries > 3 ORDER BY id ASC"
  );
}

export async function clearFailed() {
  const db = await getDB();
  await db.runAsync("DELETE FROM pending_mutations WHERE status = 'failed' AND retries > 3");
}
