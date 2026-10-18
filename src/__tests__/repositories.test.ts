import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  deleteProfile,
  getProfile,
  saveProfile,
  updateQuitAt,
} from '../db/repositories/profile.repo';
import {
  addReason,
  deleteReason,
  getReasons,
  saveReasons,
} from '../db/repositories/reasons.repo';
import {
  addCustomTrigger,
  getActiveTriggers,
  getTriggers,
  setTriggerActive,
  updateTriggerPlan,
} from '../db/repositories/triggers.repo';
import {
  clearAllUserData,
  deleteSetting,
  getSetting,
  hasAcceptedDisclaimer,
  hasCompletedOnboarding,
  setDisclaimerAccepted,
  setOnboardingCompleted,
  setSetting,
} from '../db/repositories/settings.repo';

describe('Database Repositories', () => {
  let db = createTestDatabase();

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  describe('Profile Repository', () => {
    it('returns null when no profile has been saved', async () => {
      const profile = await getProfile(db);
      expect(profile).toBeNull();
    });

    it('saves and retrieves user profile correctly', async () => {
      const now = Date.now();
      await saveProfile(db, {
        quit_at: now,
        cigs_per_day: 15,
        pack_size: 20,
        pack_price: 12.5,
        currency: 'USD',
        years_smoked: 5,
        approach: 'cold_turkey',
        confidence: 9,
      });

      const profile = await getProfile(db);
      expect(profile).not.toBeNull();
      expect(profile?.quit_at).toBe(now);
      expect(profile?.cigs_per_day).toBe(15);
      expect(profile?.pack_size).toBe(20);
      expect(profile?.pack_price).toBe(12.5);
      expect(profile?.currency).toBe('USD');
      expect(profile?.years_smoked).toBe(5);
      expect(profile?.approach).toBe('cold_turkey');
      expect(profile?.confidence).toBe(9);
    });

    it('updates quit_at timestamp', async () => {
      const now = Date.now();
      await saveProfile(db, {
        quit_at: now,
        cigs_per_day: 10,
        pack_size: 20,
        pack_price: 10,
        currency: '$',
        approach: 'cold_turkey',
      });

      const newQuitAt = now - 3600000;
      await updateQuitAt(db, newQuitAt);

      const updated = await getProfile(db);
      expect(updated?.quit_at).toBe(newQuitAt);
    });

    it('deletes profile', async () => {
      await saveProfile(db, {
        quit_at: Date.now(),
        cigs_per_day: 10,
        pack_size: 20,
        pack_price: 10,
        currency: '$',
        approach: 'cold_turkey',
      });
      await deleteProfile(db);
      expect(await getProfile(db)).toBeNull();
    });
  });

  describe('Reasons Repository', () => {
    it('adds single reason and retrieves list ordered by sort_order', async () => {
      await addReason(db, 'Health', 1);
      await addReason(db, 'Save Money', 0);

      const list = await getReasons(db);
      expect(list.length).toBe(2);
      expect(list[0].text).toBe('Save Money');
      expect(list[1].text).toBe('Health');
    });

    it('replaces all reasons in batch with saveReasons', async () => {
      await addReason(db, 'Old reason');
      await saveReasons(db, ['Freedom from cravings', 'Live longer']);

      const list = await getReasons(db);
      expect(list.length).toBe(2);
      expect(list.map((r) => r.text)).toEqual(['Freedom from cravings', 'Live longer']);
    });

    it('deletes specific reason by id', async () => {
      const r = await addReason(db, 'To be removed');
      await deleteReason(db, r.id);

      const list = await getReasons(db);
      expect(list.find((item) => item.id === r.id)).toBeUndefined();
    });
  });

  describe('Triggers Repository', () => {
    it('toggles trigger active status', async () => {
      const list = await getTriggers(db);
      const first = list[0];
      expect(first.is_active).toBe(1);

      await setTriggerActive(db, first.id, false);

      const updated = await getTriggers(db);
      expect(updated.find((t) => t.id === first.id)?.is_active).toBe(0);

      const activeOnly = await getActiveTriggers(db);
      expect(activeOnly.find((t) => t.id === first.id)).toBeUndefined();
    });

    it('updates coping plan for a trigger', async () => {
      const list = await getTriggers(db);
      const first = list[0];

      await updateTriggerPlan(db, first.id, 'If triggered, do 10 pushups.');
      const updated = await getTriggers(db);
      expect(updated.find((t) => t.id === first.id)?.coping_plan).toBe(
        'If triggered, do 10 pushups.'
      );
    });

    it('creates custom trigger marked with is_custom = 1', async () => {
      const custom = await addCustomTrigger(
        db,
        'Late night gaming',
        'Drink iced tea instead'
      );
      expect(custom.is_custom).toBe(1);
      expect(custom.label).toBe('Late night gaming');

      const all = await getTriggers(db);
      expect(all.some((t) => t.id === custom.id && t.is_custom === 1)).toBe(true);
    });
  });

  describe('Settings Repository', () => {
    it('sets, gets and deletes setting keys', async () => {
      expect(await getSetting(db, 'test_key')).toBeNull();

      await setSetting(db, 'test_key', 'test_val');
      expect(await getSetting(db, 'test_key')).toBe('test_val');

      await deleteSetting(db, 'test_key');
      expect(await getSetting(db, 'test_key')).toBeNull();
    });

    it('manages onboarding completed state', async () => {
      expect(await hasCompletedOnboarding(db)).toBe(false);

      await setOnboardingCompleted(db, true);
      expect(await hasCompletedOnboarding(db)).toBe(true);

      await setOnboardingCompleted(db, false);
      expect(await hasCompletedOnboarding(db)).toBe(false);
    });

    it('manages disclaimer acceptance state', async () => {
      expect(await hasAcceptedDisclaimer(db)).toBe(false);

      await setDisclaimerAccepted(db, true);
      expect(await hasAcceptedDisclaimer(db)).toBe(true);

      const timestamp = await getSetting(db, 'disclaimer_accepted_at');
      expect(timestamp).not.toBeNull();
    });

    it('clears all user data while preserving seed trigger structure', async () => {
      await saveProfile(db, {
        quit_at: Date.now(),
        cigs_per_day: 20,
        pack_size: 20,
        pack_price: 10,
        currency: '$',
        approach: 'cold_turkey',
      });
      await addReason(db, 'My reason');
      await addCustomTrigger(db, 'My custom trigger');
      await setOnboardingCompleted(db, true);

      await clearAllUserData(db);

      expect(await getProfile(db)).toBeNull();
      expect((await getReasons(db)).length).toBe(0);
      expect(await hasCompletedOnboarding(db)).toBe(false);

      const triggers = await getTriggers(db);
      expect(triggers.some((t) => t.is_custom === 1)).toBe(false);
      expect(triggers.length).toBeGreaterThan(0);
    });
  });
});
