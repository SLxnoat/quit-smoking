import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  upsertCheckin,
  getCheckinByDay,
  getTodayCheckin,
  getAllCheckins,
  deleteCheckin,
  getCheckinCount,
  getLocalDayString,
} from '../db/repositories/checkins.repo';
import {
  createThoughtRecord,
  getThoughtRecords,
  getThoughtRecordById,
  updateThoughtRecord,
  deleteThoughtRecord,
  getThoughtRecordsCount,
} from '../db/repositories/thought-records.repo';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Journal Repositories (Check-ins & Thought Records)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  describe('Check-in Repository & TC-010', () => {
    it('creates a new check-in for a given day', async () => {
      const today = getLocalDayString();
      const checkin = await upsertCheckin(db, {
        day: today,
        mood: 8,
        stress: 3,
        confidence: 9,
        sleep_quality: 7,
        note: 'Feeling strong and confident today.',
      });

      expect(checkin.id).toBeGreaterThan(0);
      expect(checkin.day).toBe(today);
      expect(checkin.mood).toBe(8);
      expect(checkin.stress).toBe(3);
      expect(checkin.confidence).toBe(9);
      expect(checkin.sleep_quality).toBe(7);
      expect(checkin.note).toBe('Feeling strong and confident today.');

      const count = await getCheckinCount(db);
      expect(count).toBe(1);
    });

    it('TC-010: upserts single row when two check-ins occur on the same day', async () => {
      const day = '2026-11-01';

      // First check-in of the day (morning)
      const morningCheckin = await upsertCheckin(db, {
        day,
        mood: 5,
        stress: 7,
        confidence: 6,
        sleep_quality: 5,
        note: 'Rough morning craving.',
        created_at: 1000,
      });

      expect(morningCheckin.mood).toBe(5);
      expect(await getCheckinCount(db)).toBe(1);

      // Second check-in of the same day (evening update)
      const eveningCheckin = await upsertCheckin(db, {
        day,
        mood: 8,
        stress: 2,
        confidence: 9,
        sleep_quality: 5,
        note: 'Day improved significantly after exercise!',
        created_at: 5000,
      });

      // Assert TC-010 specification: exactly 1 row exists
      const totalCount = await getCheckinCount(db);
      expect(totalCount).toBe(1);

      // Verify the record was updated with evening values
      expect(eveningCheckin.id).toBe(morningCheckin.id);
      expect(eveningCheckin.mood).toBe(8);
      expect(eveningCheckin.stress).toBe(2);
      expect(eveningCheckin.confidence).toBe(9);
      expect(eveningCheckin.note).toBe('Day improved significantly after exercise!');

      const fetched = await getCheckinByDay(db, day);
      expect(fetched?.mood).toBe(8);
      expect(fetched?.note).toBe('Day improved significantly after exercise!');
    });

    it('retrieves today check-in correctly', async () => {
      const today = getLocalDayString();
      expect(await getTodayCheckin(db)).toBeNull();

      await upsertCheckin(db, {
        day: today,
        mood: 9,
        stress: 1,
        confidence: 10,
        sleep_quality: 9,
      });

      const todayCheckin = await getTodayCheckin(db);
      expect(todayCheckin).not.toBeNull();
      expect(todayCheckin?.day).toBe(today);
      expect(todayCheckin?.mood).toBe(9);
    });

    it('lists check-ins sorted by date descending and supports deletion', async () => {
      await upsertCheckin(db, { day: '2026-11-01', mood: 6 });
      await upsertCheckin(db, { day: '2026-11-03', mood: 8 });
      await upsertCheckin(db, { day: '2026-11-02', mood: 7 });

      const all = await getAllCheckins(db);
      expect(all).toHaveLength(3);
      expect(all[0].day).toBe('2026-11-03');
      expect(all[1].day).toBe('2026-11-02');
      expect(all[2].day).toBe('2026-11-01');

      // Delete the middle check-in
      await deleteCheckin(db, all[1].id);
      expect(await getCheckinCount(db)).toBe(2);
      expect(await getCheckinByDay(db, '2026-11-02')).toBeNull();
    });
  });

  describe('Thought Record Repository (CBT)', () => {
    it('creates and retrieves thought records', async () => {
      const record = await createThoughtRecord(db, {
        situation: 'Work deadline was moved up by 2 days.',
        thought: 'I cannot handle this stress without a cigarette.',
        emotion: 'Anxious, overwhelmed',
        reframe: 'Smoking creates physical withdrawal without solving the deadline. I can take 5 deep breaths and break down the tasks.',
        belief_before: 85,
        belief_after: 25,
      });

      expect(record.id).toBeGreaterThan(0);
      expect(record.situation).toBe('Work deadline was moved up by 2 days.');
      expect(record.thought).toBe('I cannot handle this stress without a cigarette.');
      expect(record.emotion).toBe('Anxious, overwhelmed');
      expect(record.belief_before).toBe(85);
      expect(record.belief_after).toBe(25);

      const all = await getThoughtRecords(db);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(record.id);
      expect(await getThoughtRecordsCount(db)).toBe(1);
    });

    it('updates an existing thought record', async () => {
      const record = await createThoughtRecord(db, {
        situation: 'Coffee break with colleagues',
        thought: 'I feel left out if I do not smoke',
        emotion: 'Isolated',
        reframe: 'My health is more important than fitting in',
        belief_before: 70,
        belief_after: 40,
      });

      const updated = await updateThoughtRecord(db, record.id, {
        reframe: 'My true friends appreciate that I am quitting for my health. I can enjoy coffee without smoke.',
        belief_after: 15,
      });

      expect(updated).not.toBeNull();
      expect(updated?.reframe).toBe(
        'My true friends appreciate that I am quitting for my health. I can enjoy coffee without smoke.'
      );
      expect(updated?.belief_after).toBe(15);
      expect(updated?.situation).toBe('Coffee break with colleagues');
    });

    it('deletes thought records cleanly', async () => {
      const record = await createThoughtRecord(db, {
        situation: 'Driving in heavy traffic',
        thought: 'I need a puff right now',
        emotion: 'Frustrated',
        reframe: 'Traffic is temporary, smoke damage is lasting.',
        belief_before: 80,
        belief_after: 20,
      });

      expect(await getThoughtRecordsCount(db)).toBe(1);
      await deleteThoughtRecord(db, record.id);
      expect(await getThoughtRecordsCount(db)).toBe(0);
      expect(await getThoughtRecordById(db, record.id)).toBeNull();
    });
  });
});
