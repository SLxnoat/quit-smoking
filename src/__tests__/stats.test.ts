import {
  calculateStats,
  formatDuration,
  formatElapsedTimer,
  getTimeBreakdown,
} from '../domain/stats';

describe('Stats Domain Logic', () => {
  it('TC-001: returns elapsed 0 and money 0 when quit_at equals current time', () => {
    const fixedNow = 1700000000000;
    const stats = calculateStats(
      {
        quitAt: fixedNow,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10.0,
      },
      () => fixedNow
    );

    expect(stats.elapsedMs).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.lifeRegainedMinutes).toBe(0);
    expect(stats.isFutureQuit).toBe(false);
  });

  it('TC-002: calculates exactly 35 cigarettes avoided after 3.5 days at 10 cigs/day', () => {
    const start = 1700000000000;
    const threePointFiveDays = 3.5 * 24 * 60 * 60 * 1000; // 302,400,000 ms
    const clock = () => start + threePointFiveDays;

    const stats = calculateStats(
      {
        quitAt: start,
        cigsPerDay: 10,
        packSize: 20,
        packPrice: 10.0,
      },
      clock
    );

    expect(stats.cigsAvoided).toBe(35);
  });

  it('TC-003: calculates $20.00 saved for 40 avoided cigarettes (pack of 20 @ $10.00)', () => {
    const start = 1700000000000;
    const twoDays = 2 * 24 * 60 * 60 * 1000; // 40 cigs at 20/day
    const clock = () => start + twoDays;

    const stats = calculateStats(
      {
        quitAt: start,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10.0,
      },
      clock
    );

    expect(stats.cigsAvoided).toBe(40);
    expect(stats.moneySaved).toBe(20.0);
  });

  it('TC-004: clamps elapsed to 0 and flags isFutureQuit when quit_at is in the future', () => {
    const now = 1700000000000;
    const future = now + 5 * 24 * 60 * 60 * 1000;

    const stats = calculateStats(
      {
        quitAt: future,
        cigsPerDay: 15,
        packSize: 20,
        packPrice: 12.0,
      },
      () => now
    );

    expect(stats.elapsedMs).toBe(0);
    expect(stats.cigsAvoided).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.isFutureQuit).toBe(true);
  });

  it('subtracts logged slips from cigarettes avoided and updates money saved', () => {
    const start = 1700000000000;
    const twoDays = 2 * 24 * 60 * 60 * 1000; // 40 avoided theoretically

    const stats = calculateStats(
      {
        quitAt: start,
        cigsPerDay: 20,
        packSize: 20,
        packPrice: 10.0,
        slipsCount: 5, // 5 cigarettes slipped
      },
      () => start + twoDays
    );

    expect(stats.cigsAvoided).toBe(35);
    expect(stats.moneySaved).toBe(17.5);
    expect(stats.lifeRegainedMinutes).toBe(35 * 11);
  });

  it('formats elapsed timer string with leading zeros and day counts', () => {
    expect(
      formatElapsedTimer({
        days: 0,
        hours: 5,
        minutes: 9,
        seconds: 3,
        totalSeconds: 18543,
      })
    ).toBe('05:09:03');

    expect(
      formatElapsedTimer({
        days: 3,
        hours: 14,
        minutes: 2,
        seconds: 45,
        totalSeconds: 309765,
      })
    ).toBe('3d 14:02:45');
  });

  it('formats life regained duration into human friendly strings', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(125)).toBe('2h 5m');
    expect(formatDuration(1500)).toBe('1d 1h');
  });

  it('correctly extracts time breakdown components', () => {
    const ms = (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
    const breakdown = getTimeBreakdown(ms);

    expect(breakdown.days).toBe(2);
    expect(breakdown.hours).toBe(3);
    expect(breakdown.minutes).toBe(4);
    expect(breakdown.seconds).toBe(5);
  });
});
