import { type SQLiteDatabase } from 'expo-sqlite';

export type CravingOutcome = 'resisted' | 'smoked' | 'abandoned';

export interface CravingLog {
  id: number;
  started_at: number;
  duration_sec: number | null;
  intensity_before: number | null;
  intensity_after: number | null;
  outcome: CravingOutcome;
  trigger_id: number | null;
  tool_used: string | null;
  note: string | null;
}

export interface CreateCravingLogInput {
  started_at: number;
  duration_sec?: number | null;
  intensity_before?: number | null;
  intensity_after?: number | null;
  outcome: CravingOutcome;
  trigger_id?: number | null;
  tool_used?: string | null;
  note?: string | null;
}

export async function createCravingLog(
  db: SQLiteDatabase,
  input: CreateCravingLogInput
): Promise<CravingLog> {
  const result = await db.runAsync(
    `INSERT INTO craving_logs (
      started_at, duration_sec, intensity_before, intensity_after,
      outcome, trigger_id, tool_used, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    input.started_at,
    input.duration_sec ?? null,
    input.intensity_before ?? null,
    input.intensity_after ?? null,
    input.outcome,
    input.trigger_id ?? null,
    input.tool_used ?? null,
    input.note ?? null
  );

  return {
    id: result.lastInsertRowId,
    started_at: input.started_at,
    duration_sec: input.duration_sec ?? null,
    intensity_before: input.intensity_before ?? null,
    intensity_after: input.intensity_after ?? null,
    outcome: input.outcome,
    trigger_id: input.trigger_id ?? null,
    tool_used: input.tool_used ?? null,
    note: input.note ?? null,
  };
}

export async function getCravingLogs(
  db: SQLiteDatabase
): Promise<CravingLog[]> {
  return await db.getAllAsync<CravingLog>(
    'SELECT * FROM craving_logs ORDER BY started_at DESC;'
  );
}

export async function getResistedCravingsCount(
  db: SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM craving_logs WHERE outcome = 'resisted';"
  );
  return row?.count ?? 0;
}

export async function getRecentCravingLogs(
  db: SQLiteDatabase,
  limit: number = 10
): Promise<CravingLog[]> {
  return await db.getAllAsync<CravingLog>(
    'SELECT * FROM craving_logs ORDER BY started_at DESC LIMIT ?;',
    limit
  );
}
