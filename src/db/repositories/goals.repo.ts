import { type SQLiteDatabase } from 'expo-sqlite';

export interface Goal {
  id: number;
  title: string;
  target_amount: number;
  achieved_at: number | null;
}

export interface CreateGoalInput {
  title: string;
  target_amount: number;
}

export async function getGoals(db: SQLiteDatabase): Promise<Goal[]> {
  return await db.getAllAsync<Goal>(
    'SELECT id, title, target_amount, achieved_at FROM goals ORDER BY target_amount ASC, id ASC;'
  );
}

export async function getGoalById(
  db: SQLiteDatabase,
  id: number
): Promise<Goal | null> {
  return await db.getFirstAsync<Goal>(
    'SELECT id, title, target_amount, achieved_at FROM goals WHERE id = ? LIMIT 1;',
    id
  );
}

export async function createGoal(
  db: SQLiteDatabase,
  input: CreateGoalInput
): Promise<Goal> {
  const title = input.title.trim();
  const targetAmount = Math.max(0.01, input.target_amount);

  const result = await db.runAsync(
    'INSERT INTO goals (title, target_amount, achieved_at) VALUES (?, ?, NULL);',
    title,
    targetAmount
  );

  return {
    id: result.lastInsertRowId,
    title,
    target_amount: targetAmount,
    achieved_at: null,
  };
}

export async function updateGoal(
  db: SQLiteDatabase,
  id: number,
  updates: Partial<Pick<Goal, 'title' | 'target_amount' | 'achieved_at'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title.trim());
  }
  if (updates.target_amount !== undefined) {
    fields.push('target_amount = ?');
    values.push(Math.max(0.01, updates.target_amount));
  }
  if (updates.achieved_at !== undefined) {
    fields.push('achieved_at = ?');
    values.push(updates.achieved_at ?? null);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ?;`,
    ...values
  );
}

export async function deleteGoal(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM goals WHERE id = ?;', id);
}

/**
 * Checks all unachieved goals against current savings.
 * Automatically marks goals where target_amount <= moneySaved as achieved.
 * Returns the array of goals that were newly marked achieved.
 */
export async function checkAndMarkAchievedGoals(
  db: SQLiteDatabase,
  moneySaved: number,
  now: number = Date.now()
): Promise<Goal[]> {
  const unachieved = await db.getAllAsync<Goal>(
    'SELECT id, title, target_amount, achieved_at FROM goals WHERE achieved_at IS NULL AND target_amount <= ? ORDER BY target_amount ASC;',
    moneySaved
  );

  if (unachieved.length === 0) return [];

  const newlyAchieved: Goal[] = [];
  for (const goal of unachieved) {
    await db.runAsync(
      'UPDATE goals SET achieved_at = ? WHERE id = ? AND achieved_at IS NULL;',
      now,
      goal.id
    );
    newlyAchieved.push({ ...goal, achieved_at: now });
  }

  return newlyAchieved;
}
