import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import { saveProfile } from '../db/repositories/profile.repo';
import { addReason } from '../db/repositories/reasons.repo';
import { createCravingLog } from '../db/repositories/craving.repo';
import { upsertCheckin } from '../db/repositories/checkins.repo';
import { createThoughtRecord } from '../db/repositories/thought-records.repo';
import { getContentItemById } from '../db/repositories/content.repo';
import {
  exportUserData,
  importUserData,
  deleteAllUserData,
} from '../services/backup.service';
import { InvalidBackupError, validateBackupJson } from '../domain/backup';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Backup, Restore & Data Deletion (TC-011, TC-012)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  describe('TC-011: Import with Malformed or Invalid JSON', () => {
    it('rejects unparseable non-JSON strings and leaves DB untouched', async () => {
      // 1. Populate baseline user data
      await saveProfile(db, {
        quit_at: 1700000000000,
        cigs_per_day: 15,
        pack_size: 20,
        pack_price: 12.5,
        currency: 'USD',
        approach: 'cold_turkey',
      });
      await addReason(db, 'Save money for travel');

      const malformedJson = '<<< NOT A VALID JSON OBJECT >>>';

      // 2. Validate throws InvalidBackupError
      expect(() => validateBackupJson(malformedJson)).toThrow(InvalidBackupError);

      await expect(importUserData(db, malformedJson)).rejects.toThrow(InvalidBackupError);

      // 3. Verify database was completely untouched
      const profile = await db.getFirstAsync<{ cigs_per_day: number }>('SELECT * FROM profile WHERE id = 1;');
      expect(profile).toBeDefined();
      expect(profile?.cigs_per_day).toBe(15);

      const reasons = await db.getAllAsync<{ text: string }>('SELECT * FROM reasons;');
      expect(reasons).toHaveLength(1);
      expect(reasons[0].text).toBe('Save money for travel');
    });

    it('rejects JSON missing required version or schema fields without modifying DB', async () => {
      await saveProfile(db, {
        quit_at: 1700000000000,
        cigs_per_day: 20,
        pack_size: 20,
        pack_price: 10,
        currency: 'USD',
        approach: 'cold_turkey',
      });

      const invalidSchemaJson = JSON.stringify({
        version: 999, // unsupported version
        app: 'UnknownApp',
        data: {
          profile: {
            cigs_per_day: -5, // invalid negative number
          },
        },
      });

      await expect(importUserData(db, invalidSchemaJson)).rejects.toThrow(InvalidBackupError);

      // Check DB remains untouched
      const profile = await db.getFirstAsync<{ cigs_per_day: number }>('SELECT * FROM profile WHERE id = 1;');
      expect(profile?.cigs_per_day).toBe(20);
    });

    it('rejects JSON with invalid enum values for craving logs', async () => {
      const corruptCravingJson = JSON.stringify({
        version: 1,
        app: 'Ember',
        appVersion: '1.0.0',
        exportedAt: Date.now(),
        data: {
          profile: null,
          reasons: [],
          triggers: [],
          craving_logs: [
            {
              started_at: Date.now(),
              outcome: 'invalid_outcome_status', // only 'resisted' | 'smoked' | 'abandoned' allowed
            },
          ],
          slips: [],
          checkins: [],
          thought_records: [],
          goals: [],
          achievements: [],
          bookmarks: [],
          lesson_completions: [],
          support_contacts: [],
          settings: [],
        },
      });

      await expect(importUserData(db, corruptCravingJson)).rejects.toThrow(InvalidBackupError);
    });
  });

  describe('TC-012: Delete All User Data Flow', () => {
    it('wipes all user tables, re-seeds default triggers, and preserves content items intact', async () => {
      // 1. Populate user tables
      await saveProfile(db, {
        quit_at: 1700000000000,
        cigs_per_day: 18,
        pack_size: 20,
        pack_price: 14,
        currency: 'USD',
        approach: 'cold_turkey',
      });
      await addReason(db, 'Improve respiratory health');
      await createCravingLog(db, {
        started_at: 1700001000000,
        duration_sec: 180,
        intensity_before: 8,
        intensity_after: 3,
        outcome: 'resisted',
      });
      await upsertCheckin(db, {
        day: '2026-11-01',
        mood: 7,
        stress: 4,
        confidence: 8,
        sleep_quality: 6,
        note: 'Day 1 completed!',
      });
      await createThoughtRecord(db, {
        situation: 'Coffee break',
        thought: 'I cannot survive without one',
        emotion: 'Anxious',
        reframe: 'A craving is only a 3-minute wave',
        belief_before: 80,
        belief_after: 20,
      });

      // Confirm bundled content exists before delete
      const sampleLessonBefore = await getContentItemById(db, 'day-01');
      expect(sampleLessonBefore).toBeDefined();

      const initialContentCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM content_items;'
      );
      expect(initialContentCount?.count).toBeGreaterThan(0);

      // 2. Perform delete all user data
      await deleteAllUserData(db);

      // 3. Verify user tables are empty
      const profile = await db.getFirstAsync('SELECT * FROM profile;');
      expect(profile).toBeNull();

      const reasons = await db.getAllAsync('SELECT * FROM reasons;');
      expect(reasons).toHaveLength(0);

      const cravings = await db.getAllAsync('SELECT * FROM craving_logs;');
      expect(cravings).toHaveLength(0);

      const checkins = await db.getAllAsync('SELECT * FROM checkins;');
      expect(checkins).toHaveLength(0);

      const thoughts = await db.getAllAsync('SELECT * FROM thought_records;');
      expect(thoughts).toHaveLength(0);

      // 4. Verify triggers were reset to defaults
      const triggers = await db.getAllAsync('SELECT * FROM triggers;');
      expect(triggers.length).toBe(8); // 8 predefined triggers

      // 5. Verify content_items are 100% intact (TC-012 requirement)
      const afterContentCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM content_items;'
      );
      expect(afterContentCount?.count).toBe(initialContentCount?.count);

      const sampleLessonAfter = await getContentItemById(db, 'day-01');
      expect(sampleLessonAfter).toBeDefined();
      expect(sampleLessonAfter?.title).toBe(sampleLessonBefore?.title);
    });
  });

  describe('Export -> Delete -> Import Roundtrip', () => {
    it('round-trips all user data accurately', async () => {
      // 1. Seed user data
      const originalQuitAt = 1714000000000;
      await saveProfile(db, {
        quit_at: originalQuitAt,
        cigs_per_day: 25,
        pack_size: 20,
        pack_price: 15.5,
        currency: 'EUR',
        approach: 'gradual',
        years_smoked: 10,
        confidence: 8,
      });

      await addReason(db, 'My children');
      await addReason(db, 'Health and vitality');

      await createCravingLog(db, {
        started_at: 1714005000000,
        duration_sec: 240,
        intensity_before: 9,
        intensity_after: 2,
        outcome: 'resisted',
        tool_used: '4-7-8 Breathing',
        note: 'Breathed through the peak.',
      });

      await upsertCheckin(db, {
        day: '2026-11-02',
        mood: 9,
        stress: 2,
        confidence: 10,
        sleep_quality: 8,
        note: 'Felt calm all day.',
      });

      await createThoughtRecord(db, {
        situation: 'Work deadline',
        thought: 'Smoking relaxes me',
        emotion: 'Tense',
        reframe: 'Smoking spikes heart rate and causes withdrawal anxiety',
        belief_before: 90,
        belief_after: 15,
      });

      // 2. Export user data
      const exported = await exportUserData(db);
      expect(exported.version).toBe(1);
      expect(exported.app).toBe('Ember');
      expect(exported.data.profile?.currency).toBe('EUR');
      expect(exported.data.reasons).toHaveLength(2);
      expect(exported.data.craving_logs).toHaveLength(1);
      expect(exported.data.checkins).toHaveLength(1);
      expect(exported.data.thought_records).toHaveLength(1);

      const serialized = JSON.stringify(exported);

      // 3. Wipe database
      await deleteAllUserData(db);
      const wipedProfile = await db.getFirstAsync('SELECT * FROM profile;');
      expect(wipedProfile).toBeNull();

      // 4. Import from serialized JSON
      await importUserData(db, serialized);

      // 5. Verify all data is faithfully restored
      const restoredProfile = await db.getFirstAsync<any>('SELECT * FROM profile WHERE id = 1;');
      expect(restoredProfile).toBeDefined();
      expect(restoredProfile.quit_at).toBe(originalQuitAt);
      expect(restoredProfile.cigs_per_day).toBe(25);
      expect(restoredProfile.currency).toBe('EUR');
      expect(restoredProfile.confidence).toBe(8);

      const restoredReasons = await db.getAllAsync<{ text: string }>('SELECT * FROM reasons ORDER BY id ASC;');
      expect(restoredReasons).toHaveLength(2);
      expect(restoredReasons[0].text).toBe('My children');
      expect(restoredReasons[1].text).toBe('Health and vitality');

      const restoredCravings = await db.getAllAsync<any>('SELECT * FROM craving_logs;');
      expect(restoredCravings).toHaveLength(1);
      expect(restoredCravings[0].tool_used).toBe('4-7-8 Breathing');
      expect(restoredCravings[0].intensity_before).toBe(9);

      const restoredCheckin = await db.getFirstAsync<any>('SELECT * FROM checkins WHERE day = ?;', ['2026-11-02']);
      expect(restoredCheckin).toBeDefined();
      expect(restoredCheckin.mood).toBe(9);
      expect(restoredCheckin.note).toBe('Felt calm all day.');

      const restoredThoughts = await db.getAllAsync<any>('SELECT * FROM thought_records;');
      expect(restoredThoughts).toHaveLength(1);
      expect(restoredThoughts[0].situation).toBe('Work deadline');
    });
  });
});
