import { type SQLiteDatabase } from 'expo-sqlite';

export interface Slip {
  id: number;
  occurred_at: number;
  cigarettes: number;
  trigger_id: number | null;
  reflection: string | null;
  reset_streak: number; // 1 or 0
  previous_quit_at: number | null;
}

export interface CreateSlipInput {
  occurred_at?: number;
  cigarettes?: number;
  trigger_id?: number | null;
  reflection?: string | null;
  reset_streak?: boolean | number;
  previous_quit_at?: number | null;
}

export interface LifetimeStats {
  lifetimeSmokeFreeMs: number;
  lifetimeSmokeFreeDays: number;
  currentStreakMs: number;
  currentStreakDays: number;
  totalSlipsCount: number;
  totalSlipCigarettes: number;
}

export async function createSlip(
  db: SQLiteDatabase,
  input: CreateSlipInput
): Promise<Slip> {
  const occurredAt = input.occurred_at ?? Date.now();
  const cigarettes = Math.max(1, input.cigarettes ?? 1);
  const resetStreak =
    input.reset_streak === true || input.reset_streak === 1 ? 1 : 0;
  const triggerId = input.trigger_id ?? null;
  const reflection = input.reflection?.trim() || null;
  const previousQuitAt = input.previous_quit_at ?? null;

  const result = await db.runAsync(
    `INSERT INTO slips (
      occurred_at, cigarettes, trigger_id, reflection, reset_streak, previous_quit_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    occurredAt,
    cigarettes,
    triggerId,
    reflection,
    resetStreak,
    previousQuitAt
  );

  return {
    id: result.lastInsertRowId,
    occurred_at: occurredAt,
    cigarettes,
    trigger_id: triggerId,
    reflection,
    reset_streak: resetStreak,
    previous_quit_at: previousQuitAt,
  };
}

export async function getSlips(db: SQLiteDatabase): Promise<Slip[]> {
  return await db.getAllAsync<Slip>(
    'SELECT * FROM slips ORDER BY occurred_at DESC;'
  );
}

export async function getSlipsCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM slips;'
  );
  return row?.count ?? 0;
}

export async function getTotalSlipCigarettes(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(cigarettes) as total FROM slips;'
  );
  return row?.total ?? 0;
}

export async function getRecentSlips(
  db: SQLiteDatabase,
  limit: number = 5
): Promise<Slip[]> {
  return await db.getAllAsync<Slip>(
    'SELECT * FROM slips ORDER BY occurred_at DESC LIMIT ?;',
    limit
  );
}

/**
 * Calculates accurate lifetime smoke-free duration and streak information.
 * When a slip resets the current streak, previous smoke-free periods are preserved.
 */
export async function getLifetimeStats(
  db: SQLiteDatabase,
  currentQuitAt: number,
  now: number = Date.now()
): Promise<LifetimeStats> {
  // Current streak
  const currentStreakMs = Math.max(0, now - currentQuitAt);
  const currentStreakDays = Math.floor(currentStreakMs / 86400000);

  // Retrieve all slips that resulted in streak resets
  const resetSlips = await db.getAllAsync<{
    occurred_at: number;
    previous_quit_at: number | null;
  }>(
    'SELECT occurred_at, previous_quit_at FROM slips WHERE reset_streak = 1 AND previous_quit_at IS NOT NULL;'
  );

  let pastStreakMs = 0;
  for (const slip of resetSlips) {
    if (slip.previous_quit_at !== null && slip.occurred_at > slip.previous_quit_at) {
      pastStreakMs += slip.occurred_at - slip.previous_quit_at;
    }
  }

  const lifetimeSmokeFreeMs = pastStreakMs + currentStreakMs;
  const lifetimeSmokeFreeDays = Math.floor(lifetimeSmokeFreeMs / 86400000);

  const totalSlipsCount = await getSlipsCount(db);
  const totalSlipCigarettes = await getTotalSlipCigarettes(db);

  return {
    lifetimeSmokeFreeMs,
    lifetimeSmokeFreeDays,
    currentStreakMs,
    currentStreakDays,
    totalSlipsCount,
    totalSlipCigarettes,
  };
}
