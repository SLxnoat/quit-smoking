export type Clock = () => number;

export interface StatsInput {
  quitAt: number;
  cigsPerDay: number;
  packSize: number;
  packPrice: number;
  slipsCount?: number;
}

export interface TimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export interface SmokeFreeStats {
  elapsedMs: number;
  time: TimeBreakdown;
  cigsAvoided: number;
  moneySaved: number;
  lifeRegainedMinutes: number;
  lifeRegainedFormatted: string;
  isFutureQuit: boolean;
}

export function getTimeBreakdown(ms: number): TimeBreakdown {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function formatElapsedTimer(time: TimeBreakdown): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (time.days > 0) {
    return `${time.days}d ${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  }
  return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
}

export function calculateStats(
  input: StatsInput,
  clock: Clock = Date.now
): SmokeFreeStats {
  const now = clock();
  const diffMs = now - input.quitAt;
  const isFutureQuit = diffMs < 0;
  const elapsedMs = Math.max(0, diffMs);

  const time = getTimeBreakdown(elapsedMs);

  const elapsedDays = elapsedMs / 86400000;
  const theoreticalAvoided = Math.floor(elapsedDays * input.cigsPerDay);
  const slips = input.slipsCount ?? 0;
  const cigsAvoided = Math.max(0, theoreticalAvoided - slips);

  const packSize = Math.max(1, input.packSize);
  const moneySaved = Number(((cigsAvoided / packSize) * input.packPrice).toFixed(2));

  // ~11 minutes of life regained per avoided cigarette (standard epidemiological estimate)
  const lifeRegainedMinutes = cigsAvoided * 11;
  const lifeRegainedFormatted = formatDuration(lifeRegainedMinutes);

  return {
    elapsedMs,
    time,
    cigsAvoided,
    moneySaved,
    lifeRegainedMinutes,
    lifeRegainedFormatted,
    isFutureQuit,
  };
}
