import { type SQLiteDatabase } from 'expo-sqlite';
import { HEALTH_RECOVERY_TIMELINE } from '../../domain/healthTimeline';
import { ALL_ACHIEVEMENTS } from '../../domain/milestones';

export interface SeedContentItem {
  id: string;
  type: 'quote' | 'tip' | 'milestone';
  locale: string;
  title?: string;
  body: string;
  category: string;
  author_or_source?: string;
}

export const SEED_QUOTES: SeedContentItem[] = [
  {
    id: 'quote_01',
    type: 'quote',
    locale: 'en',
    category: 'resilience',
    title: 'The Nature of Urges',
    body: 'Cravings are not commands; they are simply temporary neurological ripples. Watch them rise and fall like waves.',
    author_or_source: 'Mindfulness-Based Relapse Prevention',
  },
  {
    id: 'quote_02',
    type: 'quote',
    locale: 'en',
    category: 'freedom',
    title: 'True Freedom',
    body: 'Freedom is not the absence of desire, but the mastery of choice.',
    author_or_source: 'Epictetus',
  },
  {
    id: 'quote_03',
    type: 'quote',
    locale: 'en',
    category: 'courage',
    title: 'Small Victories',
    body: 'Every time you choose breath over smoke, you reclaim authority over your life.',
    author_or_source: 'Ember Wisdom',
  },
  {
    id: 'quote_04',
    type: 'quote',
    locale: 'en',
    category: 'clarity',
    title: 'Breaking the Illusion',
    body: 'Smoking never solved stress; it only temporarily satisfied the withdrawal created by the previous cigarette.',
    author_or_source: 'Cognitive Cessation Science',
  },
  {
    id: 'quote_05',
    type: 'quote',
    locale: 'en',
    category: 'patience',
    title: 'The Discomfort of Healing',
    body: 'Withdrawal discomfort is not a sign that something is wrong; it is the physical sensation of your body healing.',
    author_or_source: 'NHS Smokefree',
  },
  {
    id: 'quote_06',
    type: 'quote',
    locale: 'en',
    category: 'identity',
    title: 'Your New Identity',
    body: 'You are not a smoker trying to resist; you are a healthy, smoke-free human protecting your peace.',
    author_or_source: 'James Clear, Atomic Habits',
  },
  {
    id: 'quote_07',
    type: 'quote',
    locale: 'en',
    category: 'resilience',
    title: 'Between Stimulus and Response',
    body: 'Between stimulus and response there is a space. In that space is our power to choose our response.',
    author_or_source: 'Viktor Frankl',
  },
  {
    id: 'quote_08',
    type: 'quote',
    locale: 'en',
    category: 'vitality',
    title: 'Clean Oxygen',
    body: 'Feel the clean, cool air entering your lungs. Your body has been waiting for this restoration.',
    author_or_source: 'Ember Breathwork',
  },
  {
    id: 'quote_09',
    type: 'quote',
    locale: 'en',
    category: 'patience',
    title: 'One Moment at a Time',
    body: 'You never have to resist smoking for the rest of your life right now. You only need to be smoke-free this present minute.',
    author_or_source: 'Urge Surfing Principle',
  },
  {
    id: 'quote_10',
    type: 'quote',
    locale: 'en',
    category: 'freedom',
    title: 'The Great Trade',
    body: 'You are trading temporary discomfort for decades of health, vitality, and true self-respect.',
    author_or_source: 'Motivational Cessation Therapy',
  },
  {
    id: 'quote_11',
    type: 'quote',
    locale: 'en',
    category: 'resilience',
    title: 'Master of Mind',
    body: 'He who conquers himself is mightier than he who conquers a city.',
    author_or_source: 'Eastern Philosophy',
  },
  {
    id: 'quote_12',
    type: 'quote',
    locale: 'en',
    category: 'clarity',
    title: 'Urges Peak Fast',
    body: 'A craving peaks in 3 to 5 minutes. If you can surf those 180 seconds, the wave will collapse on its own.',
    author_or_source: 'Dr. G. Alan Marlatt',
  },
  {
    id: 'quote_13',
    type: 'quote',
    locale: 'en',
    category: 'compassion',
    title: 'Gentle Strength',
    body: 'Treat yourself with fierce compassion today. Recovery is built on encouragement, never self-criticism.',
    author_or_source: 'Self-Compassion Science',
  },
  {
    id: 'quote_14',
    type: 'quote',
    locale: 'en',
    category: 'vitality',
    title: 'Regaining Energy',
    body: 'Every smoke-free hour cleanses your vascular system. Your heart is beating with less strain right now.',
    author_or_source: 'American Heart Association',
  },
  {
    id: 'quote_15',
    type: 'quote',
    locale: 'en',
    category: 'courage',
    title: 'Unshakable Will',
    body: 'Difficulties strengthen the mind, as labor does the body.',
    author_or_source: 'Seneca',
  },
];

export const SEED_TIPS: SeedContentItem[] = [
  {
    id: 'tip_4d_delay',
    type: 'tip',
    locale: 'en',
    category: '4Ds',
    title: '1. Delay for 5 Minutes',
    body: 'When an urge hits, set a 5-minute timer. Don’t fight the thought; just tell yourself you will wait 5 minutes. Most cravings peak and subside before the timer finishes.',
    author_or_source: 'NHS 4Ds Strategy',
  },
  {
    id: 'tip_4d_deep_breath',
    type: 'tip',
    locale: 'en',
    category: '4Ds',
    title: '2. Deep Breathing (4-7-8)',
    body: 'Inhale through your nose for 4 seconds, hold gently for 7 seconds, exhale slowly through your mouth for 8 seconds. This directly triggers your parasympathetic calming reflex.',
    author_or_source: 'Clinical Breathwork',
  },
  {
    id: 'tip_4d_drink_water',
    type: 'tip',
    locale: 'en',
    category: '4Ds',
    title: '3. Drink Ice-Cold Water',
    body: 'Sip a glass of ice water slowly through a straw. The temperature shift stimulates the vagus nerve and mimics the oral sensation, interrupting craving signals in the brain.',
    author_or_source: 'Behavioral Substitution',
  },
  {
    id: 'tip_4d_distract',
    type: 'tip',
    locale: 'en',
    category: '4Ds',
    title: '4. Distract Your Hands & Mind',
    body: 'Change your environment immediately. Walk into another room, wash dishes, solve a crossword, or do 10 pushups. Shifting sensory focus breaks the habitual loop.',
    author_or_source: 'Habit Reversal Therapy',
  },
  {
    id: 'tip_reframe_hunger',
    type: 'tip',
    locale: 'en',
    category: 'reframe',
    title: 'Notice "False Hunger"',
    body: 'Nicotine withdrawal often mimics low blood sugar or an empty stomach. Before assuming you need nicotine, eat a piece of fruit or a handful of nuts.',
    author_or_source: 'Nutritional Cessation Guide',
  },
  {
    id: 'tip_grounding_54321',
    type: 'tip',
    locale: 'en',
    category: 'mindfulness',
    title: '5-4-3-2-1 Sensory Grounding',
    body: 'Look around and name: 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. Grounding pulls your prefrontal cortex back into control.',
    author_or_source: 'Trauma & Addiction Psychology',
  },
  {
    id: 'tip_coffee_switch',
    type: 'tip',
    locale: 'en',
    category: 'triggers',
    title: 'Rewire the Morning Coffee Trigger',
    body: 'If morning coffee was your prime smoking trigger, change the environment: drink tea instead for a week, sit in a different room, or take your mug on a morning stroll.',
    author_or_source: 'CBT Trigger Planning',
  },
  {
    id: 'tip_clean_environment',
    type: 'tip',
    locale: 'en',
    category: 'environment',
    title: 'Eliminate Environmental Cues',
    body: 'Wash coats that smell like smoke, deep clean your car interior, and discard all lighters and ashtrays. Removing visual cues reduces craving spikes by over 40%.',
    author_or_source: 'Environmental Cue Exposure Studies',
  },
  {
    id: 'tip_urge_surfing',
    type: 'tip',
    locale: 'en',
    category: 'mindfulness',
    title: 'Urge Surfing Technique',
    body: 'Imagine your craving as an ocean wave. Do not fight it with clenched fists. Instead, observe where in your body you feel it (chest, throat, stomach) and breathe right into it.',
    author_or_source: 'Marlatt & Gordon',
  },
  {
    id: 'tip_oral_substitute',
    type: 'tip',
    locale: 'en',
    category: 'substitute',
    title: 'Oral Fixation Substitutes',
    body: 'Keep cinnamon sticks, toothpicks, sugar-free gum, or crunchy carrots nearby. Giving your mouth something healthy to do satisfies the tactile routine.',
    author_or_source: 'American Cancer Society',
  },
  {
    id: 'tip_money_jar',
    type: 'tip',
    locale: 'en',
    category: 'motivation',
    title: 'Visualize the Reward',
    body: 'Every dollar not spent on cigarettes is real wealth. Transfer your daily cigarette savings into a separate savings bucket for a celebratory weekend getaway or gift.',
    author_or_source: 'Financial Operant Conditioning',
  },
  {
    id: 'tip_alcohol_guard',
    type: 'tip',
    locale: 'en',
    category: 'triggers',
    title: 'Guard Against Social Alcohol',
    body: 'Alcohol lowers prefrontal inhibition and is the #1 trigger for slips in the first month. Consider taking a 3-week break from alcohol, or switch to tonic water with lime.',
    author_or_source: 'Relapse Prevention Science',
  },
];

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
    ...getSeedMilestones(),
  ];

  for (const item of allItems) {
    await db.runAsync(
      `INSERT OR REPLACE INTO content_items (id, type, locale, title, body, category, author_or_source)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.type,
        item.locale,
        item.title ?? null,
        item.body,
        item.category,
        item.author_or_source ?? null,
      ]
    );
  }
}
