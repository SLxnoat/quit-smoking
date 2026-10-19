import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getProfile, type Profile } from '../db/repositories/profile.repo';
import { calculateStats, type SmokeFreeStats } from '../domain/stats';
import {
  getHealthRecoveryProgress,
  getNextHealthMilestone,
  type HealthMilestoneProgress,
} from '../domain/healthTimeline';
import {
  getLifetimeStats,
  getTotalSlipCigarettes,
  type LifetimeStats,
} from '../db/repositories/slips.repo';
import { useTicker, type UseTickerOptions } from './use-ticker';

export interface UseStatsOptions extends UseTickerOptions {
  /**
   * Number of slips recorded during this cessation journey. Defaults to total logged in DB.
   */
  slipsCount?: number;
}

export interface UseStatsResult {
  profile: Profile | null;
  stats: SmokeFreeStats | null;
  lifetimeStats: LifetimeStats | null;
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
  const { slipsCount, intervalMs, enabled, clock } = options;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [dbSlipCigs, setDbSlipCigs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Focus- and AppState-aware live clock
  const now = useTicker({ intervalMs, enabled, clock });
  const nowRef = useRef(now);
  useEffect(() => {
    nowRef.current = now;
  }, [now]);

  const refresh = useCallback(async () => {
    try {
      const [prof, slipCigs] = await Promise.all([
        getProfile(db),
        getTotalSlipCigarettes(db).catch(() => 0),
      ]);
      setProfile(prof);
      setDbSlipCigs(slipCigs);
      if (prof) {
        const life = await getLifetimeStats(db, prof.quit_at, nowRef.current).catch(() => null);
        setLifetimeStats(life);
      } else {
        setLifetimeStats(null);
      }
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
        const [prof, slipCigs] = await Promise.all([
          getProfile(db),
          getTotalSlipCigarettes(db).catch(() => 0),
        ]);
        if (!cancelled) {
          setProfile(prof);
          setDbSlipCigs(slipCigs);
          if (prof) {
            const life = await getLifetimeStats(db, prof.quit_at, nowRef.current).catch(() => null);
            if (!cancelled) setLifetimeStats(life);
          }
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

  // Effective slips count for cigsAvoided calculation
  const effectiveSlips = slipsCount !== undefined ? slipsCount : dbSlipCigs;

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
        slipsCount: effectiveSlips,
      },
      () => now
    );
  }, [profile, now, effectiveSlips]);

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
    lifetimeStats,
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
