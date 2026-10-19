import { type SQLiteDatabase } from 'expo-sqlite';

export const SETTINGS_KEYS = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  DISCLAIMER_ACCEPTED: 'disclaimer_accepted',
  DISCLAIMER_ACCEPTED_AT: 'disclaimer_accepted_at',
  THEME_MODE: 'theme_mode',
  CURRENCY: 'currency',
  SECURITY_LOCK_ENABLED: 'security_lock_enabled',
  HAPTICS_ENABLED: 'haptics_enabled',
  REDUCE_MOTION: 'reduce_motion',
} as const;

export async function getSetting(
  db: SQLiteDatabase,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1;',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value]
  );
}

export async function deleteSetting(
  db: SQLiteDatabase,
  key: string
): Promise<void> {
  await db.runAsync('DELETE FROM settings WHERE key = ?;', [key]);
}

export async function hasCompletedOnboarding(db: SQLiteDatabase): Promise<boolean> {
  const val = await getSetting(db, SETTINGS_KEYS.ONBOARDING_COMPLETED);
  return val === 'true';
}

export async function setOnboardingCompleted(
  db: SQLiteDatabase,
  completed: boolean
): Promise<void> {
  await setSetting(db, SETTINGS_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
}

export async function hasAcceptedDisclaimer(db: SQLiteDatabase): Promise<boolean> {
  const val = await getSetting(db, SETTINGS_KEYS.DISCLAIMER_ACCEPTED);
  return val === 'true';
}

export async function setDisclaimerAccepted(
  db: SQLiteDatabase,
  accepted: boolean
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await setSetting(db, SETTINGS_KEYS.DISCLAIMER_ACCEPTED, accepted ? 'true' : 'false');
    if (accepted) {
      await setSetting(db, SETTINGS_KEYS.DISCLAIMER_ACCEPTED_AT, Date.now().toString());
    } else {
      await deleteSetting(db, SETTINGS_KEYS.DISCLAIMER_ACCEPTED_AT);
    }
  });
}

export async function clearAllUserData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM profile;');
    await db.runAsync('DELETE FROM reasons;');
    await db.runAsync('DELETE FROM craving_logs;');
    await db.runAsync('DELETE FROM slips;');
    await db.runAsync('DELETE FROM checkins;');
    await db.runAsync('DELETE FROM thought_records;');
    await db.runAsync('DELETE FROM goals;');
    await db.runAsync('DELETE FROM achievements;');
    await db.runAsync('DELETE FROM support_contacts;');
    await db.runAsync('DELETE FROM bookmarks;');
    await db.runAsync('DELETE FROM settings;');
    // Reset custom triggers and reactivate predefined triggers
    await db.runAsync('DELETE FROM triggers WHERE is_custom = 1;');
    await db.runAsync('UPDATE triggers SET is_active = 1;');
  });
}

export async function isHapticsEnabled(db: SQLiteDatabase): Promise<boolean> {
  const val = await getSetting(db, SETTINGS_KEYS.HAPTICS_ENABLED);
  return val !== 'false'; // Defaults to true
}

export async function setHapticsEnabled(
  db: SQLiteDatabase,
  enabled: boolean
): Promise<void> {
  await setSetting(db, SETTINGS_KEYS.HAPTICS_ENABLED, enabled ? 'true' : 'false');
}

export async function isReduceMotionSetting(db: SQLiteDatabase): Promise<boolean> {
  const val = await getSetting(db, SETTINGS_KEYS.REDUCE_MOTION);
  return val === 'true'; // Defaults to system / false
}

export async function setReduceMotionSetting(
  db: SQLiteDatabase,
  enabled: boolean
): Promise<void> {
  await setSetting(db, SETTINGS_KEYS.REDUCE_MOTION, enabled ? 'true' : 'false');
}
