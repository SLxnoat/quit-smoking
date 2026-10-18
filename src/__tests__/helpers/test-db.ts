import Database from 'better-sqlite3';
import { type SQLiteDatabase } from 'expo-sqlite';

export function createTestDatabase(): SQLiteDatabase {
  const db = new Database(':memory:');

  const wrapper: Partial<SQLiteDatabase> = {
    execAsync: async (source: string) => {
      db.exec(source);
    },
    runAsync: async (source: string, ...params: unknown[]) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = db.prepare(source);
      const info = stmt.run(...flatParams);
      return {
        lastInsertRowId: Number(info.lastInsertRowid),
        changes: info.changes,
      };
    },
    getFirstAsync: async <T>(source: string, ...params: unknown[]): Promise<T | null> => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = db.prepare(source);
      const row = stmt.get(...flatParams) as T | undefined;
      return row ?? null;
    },
    getAllAsync: async <T>(source: string, ...params: unknown[]): Promise<T[]> => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = db.prepare(source);
      return stmt.all(...flatParams) as T[];
    },
    withTransactionAsync: async (action: () => Promise<void>) => {
      db.exec('BEGIN TRANSACTION;');
      try {
        await action();
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    },
  };

  return wrapper as SQLiteDatabase;
}
