import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getUnlockedAchievements,
  getUnlockedKeys,
  unlockManyAchievements,
  type UnlockedAchievement,
} from '../db/repositories/achievements.repo';
import {
  evaluateAchievements,
  type AchievementDefinition,
} from '../domain/milestones';

export interface UseAchievementsResult {
  unlockedKeys: Set<string>;
  unlockedList: UnlockedAchievement[];
  latestCelebration: AchievementDefinition | null;
  dismissCelebration: () => void;
  evaluateAndUnlock: (params: {
    elapsedSeconds: number;
    cravingsResisted?: number;
    moneySaved?: number;
  }) => Promise<AchievementDefinition[]>;
  refresh: () => Promise<void>;
  loading: boolean;
}

export function useAchievements(): UseAchievementsResult {
  const db = useSQLiteContext();
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [unlockedList, setUnlockedList] = useState<UnlockedAchievement[]>([]);
  const [latestCelebration, setLatestCelebration] =
    useState<AchievementDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const [keys, list] = await Promise.all([
        getUnlockedKeys(db),
        getUnlockedAchievements(db),
      ]);
      setUnlockedKeys(keys);
      setUnlockedList(list);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dismissCelebration = useCallback(() => {
    setLatestCelebration(null);
  }, []);

  const evaluateAndUnlock = useCallback(
    async ({
      elapsedSeconds,
      cravingsResisted = 0,
      moneySaved = 0,
    }: {
      elapsedSeconds: number;
      cravingsResisted?: number;
      moneySaved?: number;
    }): Promise<AchievementDefinition[]> => {
      // 1. Get current unlocked keys
      const currentKeys = await getUnlockedKeys(db);

      // 2. Evaluate with domain logic
      const candidates = evaluateAchievements({
        elapsedSeconds,
        cravingsResisted,
        moneySaved,
        alreadyUnlockedKeys: currentKeys,
      });

      if (candidates.length === 0) {
        return [];
      }

      // 3. Persist idempotently
      const newlyUnlockedKeys = await unlockManyAchievements(
        db,
        candidates.map((c) => c.key)
      );

      if (newlyUnlockedKeys.length > 0) {
        await refresh();

        const newlyUnlockedDefs = candidates.filter((c) =>
          newlyUnlockedKeys.includes(c.key)
        );

        // Queue first celebration
        if (newlyUnlockedDefs.length > 0) {
          setLatestCelebration(newlyUnlockedDefs[0]);
        }

        return newlyUnlockedDefs;
      }

      return [];
    },
    [db, refresh]
  );

  return {
    unlockedKeys,
    unlockedList,
    latestCelebration,
    dismissCelebration,
    evaluateAndUnlock,
    refresh,
    loading,
  };
}
