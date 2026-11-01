import { type CravingLog } from '../db/repositories/craving.repo';
import { type Trigger } from '../db/repositories/triggers.repo';
import { type Checkin } from '../db/repositories/checkins.repo';
import { type Slip } from '../db/repositories/slips.repo';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type WeekdayName = (typeof WEEKDAYS)[number];

export interface TimeBlock {
  key: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  hourRange: string;
  startHour: number;
  endHour: number;
}

export const TIME_BLOCKS: TimeBlock[] = [
  { key: 'morning', label: 'Morning', hourRange: '06:00 - 11:59', startHour: 6, endHour: 11 },
  { key: 'afternoon', label: 'Afternoon', hourRange: '12:00 - 17:59', startHour: 12, endHour: 17 },
  { key: 'evening', label: 'Evening', hourRange: '18:00 - 23:59', startHour: 18, endHour: 23 },
  { key: 'night', label: 'Night', hourRange: '00:00 - 05:59', startHour: 0, endHour: 5 },
];

export interface HeatmapInsights {
  // 7 weekdays x 24 hours counts
  hourlyMatrix: number[][]; // [weekday 0-6][hour 0-23]
  // 7 weekdays x 4 time blocks
  blockMatrix: number[][]; // [weekday 0-6][block 0-3]
  totalCravings: number;
  maxHourlyCount: number;
  maxBlockCount: number;
  peakWeekdayIndex: number | null;
  peakWeekdayName: WeekdayName | null;
  peakHour: number | null;
  peakHourFormatted: string | null;
  peakBlockKey: TimeBlock['key'] | null;
  peakBlockLabel: string | null;
  summaryText: string;
}

export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const ampm = normalized >= 12 ? 'PM' : 'AM';
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour}:00 ${ampm}`;
}

export function formatHourRange(hour: number): string {
  const start = formatHour(hour);
  const end = formatHour((hour + 1) % 24);
  return `${start} - ${end}`;
}

/**
 * Calculates hourly and weekday distribution of cravings for heatmap visualization.
 * Robust against empty, single, or massive datasets (1,000+ entries).
 */
export function calculateHeatmap(cravings: CravingLog[]): HeatmapInsights {
  const hourlyMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const blockMatrix: number[][] = Array.from({ length: 7 }, () => Array(4).fill(0));

  let totalCravings = 0;

  for (const craving of cravings) {
    if (!craving.started_at) continue;
    const date = new Date(craving.started_at);
    if (isNaN(date.getTime())) continue;

    const weekday = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23

    hourlyMatrix[weekday][hour] += 1;
    totalCravings += 1;

    // Time block mapping
    let blockIndex = 3; // default night (0-5)
    if (hour >= 6 && hour <= 11) blockIndex = 0;
    else if (hour >= 12 && hour <= 17) blockIndex = 1;
    else if (hour >= 18 && hour <= 23) blockIndex = 2;

    blockMatrix[weekday][blockIndex] += 1;
  }

  let maxHourlyCount = 0;
  let peakWeekdayIndex: number | null = null;
  let peakHour: number | null = null;

  for (let w = 0; w < 7; w++) {
    for (let h = 0; h < 24; h++) {
      const count = hourlyMatrix[w][h];
      if (count > maxHourlyCount) {
        maxHourlyCount = count;
        peakWeekdayIndex = w;
        peakHour = h;
      }
    }
  }

  let maxBlockCount = 0;
  let peakBlockIndex: number | null = null;
  for (let w = 0; w < 7; w++) {
    for (let b = 0; b < 4; b++) {
      const count = blockMatrix[w][b];
      if (count > maxBlockCount) {
        maxBlockCount = count;
        peakBlockIndex = b;
      }
    }
  }

  const peakWeekdayName = peakWeekdayIndex !== null ? WEEKDAYS[peakWeekdayIndex] : null;
  const peakHourFormatted = peakHour !== null ? formatHourRange(peakHour) : null;
  const peakBlock = peakBlockIndex !== null ? TIME_BLOCKS[peakBlockIndex] : null;

  let summaryText = 'No cravings recorded yet. Patterns will emerge as you record urges.';
  if (totalCravings > 0 && peakWeekdayName && peakHour !== null) {
    summaryText = `Based on ${totalCravings} recorded urge${totalCravings > 1 ? 's' : ''}, your peak craving time is ${peakWeekdayName} between ${formatHourRange(peakHour)} (${maxHourlyCount} urge${maxHourlyCount > 1 ? 's' : ''}).`;
  }

  return {
    hourlyMatrix,
    blockMatrix,
    totalCravings,
    maxHourlyCount,
    maxBlockCount,
    peakWeekdayIndex,
    peakWeekdayName,
    peakHour,
    peakHourFormatted,
    peakBlockKey: peakBlock?.key ?? null,
    peakBlockLabel: peakBlock?.label ?? null,
    summaryText,
  };
}

export interface TriggerInsight {
  triggerId: number | null;
  label: string;
  count: number;
  percentage: number; // 0-100
  resistedCount: number;
  smokedCount: number;
}

export interface TopTriggersInsights {
  triggers: TriggerInsight[];
  totalTagged: number;
  topTrigger: TriggerInsight | null;
  summaryText: string;
}

/**
 * Calculates top situational triggers across cravings and slips.
 */
export function calculateTopTriggers(
  cravings: CravingLog[],
  triggersList: Trigger[],
  slips: Slip[] = []
): TopTriggersInsights {
  const triggerMap = new Map<number, Trigger>();
  for (const t of triggersList) {
    triggerMap.set(t.id, t);
  }

  const counts = new Map<
    number | null,
    { count: number; resisted: number; smoked: number }
  >();

  let totalTagged = 0;

  for (const c of cravings) {
    const key = c.trigger_id ?? null;
    const existing = counts.get(key) ?? { count: 0, resisted: 0, smoked: 0 };
    existing.count += 1;
    if (c.outcome === 'resisted') existing.resisted += 1;
    if (c.outcome === 'smoked') existing.smoked += 1;
    counts.set(key, existing);
    totalTagged += 1;
  }

  for (const s of slips) {
    const key = s.trigger_id ?? null;
    const existing = counts.get(key) ?? { count: 0, resisted: 0, smoked: 0 };
    existing.count += 1;
    existing.smoked += s.cigarettes || 1;
    counts.set(key, existing);
    totalTagged += 1;
  }

  const results: TriggerInsight[] = [];

  for (const [triggerId, data] of counts.entries()) {
    let label = 'Untagged / Other';
    if (triggerId !== null && triggerMap.has(triggerId)) {
      label = triggerMap.get(triggerId)!.label;
    }
    const percentage = totalTagged > 0 ? Math.round((data.count / totalTagged) * 100) : 0;
    results.push({
      triggerId,
      label,
      count: data.count,
      percentage,
      resistedCount: data.resisted,
      smokedCount: data.smoked,
    });
  }

  // Sort descending by total count
  results.sort((a, b) => b.count - a.count);

  const topTrigger = results.length > 0 ? results[0] : null;

  let summaryText = 'No trigger occurrences recorded yet.';
  if (topTrigger && totalTagged > 0) {
    summaryText = `"${topTrigger.label}" is your most frequent trigger, accounting for ${topTrigger.percentage}% of all recorded urges (${topTrigger.count} times).`;
  }

  return {
    triggers: results,
    totalTagged,
    topTrigger,
    summaryText,
  };
}

export interface MoodTrendDay {
  day: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon"
  hasCheckin: boolean;
  mood: number | null; // 1-10
  stress: number | null; // 1-10
  confidence: number | null; // 1-10
  sleepQuality: number | null; // 1-10
}

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface MoodTrendInsights {
  days: MoodTrendDay[];
  averageMood: number | null;
  averageStress: number | null;
  averageConfidence: number | null;
  averageSleepQuality: number | null;
  moodTrend: TrendDirection;
  stressTrend: TrendDirection;
  checkinsRecorded: number;
  totalDays: number;
  summaryText: string;
}

/**
 * Calculates mood and stress trends over the past N days.
 */
export function calculateMoodTrend(
  checkins: Checkin[],
  daysCount: number = 7,
  referenceDate: Date = new Date()
): MoodTrendInsights {
  const checkinByDay = new Map<string, Checkin>();
  for (const c of checkins) {
    checkinByDay.set(c.day, c);
  }

  const days: MoodTrendDay[] = [];
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  // Generate date range backwards
  for (let i = daysCount - 1; i >= 0; i--) {
    const current = new Date(start);
    current.setDate(start.getDate() - i);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(current.getDate()).padStart(2, '0');
    const dayStr = `${year}-${month}-${dayOfMonth}`;
    const dayLabel = WEEKDAYS[current.getDay()];

    const found = checkinByDay.get(dayStr);
    days.push({
      day: dayStr,
      dayLabel,
      hasCheckin: !!found,
      mood: found?.mood ?? null,
      stress: found?.stress ?? null,
      confidence: found?.confidence ?? null,
      sleepQuality: found?.sleep_quality ?? null,
    });
  }

  const validMoods = days.filter((d) => d.mood !== null).map((d) => d.mood as number);
  const validStresses = days.filter((d) => d.stress !== null).map((d) => d.stress as number);
  const validConfidences = days.filter((d) => d.confidence !== null).map((d) => d.confidence as number);
  const validSleeps = days.filter((d) => d.sleepQuality !== null).map((d) => d.sleepQuality as number);

  const average = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  const averageMood = average(validMoods);
  const averageStress = average(validStresses);
  const averageConfidence = average(validConfidences);
  const averageSleepQuality = average(validSleeps);

  // Calculate trends by comparing earlier half to later half of valid moods
  let moodTrend: TrendDirection = 'stable';
  if (validMoods.length >= 2) {
    const mid = Math.floor(validMoods.length / 2);
    const firstHalf = validMoods.slice(0, mid);
    const secondHalf = validMoods.slice(mid);
    const avgFirst = average(firstHalf) || 0;
    const avgSecond = average(secondHalf) || 0;
    if (avgSecond - avgFirst >= 0.5) moodTrend = 'improving';
    else if (avgFirst - avgSecond >= 0.5) moodTrend = 'declining';
  }

  let stressTrend: TrendDirection = 'stable';
  if (validStresses.length >= 2) {
    const mid = Math.floor(validStresses.length / 2);
    const firstHalf = validStresses.slice(0, mid);
    const secondHalf = validStresses.slice(mid);
    const avgFirst = average(firstHalf) || 0;
    const avgSecond = average(secondHalf) || 0;
    // Lower stress is improving, higher stress is declining
    if (avgFirst - avgSecond >= 0.5) stressTrend = 'improving';
    else if (avgSecond - avgFirst >= 0.5) stressTrend = 'declining';
  }

  let summaryText = 'No daily check-ins recorded yet for this period.';
  if (validMoods.length > 0) {
    const moodStr = averageMood !== null ? `${averageMood}/10` : 'N/A';
    const stressStr = averageStress !== null ? `${averageStress}/10` : 'N/A';
    summaryText = `Over the past ${daysCount} days (${validMoods.length} check-in${validMoods.length > 1 ? 's' : ''}), your average mood is ${moodStr} (${moodTrend}) and average stress is ${stressStr}.`;
  }

  return {
    days,
    averageMood,
    averageStress,
    averageConfidence,
    averageSleepQuality,
    moodTrend,
    stressTrend,
    checkinsRecorded: validMoods.length,
    totalDays: daysCount,
    summaryText,
  };
}

export interface CravingOutcomeStats {
  total: number;
  resisted: number;
  smoked: number;
  abandoned: number;
  resistedPercentage: number;
  smokedPercentage: number;
  summaryText: string;
}

/**
 * Calculates outcome stats (resisted vs smoked vs abandoned) across cravings.
 */
export function calculateOutcomeStats(cravings: CravingLog[]): CravingOutcomeStats {
  let resisted = 0;
  let smoked = 0;
  let abandoned = 0;

  for (const c of cravings) {
    if (c.outcome === 'resisted') resisted++;
    else if (c.outcome === 'smoked') smoked++;
    else if (c.outcome === 'abandoned') abandoned++;
  }

  const total = cravings.length;
  const resistedPercentage = total > 0 ? Math.round((resisted / total) * 100) : 0;
  const smokedPercentage = total > 0 ? Math.round((smoked / total) * 100) : 0;

  let summaryText = 'No craving sessions logged yet.';
  if (total > 0) {
    summaryText = `You have resisted ${resisted} of ${total} cravings (${resistedPercentage}% success rate).`;
  }

  return {
    total,
    resisted,
    smoked,
    abandoned,
    resistedPercentage,
    smokedPercentage,
    summaryText,
  };
}
