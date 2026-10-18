import { type SQLiteDatabase } from 'expo-sqlite';

export interface Profile {
  id: 1;
  quit_at: number;
  cigs_per_day: number;
  pack_size: number;
  pack_price: number;
  currency: string;
  years_smoked?: number | null;
  approach: 'cold_turkey' | 'gradual';
  confidence?: number | null;
  created_at: number;
}

export type CreateProfileInput = Omit<Profile, 'id' | 'created_at'> & {
  created_at?: number;
};

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const row = await db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1 LIMIT 1;');
  return row ?? null;
}

export async function saveProfile(
  db: SQLiteDatabase,
  input: CreateProfileInput
): Promise<Profile> {
  const createdAt = input.created_at ?? Date.now();
  await db.runAsync(
    `INSERT INTO profile (id, quit_at, cigs_per_day, pack_size, pack_price, currency, years_smoked, approach, confidence, created_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       quit_at = excluded.quit_at,
       cigs_per_day = excluded.cigs_per_day,
       pack_size = excluded.pack_size,
       pack_price = excluded.pack_price,
       currency = excluded.currency,
       years_smoked = excluded.years_smoked,
       approach = excluded.approach,
       confidence = excluded.confidence;`,
    [
      input.quit_at,
      input.cigs_per_day,
      input.pack_size,
      input.pack_price,
      input.currency,
      input.years_smoked ?? null,
      input.approach,
      input.confidence ?? null,
      createdAt,
    ]
  );

  return {
    id: 1,
    ...input,
    created_at: createdAt,
  };
}

export async function updateQuitAt(db: SQLiteDatabase, quitAt: number): Promise<void> {
  await db.runAsync('UPDATE profile SET quit_at = ? WHERE id = 1;', [quitAt]);
}

export async function deleteProfile(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM profile WHERE id = 1;');
}
