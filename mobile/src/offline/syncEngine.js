import { api } from '../api/client';
import { getQueue, markInFlight, markFailed, dequeue, getPendingCount } from './mutationQueue';
import { getDB } from './db';

const MAX_RETRIES = 3;
let syncing = false;

export async function processQueue(onCountChange) {
  if (syncing) return;
  syncing = true;

  try {
    const queue = await getQueue();
    if (queue.length === 0) return;

    if (onCountChange) onCountChange(queue.length);

    for (const mutation of queue) {
      if (mutation.retries > MAX_RETRIES) {
        continue;
      }

      await markInFlight(mutation.id);

      try {
        const options = { method: mutation.method };
        if (mutation.body) {
          options.body = mutation.body; // already JSON string
        }

        const result = await api(mutation.endpoint, options);

        // Update cache with server response if applicable
        if (mutation.entity_table && mutation.temp_id) {
          await replaceTempId(mutation, result);
        }

        await dequeue(mutation.id);

        const remaining = await getPendingCount();
        if (onCountChange) onCountChange(remaining);
      } catch (err) {
        if (err.message === 'Session expired') {
          // Stop processing — user needs to re-auth
          await markFailed(mutation.id);
          break;
        }

        // 404 on DELETE means already deleted server-side — just dequeue
        if (mutation.method === 'DELETE' && err.message?.includes('404')) {
          await dequeue(mutation.id);
          continue;
        }

        await markFailed(mutation.id);
      }
    }
  } finally {
    syncing = false;
    const finalCount = await getPendingCount();
    if (onCountChange) onCountChange(finalCount);
  }
}

async function replaceTempId(mutation, result) {
  const db = await getDB();
  const { entity_table, temp_id } = mutation;

  // Map table to its PK column and response field
  const tableConfig = {
    habits: { pk: 'habitId', field: 'habit' },
    todos: { pk: 'todoId', field: 'todo' },
    calendar_events: { pk: 'eventId', field: 'event' },
    templates: { pk: 'routineId', field: 'template' },
    workout_logs: { pk: 'logId', field: 'log' },
    exercises: { pk: 'id', field: 'exercise' },
  };

  const config = tableConfig[entity_table];
  if (!config || !result[config.field]) return;

  const serverEntity = result[config.field];
  const realId = serverEntity[config.pk];

  if (realId && realId !== temp_id) {
    // Delete the temp row and insert the real one
    await db.runAsync(`DELETE FROM ${entity_table} WHERE ${config.pk} = ?`, [temp_id]);
    await db.runAsync(
      `INSERT OR REPLACE INTO ${entity_table} (${config.pk}, data, synced) VALUES (?, ?, 1)`,
      [realId, JSON.stringify(serverEntity)]
    );
  } else {
    // Same ID — just mark as synced with server data
    await db.runAsync(
      `UPDATE ${entity_table} SET data = ?, synced = 1 WHERE ${config.pk} = ?`,
      [JSON.stringify(serverEntity), temp_id]
    );
  }
}

export function isOfflineError(err) {
  if (!err) return false;
  const msg = err.message || '';
  return (
    msg === 'Network request failed' ||
    msg === 'Request timed out' ||
    msg.includes('network') ||
    msg.includes('Failed to fetch') ||
    err.name === 'AbortError'
  );
}

export function generateTempId() {
  return 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}
