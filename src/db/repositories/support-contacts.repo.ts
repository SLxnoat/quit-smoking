import { type SQLiteDatabase } from 'expo-sqlite';

export interface SupportContact {
  id: number;
  name: string;
  phone: string;
}

export const DEFAULT_SUPPORT_CONTACTS = [
  { name: 'National Quitline (US)', phone: '1-800-784-8669' },
  { name: 'Crisis Text Line', phone: '741741' },
  { name: 'NHS Smokefree (UK)', phone: '03001231044' },
];

export async function getSupportContacts(
  db: SQLiteDatabase
): Promise<SupportContact[]> {
  return await db.getAllAsync<SupportContact>(
    'SELECT * FROM support_contacts ORDER BY id ASC;'
  );
}

export async function addSupportContact(
  db: SQLiteDatabase,
  name: string,
  phone: string
): Promise<SupportContact> {
  const cleanName = name.trim();
  const cleanPhone = phone.trim();

  const result = await db.runAsync(
    'INSERT INTO support_contacts (name, phone) VALUES (?, ?);',
    cleanName,
    cleanPhone
  );

  return {
    id: result.lastInsertRowId,
    name: cleanName,
    phone: cleanPhone,
  };
}

export async function deleteSupportContact(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM support_contacts WHERE id = ?;', id);
}

export async function seedDefaultSupportContacts(
  db: SQLiteDatabase
): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM support_contacts;'
  );

  if ((existing?.count ?? 0) === 0) {
    for (const contact of DEFAULT_SUPPORT_CONTACTS) {
      await db.runAsync(
        'INSERT INTO support_contacts (name, phone) VALUES (?, ?);',
        contact.name,
        contact.phone
      );
    }
  }
}
