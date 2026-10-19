import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  getSupportContacts,
  addSupportContact,
  deleteSupportContact,
  seedDefaultSupportContacts,
} from '../db/repositories/support-contacts.repo';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Support Contacts Repository', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('seeds default quitlines and crisis contacts if table is empty', async () => {
    await seedDefaultSupportContacts(db);
    const contacts = await getSupportContacts(db);

    expect(contacts.length).toBeGreaterThanOrEqual(3);
    const quitline = contacts.find((c) => c.name.includes('National Quitline'));
    expect(quitline).toBeDefined();
    expect(quitline?.phone).toBe('1-800-784-8669');

    // Calling seed again should be idempotent
    await seedDefaultSupportContacts(db);
    const contactsAgain = await getSupportContacts(db);
    expect(contactsAgain.length).toBe(contacts.length);
  });

  it('adds and deletes personal support contacts', async () => {
    const contact = await addSupportContact(db, 'Dr. Sarah Smith', '+15551234567');
    expect(contact.id).toBeGreaterThan(0);
    expect(contact.name).toBe('Dr. Sarah Smith');
    expect(contact.phone).toBe('+15551234567');

    const contacts = await getSupportContacts(db);
    expect(contacts.some((c) => c.name === 'Dr. Sarah Smith')).toBe(true);

    await deleteSupportContact(db, contact.id);
    const afterDelete = await getSupportContacts(db);
    expect(afterDelete.some((c) => c.name === 'Dr. Sarah Smith')).toBe(false);
  });
});
