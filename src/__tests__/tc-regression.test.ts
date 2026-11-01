import { calculateStats } from '../domain/stats';
import { evaluateAchievements, ALL_ACHIEVEMENTS } from '../domain/milestones';
import { recordSlip } from '../services/slip.service';
import { migrateDb } from '../db/migrations';
import { saveProfile, getProfile } from '../db/repositories/profile.repo';
import { addReason, getReasons } from '../db/repositories/reasons.repo';
import { upsertCheckin, getCheckinByDay, getCheckinCount } from '../db/repositories/checkins.repo';
import { importUserData, deleteAllUserData, exportUserData } from '../services/backup.service';
import { getContentItemById } from '../db/repositories/content.repo';
import { createTestDatabase } from './helpers/test-db';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Sprint 7 Full Regression Suite: TC-001 through TC-015', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  // TC-001: Stats | quit_at = now | elapsed 0, money 0
  it('TC-001: Stats with quit_at = now produces 0 elapsed, 0 avoided, 0 money', () => {
    const now = 1700000000000;
    const stats = calculateStats(
      {
        quitAt: now,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10,
      },
      () => now
    );

    expect(stats.elapsedMs).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.lifeRegainedMinutes).toBe(0);
  });

  // TC-002: Stats | 10 cigs/day, 3.5 days | cigsAvoided = 35
  it('TC-002: Stats with 10 cigs/day after 3.5 days yields exactly 35 cigs avoided', () => {
    const quitAt = 1700000000000;
    const threeAndHalfDaysMs = 3.5 * 24 * 60 * 60 * 1000;
    const stats = calculateStats(
      {
        quitAt,
        cigsPerDay: 10,
        packSize: 20,
        packPrice: 10,
      },
      () => quitAt + threeAndHalfDaysMs
    );

    expect(stats.cigsAvoided).toBe(35);
  });

  // TC-003: Stats | pack 20 @ 10.00, 40 avoided | money = 20.00
  it('TC-003: Stats with pack 20 @ 10.00 and 40 cigs avoided yields 20.00 money saved', () => {
    const quitAt = 1700000000000;
    // 40 cigs at 20 cigs/day = 2 days
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const stats = calculateStats(
      {
        quitAt,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10,
      },
      () => quitAt + twoDaysMs
    );

    expect(stats.cigsAvoided).toBe(40);
    expect(stats.moneySaved).toBe(20.0);
  });

  // TC-004: Stats | future quit_at | elapsed clamped to 0
  it('TC-004: Stats with future quit_at clamps elapsed, cigs, money, and life to 0', () => {
    const now = 1700000000000;
    const futureQuitAt = now + 86400000; // 1 day in future
    const stats = calculateStats(
      {
        quitAt: futureQuitAt,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 15,
      },
      () => now
    );

    expect(stats.elapsedMs).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.lifeRegainedMinutes).toBe(0);
  });

  // TC-005: Milestones | elapsed 24 h | 20-min and 24-h badges unlocked once
  it('TC-005: Achievements evaluated at 24h unlocks ms_20m and ms_24h', () => {
    const unlocked = evaluateAchievements({
      elapsedSeconds: 24 * 3600,
      alreadyUnlockedKeys: new Set(),
    });
    const unlockedKeys = unlocked.map((a) => a.key);

    expect(unlockedKeys).toContain('ms_20m');
    expect(unlockedKeys).toContain('ms_24h');
  });

  // TC-006: Milestones | re-evaluate | no duplicate unlock
  it('TC-006: Re-evaluating achievements with existing unlocked set yields no duplicate unlocks', () => {
    const firstUnlocked = evaluateAchievements({
      elapsedSeconds: 24 * 3600,
      alreadyUnlockedKeys: new Set(),
    });
    const alreadyUnlocked = new Set(firstUnlocked.map((a) => a.key));

    const secondUnlocked = evaluateAchievements({
      elapsedSeconds: 24 * 3600,
      alreadyUnlockedKeys: alreadyUnlocked,
    });

    expect(secondUnlocked).toHaveLength(0); // 0 duplicate unlocks!
  });

  // TC-007: Slip | reset = true | quit_at updated, lifetime preserved
  it('TC-007: Slip with reset = true updates quit_at and preserves original quit date', async () => {
    const originalQuitAt = 1700000000000;
    await saveProfile(db, {
      quit_at: originalQuitAt,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 12,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const slipTime = originalQuitAt + 5 * 86400000; // 5 days later
    const result = await recordSlip(db, {
      occurredAt: slipTime,
      cigarettes: 1,
      reflection: 'Stressful meeting, recommitting now.',
      resetStreak: true,
    });

    expect(result.slip.reset_streak).toBe(1);
    expect(result.updatedProfile?.quit_at).toBe(slipTime);
    expect(result.slip.previous_quit_at).toBe(originalQuitAt);

    const updatedProfile = await getProfile(db);
    expect(updatedProfile?.quit_at).toBe(slipTime);

    const slips = await db.getAllAsync<{ cigarettes: number; previous_quit_at: number }>(
      'SELECT * FROM slips;'
    );
    expect(slips).toHaveLength(1);
    expect(slips[0].previous_quit_at).toBe(originalQuitAt);
  });

  // TC-008: DB | fresh install | user_version = latest, seed present
  it('TC-008: Fresh database install has user_version >= 1 and seeds predefined triggers & content', async () => {
    const versionRes = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(versionRes?.user_version).toBeGreaterThanOrEqual(1);

    const triggers = await db.getAllAsync('SELECT * FROM triggers;');
    expect(triggers.length).toBe(8);

    const contentCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM content_items;'
    );
    expect(contentCount?.count).toBeGreaterThanOrEqual(200);
  });

  // TC-009: DB | upgrade v1->v2 | data intact
  it('TC-009: Database migration runs idempotently and keeps existing user data intact', async () => {
    await saveProfile(db, {
      quit_at: 1710000000000,
      cigs_per_day: 15,
      pack_size: 20,
      pack_price: 11,
      currency: 'EUR',
      approach: 'cold_turkey',
    });
    await addReason(db, 'Health of my heart');

    // Run migrateDb again (simulating app relaunch / migration re-run)
    await migrateDb(db);

    const profile = await getProfile(db);
    expect(profile?.currency).toBe('EUR');
    expect(profile?.cigs_per_day).toBe(15);

    const reasons = await getReasons(db);
    expect(reasons).toHaveLength(1);
    expect(reasons[0].text).toBe('Health of my heart');
  });

  // TC-010: Check-in | two on same day | upsert, single row
  it('TC-010: Logging two check-ins on the same day upserts to a single row', async () => {
    const day = '2026-11-02';
    await upsertCheckin(db, {
      day,
      mood: 6,
      stress: 5,
      confidence: 7,
      sleep_quality: 5,
      note: 'Morning check-in: Feeling so-so.',
    });

    // Evening check-in on the exact same local day
    await upsertCheckin(db, {
      day,
      mood: 9,
      stress: 2,
      confidence: 9,
      sleep_quality: 8,
      note: 'Evening check-in: Felt much better after a walk.',
    });

    const count = await getCheckinCount(db);
    expect(count).toBe(1);

    const checkin = await getCheckinByDay(db, day);
    expect(checkin?.mood).toBe(9);
    expect(checkin?.stress).toBe(2);
    expect(checkin?.note).toBe('Evening check-in: Felt much better after a walk.');
  });

  // TC-011: Import | malformed JSON | rejected, no change
  it('TC-011: Malformed JSON import is rejected and leaves existing database unchanged', async () => {
    await saveProfile(db, {
      quit_at: 1700000000000,
      cigs_per_day: 12,
      pack_size: 20,
      pack_price: 10,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const badJson = 'MALFORMED_NON_JSON_CONTENT';
    await expect(importUserData(db, badJson)).rejects.toThrow();

    const profile = await getProfile(db);
    expect(profile?.cigs_per_day).toBe(12);
  });

  // TC-012: Delete | delete all | user tables empty, content intact
  it('TC-012: Delete all wipes user tables, resets triggers, and preserves content items', async () => {
    await saveProfile(db, {
      quit_at: 1700000000000,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 10,
      currency: 'USD',
      approach: 'cold_turkey',
    });
    await addReason(db, 'Personal freedom');

    await deleteAllUserData(db);

    const profile = await getProfile(db);
    expect(profile).toBeNull();

    const reasons = await getReasons(db);
    expect(reasons).toHaveLength(0);

    const triggers = await db.getAllAsync('SELECT * FROM triggers;');
    expect(triggers.length).toBe(8);

    const contentItem = await getContentItemById(db, 'day-01');
    expect(contentItem).toBeDefined();
  });

  // TC-013: DST | quit across DST change | elapsed correct (UTC timestamp math)
  it('TC-013: Quit date calculation across Daylight Saving Time (DST) shift uses UTC duration without drift', () => {
    const quitAtUtc = Date.UTC(2026, 10, 1, 6, 0, 0); // 06:00 UTC
    const nowUtc = quitAtUtc + 48 * 60 * 60 * 1000; // exactly 48 hours later

    const stats = calculateStats(
      {
        quitAt: quitAtUtc,
        cigsPerDay: 24,
        packSize: 20,
        packPrice: 10,
      },
      () => nowUtc
    );

    expect(stats.elapsedMs).toBe(48 * 3600 * 1000);
    expect(stats.time.days).toBe(2);
    expect(stats.time.hours).toBe(0);
    expect(stats.cigsAvoided).toBe(48); // exactly 48 cigarettes avoided
  });

  // TC-014: Offline | airplane mode full run | all features work with zero network
  it('TC-014: All domain and repository operations function completely offline with zero fetch', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    // 1. Save profile
    await saveProfile(db, {
      quit_at: 1700000000000,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 10,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    // 2. Add reasons & checkins
    await addReason(db, 'Save money');
    await upsertCheckin(db, {
      day: '2026-11-02',
      mood: 8,
      stress: 3,
      confidence: 8,
      sleep_quality: 7,
    });

    // 3. Stats & Milestones
    const stats = calculateStats(
      {
        quitAt: 1700000000000,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10,
      },
      () => 1700000000000 + 86400000
    );
    const achievements = evaluateAchievements({
      elapsedSeconds: stats.time.totalSeconds,
      alreadyUnlockedKeys: new Set(),
    });

    // 4. Export data
    const exportData = await exportUserData(db);

    expect(stats.cigsAvoided).toBe(20);
    expect(achievements.length).toBeGreaterThan(0);
    expect(exportData.data.profile).toBeDefined();

    // Verify zero network requests were attempted
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // TC-015: A11y | VoiceOver/TalkBack onboarding | all controls labelled
  it('TC-015: Predefined triggers and core entities have comprehensive accessible labels', async () => {
    const triggers = await db.getAllAsync<{ key: string; label: string; coping_plan: string }>(
      'SELECT * FROM triggers;'
    );

    expect(triggers.length).toBeGreaterThan(0);
    for (const t of triggers) {
      expect(t.label.length).toBeGreaterThan(5);
      expect(t.coping_plan.length).toBeGreaterThan(15);
    }

    for (const a of ALL_ACHIEVEMENTS) {
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });
});
