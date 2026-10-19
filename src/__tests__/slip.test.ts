import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import { saveProfile, getProfile } from '../db/repositories/profile.repo';
import {
  createSlip,
  getSlips,
  getSlipsCount,
  getTotalSlipCigarettes,
  getLifetimeStats,
} from '../db/repositories/slips.repo';
import { recordSlip } from '../services/slip.service';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Slip Flow & Lifetime Stats Preservation (TC-007)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('TC-007: resets current streak but preserves lifetime stats when reset_streak is true', async () => {
    const DAY_MS = 86400000;
    const initialQuit = 1_000_000_000_000;
    const tenDaysLater = initialQuit + 10 * DAY_MS;

    // 1. User starts smoke-free journey
    await saveProfile(db, {
      quit_at: initialQuit,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 15,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    // Verify initial streak before slip
    const beforeSlipStats = await getLifetimeStats(db, initialQuit, tenDaysLater);
    expect(beforeSlipStats.currentStreakDays).toBe(10);
    expect(beforeSlipStats.lifetimeSmokeFreeDays).toBe(10);

    // 2. User logs a slip after 10 days and chooses reset_streak = true
    const result = await recordSlip(
      db,
      {
        occurredAt: tenDaysLater,
        cigarettes: 1,
        triggerId: 1,
        reflection: 'Felt stressed after a work meeting, but I will use box breathing next time.',
        resetStreak: true,
      },
      () => tenDaysLater
    );

    // 3. Verify profile.quit_at updated to slip time
    const updatedProfile = await getProfile(db);
    expect(updatedProfile?.quit_at).toBe(tenDaysLater);

    // 4. Verify Gherkin condition:
    // Then my current streak is 0 days
    // And my lifetime smoke-free days remain 10
    expect(result.lifetimeStats.currentStreakDays).toBe(0);
    expect(result.lifetimeStats.lifetimeSmokeFreeDays).toBe(10);
    expect(result.lifetimeStats.totalSlipsCount).toBe(1);
    expect(result.lifetimeStats.totalSlipCigarettes).toBe(1);

    // 5. Five days after the slip, streak is 5 and lifetime is 15
    const fiveDaysAfterSlip = tenDaysLater + 5 * DAY_MS;
    const futureStats = await getLifetimeStats(db, updatedProfile!.quit_at, fiveDaysAfterSlip);
    expect(futureStats.currentStreakDays).toBe(5);
    expect(futureStats.lifetimeSmokeFreeDays).toBe(15);
  });

  it('preserves current streak when reset_streak is false', async () => {
    const DAY_MS = 86400000;
    const initialQuit = 1_000_000_000_000;
    const sevenDaysLater = initialQuit + 7 * DAY_MS;

    await saveProfile(db, {
      quit_at: initialQuit,
      cigs_per_day: 10,
      pack_size: 20,
      pack_price: 10,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const result = await recordSlip(
      db,
      {
        occurredAt: sevenDaysLater,
        cigarettes: 2,
        triggerId: null,
        reflection: 'Minor bump, keeping momentum.',
        resetStreak: false,
      },
      () => sevenDaysLater
    );

    const profile = await getProfile(db);
    expect(profile?.quit_at).toBe(initialQuit); // Unchanged
    expect(result.lifetimeStats.currentStreakDays).toBe(7);
    expect(result.lifetimeStats.lifetimeSmokeFreeDays).toBe(7);
    expect(result.lifetimeStats.totalSlipCigarettes).toBe(2);
  });

  it('aggregates multiple streak resets accurately in lifetime calculations', async () => {
    const DAY_MS = 86400000;
    const T0 = 100_000_000;
    const T1 = T0 + 5 * DAY_MS; // 5 days smoke-free
    const T2 = T1 + 8 * DAY_MS; // 8 more days smoke-free
    const T3 = T2 + 3 * DAY_MS; // 3 more days smoke-free

    await saveProfile(db, {
      quit_at: T0,
      cigs_per_day: 15,
      pack_size: 20,
      pack_price: 12,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    // Slip 1 at T1 (reset)
    await recordSlip(db, { occurredAt: T1, cigarettes: 1, resetStreak: true }, () => T1);

    // Slip 2 at T2 (reset)
    await recordSlip(db, { occurredAt: T2, cigarettes: 1, resetStreak: true }, () => T2);

    // Check stats at T3
    const finalStats = await getLifetimeStats(db, T2, T3);
    // Period 1: 5 days, Period 2: 8 days, Period 3: 3 days -> 16 days total!
    expect(finalStats.currentStreakDays).toBe(3);
    expect(finalStats.lifetimeSmokeFreeDays).toBe(16);
    expect(finalStats.totalSlipsCount).toBe(2);
  });

  it('supports raw repository insertions and query listings', async () => {
    const slip = await createSlip(db, {
      occurred_at: 5000,
      cigarettes: 3,
      trigger_id: null,
      reflection: 'Social party slip',
      reset_streak: true,
      previous_quit_at: 1000,
    });

    expect(slip.id).toBeGreaterThan(0);
    expect(slip.cigarettes).toBe(3);
    expect(slip.reset_streak).toBe(1);

    const allSlips = await getSlips(db);
    expect(allSlips).toHaveLength(1);
    expect(await getSlipsCount(db)).toBe(1);
    expect(await getTotalSlipCigarettes(db)).toBe(3);
  });
});
