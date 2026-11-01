import { type SQLiteDatabase } from 'expo-sqlite';

export interface ThoughtRecord {
  id: number;
  created_at: number;
  situation: string | null;
  thought: string | null;
  emotion: string | null;
  reframe: string | null;
  belief_before: number | null; // 0-100 percentage
  belief_after: number | null; // 0-100 percentage
}

export interface CreateThoughtRecordInput {
  situation: string;
  thought: string;
  emotion: string;
  reframe: string;
  belief_before?: number | null;
  belief_after?: number | null;
  created_at?: number;
}

export interface UpdateThoughtRecordInput {
  situation?: string;
  thought?: string;
  emotion?: string;
  reframe?: string;
  belief_before?: number | null;
  belief_after?: number | null;
}

export async function createThoughtRecord(
  db: SQLiteDatabase,
  input: CreateThoughtRecordInput
): Promise<ThoughtRecord> {
  const createdAt = input.created_at ?? Date.now();
  const situation = input.situation.trim();
  const thought = input.thought.trim();
  const emotion = input.emotion.trim();
  const reframe = input.reframe.trim();
  const beliefBefore = input.belief_before ?? null;
  const beliefAfter = input.belief_after ?? null;

  const result = await db.runAsync(
    `INSERT INTO thought_records (
      created_at, situation, thought, emotion, reframe, belief_before, belief_after
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    createdAt,
    situation,
    thought,
    emotion,
    reframe,
    beliefBefore,
    beliefAfter
  );

  return {
    id: result.lastInsertRowId,
    created_at: createdAt,
    situation,
    thought,
    emotion,
    reframe,
    belief_before: beliefBefore,
    belief_after: beliefAfter,
  };
}

export async function getThoughtRecords(
  db: SQLiteDatabase,
  limit: number = 100
): Promise<ThoughtRecord[]> {
  return await db.getAllAsync<ThoughtRecord>(
    'SELECT * FROM thought_records ORDER BY created_at DESC LIMIT ?;',
    limit
  );
}

export async function getThoughtRecordById(
  db: SQLiteDatabase,
  id: number
): Promise<ThoughtRecord | null> {
  const row = await db.getFirstAsync<ThoughtRecord>(
    'SELECT * FROM thought_records WHERE id = ? LIMIT 1;',
    id
  );
  return row ?? null;
}

export async function updateThoughtRecord(
  db: SQLiteDatabase,
  id: number,
  input: UpdateThoughtRecordInput
): Promise<ThoughtRecord | null> {
  const existing = await getThoughtRecordById(db, id);
  if (!existing) return null;

  const situation = input.situation !== undefined ? input.situation.trim() : existing.situation;
  const thought = input.thought !== undefined ? input.thought.trim() : existing.thought;
  const emotion = input.emotion !== undefined ? input.emotion.trim() : existing.emotion;
  const reframe = input.reframe !== undefined ? input.reframe.trim() : existing.reframe;
  const beliefBefore = input.belief_before !== undefined ? input.belief_before : existing.belief_before;
  const beliefAfter = input.belief_after !== undefined ? input.belief_after : existing.belief_after;

  await db.runAsync(
    `UPDATE thought_records SET
       situation = ?,
       thought = ?,
       emotion = ?,
       reframe = ?,
       belief_before = ?,
       belief_after = ?
     WHERE id = ?;`,
    situation,
    thought,
    emotion,
    reframe,
    beliefBefore,
    beliefAfter,
    id
  );

  return await getThoughtRecordById(db, id);
}

export async function deleteThoughtRecord(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM thought_records WHERE id = ?;', id);
}

export async function getThoughtRecordsCount(
  db: SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM thought_records;'
  );
  return row?.count ?? 0;
}
