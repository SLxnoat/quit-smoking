import { type SQLiteDatabase } from 'expo-sqlite';

export interface Reason {
  id: number;
  text: string;
  sort_order: number;
  created_at: number;
}

export async function getReasons(db: SQLiteDatabase): Promise<Reason[]> {
  return await db.getAllAsync<Reason>(
    'SELECT * FROM reasons ORDER BY sort_order ASC, id ASC;'
  );
}

export async function addReason(
  db: SQLiteDatabase,
  text: string,
  sortOrder: number = 0
): Promise<Reason> {
  const createdAt = Date.now();
  const result = await db.runAsync(
    'INSERT INTO reasons (text, sort_order, created_at) VALUES (?, ?, ?);',
    [text.trim(), sortOrder, createdAt]
  );

  return {
    id: result.lastInsertRowId,
    text: text.trim(),
    sort_order: sortOrder,
    created_at: createdAt,
  };
}

export async function saveReasons(
  db: SQLiteDatabase,
  texts: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM reasons;');
    const now = Date.now();
    for (let i = 0; i < texts.length; i++) {
      const trimmed = texts[i].trim();
      if (trimmed.length > 0) {
        await db.runAsync(
          'INSERT INTO reasons (text, sort_order, created_at) VALUES (?, ?, ?);',
          [trimmed, i, now]
        );
      }
    }
  });
}

export async function deleteReason(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM reasons WHERE id = ?;', [id]);
}
