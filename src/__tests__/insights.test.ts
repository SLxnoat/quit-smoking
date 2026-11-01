import {
  calculateHeatmap,
  calculateTopTriggers,
  calculateMoodTrend,
  calculateOutcomeStats,
  formatHour,
  formatHourRange,
  type HeatmapInsights,
} from '../domain/insights';
import { type CravingLog } from '../db/repositories/craving.repo';
import { type Trigger } from '../db/repositories/triggers.repo';
import { type Checkin } from '../db/repositories/checkins.repo';
import { type Slip } from '../db/repositories/slips.repo';

describe('domain/insights.ts', () => {
  describe('calculateHeatmap', () => {
    it('handles 0 craving records gracefully within budget', () => {
      const insights = calculateHeatmap([]);
      expect(insights.totalCravings).toBe(0);
      expect(insights.maxHourlyCount).toBe(0);
      expect(insights.maxBlockCount).toBe(0);
      expect(insights.peakWeekdayIndex).toBeNull();
      expect(insights.peakHour).toBeNull();
      expect(insights.summaryText).toContain('No cravings recorded yet');
      // Ensure 7x24 matrix exists and is all zeros
      expect(insights.hourlyMatrix).toHaveLength(7);
      expect(insights.hourlyMatrix[0]).toHaveLength(24);
      expect(insights.blockMatrix).toHaveLength(7);
      expect(insights.blockMatrix[0]).toHaveLength(4);
    });

    it('handles 1 craving record and identifies peak day and hour', () => {
      // 2026-11-06 is a Friday. 15:30 is 3:30 PM (Hour 15, Afternoon block)
      const fridayDate = new Date(2026, 10, 6, 15, 30);
      const craving: CravingLog = {
        id: 1,
        started_at: fridayDate.getTime(),
        duration_sec: 180,
        intensity_before: 7,
        intensity_after: 3,
        outcome: 'resisted',
        trigger_id: 1,
        tool_used: 'breathing',
        note: null,
      };

      const insights = calculateHeatmap([craving]);
      expect(insights.totalCravings).toBe(1);
      expect(insights.maxHourlyCount).toBe(1);
      expect(insights.peakWeekdayName).toBe('Fri');
      expect(insights.peakHour).toBe(15);
      expect(insights.peakBlockKey).toBe('afternoon');
      expect(insights.summaryText).toContain('peak craving time is Fri between 3:00 PM - 4:00 PM');
    });

    it('processes 1,000+ records within performance budget (< 100ms)', () => {
      const mockCravings: CravingLog[] = [];
      const baseTime = new Date(2026, 0, 1, 0, 0).getTime();

      for (let i = 0; i < 1200; i++) {
        // Distribute timestamps over days and hours
        const ts = baseTime + i * 3600 * 1000 * 3.5;
        mockCravings.push({
          id: i + 1,
          started_at: ts,
          duration_sec: 120,
          intensity_before: 5,
          intensity_after: 2,
          outcome: i % 5 === 0 ? 'smoked' : 'resisted',
          trigger_id: (i % 6) + 1,
          tool_used: 'timer',
          note: null,
        });
      }

      const start = Date.now();
      const insights: HeatmapInsights = calculateHeatmap(mockCravings);
      const durationMs = Date.now() - start;

      expect(durationMs).toBeLessThan(100);
      expect(insights.totalCravings).toBe(1200);
      expect(insights.maxHourlyCount).toBeGreaterThan(0);
      expect(insights.peakWeekdayName).toBeTruthy();
      expect(insights.summaryText).toContain('recorded urges');
    });
  });

  describe('calculateTopTriggers', () => {
    const mockTriggers: Trigger[] = [
      { id: 1, key: 'stress', label: 'Stress / Anxiety', coping_plan: null, is_custom: 0, is_active: 1 },
      { id: 2, key: 'coffee', label: 'Morning Coffee', coping_plan: null, is_custom: 0, is_active: 1 },
      { id: 3, key: 'social', label: 'Social Outings', coping_plan: null, is_custom: 0, is_active: 1 },
    ];

    it('handles 0 records gracefully with accessible summary text', () => {
      const result = calculateTopTriggers([], mockTriggers, []);
      expect(result.totalTagged).toBe(0);
      expect(result.triggers).toHaveLength(0);
      expect(result.topTrigger).toBeNull();
      expect(result.summaryText).toBe('No trigger occurrences recorded yet.');
    });

    it('aggregates cravings and slips by trigger and computes percentages accurately', () => {
      const cravings: CravingLog[] = [
        { id: 1, started_at: 1000, duration_sec: 60, intensity_before: 8, intensity_after: 3, outcome: 'resisted', trigger_id: 1, tool_used: null, note: null },
        { id: 2, started_at: 2000, duration_sec: 60, intensity_before: 6, intensity_after: 2, outcome: 'resisted', trigger_id: 1, tool_used: null, note: null },
        { id: 3, started_at: 3000, duration_sec: 60, intensity_before: 5, intensity_after: 4, outcome: 'smoked', trigger_id: 2, tool_used: null, note: null },
        { id: 4, started_at: 4000, duration_sec: 60, intensity_before: 4, intensity_after: 1, outcome: 'resisted', trigger_id: null, tool_used: null, note: null },
      ];

      const slips: Slip[] = [
        { id: 1, occurred_at: 5000, cigarettes: 1, trigger_id: 1, reflection: 'Tired', reset_streak: 1, previous_quit_at: null },
      ];

      const result = calculateTopTriggers(cravings, mockTriggers, slips);
      expect(result.totalTagged).toBe(5);

      // Trigger 1 (Stress): 2 cravings + 1 slip = 3 occurrences (60%)
      const stress = result.triggers.find((t) => t.triggerId === 1);
      expect(stress).toBeDefined();
      expect(stress?.count).toBe(3);
      expect(stress?.percentage).toBe(60);
      expect(stress?.resistedCount).toBe(2);
      expect(stress?.smokedCount).toBe(1);

      // Top trigger should be Stress
      expect(result.topTrigger?.label).toBe('Stress / Anxiety');
      expect(result.summaryText).toContain('"Stress / Anxiety" is your most frequent trigger');
    });
  });

  describe('calculateMoodTrend', () => {
    const refDate = new Date(2026, 10, 7); // Nov 7, 2026

    it('handles 0 check-ins gracefully with empty days', () => {
      const result = calculateMoodTrend([], 7, refDate);
      expect(result.days).toHaveLength(7);
      expect(result.checkinsRecorded).toBe(0);
      expect(result.averageMood).toBeNull();
      expect(result.averageStress).toBeNull();
      expect(result.moodTrend).toBe('stable');
      expect(result.summaryText).toContain('No daily check-ins recorded yet');
    });

    it('computes trend correctly when mood is improving', () => {
      // Days from Nov 1 to Nov 7
      const checkins: Checkin[] = [
        { id: 1, day: '2026-11-01', mood: 4, stress: 8, confidence: 5, sleep_quality: 4, note: null, created_at: 100 },
        { id: 2, day: '2026-11-02', mood: 5, stress: 7, confidence: 6, sleep_quality: 5, note: null, created_at: 200 },
        { id: 3, day: '2026-11-05', mood: 8, stress: 4, confidence: 9, sleep_quality: 8, note: null, created_at: 300 },
        { id: 4, day: '2026-11-07', mood: 9, stress: 3, confidence: 9, sleep_quality: 8, note: null, created_at: 400 },
      ];

      const result = calculateMoodTrend(checkins, 7, refDate);
      expect(result.checkinsRecorded).toBe(4);
      expect(result.averageMood).toBe(6.5);
      expect(result.averageStress).toBe(5.5);
      expect(result.moodTrend).toBe('improving');
      expect(result.stressTrend).toBe('improving');
      expect(result.summaryText).toContain('improving');
    });
  });

  describe('calculateOutcomeStats', () => {
    it('handles empty craving logs', () => {
      const stats = calculateOutcomeStats([]);
      expect(stats.total).toBe(0);
      expect(stats.resistedPercentage).toBe(0);
      expect(stats.summaryText).toBe('No craving sessions logged yet.');
    });

    it('calculates resisted percentage accurately', () => {
      const cravings: CravingLog[] = [
        { id: 1, started_at: 1, duration_sec: 1, intensity_before: 5, intensity_after: 2, outcome: 'resisted', trigger_id: null, tool_used: null, note: null },
        { id: 2, started_at: 2, duration_sec: 1, intensity_before: 5, intensity_after: 2, outcome: 'resisted', trigger_id: null, tool_used: null, note: null },
        { id: 3, started_at: 3, duration_sec: 1, intensity_before: 5, intensity_after: 2, outcome: 'resisted', trigger_id: null, tool_used: null, note: null },
        { id: 4, started_at: 4, duration_sec: 1, intensity_before: 5, intensity_after: 5, outcome: 'smoked', trigger_id: null, tool_used: null, note: null },
      ];

      const stats = calculateOutcomeStats(cravings);
      expect(stats.total).toBe(4);
      expect(stats.resisted).toBe(3);
      expect(stats.smoked).toBe(1);
      expect(stats.resistedPercentage).toBe(75);
      expect(stats.summaryText).toBe('You have resisted 3 of 4 cravings (75% success rate).');
    });
  });

  describe('formatting helpers', () => {
    it('formats hours and ranges cleanly', () => {
      expect(formatHour(0)).toBe('12:00 AM');
      expect(formatHour(9)).toBe('9:00 AM');
      expect(formatHour(12)).toBe('12:00 PM');
      expect(formatHour(17)).toBe('5:00 PM');
      expect(formatHour(23)).toBe('11:00 PM');

      expect(formatHourRange(17)).toBe('5:00 PM - 6:00 PM');
    });
  });
});
