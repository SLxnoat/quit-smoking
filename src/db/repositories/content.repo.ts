import { type SQLiteDatabase } from 'expo-sqlite';

export interface ContentItem {
  id: string;
  type: 'quote' | 'tip' | 'lesson' | 'article' | 'exercise' | 'slip_message' | 'milestone';
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

  query += ' ORDER BY day_index ASC, id ASC;';

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

// -------------------------------------------------------------
// 30-Day Lesson Path
// -------------------------------------------------------------

export async function getLessons(db: SQLiteDatabase): Promise<ContentItem[]> {
  return await db.getAllAsync<ContentItem>(
    "SELECT * FROM content_items WHERE type = 'lesson' ORDER BY day_index ASC;"
  );
}

export async function getLessonByDay(
  db: SQLiteDatabase,
  dayIndex: number
): Promise<ContentItem | null> {
  const row = await db.getFirstAsync<ContentItem>(
    "SELECT * FROM content_items WHERE type = 'lesson' AND day_index = ? LIMIT 1;",
    [dayIndex]
  );
  return row ?? null;
}

export async function getTodayLesson(
  db: SQLiteDatabase,
  quitAtMs: number,
  nowMs: number = Date.now()
): Promise<{ lesson: ContentItem | null; currentDay: number; isFutureQuit: boolean }> {
  if (quitAtMs > nowMs) {
    const day1Lesson = await getLessonByDay(db, 1);
    return { lesson: day1Lesson, currentDay: 1, isFutureQuit: true };
  }

  const elapsedDays = Math.floor((nowMs - quitAtMs) / 86400000);
  const currentDay = Math.min(30, Math.max(1, elapsedDays + 1));
  const lesson = await getLessonByDay(db, currentDay);

  return { lesson, currentDay, isFutureQuit: false };
}

// -------------------------------------------------------------
// Search & Articles / Exercises
// -------------------------------------------------------------

export async function searchContent(
  db: SQLiteDatabase,
  queryText: string,
  typeFilter?: string
): Promise<ContentItem[]> {
  const trimmed = queryText.trim();
  if (!trimmed) {
    if (typeFilter) {
      return await getContentItems(db, { type: typeFilter });
    }
    return await getContentItems(db);
  }

  const searchParam = `%${trimmed}%`;
  let sql = `
    SELECT * FROM content_items
    WHERE (title LIKE ? OR body LIKE ? OR category LIKE ?)
  `;
  const params: (string | number)[] = [searchParam, searchParam, searchParam];

  if (typeFilter) {
    sql += ' AND type = ?';
    params.push(typeFilter);
  }

  sql += ' ORDER BY day_index ASC, id ASC;';

  return await db.getAllAsync<ContentItem>(sql, params);
}

// -------------------------------------------------------------
// Lesson Completion Tracking
// -------------------------------------------------------------

export async function completeLesson(db: SQLiteDatabase, lessonId: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO lesson_completions (lesson_id, completed_at) VALUES (?, ?);',
    [lessonId, Date.now()]
  );
}

export async function uncompleteLesson(db: SQLiteDatabase, lessonId: string): Promise<void> {
  await db.runAsync('DELETE FROM lesson_completions WHERE lesson_id = ?;', [lessonId]);
}

export async function isLessonCompleted(db: SQLiteDatabase, lessonId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ lesson_id: string }>(
    'SELECT lesson_id FROM lesson_completions WHERE lesson_id = ? LIMIT 1;',
    [lessonId]
  );
  return !!row;
}

export async function getCompletedLessonIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ lesson_id: string }>(
    'SELECT lesson_id FROM lesson_completions;'
  );
  return new Set(rows.map((r) => r.lesson_id));
}

// -------------------------------------------------------------
// Bookmarks Management
// -------------------------------------------------------------

export async function toggleBookmark(db: SQLiteDatabase, contentId: string): Promise<boolean> {
  const exists = await isBookmarked(db, contentId);
  if (exists) {
    await db.runAsync('DELETE FROM bookmarks WHERE content_id = ?;', [contentId]);
    return false;
  } else {
    await db.runAsync(
      'INSERT OR REPLACE INTO bookmarks (content_id, created_at) VALUES (?, ?);',
      [contentId, Date.now()]
    );
    return true;
  }
}

export async function isBookmarked(db: SQLiteDatabase, contentId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ content_id: string }>(
    'SELECT content_id FROM bookmarks WHERE content_id = ? LIMIT 1;',
    [contentId]
  );
  return !!row;
}

export async function getBookmarkedItems(db: SQLiteDatabase): Promise<ContentItem[]> {
  return await db.getAllAsync<ContentItem>(`
    SELECT c.* FROM content_items c
    INNER JOIN bookmarks b ON b.content_id = c.id
    ORDER BY b.created_at DESC;
  `);
}

export async function getBookmarkedIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ content_id: string }>('SELECT content_id FROM bookmarks;');
  return new Set(rows.map((r) => r.content_id));
}
