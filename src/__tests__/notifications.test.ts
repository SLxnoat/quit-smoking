import {
  computeNotificationSchedule,
  adjustForQuietHours,
  isWithinQuietHours,
} from '../domain/notifications';
import { HealthMilestone } from '../domain/healthTimeline';

describe('Notification Scheduling Engine (Sprint 5)', () => {
  const dummyMilestones: HealthMilestone[] = [
    {
      id: 'm_20m',
      title: 'Pulse Normalizing',
      thresholdSeconds: 1200, // 20m
      timeLabel: '20 minutes',
      description: 'Pulse settles.',
      source: 'WHO',
      category: 'cardiovascular',
    },
    {
      id: 'm_8h',
      title: 'CO Halved',
      thresholdSeconds: 28800, // 8h
      timeLabel: '8 hours',
      description: 'Carbon monoxide reduced.',
      source: 'NHS',
      category: 'cardiovascular',
    },
    {
      id: 'm_24h',
      title: 'Heart Attack Risk Drops',
      thresholdSeconds: 86400, // 24h
      timeLabel: '24 hours',
      description: 'Heart risk starts falling.',
      source: 'CDC',
      category: 'cardiovascular',
    },
    {
      id: 'm_48h',
      title: 'Taste & Smell Regrow',
      thresholdSeconds: 172800, // 48h
      timeLabel: '48 hours',
      description: 'Nerve endings heal.',
      source: 'CDC',
      category: 'systemic',
    },
  ];

  describe('isWithinQuietHours & adjustForQuietHours', () => {
    it('detects hours within quiet period (22:00 to 08:00)', () => {
      // 23:00 (11 PM) -> quiet
      const lateNight = new Date(2026, 10, 1, 23, 0, 0);
      expect(isWithinQuietHours(lateNight, 22, 8)).toBe(true);

      // 03:30 (3:30 AM) -> quiet
      const earlyMorning = new Date(2026, 10, 2, 3, 30, 0);
      expect(isWithinQuietHours(earlyMorning, 22, 8)).toBe(true);

      // 14:00 (2 PM) -> not quiet
      const afternoon = new Date(2026, 10, 1, 14, 0, 0);
      expect(isWithinQuietHours(afternoon, 22, 8)).toBe(false);
    });

    it('shifts overnight triggers to morning quietEnd (08:00)', () => {
      // 23:30 on Nov 1 -> shifted to 08:00 on Nov 2
      const triggerLate = new Date(2026, 10, 1, 23, 30, 0).getTime();
      const adjusted = adjustForQuietHours(triggerLate, 22, 8);
      const adjustedDate = new Date(adjusted);

      expect(adjustedDate.getDate()).toBe(2);
      expect(adjustedDate.getHours()).toBe(8);
      expect(adjustedDate.getMinutes()).toBe(0);

      // 05:15 on Nov 2 -> shifted to 08:00 on Nov 2
      const triggerEarly = new Date(2026, 10, 2, 5, 15, 0).getTime();
      const adjustedEarly = adjustForQuietHours(triggerEarly, 22, 8);
      const adjustedEarlyDate = new Date(adjustedEarly);

      expect(adjustedEarlyDate.getDate()).toBe(2);
      expect(adjustedEarlyDate.getHours()).toBe(8);
      expect(adjustedEarlyDate.getMinutes()).toBe(0);

      // Daytime 15:00 -> untouched
      const daytime = new Date(2026, 10, 1, 15, 0, 0).getTime();
      expect(adjustForQuietHours(daytime, 22, 8)).toBe(daytime);
    });
  });

  describe('computeNotificationSchedule pure logic', () => {
    it('returns empty array when enabled = false', () => {
      const now = new Date(2026, 10, 1, 12, 0, 0).getTime();
      const quitAt = now - 3600000;
      const result = computeNotificationSchedule(quitAt, dummyMilestones, { enabled: false }, now);
      expect(result).toHaveLength(0);
    });

    it('schedules only upcoming future milestones and check-ins', () => {
      // User quit at 10:00 AM on Nov 1. Current time is 12:00 PM (2h later).
      // 20-min milestone was at 10:20 AM (in the past -> should NOT be scheduled).
      // 8-h milestone is at 18:00 (6 PM -> future -> should be scheduled).
      // 24-h milestone is at 10:00 AM on Nov 2 -> should be scheduled.
      const quitAt = new Date(2026, 10, 1, 10, 0, 0).getTime();
      const now = new Date(2026, 10, 1, 12, 0, 0).getTime();

      const schedule = computeNotificationSchedule(
        quitAt,
        dummyMilestones,
        { daysAhead: 3, dailyReminderHour: 20 },
        now
      );

      expect(schedule.length).toBeGreaterThan(0);

      // Past 20-min milestone must not exist
      const pastItem = schedule.find((s) => s.id === 'milestone_m_20m');
      expect(pastItem).toBeUndefined();

      // Future 8-h milestone must exist
      const futureItem = schedule.find((s) => s.id === 'milestone_m_8h');
      expect(futureItem).toBeDefined();
      expect(futureItem?.type).toBe('milestone');
    });

    it('enforces maximum 3 notifications per calendar day cap', () => {
      const quitAt = new Date(2026, 10, 1, 8, 0, 0).getTime();
      const now = quitAt;

      // Create 6 dummy milestones that all trigger on the same day
      const denseMilestones: HealthMilestone[] = [
        { id: '1', title: 'M1', thresholdSeconds: 3600, timeLabel: '1h', description: '', source: '', category: 'systemic' },
        { id: '2', title: 'M2', thresholdSeconds: 7200, timeLabel: '2h', description: '', source: '', category: 'systemic' },
        { id: '3', title: 'M3', thresholdSeconds: 10800, timeLabel: '3h', description: '', source: '', category: 'systemic' },
        { id: '4', title: 'M4', thresholdSeconds: 14400, timeLabel: '4h', description: '', source: '', category: 'systemic' },
        { id: '5', title: 'M5', thresholdSeconds: 18000, timeLabel: '5h', description: '', source: '', category: 'systemic' },
      ];

      const schedule = computeNotificationSchedule(
        quitAt,
        denseMilestones,
        { maxPerDay: 3, daysAhead: 1, dailyReminderHour: 20 },
        now
      );

      // Group by day and assert cap <= 3
      const dayCounts = new Map<string, number>();
      for (const item of schedule) {
        dayCounts.set(item.localDay, (dayCounts.get(item.localDay) ?? 0) + 1);
      }

      for (const [, count] of dayCounts) {
        expect(count).toBeLessThanOrEqual(3);
      }
    });

    it('reschedules future trigger timestamps when quitAt shifts', () => {
      const now = new Date(2026, 10, 1, 12, 0, 0).getTime();
      const originalQuit = now;
      const delayedQuit = now + 86400000; // quit date shifted 24h later

      const schedule1 = computeNotificationSchedule(originalQuit, dummyMilestones, { daysAhead: 3 }, now);
      const schedule2 = computeNotificationSchedule(delayedQuit, dummyMilestones, { daysAhead: 4 }, now);

      const m8h_orig = schedule1.find((s) => s.id === 'milestone_m_8h');
      const m8h_delayed = schedule2.find((s) => s.id === 'milestone_m_8h');

      expect(m8h_orig).toBeDefined();
      expect(m8h_delayed).toBeDefined();
      expect(m8h_delayed!.triggerTimeMs).toBeGreaterThan(m8h_orig!.triggerTimeMs);
    });
  });
});
