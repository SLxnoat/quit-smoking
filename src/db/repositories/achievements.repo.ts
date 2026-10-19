import { type SQLiteDatabase } from 'expo-sqlite';

export interface UnlockedAchievement {
  key: string;
  unlocked_at: number;
}

export async function getUnlockedAchievements(
  db: SQLiteDatabase
): Promise<UnlockedAchievement[]> {
  return await db.getAllAsync<UnlockedAchievement>(
    'SELECT key, unlocked_at FROM achievements ORDER BY unlocked_at ASC;'
  );
}

export async function getUnlockedKeys(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ key: string }>(
    'SELECT key FROM achievements;'
  );
  return new Set(rows.map((r) => r.key));
}

export async function isAchievementUnlocked(
  db: SQLiteDatabase,
  key: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ key: string }>(
    'SELECT key FROM achievements WHERE key = ? LIMIT 1;',
    key
  );
  return row !== null;
}

/**
 * Idempotently unlocks an achievement.
 * Returns true if the achievement was newly unlocked, or false if already unlocked.
 */
export async function unlockAchievement(
  db: SQLiteDatabase,
  key: string,
  unlockedAt: number = Date.now()
): Promise<boolean> {
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO achievements (key, unlocked_at) VALUES (?, ?);',
    key,
    unlockedAt
  );
  return result.changes > 0;
}

/**
 * Idempotently unlocks multiple achievements in batch.
 * Returns array of keys that were newly unlocked during this call.
 */
export async function unlockManyAchievements(
  db: SQLiteDatabase,
  keys: string[],
  unlockedAt: number = Date.now()
): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  for (const key of keys) {
    const isNew = await unlockAchievement(db, key, unlockedAt);
    if (isNew) {
      newlyUnlocked.push(key);
    }
  }

  return newlyUnlocked;
}

export async function resetAchievements(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM achievements;');
}
