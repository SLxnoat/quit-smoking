import { type SQLiteDatabase } from 'expo-sqlite';

export interface Checkin {
  id: number;
  day: string; // YYYY-MM-DD
  mood: number | null; // 1-10
  stress: number | null; // 1-10
  confidence: number | null; // 1-10
  sleep_quality: number | null; // 1-10
  note: string | null;
  created_at: number;
}

export interface UpsertCheckinInput {
  day?: string;
  mood?: number | null;
  stress?: number | null;
  confidence?: number | null;
  sleep_quality?: number | null;
  note?: string | null;
  created_at?: number;
}

/**
 * Returns the current date in local YYYY-MM-DD format.
 */
export function getLocalDayString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Upserts a check-in for a given local day.
 * Ensures exactly one check-in per day (TC-010, FR-CHK-1).
 */
export async function upsertCheckin(
  db: SQLiteDatabase,
  input: UpsertCheckinInput
): Promise<Checkin> {
  const day = input.day ?? getLocalDayString();
  const createdAt = input.created_at ?? Date.now();
  const mood = input.mood !== undefined ? input.mood : null;
  const stress = input.stress !== undefined ? input.stress : null;
  const confidence = input.confidence !== undefined ? input.confidence : null;
  const sleepQuality = input.sleep_quality !== undefined ? input.sleep_quality : null;
  const note = input.note?.trim() || null;

  await db.runAsync(
    `INSERT INTO checkins (day, mood, stress, confidence, sleep_quality, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       mood = excluded.mood,
       stress = excluded.stress,
       confidence = excluded.confidence,
       sleep_quality = excluded.sleep_quality,
       note = excluded.note,
       created_at = excluded.created_at;`,
    day,
    mood,
    stress,
    confidence,
    sleepQuality,
    note,
    createdAt
  );

  const saved = await getCheckinByDay(db, day);
  if (!saved) {
    throw new Error(`Failed to load check-in after upsert for day ${day}`);
  }
  return saved;
}

export async function getCheckinByDay(
  db: SQLiteDatabase,
  day: string
): Promise<Checkin | null> {
  const row = await db.getFirstAsync<Checkin>(
    'SELECT * FROM checkins WHERE day = ? LIMIT 1;',
    day
  );
  return row ?? null;
}

export async function getTodayCheckin(
  db: SQLiteDatabase
): Promise<Checkin | null> {
  return await getCheckinByDay(db, getLocalDayString());
}

export async function getAllCheckins(
  db: SQLiteDatabase,
  limit: number = 100
): Promise<Checkin[]> {
  return await db.getAllAsync<Checkin>(
    'SELECT * FROM checkins ORDER BY day DESC LIMIT ?;',
    limit
  );
}

export async function deleteCheckin(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM checkins WHERE id = ?;', id);
}

export async function getCheckinCount(
  db: SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checkins;'
  );
  return row?.count ?? 0;
}
