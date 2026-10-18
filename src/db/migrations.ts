import { type SQLiteDatabase } from 'expo-sqlite';
import { configurePragmas } from './client';

export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  quit_at INTEGER NOT NULL,
  cigs_per_day REAL NOT NULL,
  pack_size INTEGER NOT NULL DEFAULT 20,
  pack_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  years_smoked REAL,
  approach TEXT NOT NULL DEFAULT 'cold_turkey',
  confidence INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,
  label TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  coping_plan TEXT
);

CREATE TABLE IF NOT EXISTS craving_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  duration_sec INTEGER,
  intensity_before INTEGER,
  intensity_after INTEGER,
  outcome TEXT NOT NULL CHECK (outcome IN ('resisted', 'smoked', 'abandoned')),
  trigger_id INTEGER REFERENCES triggers(id) ON DELETE SET NULL,
  tool_used TEXT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_craving_started ON craving_logs(started_at);

CREATE TABLE IF NOT EXISTS slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at INTEGER NOT NULL,
  cigarettes INTEGER NOT NULL DEFAULT 1,
  trigger_id INTEGER REFERENCES triggers(id) ON DELETE SET NULL,
  reflection TEXT,
  reset_streak INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL UNIQUE,
  mood INTEGER,
  stress INTEGER,
  confidence INTEGER,
  sleep_quality INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS thought_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  situation TEXT,
  thought TEXT,
  emotion TEXT,
  reframe TEXT,
  belief_before INTEGER,
  belief_after INTEGER
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  target_amount REAL NOT NULL,
  achieved_at INTEGER
);

CREATE TABLE IF NOT EXISTS achievements (
  key TEXT PRIMARY KEY,
  unlocked_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS support_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  title TEXT,
  body TEXT NOT NULL,
  category TEXT,
  day_index INTEGER,
  author_or_source TEXT
);
CREATE INDEX IF NOT EXISTS idx_content_type ON content_items(type, locale);

CREATE TABLE IF NOT EXISTS bookmarks (
  content_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const PREDEFINED_TRIGGERS = [
  {
    key: 'stress',
    label: 'Feeling stressed or overwhelmed',
    coping_plan: 'If stressed, take 5 slow box breaths and drink a glass of cold water.',
  },
  {
    key: 'coffee',
    label: 'Morning coffee or tea',
    coping_plan: 'If having morning coffee, sit in a different spot and hold a stress ball.',
  },
  {
    key: 'alcohol',
    label: 'Social drinks or gatherings',
    coping_plan: 'If drinking socially, keep sparkling water in hand and stay away from smoke zones.',
  },
  {
    key: 'after_meal',
    label: 'Immediately after meals',
    coping_plan: 'If finishing a meal, immediately brush teeth or chew sugar-free mint gum.',
  },
  {
    key: 'driving',
    label: 'Driving or stuck in traffic',
    coping_plan: 'If driving, turn on an engaging podcast or upbeat music and hold the wheel firmly.',
  },
  {
    key: 'boredom',
    label: 'Boredom or waiting around',
    coping_plan: 'If feeling bored, launch the 3-minute distraction exercise or do 10 pushups.',
  },
  {
    key: 'social_smokers',
    label: 'Seeing friends or coworkers smoke',
    coping_plan: 'If others smoke, remind myself: "I am a non-smoker" and excuse myself.',
  },
  {
    key: 'work_break',
    label: 'Taking a work break',
    coping_plan: 'If taking a break, take a brisk 5-minute walk outside without a lighter.',
  },
];

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  return result?.user_version ?? 0;
}

export async function setSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version};`);
}

export async function seedTriggers(db: SQLiteDatabase): Promise<void> {
  for (const t of PREDEFINED_TRIGGERS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO triggers (key, label, is_custom, is_active, coping_plan)
       VALUES (?, ?, 0, 1, ?);`,
      [t.key, t.label, t.coping_plan]
    );
  }
}

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await configurePragmas(db);
  const currentVersion = await getSchemaVersion(db);

  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V1);
      await seedTriggers(db);
      await setSchemaVersion(db, 1);
    });
  }
}
