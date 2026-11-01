import * as Notifications from 'expo-notifications';
import { type SQLiteDatabase } from 'expo-sqlite';
import { getProfile } from '../db/repositories/profile.repo';
import {
  computeNotificationSchedule,
  NotificationScheduleOptions,
  ScheduledNotificationItem,
} from '../domain/notifications';

// Configure notification presentation behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Graceful fallback for headless/test environments
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.status === 'granted') {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return requested.granted || requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted || settings.status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Graceful fallback
  }
}

/**
 * Schedules milestone and daily check-in notifications based on profile.quit_at.
 * Cancels all previous notifications first to prevent stale / duplicated schedules.
 */
export async function scheduleAllNotifications(
  db: SQLiteDatabase,
  options: NotificationScheduleOptions = {}
): Promise<ScheduledNotificationItem[]> {
  try {
    const profile = await getProfile(db);
    if (!profile) return [];

    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) return [];

    const schedule = computeNotificationSchedule(profile.quit_at, undefined, options);

    await cancelAllNotifications();

    for (const item of schedule) {
      const triggerDate = new Date(item.triggerTimeMs);
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: item.title,
          body: item.body,
          data: { type: item.type, id: item.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }

    return schedule;
  } catch {
    return [];
  }
}

/**
 * Reschedule notifications when profile quit date changes, a slip occurs, or settings update.
 */
export async function rescheduleNotifications(db: SQLiteDatabase): Promise<void> {
  await scheduleAllNotifications(db);
}
