import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  getContentItems,
  getContentItemById,
  getLessons,
  getLessonByDay,
  getTodayLesson,
  searchContent,
  completeLesson,
  uncompleteLesson,
  isLessonCompleted,
  getCompletedLessonIds,
  toggleBookmark,
  isBookmarked,
  getBookmarkedItems,
} from '../db/repositories/content.repo';
import {
  seedContent,
  SEED_QUOTES,
  SEED_TIPS,
  SEED_LESSONS,
  SEED_ARTICLES,
  SEED_EXERCISES,
  SEED_SLIP_MESSAGES,
  getSeedMilestones,
} from '../db/seed/content';
import { type SQLiteDatabase } from 'expo-sqlite';

describe('Seed Content & Content Repository (Sprint 5)', () => {
  let db: SQLiteDatabase;

  const totalExpectedSeedItems =
    SEED_QUOTES.length +
    SEED_TIPS.length +
    SEED_LESSONS.length +
    SEED_ARTICLES.length +
    SEED_EXERCISES.length +
    SEED_SLIP_MESSAGES.length +
    getSeedMilestones().length;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  describe('seedContent idempotency & coverage', () => {
    it('seeds all quotes, tips, lessons, articles, exercises, slips, and milestones', async () => {
      const allItems = await getContentItems(db);
      expect(allItems.length).toBe(totalExpectedSeedItems);
      expect(SEED_QUOTES.length).toBe(120);
      expect(SEED_TIPS.length).toBe(60);
      expect(SEED_LESSONS.length).toBe(30);
      expect(SEED_ARTICLES.length).toBe(20);
      expect(SEED_EXERCISES.length).toBe(12);
      expect(SEED_SLIP_MESSAGES.length).toBe(15);
    });

    it('can run seedContent multiple times without duplicate keys or errors', async () => {
      await seedContent(db);
      await seedContent(db);

      const allItems = await getContentItems(db);
      expect(allItems.length).toBe(totalExpectedSeedItems);
    });
  });

  describe('getContentItems filtering', () => {
    it('filters items by type="quote"', async () => {
      const quotes = await getContentItems(db, { type: 'quote' });
      expect(quotes.length).toBe(120);
      expect(quotes.every((q) => q.type === 'quote')).toBe(true);
    });

    it('filters items by type="tip"', async () => {
      const tips = await getContentItems(db, { type: 'tip' });
      expect(tips.length).toBe(60);
      expect(tips.every((t) => t.type === 'tip')).toBe(true);
    });

    it('filters items by type="lesson"', async () => {
      const lessons = await getContentItems(db, { type: 'lesson' });
      expect(lessons.length).toBe(30);
      expect(lessons.every((l) => l.type === 'lesson')).toBe(true);
    });

    it('filters items by type="article"', async () => {
      const articles = await getContentItems(db, { type: 'article' });
      expect(articles.length).toBe(20);
      expect(articles.every((a) => a.type === 'article')).toBe(true);
    });

    it('filters items by type="exercise"', async () => {
      const exercises = await getContentItems(db, { type: 'exercise' });
      expect(exercises.length).toBe(12);
      expect(exercises.every((e) => e.type === 'exercise')).toBe(true);
    });

    it('filters items by type="slip_message"', async () => {
      const slips = await getContentItems(db, { type: 'slip_message' });
      expect(slips.length).toBe(15);
      expect(slips.every((s) => s.type === 'slip_message')).toBe(true);
    });

    it('filters items by type="milestone"', async () => {
      const milestones = await getContentItems(db, { type: 'milestone' });
      expect(milestones.length).toBe(getSeedMilestones().length);
      expect(milestones.every((m) => m.type === 'milestone')).toBe(true);
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

  describe('30-Day Lesson Path', () => {
    it('retrieves all 30 lessons in day order (1 to 30)', async () => {
      const lessons = await getLessons(db);
      expect(lessons).toHaveLength(30);
      for (let i = 0; i < 30; i++) {
        expect(lessons[i].day_index).toBe(i + 1);
      }
    });

    it('retrieves lesson for a specific day', async () => {
      const day3 = await getLessonByDay(db, 3);
      expect(day3).not.toBeNull();
      expect(day3?.day_index).toBe(3);
      expect(day3?.title).toContain('Mapping Your Cue Inventory');
    });

    it('computes today lesson based on quitAt timestamp', async () => {
      const now = Date.now();
      // User quit 3.5 days ago -> Day 4
      const quit3DaysAgo = now - 3.5 * 86400000;
      const result = await getTodayLesson(db, quit3DaysAgo, now);

      expect(result.currentDay).toBe(4);
      expect(result.lesson?.day_index).toBe(4);
      expect(result.isFutureQuit).toBe(false);

      // Future quit -> Day 1 preview
      const futureQuit = now + 86400000;
      const futureResult = await getTodayLesson(db, futureQuit, now);
      expect(futureResult.currentDay).toBe(1);
      expect(futureResult.isFutureQuit).toBe(true);

      // User quit 50 days ago -> capped at Day 30
      const quit50DaysAgo = now - 50 * 86400000;
      const cappedResult = await getTodayLesson(db, quit50DaysAgo, now);
      expect(cappedResult.currentDay).toBe(30);
      expect(cappedResult.lesson?.day_index).toBe(30);
    });
  });

  describe('Lesson Completion Tracking', () => {
    it('marks lesson complete, verifies status, and uncompletes', async () => {
      const lessonId = 'lesson-day-001';

      expect(await isLessonCompleted(db, lessonId)).toBe(false);

      await completeLesson(db, lessonId);
      expect(await isLessonCompleted(db, lessonId)).toBe(true);

      const completedIds = await getCompletedLessonIds(db);
      expect(completedIds.has(lessonId)).toBe(true);

      await uncompleteLesson(db, lessonId);
      expect(await isLessonCompleted(db, lessonId)).toBe(false);
    });
  });

  describe('Bookmarks Management', () => {
    it('toggles bookmarks on and off and retrieves bookmarked items', async () => {
      const contentId = 'article-001';

      expect(await isBookmarked(db, contentId)).toBe(false);

      const added = await toggleBookmark(db, contentId);
      expect(added).toBe(true);
      expect(await isBookmarked(db, contentId)).toBe(true);

      const bookmarks = await getBookmarkedItems(db);
      expect(bookmarks.some((b) => b.id === contentId)).toBe(true);

      const removed = await toggleBookmark(db, contentId);
      expect(removed).toBe(false);
      expect(await isBookmarked(db, contentId)).toBe(false);
    });
  });

  describe('searchContent', () => {
    it('searches titles, body, and category with search query', async () => {
      const results = await searchContent(db, 'nicotine');
      expect(results.length).toBeGreaterThan(0);

      const filteredExercises = await searchContent(db, 'breath', 'exercise');
      expect(filteredExercises.length).toBeGreaterThan(0);
      expect(filteredExercises.every((item) => item.type === 'exercise')).toBe(true);
    });
  });
});
