import { type SQLiteDatabase } from 'expo-sqlite';
import { getProfile, type Profile } from '../db/repositories/profile.repo';
import {
  createSlip,
  getLifetimeStats,
  type LifetimeStats,
  type Slip,
} from '../db/repositories/slips.repo';

export interface RecordSlipInput {
  occurredAt?: number;
  cigarettes?: number;
  triggerId?: number | null;
  reflection?: string | null;
  resetStreak: boolean;
}

export interface RecordSlipResult {
  slip: Slip;
  updatedProfile: Profile | null;
  lifetimeStats: LifetimeStats;
}

/**
 * Reschedule milestone notifications hook (stub for Sprint 5 notification engine).
 * When active, cancels existing notifications and schedules fresh reminders based on the new quit date.
 */
export async function rescheduleMilestoneNotifications(
  _db: SQLiteDatabase,
  _newQuitAt: number
): Promise<void> {
  // Stub for Sprint 5 notification background worker
}

/**
 * Executes the atomic slip transaction:
 * 1. Inserts slip record preserving previous quit date
 * 2. Conditionally updates profile.quit_at if user chooses to reset their streak
 * 3. Commits atomically
 * 4. Reschedules milestone notifications if streak was reset
 * 5. Returns the slip, updated profile, and preserved lifetime stats
 */
export async function recordSlip(
  db: SQLiteDatabase,
  input: RecordSlipInput,
  clock: () => number = Date.now
): Promise<RecordSlipResult> {
  const now = clock();
  const occurredAt = input.occurredAt ?? now;
  const cigarettes = Math.max(1, input.cigarettes ?? 1);
  const resetStreak = input.resetStreak;

  let createdSlip: Slip | null = null;
  let updatedProfile: Profile | null = null;

  await db.withTransactionAsync(async () => {
    const profile = await getProfile(db);
    const previousQuitAt = profile?.quit_at ?? null;

    createdSlip = await createSlip(db, {
      occurred_at: occurredAt,
      cigarettes,
      trigger_id: input.triggerId ?? null,
      reflection: input.reflection ?? null,
      reset_streak: resetStreak,
      previous_quit_at: previousQuitAt,
    });

    if (resetStreak && profile) {
      await db.runAsync('UPDATE profile SET quit_at = ? WHERE id = 1;', [occurredAt]);
      updatedProfile = {
        ...profile,
        quit_at: occurredAt,
      };
    } else {
      updatedProfile = profile;
    }
  });

  if (!createdSlip) {
    throw new Error('Failed to record slip');
  }

  const currentQuitAt = (updatedProfile as Profile | null)?.quit_at ?? occurredAt;
  const lifetimeStats = await getLifetimeStats(db, currentQuitAt, now);

  if (resetStreak && updatedProfile) {
    await rescheduleMilestoneNotifications(db, currentQuitAt);
  }

  return {
    slip: createdSlip,
    updatedProfile,
    lifetimeStats,
  };
}
