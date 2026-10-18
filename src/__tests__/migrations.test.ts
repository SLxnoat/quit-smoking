import { createTestDatabase } from './helpers/test-db';
import {
  getSchemaVersion,
  migrateDb,
  PREDEFINED_TRIGGERS,
} from '../db/migrations';

describe('Database Migrations', () => {
  it('applies schema v1 and sets user_version to 1 on fresh database', async () => {
    const db = createTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);

    await migrateDb(db);

    expect(await getSchemaVersion(db)).toBe(1);

    // Verify tables exist
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('profile');
    expect(tableNames).toContain('reasons');
    expect(tableNames).toContain('triggers');
    expect(tableNames).toContain('craving_logs');
    expect(tableNames).toContain('slips');
    expect(tableNames).toContain('checkins');
    expect(tableNames).toContain('thought_records');
    expect(tableNames).toContain('goals');
    expect(tableNames).toContain('achievements');
    expect(tableNames).toContain('support_contacts');
    expect(tableNames).toContain('content_items');
    expect(tableNames).toContain('bookmarks');
    expect(tableNames).toContain('settings');
  });

  it('seeds all predefined triggers with coping plans on initial migration', async () => {
    const db = createTestDatabase();
    await migrateDb(db);

    const triggers = await db.getAllAsync<{ key: string; label: string; is_active: number }>(
      'SELECT * FROM triggers ORDER BY id ASC;'
    );

    expect(triggers.length).toBe(PREDEFINED_TRIGGERS.length);
    expect(triggers.every((t) => t.is_active === 1)).toBe(true);

    const keys = triggers.map((t) => t.key);
    expect(keys).toContain('stress');
    expect(keys).toContain('coffee');
    expect(keys).toContain('alcohol');
    expect(keys).toContain('after_meal');
  });

  it('is completely idempotent when run multiple times', async () => {
    const db = createTestDatabase();
    await migrateDb(db);
    expect(await getSchemaVersion(db)).toBe(1);

    // Re-running should not fail or duplicate triggers
    await migrateDb(db);
    expect(await getSchemaVersion(db)).toBe(1);

    const triggers = await db.getAllAsync<{ id: number }>('SELECT id FROM triggers;');
    expect(triggers.length).toBe(PREDEFINED_TRIGGERS.length);
  });
});
