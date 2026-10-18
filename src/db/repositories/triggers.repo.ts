import { type SQLiteDatabase } from 'expo-sqlite';

export interface Trigger {
  id: number;
  key: string | null;
  label: string;
  is_custom: number;
  is_active: number;
  coping_plan: string | null;
}

export async function getTriggers(db: SQLiteDatabase): Promise<Trigger[]> {
  return await db.getAllAsync<Trigger>('SELECT * FROM triggers ORDER BY id ASC;');
}

export async function getActiveTriggers(db: SQLiteDatabase): Promise<Trigger[]> {
  return await db.getAllAsync<Trigger>(
    'SELECT * FROM triggers WHERE is_active = 1 ORDER BY id ASC;'
  );
}

export async function setTriggerActive(
  db: SQLiteDatabase,
  id: number,
  isActive: boolean
): Promise<void> {
  await db.runAsync('UPDATE triggers SET is_active = ? WHERE id = ?;', [
    isActive ? 1 : 0,
    id,
  ]);
}

export async function setTriggerActiveByKey(
  db: SQLiteDatabase,
  key: string,
  isActive: boolean
): Promise<void> {
  await db.runAsync('UPDATE triggers SET is_active = ? WHERE key = ?;', [
    isActive ? 1 : 0,
    key,
  ]);
}

export async function updateTriggerPlan(
  db: SQLiteDatabase,
  id: number,
  copingPlan: string
): Promise<void> {
  await db.runAsync('UPDATE triggers SET coping_plan = ? WHERE id = ?;', [
    copingPlan.trim(),
    id,
  ]);
}

export async function addCustomTrigger(
  db: SQLiteDatabase,
  label: string,
  copingPlan?: string
): Promise<Trigger> {
  const result = await db.runAsync(
    `INSERT INTO triggers (key, label, is_custom, is_active, coping_plan)
     VALUES (NULL, ?, 1, 1, ?);`,
    [label.trim(), copingPlan?.trim() ?? null]
  );

  return {
    id: result.lastInsertRowId,
    key: null,
    label: label.trim(),
    is_custom: 1,
    is_active: 1,
    coping_plan: copingPlan?.trim() ?? null,
  };
}
