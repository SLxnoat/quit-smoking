import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getGoals,
  createGoal,
  deleteGoal,
  checkAndMarkAchievedGoals,
  type Goal,
  type CreateGoalInput,
} from '../db/repositories/goals.repo';

export interface UseGoalsResult {
  goals: Goal[];
  loading: boolean;
  addGoal: (input: CreateGoalInput) => Promise<Goal>;
  removeGoal: (id: number) => Promise<void>;
  checkAchieved: (moneySaved: number) => Promise<Goal[]>;
  refresh: () => Promise<void>;
}

export function useGoals(): UseGoalsResult {
  const db = useSQLiteContext();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getGoals(db);
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGoal = useCallback(
    async (input: CreateGoalInput): Promise<Goal> => {
      const created = await createGoal(db, input);
      await refresh();
      return created;
    },
    [db, refresh]
  );

  const removeGoal = useCallback(
    async (id: number): Promise<void> => {
      await deleteGoal(db, id);
      await refresh();
    },
    [db, refresh]
  );

  const checkAchieved = useCallback(
    async (moneySaved: number): Promise<Goal[]> => {
      const newlyAchieved = await checkAndMarkAchievedGoals(db, moneySaved);
      if (newlyAchieved.length > 0) {
        await refresh();
      }
      return newlyAchieved;
    },
    [db, refresh]
  );

  return {
    goals,
    loading,
    addGoal,
    removeGoal,
    checkAchieved,
    refresh,
  };
}
