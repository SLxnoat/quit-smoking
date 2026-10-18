import {
  evaluateAchievements,
  ALL_ACHIEVEMENTS,
} from '../domain/milestones';
import {
  getHealthRecoveryProgress,
  getNextHealthMilestone,
  HEALTH_RECOVERY_TIMELINE,
} from '../domain/healthTimeline';

describe('Milestones & Health Timeline Domain', () => {
  describe('Milestones Evaluation', () => {
    it('TC-005: unlocks 20-min, 1-hr, 12-hr, and 24-hr badges at exactly 24 hours (86,400s)', () => {
      const elapsedSeconds = 86400; // 24 hours
      const newlyUnlocked = evaluateAchievements({
        elapsedSeconds,
        alreadyUnlockedKeys: [],
      });

      const keys = newlyUnlocked.map((a) => a.key);
      expect(keys).toContain('ms_20m');
      expect(keys).toContain('ms_1h');
      expect(keys).toContain('ms_12h');
      expect(keys).toContain('ms_24h');
      // Should not unlock 3-day or 1-week yet
      expect(keys).not.toContain('ms_3d');
      expect(keys).not.toContain('ms_1w');
    });

    it('TC-006: does not duplicate already unlocked achievements upon re-evaluation', () => {
      const elapsedSeconds = 86400;
      const firstEvaluation = evaluateAchievements({
        elapsedSeconds,
        alreadyUnlockedKeys: [],
      });
      const unlockedKeys = firstEvaluation.map((a) => a.key);
      expect(unlockedKeys.length).toBeGreaterThan(0);

      // Re-evaluate with same elapsed time
      const secondEvaluation = evaluateAchievements({
        elapsedSeconds,
        alreadyUnlockedKeys: unlockedKeys,
      });

      expect(secondEvaluation.length).toBe(0);
    });

    it('unlocks craving milestones when threshold is reached', () => {
      const newlyUnlocked = evaluateAchievements({
        elapsedSeconds: 0,
        cravingsResisted: 10,
        alreadyUnlockedKeys: ['crv_1'],
      });

      const keys = newlyUnlocked.map((a) => a.key);
      expect(keys).not.toContain('crv_1'); // already unlocked
      expect(keys).toContain('crv_5');
      expect(keys).toContain('crv_10');
      expect(keys).not.toContain('crv_25');
    });

    it('unlocks money saved milestones based on saved amount', () => {
      const newlyUnlocked = evaluateAchievements({
        elapsedSeconds: 0,
        moneySaved: 150.0,
        alreadyUnlockedKeys: [],
      });

      const keys = newlyUnlocked.map((a) => a.key);
      expect(keys).toContain('save_25');
      expect(keys).toContain('save_100');
      expect(keys).not.toContain('save_500');
    });

    it('verifies all achievements have valid icons, titles, and thresholds', () => {
      expect(ALL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
      for (const ach of ALL_ACHIEVEMENTS) {
        expect(ach.key).toBeTruthy();
        expect(ach.title).toBeTruthy();
        expect(ach.description).toBeTruthy();
        expect(ach.threshold).toBeGreaterThan(0);
        expect(ach.icon).toBeTruthy();
      }
    });
  });

  describe('Health Recovery Timeline', () => {
    it('calculates completion status and remaining time for each medical milestone', () => {
      // 10 hours smoke-free: 20m and 8h completed, 12h in progress
      const elapsedSeconds = 10 * 3600;
      const progressList = getHealthRecoveryProgress(elapsedSeconds);

      expect(progressList.length).toBe(HEALTH_RECOVERY_TIMELINE.length);

      const m20 = progressList.find((m) => m.id === 'health_20m')!;
      expect(m20.isCompleted).toBe(true);
      expect(m20.progress).toBe(1);
      expect(m20.secondsRemaining).toBe(0);

      const m8h = progressList.find((m) => m.id === 'health_8h')!;
      expect(m8h.isCompleted).toBe(true);
      expect(m8h.progress).toBe(1);

      const m12h = progressList.find((m) => m.id === 'health_12h')!;
      expect(m12h.isCompleted).toBe(false);
      expect(m12h.progress).toBeGreaterThan(0);
      expect(m12h.progress).toBeLessThan(1);
      expect(m12h.secondsRemaining).toBe(2 * 3600); // 12h - 10h = 2h
    });

    it('correctly identifies the next incomplete health milestone', () => {
      // At 10 minutes: next is 20m
      const next1 = getNextHealthMilestone(10 * 60);
      expect(next1?.id).toBe('health_20m');

      // At 30 minutes: 20m is done, next is 8h
      const next2 = getNextHealthMilestone(30 * 60);
      expect(next2?.id).toBe('health_8h');
    });

    it('returns null when all health milestones are completed (> 15 years)', () => {
      const fifteenYearsPlus = 20 * 365 * 86400;
      const next = getNextHealthMilestone(fifteenYearsPlus);
      expect(next).toBeNull();
    });
  });
});
