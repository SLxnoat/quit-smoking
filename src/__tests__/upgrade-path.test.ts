import { createTestDatabase } from './helpers/test-db';
import { migrateDb, SCHEMA_V1 } from '../db/migrations';
import { saveProfile, getProfile } from '../db/repositories/profile.repo';
import { addReason, getReasons } from '../db/repositories/reasons.repo';
import { createCravingLog } from '../db/repositories/craving.repo';
import { upsertCheckin, getCheckinByDay } from '../db/repositories/checkins.repo';
import { completeLesson, isLessonCompleted } from '../db/repositories/content.repo';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('NFR-REL-2: App Upgrade Path & Migration Data Retention', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('preserves all user data, profiles, cravings, and journal records across app updates', async () => {
    // 1. Simulate an older app release (Schema v1 installed)
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1;');

    // 2. Populate user records under old version
    const originalQuitAt = 1700000000000;
    await saveProfile(db, {
      quit_at: originalQuitAt,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 15.0,
      currency: 'GBP',
      approach: 'cold_turkey',
      years_smoked: 12,
      confidence: 9,
    });

    await addReason(db, 'Save for a new home');
    await addReason(db, 'Run a marathon');

    await createCravingLog(db, {
      started_at: 1700005000000,
      duration_sec: 180,
      intensity_before: 8,
      intensity_after: 3,
      outcome: 'resisted',
      tool_used: 'Box Breathing',
      note: 'Deep breaths kept me calm.',
    });

    await db.runAsync(
      `INSERT INTO slips (occurred_at, cigarettes, reflection, reset_streak)
       VALUES (?, ?, ?, ?);`,
      1700010000000,
      1,
      'Fell into old habit at party',
      1
    );

    await upsertCheckin(db, {
      day: '2026-11-01',
      mood: 7,
      stress: 4,
      confidence: 8,
      sleep_quality: 6,
      note: 'Solid day 1.',
    });

    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?);`,
      'onboarding_completed',
      'true'
    );

    // 3. Simulate App Update: Run migrateDb() on existing user database
    await migrateDb(db);

    // 4. Verify user data was 100% retained with ZERO data loss
    const restoredProfile = await getProfile(db);
    expect(restoredProfile).toBeDefined();
    expect(restoredProfile?.quit_at).toBe(originalQuitAt);
    expect(restoredProfile?.currency).toBe('GBP');
    expect(restoredProfile?.years_smoked).toBe(12);
    expect(restoredProfile?.confidence).toBe(9);

    const reasons = await getReasons(db);
    expect(reasons).toHaveLength(2);
    expect(reasons[0].text).toBe('Save for a new home');
    expect(reasons[1].text).toBe('Run a marathon');

    const cravings = await db.getAllAsync<any>('SELECT * FROM craving_logs;');
    expect(cravings).toHaveLength(1);
    expect(cravings[0].outcome).toBe('resisted');
    expect(cravings[0].tool_used).toBe('Box Breathing');

    const slips = await db.getAllAsync<any>('SELECT * FROM slips;');
    expect(slips).toHaveLength(1);
    expect(slips[0].cigarettes).toBe(1);

    const checkin = await getCheckinByDay(db, '2026-11-01');
    expect(checkin).toBeDefined();
    expect(checkin?.mood).toBe(7);
    expect(checkin?.note).toBe('Solid day 1.');

    // 5. Verify new tables and columns introduced in updates are operational
    await completeLesson(db, 'lesson-day-001');
    const completed = await isLessonCompleted(db, 'lesson-day-001');
    expect(completed).toBe(true);

    // 6. Verify subsequent user modifications succeed without conflict
    const updatedCheckin = await upsertCheckin(db, {
      day: '2026-11-01',
      mood: 9,
      stress: 2,
      confidence: 10,
      sleep_quality: 8,
      note: 'Updated check-in after evening walk.',
    });
    expect(updatedCheckin.mood).toBe(9);
  });
});
