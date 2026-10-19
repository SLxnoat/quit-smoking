import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getProfile, type Profile } from '../db/repositories/profile.repo';
import { calculateStats, type SmokeFreeStats } from '../domain/stats';
import {
  getHealthRecoveryProgress,
  getNextHealthMilestone,
  type HealthMilestoneProgress,
} from '../domain/healthTimeline';
import { useTicker, type UseTickerOptions } from './use-ticker';

export interface UseStatsOptions extends UseTickerOptions {
  /**
   * Number of slips recorded during this cessation journey. Defaults to 0.
   */
  slipsCount?: number;
}

export interface UseStatsResult {
  profile: Profile | null;
  stats: SmokeFreeStats | null;
  nextMilestone: HealthMilestoneProgress | null;
  milestonesProgress: HealthMilestoneProgress[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  now: number;
}

/**
 * Core stats calculation and profile subscription logic given a SQLiteDatabase handle.
 * Separated from useStats for ease of testing and flexible usage outside SQLiteProvider.
 */
export function useStatsCore(
  db: SQLiteDatabase,
  options: UseStatsOptions = {}
): UseStatsResult {
  const { slipsCount = 0, intervalMs, enabled, clock } = options;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Focus- and AppState-aware live clock
  const now = useTicker({ intervalMs, enabled, clock });

  const refresh = useCallback(async () => {
    try {
      const data = await getProfile(db);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const data = await getProfile(db);
        if (!cancelled) {
          setProfile(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [db]);

  // Reload profile when screen regains focus (e.g. returning from settings or onboarding edits)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Recalculate smoke-free stats on every tick (now) or profile change
  const stats = useMemo<SmokeFreeStats | null>(() => {
    if (!profile) {
      return null;
    }
    return calculateStats(
      {
        quitAt: profile.quit_at,
        cigsPerDay: profile.cigs_per_day,
        packSize: profile.pack_size,
        packPrice: profile.pack_price,
        slipsCount,
      },
      () => now
    );
  }, [profile, now, slipsCount]);

  // Next upcoming recovery milestone
  const nextMilestone = useMemo<HealthMilestoneProgress | null>(() => {
    if (!stats) {
      return null;
    }
    return getNextHealthMilestone(stats.time.totalSeconds);
  }, [stats]);

  // Full health recovery progress list
  const milestonesProgress = useMemo<HealthMilestoneProgress[]>(() => {
    if (!stats) {
      return [];
    }
    return getHealthRecoveryProgress(stats.time.totalSeconds);
  }, [stats]);

  return {
    profile,
    stats,
    nextMilestone,
    milestonesProgress,
    isLoading,
    error,
    refresh,
    now,
  };
}

/**
 * Main application hook for smoke-free statistics and health recovery progress.
 * Automatically obtains the database instance from SQLiteProvider context.
 *
 * @example
 * ```tsx
 * const { stats, nextMilestone, isLoading } = useStats();
 * ```
 */
export function useStats(options: UseStatsOptions = {}): UseStatsResult {
  const db = useSQLiteContext();
  return useStatsCore(db, options);
}
