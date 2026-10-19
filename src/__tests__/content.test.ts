import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  getContentItems,
  getContentItemById,
  getDailyQuote,
  getRandomTip,
  getRandomQuote,
} from '../db/repositories/content.repo';
import { seedContent, SEED_QUOTES, SEED_TIPS, getSeedMilestones } from '../db/seed/content';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Seed Content & Content Repository', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  describe('seedContent idempotency & coverage', () => {
    it('seeds all quotes, tips, and milestones into content_items table', async () => {
      const allItems = await getContentItems(db);
      const expectedCount = SEED_QUOTES.length + SEED_TIPS.length + getSeedMilestones().length;

      expect(allItems.length).toBe(expectedCount);
    });

    it('can run seedContent multiple times without errors or duplicate keys', async () => {
      // Re-run seedContent twice
      await seedContent(db);
      await seedContent(db);

      const allItems = await getContentItems(db);
      const expectedCount = SEED_QUOTES.length + SEED_TIPS.length + getSeedMilestones().length;
      expect(allItems.length).toBe(expectedCount);
    });
  });

  describe('getContentItems filtering', () => {
    it('filters items by type="quote"', async () => {
      const quotes = await getContentItems(db, { type: 'quote' });
      expect(quotes.length).toBe(SEED_QUOTES.length);
      expect(quotes.every((q) => q.type === 'quote')).toBe(true);
    });

    it('filters items by type="tip"', async () => {
      const tips = await getContentItems(db, { type: 'tip' });
      expect(tips.length).toBe(SEED_TIPS.length);
      expect(tips.every((t) => t.type === 'tip')).toBe(true);
    });

    it('filters items by type="milestone"', async () => {
      const milestones = await getContentItems(db, { type: 'milestone' });
      expect(milestones.length).toBe(getSeedMilestones().length);
      expect(milestones.every((m) => m.type === 'milestone')).toBe(true);
    });

    it('filters items by category', async () => {
      const resilienceQuotes = await getContentItems(db, { type: 'quote', category: 'resilience' });
      expect(resilienceQuotes.length).toBeGreaterThan(0);
      expect(resilienceQuotes.every((q) => q.category === 'resilience')).toBe(true);
    });
  });

  describe('getContentItemById', () => {
    it('retrieves an existing item by id', async () => {
      const item = await getContentItemById(db, 'quote_01');
      expect(item).not.toBeNull();
      expect(item?.id).toBe('quote_01');
      expect(item?.type).toBe('quote');
      expect(item?.body).toContain('Cravings are not commands');
    });

    it('returns null for non-existent id', async () => {
      const item = await getContentItemById(db, 'non_existent_id');
      expect(item).toBeNull();
    });
  });

  describe('getDailyQuote', () => {
    it('returns a deterministic quote for the current day', async () => {
      const quote1 = await getDailyQuote(db);
      const quote2 = await getDailyQuote(db);

      expect(quote1).not.toBeNull();
      expect(quote1?.type).toBe('quote');
      expect(quote2).not.toBeNull();
      expect(quote1?.id).toBe(quote2?.id);
    });

    it('returns null if there are no quotes in the database', async () => {
      const emptyDb = createTestDatabase();
      await emptyDb.execAsync(`
        CREATE TABLE content_items (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          locale TEXT NOT NULL DEFAULT 'en',
          title TEXT,
          body TEXT NOT NULL,
          category TEXT,
          day_index INTEGER,
          author_or_source TEXT
        );
      `);
      const result = await getDailyQuote(emptyDb);
      expect(result).toBeNull();
    });
  });

  describe('getRandomTip & getRandomQuote', () => {
    it('returns a valid tip', async () => {
      const tip = await getRandomTip(db);
      expect(tip).not.toBeNull();
      expect(tip?.type).toBe('tip');
      expect(tip?.body.length).toBeGreaterThan(5);
    });

    it('returns a valid quote', async () => {
      const quote = await getRandomQuote(db);
      expect(quote).not.toBeNull();
      expect(quote?.type).toBe('quote');
      expect(quote?.author_or_source).toBeDefined();
    });
  });
});
