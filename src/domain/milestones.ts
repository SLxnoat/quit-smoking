export type AchievementCategory = 'time' | 'craving' | 'money';

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  category: AchievementCategory;
  threshold: number;
  icon: string;
}

export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  // Time Milestones (threshold in seconds)
  {
    key: 'ms_20m',
    title: 'First Step',
    description: '20 minutes smoke-free. Heart rate is dropping.',
    category: 'time',
    threshold: 20 * 60,
    icon: '🌱',
  },
  {
    key: 'ms_1h',
    title: 'One Hour Strong',
    description: '60 minutes smoke-free. The journey has begun.',
    category: 'time',
    threshold: 60 * 60,
    icon: '⏱️',
  },
  {
    key: 'ms_12h',
    title: 'Oxygen Restored',
    description: '12 hours smoke-free. Carbon monoxide cleared.',
    category: 'time',
    threshold: 12 * 3600,
    icon: '🫁',
  },
  {
    key: 'ms_24h',
    title: 'First Full Day',
    description: '24 hours smoke-free! A monumental first day.',
    category: 'time',
    threshold: 24 * 3600,
    icon: '⭐',
  },
  {
    key: 'ms_3d',
    title: 'Nicotine-Free Peak',
    description: '72 hours smoke-free. Nicotine is entirely out of your system.',
    category: 'time',
    threshold: 72 * 3600,
    icon: '⚡',
  },
  {
    key: 'ms_1w',
    title: 'One Full Week',
    description: '7 days smoke-free. Your taste and smell are back.',
    category: 'time',
    threshold: 7 * 86400,
    icon: '🔥',
  },
  {
    key: 'ms_2w',
    title: 'Two Weeks of Freedom',
    description: '14 days smoke-free. Blood circulation is surging.',
    category: 'time',
    threshold: 14 * 86400,
    icon: '💪',
  },
  {
    key: 'ms_1m',
    title: 'One Month Milestone',
    description: '30 days smoke-free. Lung cilia actively regenerating.',
    category: 'time',
    threshold: 30 * 86400,
    icon: '🏆',
  },
  {
    key: 'ms_3m',
    title: '90-Day Transformation',
    description: '3 months smoke-free. Habitual pathways rewired.',
    category: 'time',
    threshold: 90 * 86400,
    icon: '🌟',
  },
  {
    key: 'ms_6m',
    title: 'Half a Year Smoke-Free',
    description: '6 months smoke-free. Stress levels lower than ever.',
    category: 'time',
    threshold: 180 * 86400,
    icon: '🎖️',
  },
  {
    key: 'ms_1y',
    title: 'One Year Legend',
    description: '365 days smoke-free. Coronary disease risk cut in half!',
    category: 'time',
    threshold: 365 * 86400,
    icon: '👑',
  },

  // Craving Milestones (threshold in count of cravings resisted)
  {
    key: 'crv_1',
    title: 'First Wave',
    description: 'Resisted your first craving with mindfulness.',
    category: 'craving',
    threshold: 1,
    icon: '🌊',
  },
  {
    key: 'crv_5',
    title: 'Urge Surfer',
    description: 'Resisted 5 cravings. You are mastering the wave.',
    category: 'craving',
    threshold: 5,
    icon: '🏄',
  },
  {
    key: 'crv_10',
    title: 'Mindful Master',
    description: 'Resisted 10 cravings. Cravings no longer control you.',
    category: 'craving',
    threshold: 10,
    icon: '🧘',
  },
  {
    key: 'crv_25',
    title: 'Iron Will',
    description: 'Resisted 25 cravings without giving in.',
    category: 'craving',
    threshold: 25,
    icon: '🛡️',
  },
  {
    key: 'crv_50',
    title: 'Craving Conqueror',
    description: 'Resisted 50 cravings. Pure psychological strength.',
    category: 'craving',
    threshold: 50,
    icon: '💎',
  },

  // Money Saved Milestones (threshold in currency units)
  {
    key: 'save_25',
    title: 'Pocket Money',
    description: 'Saved $25 by choosing not to buy tobacco.',
    category: 'money',
    threshold: 25,
    icon: '🪙',
  },
  {
    key: 'save_100',
    title: 'Century Club',
    description: 'Saved $100. Put it toward something you love.',
    category: 'money',
    threshold: 100,
    icon: '💵',
  },
  {
    key: 'save_500',
    title: 'Treat Yourself',
    description: 'Saved $500 that would have gone up in smoke.',
    category: 'money',
    threshold: 500,
    icon: '🎁',
  },
  {
    key: 'save_1000',
    title: 'Grand Saver',
    description: 'Over $1,000 saved! A true financial triumph.',
    category: 'money',
    threshold: 1000,
    icon: '🏦',
  },
];

export interface EvaluateAchievementsParams {
  elapsedSeconds: number;
  cravingsResisted?: number;
  moneySaved?: number;
  alreadyUnlockedKeys: Iterable<string>;
}

export function evaluateAchievements({
  elapsedSeconds,
  cravingsResisted = 0,
  moneySaved = 0,
  alreadyUnlockedKeys,
}: EvaluateAchievementsParams): AchievementDefinition[] {
  const unlockedSet = new Set(alreadyUnlockedKeys);
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const ach of ALL_ACHIEVEMENTS) {
    if (unlockedSet.has(ach.key)) {
      continue;
    }

    let achieved = false;
    switch (ach.category) {
      case 'time':
        achieved = elapsedSeconds >= ach.threshold;
        break;
      case 'craving':
        achieved = cravingsResisted >= ach.threshold;
        break;
      case 'money':
        achieved = moneySaved >= ach.threshold;
        break;
    }

    if (achieved) {
      newlyUnlocked.push(ach);
      unlockedSet.add(ach.key);
    }
  }

  return newlyUnlocked;
}
