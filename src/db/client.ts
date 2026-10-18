import { type SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'ember.db';

export async function configurePragmas(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}
