import { type SQLiteDatabase } from 'expo-sqlite';

export interface ContentItem {
  id: string;
  type: 'quote' | 'tip' | 'lesson' | 'article' | 'exercise' | 'milestone';
  locale: string;
  title: string | null;
  body: string;
  category: string | null;
  day_index: number | null;
  author_or_source: string | null;
}

export interface GetContentOptions {
  type?: string;
  category?: string;
  locale?: string;
}

export async function getContentItems(
  db: SQLiteDatabase,
  options: GetContentOptions = {}
): Promise<ContentItem[]> {
  const { type, category, locale = 'en' } = options;

  let query = 'SELECT * FROM content_items WHERE locale = ?';
  const params: (string | number)[] = [locale];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY id ASC;';

  return await db.getAllAsync<ContentItem>(query, params);
}

export async function getContentItemById(
  db: SQLiteDatabase,
  id: string
): Promise<ContentItem | null> {
  const row = await db.getFirstAsync<ContentItem>(
    'SELECT * FROM content_items WHERE id = ? LIMIT 1;',
    [id]
  );
  return row ?? null;
}

export async function getDailyQuote(
  db: SQLiteDatabase,
  locale: string = 'en'
): Promise<ContentItem | null> {
  const quotes = await getContentItems(db, { type: 'quote', locale });
  if (quotes.length === 0) {
    return null;
  }

  // Deterministic daily rotation based on day number
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const index = daysSinceEpoch % quotes.length;
  return quotes[index] ?? null;
}

export async function getRandomTip(
  db: SQLiteDatabase,
  category?: string,
  locale: string = 'en'
): Promise<ContentItem | null> {
  const tips = await getContentItems(db, { type: 'tip', category, locale });
  if (tips.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * tips.length);
  return tips[randomIndex] ?? null;
}

export async function getRandomQuote(
  db: SQLiteDatabase,
  locale: string = 'en'
): Promise<ContentItem | null> {
  const quotes = await getContentItems(db, { type: 'quote', locale });
  if (quotes.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex] ?? null;
}
