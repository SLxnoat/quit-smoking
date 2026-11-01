import fs from 'fs';
import path from 'path';
import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import { calculateStats } from '../domain/stats';
import { evaluateAchievements } from '../domain/milestones';
import { getDailyQuote, getContentItemById } from '../db/repositories/content.repo';
import { saveProfile } from '../db/repositories/profile.repo';
import { logCraving } from '../db/repositories/craving.repo';
import { upsertCheckin } from '../db/repositories/checkins.repo';
import { exportUserData, importUserData } from '../services/backup.service';

describe('NFR-OFF-1: 100% Offline Architecture & Compliance Audit', () => {
  it('confirms app.json has zero Android network permissions', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const appJsonRaw = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonRaw);

    const androidPermissions = appJson.expo?.android?.permissions;
    expect(androidPermissions).toBeDefined();
    // Must be empty array - zero permissions requested
    expect(androidPermissions).toEqual([]);
    expect(androidPermissions).not.toContain('android.permission.INTERNET');
    expect(androidPermissions).not.toContain('android.permission.ACCESS_NETWORK_STATE');
  });

  it('confirms app.json has allowBackup set to false with security documentation', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const appJsonRaw = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonRaw);

    expect(appJson.expo?.android?.allowBackup).toBe(false);
    expect(appJson.expo?.extra?.security?.allowBackupDecision).toBeDefined();
  });

  it('runs complete user lifecycle completely offline with zero fetch or network socket attempts', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const db = createTestDatabase();

    // 1. Database migration & bundled content seed
    await migrateDb(db);

    // 2. Profile setup
    await saveProfile(db, {
      quit_at: 1700000000000,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 12.5,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    // 3. Craving logging
    await logCraving(db, {
      started_at: 1700000600000,
      intensity_before: 8,
      intensity_after: 2,
      outcome: 'resisted',
      tool_used: 'Box Breathing',
    });

    // 4. Daily journal checkin
    await upsertCheckin(db, {
      day: '2026-11-02',
      mood: 8,
      stress: 2,
      confidence: 9,
      sleep_quality: 7,
      note: 'All offline and secure.',
    });

    // 5. Offline content retrieval
    const quote = await getDailyQuote(db, 'en');
    expect(quote).toBeDefined();

    const item = await getContentItemById(db, 'day-01');
    expect(item).toBeDefined();

    // 6. Realtime stats computation
    const stats = calculateStats(
      {
        quitAt: 1700000000000,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 12.5,
      },
      () => 1700000000000 + 86400000 * 3
    );
    expect(stats.cigsAvoided).toBe(60);

    const achievements = evaluateAchievements({
      elapsedSeconds: stats.time.totalSeconds,
      alreadyUnlockedKeys: new Set(),
    });
    expect(achievements.length).toBeGreaterThan(0);

    // 7. Full data export and import
    const exported = await exportUserData(db);
    expect(exported.app).toBe('Ember');

    await importUserData(db, JSON.stringify(exported));

    // Confirm that fetch was NEVER called
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
