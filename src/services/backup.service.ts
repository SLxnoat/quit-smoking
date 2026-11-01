import { type SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import {
  type EmberBackup,
  validateBackupJson,
} from '../domain/backup';
import { seedTriggers } from '../db/migrations';
import { rescheduleNotifications } from './notifications.service';

/**
 * Extracts all user data from the database into an in-memory EmberBackup object.
 */
export async function exportUserData(db: SQLiteDatabase): Promise<EmberBackup> {
  const profile = await db.getFirstAsync<any>('SELECT * FROM profile WHERE id = 1;');
  const reasons = await db.getAllAsync<any>('SELECT * FROM reasons ORDER BY sort_order ASC, id ASC;');
  const triggers = await db.getAllAsync<any>('SELECT * FROM triggers ORDER BY id ASC;');
  const craving_logs = await db.getAllAsync<any>('SELECT * FROM craving_logs ORDER BY started_at ASC;');
  const slips = await db.getAllAsync<any>('SELECT * FROM slips ORDER BY occurred_at ASC;');
  const checkins = await db.getAllAsync<any>('SELECT * FROM checkins ORDER BY day ASC;');
  const thought_records = await db.getAllAsync<any>('SELECT * FROM thought_records ORDER BY created_at ASC;');
  const goals = await db.getAllAsync<any>('SELECT * FROM goals ORDER BY id ASC;');
  const achievements = await db.getAllAsync<any>('SELECT * FROM achievements ORDER BY unlocked_at ASC;');
  const bookmarks = await db.getAllAsync<any>('SELECT * FROM bookmarks ORDER BY created_at ASC;');
  const lesson_completions = await db.getAllAsync<any>('SELECT * FROM lesson_completions ORDER BY completed_at ASC;');
  const support_contacts = await db.getAllAsync<any>('SELECT * FROM support_contacts ORDER BY id ASC;');
  const settings = await db.getAllAsync<any>('SELECT * FROM settings ORDER BY key ASC;');

  return {
    version: 1,
    app: 'Ember',
    appVersion: '1.0.0',
    exportedAt: Date.now(),
    data: {
      profile: profile ?? null,
      reasons: reasons ?? [],
      triggers: triggers ?? [],
      craving_logs: craving_logs ?? [],
      slips: slips ?? [],
      checkins: checkins ?? [],
      thought_records: thought_records ?? [],
      goals: goals ?? [],
      achievements: achievements ?? [],
      bookmarks: bookmarks ?? [],
      lesson_completions: lesson_completions ?? [],
      support_contacts: support_contacts ?? [],
      settings: settings ?? [],
    },
  };
}

/**
 * Serializes the user database into formatted JSON string.
 */
export async function serializeBackup(db: SQLiteDatabase): Promise<string> {
  const backup = await exportUserData(db);
  return JSON.stringify(backup, null, 2);
}

/**
 * Exports user data to a local cache file and opens the native share sheet.
 */
export async function exportBackupToFile(db: SQLiteDatabase): Promise<string> {
  const json = await serializeBackup(db);
  const fileName = `ember-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync().catch(() => false);
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Ember Backup',
      UTI: 'public.json',
    });
  }

  return fileUri;
}

/**
 * Validates and imports user data into the database within an atomic transaction.
 *
 * TC-011 Guarantee:
 * If the provided JSON is malformed or invalid according to the backup schema,
 * an error is thrown immediately BEFORE any database transaction is initiated,
 * guaranteeing no partial or complete changes occur.
 */
export async function importUserData(db: SQLiteDatabase, jsonString: string): Promise<void> {
  // Step 1: Pre-validation (Must throw on failure and never touch SQLite)
  const backup = validateBackupJson(jsonString);

  // Step 2: Atomic database replacement
  await db.withTransactionAsync(async () => {
    // Wipe user tables
    await db.execAsync(`
      DELETE FROM profile;
      DELETE FROM reasons;
      DELETE FROM triggers;
      DELETE FROM craving_logs;
      DELETE FROM slips;
      DELETE FROM checkins;
      DELETE FROM thought_records;
      DELETE FROM goals;
      DELETE FROM achievements;
      DELETE FROM bookmarks;
      DELETE FROM lesson_completions;
      DELETE FROM support_contacts;
      DELETE FROM settings;
    `);

    // Insert profile if present
    if (backup.data.profile) {
      const p = backup.data.profile;
      await db.runAsync(
        `INSERT INTO profile (id, quit_at, cigs_per_day, pack_size, pack_price, currency, years_smoked, approach, confidence, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          p.quit_at,
          p.cigs_per_day,
          p.pack_size,
          p.pack_price,
          p.currency,
          p.years_smoked ?? null,
          p.approach,
          p.confidence ?? null,
          p.created_at,
        ]
      );
    }

    // Insert reasons
    for (const r of backup.data.reasons) {
      await db.runAsync(
        `INSERT INTO reasons (text, sort_order, created_at) VALUES (?, ?, ?);`,
        [r.text, r.sort_order ?? 0, r.created_at ?? Date.now()]
      );
    }

    // Insert triggers
    for (const t of backup.data.triggers) {
      await db.runAsync(
        `INSERT INTO triggers (key, label, is_custom, is_active, coping_plan) VALUES (?, ?, ?, ?, ?);`,
        [t.key ?? null, t.label, t.is_custom ?? 0, t.is_active ?? 1, t.coping_plan ?? null]
      );
    }

    // Insert craving logs
    for (const c of backup.data.craving_logs) {
      await db.runAsync(
        `INSERT INTO craving_logs (started_at, duration_sec, intensity_before, intensity_after, outcome, trigger_id, tool_used, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.started_at,
          c.duration_sec ?? null,
          c.intensity_before ?? null,
          c.intensity_after ?? null,
          c.outcome,
          c.trigger_id ?? null,
          c.tool_used ?? null,
          c.note ?? null,
        ]
      );
    }

    // Insert slips
    for (const s of backup.data.slips) {
      await db.runAsync(
        `INSERT INTO slips (occurred_at, cigarettes, trigger_id, reflection, reset_streak, previous_quit_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          s.occurred_at,
          s.cigarettes,
          s.trigger_id ?? null,
          s.reflection ?? null,
          s.reset_streak ?? 1,
          s.previous_quit_at ?? null,
        ]
      );
    }

    // Insert checkins
    for (const ch of backup.data.checkins) {
      await db.runAsync(
        `INSERT INTO checkins (day, mood, stress, confidence, sleep_quality, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          ch.day,
          ch.mood ?? null,
          ch.stress ?? null,
          ch.confidence ?? null,
          ch.sleep_quality ?? null,
          ch.note ?? null,
          ch.created_at,
        ]
      );
    }

    // Insert thought records
    for (const tr of backup.data.thought_records) {
      await db.runAsync(
        `INSERT INTO thought_records (created_at, situation, thought, emotion, reframe, belief_before, belief_after)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          tr.created_at,
          tr.situation ?? null,
          tr.thought ?? null,
          tr.emotion ?? null,
          tr.reframe ?? null,
          tr.belief_before ?? null,
          tr.belief_after ?? null,
        ]
      );
    }

    // Insert goals
    for (const g of backup.data.goals) {
      await db.runAsync(
        `INSERT INTO goals (title, target_amount, achieved_at) VALUES (?, ?, ?);`,
        [g.title, g.target_amount, g.achieved_at ?? null]
      );
    }

    // Insert achievements
    for (const a of backup.data.achievements) {
      await db.runAsync(
        `INSERT INTO achievements (key, unlocked_at) VALUES (?, ?);`,
        [a.key, a.unlocked_at]
      );
    }

    // Insert bookmarks
    for (const bm of backup.data.bookmarks) {
      await db.runAsync(
        `INSERT INTO bookmarks (content_id, created_at) VALUES (?, ?);`,
        [bm.content_id, bm.created_at]
      );
    }

    // Insert lesson completions
    for (const lc of backup.data.lesson_completions) {
      await db.runAsync(
        `INSERT INTO lesson_completions (lesson_id, completed_at) VALUES (?, ?);`,
        [lc.lesson_id, lc.completed_at]
      );
    }

    // Insert support contacts
    for (const sc of backup.data.support_contacts) {
      await db.runAsync(
        `INSERT INTO support_contacts (name, phone) VALUES (?, ?);`,
        [sc.name, sc.phone]
      );
    }

    // Insert settings
    for (const set of backup.data.settings) {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?);`,
        [set.key, set.value]
      );
    }
  });

  // Re-schedule notifications if applicable
  await rescheduleNotifications(db).catch(() => {});
}

/**
 * Prompts user to pick a JSON backup file and imports it into the database.
 */
export async function pickAndImportBackupFile(
  db: SQLiteDatabase
): Promise<{ success: boolean; canceled?: boolean; message?: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { success: false, canceled: true };
  }

  const fileUri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await importUserData(db, content);
  return { success: true, message: 'Backup successfully restored!' };
}

/**
 * TC-012: Completely deletes all user-generated data.
 * User tables are purged, default triggers are re-seeded,
 * and bundled content_items are preserved untouched.
 */
export async function deleteAllUserData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM profile;
      DELETE FROM reasons;
      DELETE FROM triggers;
      DELETE FROM craving_logs;
      DELETE FROM slips;
      DELETE FROM checkins;
      DELETE FROM thought_records;
      DELETE FROM goals;
      DELETE FROM achievements;
      DELETE FROM bookmarks;
      DELETE FROM lesson_completions;
      DELETE FROM support_contacts;
      DELETE FROM settings;
    `);

    // Reset default predefined triggers
    await seedTriggers(db);
  });

  // Cancel any scheduled local notifications
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
