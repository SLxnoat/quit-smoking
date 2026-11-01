import { HEALTH_RECOVERY_TIMELINE, HealthMilestone } from './healthTimeline';

export interface NotificationScheduleOptions {
  enabled?: boolean;
  quietHoursStart?: number; // 0..23, default 22 (10 PM)
  quietHoursEnd?: number; // 0..23, default 8 (8 AM)
  dailyReminderHour?: number; // 0..23, default 20 (8 PM)
  dailyReminderMinute?: number; // 0..59, default 0
  maxPerDay?: number; // default 3
  daysAhead?: number; // default 14 days
}

export interface ScheduledNotificationItem {
  id: string;
  type: 'milestone' | 'checkin' | 'motivational';
  title: string;
  body: string;
  triggerTimeMs: number;
  localDay: string; // YYYY-MM-DD
}

export function formatLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isWithinQuietHours(
  date: Date,
  quietStart: number = 22,
  quietEnd: number = 8
): boolean {
  const hour = date.getHours();
  if (quietStart > quietEnd) {
    // Overnight: e.g. 22:00 to 08:00
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

export function adjustForQuietHours(
  triggerTimeMs: number,
  quietStart: number = 22,
  quietEnd: number = 8
): number {
  const date = new Date(triggerTimeMs);
  if (!isWithinQuietHours(date, quietStart, quietEnd)) {
    return triggerTimeMs;
  }

  // If in quiet hours, shift forward to quietEnd:00:00
  const adjusted = new Date(date);
  if (date.getHours() >= quietStart) {
    // Falls late at night (e.g. 23:00) -> shift to next morning at quietEnd
    adjusted.setDate(adjusted.getDate() + 1);
  }
  adjusted.setHours(quietEnd, 0, 0, 0);

  return adjusted.getTime();
}

/**
 * Pure function: Computes scheduled notifications respecting:
 * - Milestone timing based on quitAt
 * - Daily check-in reminders
 * - Quiet hours (overnight shifted to morning)
 * - Maximum notifications per calendar day cap (default: 3)
 */
export function computeNotificationSchedule(
  quitAtMs: number,
  milestones: HealthMilestone[] = HEALTH_RECOVERY_TIMELINE,
  options: NotificationScheduleOptions = {},
  nowMs: number = Date.now()
): ScheduledNotificationItem[] {
  const {
    enabled = true,
    quietHoursStart = 22,
    quietHoursEnd = 8,
    dailyReminderHour = 20,
    dailyReminderMinute = 0,
    maxPerDay = 3,
    daysAhead = 14,
  } = options;

  if (!enabled) {
    return [];
  }

  const maxFutureMs = nowMs + daysAhead * 86400000;
  const rawCandidates: ScheduledNotificationItem[] = [];

  // 1. Health Milestones
  for (const m of milestones) {
    const milestoneTargetMs = quitAtMs + m.thresholdSeconds * 1000;

    // Only schedule if strictly in the future and within scheduling window
    if (milestoneTargetMs > nowMs && milestoneTargetMs <= maxFutureMs) {
      const adjustedMs = adjustForQuietHours(milestoneTargetMs, quietHoursStart, quietHoursEnd);
      const localDay = formatLocalDateString(new Date(adjustedMs));

      rawCandidates.push({
        id: `milestone_${m.id}`,
        type: 'milestone',
        title: 'Health Recovery Milestone Reached! 🎉',
        body: `${m.title}: ${m.description}`,
        triggerTimeMs: adjustedMs,
        localDay,
      });
    }
  }

  // 2. Daily Check-in Reminders
  for (let i = 0; i <= daysAhead; i++) {
    const targetDate = new Date(nowMs + i * 86400000);
    targetDate.setHours(dailyReminderHour, dailyReminderMinute, 0, 0);
    const reminderMs = targetDate.getTime();

    if (reminderMs > nowMs && reminderMs <= maxFutureMs) {
      const adjustedMs = adjustForQuietHours(reminderMs, quietHoursStart, quietHoursEnd);
      const localDay = formatLocalDateString(new Date(adjustedMs));

      rawCandidates.push({
        id: `checkin_${localDay}`,
        type: 'checkin',
        title: 'Daily Smoke-Free Check-In ☀️',
        body: 'Take 60 seconds to track your mood, stress, and celebrate your smoke-free day.',
        triggerTimeMs: adjustedMs,
        localDay,
      });
    }
  }

  // 3. Group by local day and enforce cap (maxPerDay)
  const dayGroups = new Map<string, ScheduledNotificationItem[]>();
  for (const item of rawCandidates) {
    const list = dayGroups.get(item.localDay) ?? [];
    list.push(item);
    dayGroups.set(item.localDay, list);
  }

  const finalSchedule: ScheduledNotificationItem[] = [];

  for (const [, items] of dayGroups) {
    // Sort items for the day: milestones have priority over check-ins, then by trigger time
    items.sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === 'milestone') return -1;
        if (b.type === 'milestone') return 1;
      }
      return a.triggerTimeMs - b.triggerTimeMs;
    });

    // Enforce maxPerDay
    const capped = items.slice(0, maxPerDay);
    finalSchedule.push(...capped);
  }

  // Final overall chronological sort
  finalSchedule.sort((a, b) => a.triggerTimeMs - b.triggerTimeMs);

  return finalSchedule;
}
