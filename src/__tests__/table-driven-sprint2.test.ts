import { calculateStats } from '../domain/stats';
import { evaluateAchievements } from '../domain/milestones';
import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  getUnlockedAchievements,
  getUnlockedKeys,
  unlockAchievement,
  unlockManyAchievements,
} from '../db/repositories/achievements.repo';
import {
  createGoal,
  getGoals,
  deleteGoal,
  checkAndMarkAchievedGoals,
} from '../db/repositories/goals.repo';
import { type Profile } from '../db/repositories/profile.repo';

describe('Sprint 2 Table-Driven Acceptance Tests (TC-001..006, TC-013)', () => {
  const baseProfile: Profile = {
    id: 1,
    quit_at: 0,
    cigs_per_day: 10,
    pack_size: 20,
    pack_price: 10.0,
    currency: 'USD',
    approach: 'cold_turkey',
    created_at: 0,
  };

  function toStatsInput(p: Profile) {
    return {
      quitAt: p.quit_at,
      cigsPerDay: p.cigs_per_day,
      packSize: p.pack_size,
      packPrice: p.pack_price,
    };
  }

  /**
   * TC-001: Stats when quit_at = now
   * Expected: elapsed 0, money 0, cigsAvoided 0, lifeRegained 0
   */
  it('TC-001: Stats when quit_at = now -> elapsed 0, money 0', () => {
    const fixedNow = 1700000000000;
    const profile: Profile = {
      ...baseProfile,
      quit_at: fixedNow,
    };

    const stats = calculateStats(toStatsInput(profile), () => fixedNow);

    expect(stats.time.totalSeconds).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.lifeRegainedMinutes).toBe(0);
    expect(stats.isFutureQuit).toBe(false);
  });

  /**
   * TC-002: Stats for 10 cigs/day after 3.5 days
   * Expected: cigsAvoided = floor(3.5 * 10) = 35
   */
  it('TC-002: Stats for 10 cigs/day after 3.5 days -> cigsAvoided = 35', () => {
    const quitAt = 1700000000000;
    const threeAndHalfDaysMs = 3.5 * 86400 * 1000; // 302,400,000 ms
    const now = quitAt + threeAndHalfDaysMs;

    const profile: Profile = {
      ...baseProfile,
      quit_at: quitAt,
      cigs_per_day: 10,
    };

    const stats = calculateStats(toStatsInput(profile), () => now);

    expect(stats.cigsAvoided).toBe(35);
  });

  /**
   * TC-003: Stats for pack 20 @ 10.00, 40 avoided
   * Expected: money = (40 / 20) * 10.00 = 20.00
   */
  it('TC-003: Stats for pack 20 @ 10.00, 40 avoided -> money = 20.00', () => {
    const quitAt = 1700000000000;
    // 40 cigarettes avoided at 10/day = 4 days
    const fourDaysMs = 4 * 86400 * 1000;
    const now = quitAt + fourDaysMs;

    const profile: Profile = {
      ...baseProfile,
      quit_at: quitAt,
      cigs_per_day: 10,
      pack_size: 20,
      pack_price: 10.0,
    };

    const stats = calculateStats(toStatsInput(profile), () => now);

    expect(stats.cigsAvoided).toBe(40);
    expect(stats.moneySaved).toBeCloseTo(20.0, 2);
  });

  /**
   * TC-004: Stats for future quit_at
   * Expected: elapsed clamped to 0, isFutureQuit = true, stats = 0
   */
  it('TC-004: Stats for future quit_at -> elapsed clamped to 0', () => {
    const now = 1700000000000;
    const futureQuitAt = now + 2 * 86400 * 1000; // 2 days in the future

    const profile: Profile = {
      ...baseProfile,
      quit_at: futureQuitAt,
    };

    const stats = calculateStats(toStatsInput(profile), () => now);

    expect(stats.isFutureQuit).toBe(true);
    expect(stats.time.totalSeconds).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.lifeRegainedMinutes).toBe(0);
  });

  /**
   * TC-005: Milestones evaluation at 24 h elapsed
   * Expected: 20-min (ms_20m) and 24-h (ms_24h) unlocked exactly once
   */
  it('TC-005: Milestones at 24 h elapsed -> 20-min and 24-h badges unlocked', () => {
    const elapsedSeconds = 24 * 3600; // 86,400 seconds

    const newlyUnlocked = evaluateAchievements({
      elapsedSeconds,
      cravingsResisted: 0,
      moneySaved: 0,
      alreadyUnlockedKeys: new Set(),
    });

    const unlockedKeys = newlyUnlocked.map((a) => a.key);

    expect(unlockedKeys).toContain('ms_20m');
    expect(unlockedKeys).toContain('ms_1h');
    expect(unlockedKeys).toContain('ms_12h');
    expect(unlockedKeys).toContain('ms_24h');
    expect(unlockedKeys).not.toContain('ms_3d'); // 72 hours, not unlocked yet
  });

  /**
   * TC-006: Milestones re-evaluation
   * Expected: no duplicate unlock (empty newlyUnlocked list)
   */
  it('TC-006: Milestones re-evaluate -> no duplicate unlock', () => {
    const elapsedSeconds = 24 * 3600;

    // First evaluation
    const firstRun = evaluateAchievements({
      elapsedSeconds,
      cravingsResisted: 0,
      moneySaved: 0,
      alreadyUnlockedKeys: new Set(),
    });
    const unlockedSet = new Set(firstRun.map((a) => a.key));

    // Re-evaluation with existing unlocked set
    const secondRun = evaluateAchievements({
      elapsedSeconds,
      cravingsResisted: 0,
      moneySaved: 0,
      alreadyUnlockedKeys: unlockedSet,
    });

    expect(secondRun).toHaveLength(0);
  });

  /**
   * TC-013: DST quit across Daylight Saving Time transition
   * Expected: elapsed correct in UTC timestamps regardless of local timezone clock shifts
   */
  it('TC-013: DST transition quit_at -> elapsed correct (UTC epoch arithmetic)', () => {
    // US Daylight Saving Time transition (Spring forward):
    // 2026-03-08 01:59:59 EST -> 2026-03-08 03:00:00 EDT (1 hour jumps locally)
    const quitAtUtc = Date.UTC(2026, 2, 8, 5, 0, 0); // 00:00 EST in UTC
    const nowUtc = Date.UTC(2026, 2, 8, 17, 0, 0); // exactly 12 hours later in UTC

    const profile: Profile = {
      ...baseProfile,
      quit_at: quitAtUtc,
    };

    const stats = calculateStats(toStatsInput(profile), () => nowUtc);

    // Regardless of local DST clock shifts, UTC epoch subtraction yields exactly 12 hours
    expect(stats.time.totalSeconds).toBe(12 * 3600);
    expect(stats.time.hours).toBe(12);
    expect(stats.time.minutes).toBe(0);
    expect(stats.time.seconds).toBe(0);
  });
});

describe('Achievements Repository & Idempotency Integration', () => {
  let db = createTestDatabase();

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('unlocks achievement idempotently', async () => {
    const isNewFirst = await unlockAchievement(db, 'ms_20m', 1000);
    expect(isNewFirst).toBe(true);

    const isNewSecond = await unlockAchievement(db, 'ms_20m', 2000);
    expect(isNewSecond).toBe(false);

    const list = await getUnlockedAchievements(db);
    expect(list).toHaveLength(1);
    expect(list[0].key).toBe('ms_20m');
    expect(list[0].unlocked_at).toBe(1000); // Original unlock timestamp preserved
  });

  it('unlocks many achievements in batch and returns only newly unlocked keys', async () => {
    // Pre-unlock one
    await unlockAchievement(db, 'ms_20m', 1000);

    const batch = ['ms_20m', 'ms_1h', 'ms_12h'];
    const newlyUnlocked = await unlockManyAchievements(db, batch, 2000);

    expect(newlyUnlocked).toEqual(['ms_1h', 'ms_12h']);

    const allKeys = await getUnlockedKeys(db);
    expect(allKeys.size).toBe(3);
    expect(allKeys.has('ms_20m')).toBe(true);
    expect(allKeys.has('ms_1h')).toBe(true);
    expect(allKeys.has('ms_12h')).toBe(true);
  });
});

describe('Goals Repository & Automatic Milestone Trigger Integration', () => {
  let db = createTestDatabase();

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('creates, retrieves, and deletes financial savings goals', async () => {
    const goal = await createGoal(db, {
      title: 'Noise Cancelling Headphones',
      target_amount: 150.0,
    });

    expect(goal.id).toBeGreaterThan(0);
    expect(goal.title).toBe('Noise Cancelling Headphones');
    expect(goal.target_amount).toBe(150.0);
    expect(goal.achieved_at).toBeNull();

    const goals = await getGoals(db);
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe('Noise Cancelling Headphones');

    await deleteGoal(db, goal.id);
    const goalsAfterDelete = await getGoals(db);
    expect(goalsAfterDelete).toHaveLength(0);
  });

  it('automatically marks goals achieved when money saved reaches target amount', async () => {
    await createGoal(db, { title: 'Dinner Out', target_amount: 50.0 });
    await createGoal(db, { title: 'Weekend Spa', target_amount: 200.0 });

    // With $60 saved, only Dinner Out should be achieved
    const achievedNow = 1700000500000;
    const newlyAchieved = await checkAndMarkAchievedGoals(db, 60.0, achievedNow);

    expect(newlyAchieved).toHaveLength(1);
    expect(newlyAchieved[0].title).toBe('Dinner Out');
    expect(newlyAchieved[0].achieved_at).toBe(achievedNow);

    // Calling again with same savings should return no new achievements
    const secondCall = await checkAndMarkAchievedGoals(db, 60.0, achievedNow + 1000);
    expect(secondCall).toHaveLength(0);

    // Increasing savings to $250 should now achieve Weekend Spa
    const spaAchieved = await checkAndMarkAchievedGoals(db, 250.0, achievedNow + 2000);
    expect(spaAchieved).toHaveLength(1);
    expect(spaAchieved[0].title).toBe('Weekend Spa');
  });
});
