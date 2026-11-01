import { type SQLiteDatabase } from 'expo-sqlite';
import { HEALTH_RECOVERY_TIMELINE } from '../../domain/healthTimeline';
import { ALL_ACHIEVEMENTS } from '../../domain/milestones';

import quotesJson from './content/quotes.en.json';
import tipsJson from './content/tips.en.json';
import lessonsJson from './content/lessons.en.json';
import articlesJson from './content/articles.en.json';
import exercisesJson from './content/exercises.en.json';
import slipMessagesJson from './content/slip_messages.en.json';

export interface SeedContentItem {
  id: string;
  type: 'quote' | 'tip' | 'lesson' | 'article' | 'exercise' | 'slip_message' | 'milestone';
  locale: string;
  title?: string;
  body: string;
  category: string;
  day_index?: number;
  author_or_source?: string;
}

export const SEED_QUOTES: SeedContentItem[] = quotesJson.items.map((q) => ({
  id: q.id,
  type: 'quote',
  locale: quotesJson.locale,
  title: q.title,
  body: q.body,
  category: q.category,
  author_or_source: q.source,
}));

export const SEED_TIPS: SeedContentItem[] = tipsJson.items.map((t) => ({
  id: t.id,
  type: 'tip',
  locale: tipsJson.locale,
  title: t.title,
  body: t.body,
  category: t.category,
  author_or_source: t.source,
}));

export const SEED_LESSONS: SeedContentItem[] = lessonsJson.items.map((l) => ({
  id: l.id,
  type: 'lesson',
  locale: lessonsJson.locale,
  title: l.title,
  body: l.body,
  category: l.category,
  day_index: l.dayIndex,
  author_or_source: l.source,
}));

export const SEED_ARTICLES: SeedContentItem[] = articlesJson.items.map((a) => ({
  id: a.id,
  type: 'article',
  locale: articlesJson.locale,
  title: a.title,
  body: a.body,
  category: a.category,
  author_or_source: a.source,
}));

export const SEED_EXERCISES: SeedContentItem[] = exercisesJson.items.map((e) => ({
  id: e.id,
  type: 'exercise',
  locale: exercisesJson.locale,
  title: e.title,
  body: e.body,
  category: e.category,
  author_or_source: e.source,
}));

export const SEED_SLIP_MESSAGES: SeedContentItem[] = slipMessagesJson.items.map((s) => ({
  id: s.id,
  type: 'slip_message',
  locale: slipMessagesJson.locale,
  title: s.title,
  body: s.body,
  category: s.category,
  author_or_source: s.source,
}));

export function getSeedMilestones(): SeedContentItem[] {
  const items: SeedContentItem[] = [];

  for (const m of HEALTH_RECOVERY_TIMELINE) {
    items.push({
      id: `content_${m.id}`,
      type: 'milestone',
      locale: 'en',
      category: m.category,
      title: m.title,
      body: m.description,
      author_or_source: m.source,
    });
  }

  for (const a of ALL_ACHIEVEMENTS) {
    items.push({
      id: `content_ach_${a.key}`,
      type: 'milestone',
      locale: 'en',
      category: a.category,
      title: a.title,
      body: a.description,
      author_or_source: 'Ember Achievement',
    });
  }

  return items;
}

export async function seedContent(db: SQLiteDatabase): Promise<void> {
  const allItems: SeedContentItem[] = [
    ...SEED_QUOTES,
    ...SEED_TIPS,
    ...SEED_LESSONS,
    ...SEED_ARTICLES,
    ...SEED_EXERCISES,
    ...SEED_SLIP_MESSAGES,
    ...getSeedMilestones(),
  ];

  for (const item of allItems) {
    await db.runAsync(
      `INSERT OR REPLACE INTO content_items (id, type, locale, title, body, category, day_index, author_or_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.type,
        item.locale,
        item.title ?? null,
        item.body,
        item.category,
        item.day_index ?? null,
        item.author_or_source ?? null,
      ]
    );
  }
}
