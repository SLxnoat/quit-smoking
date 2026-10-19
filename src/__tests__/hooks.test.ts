import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useTicker } from '../hooks/use-ticker';
import { useStatsCore } from '../hooks/use-stats';
import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import { saveProfile } from '../db/repositories/profile.repo';
import { type SQLiteDatabase } from 'expo-sqlite';

// Enable act environment for React 19 test runner
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void) | void) => {
    const useEffect = jest.requireActual('react').useEffect;
    useEffect(() => {
      const cleanup = callback();
      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }, [callback]);
  },
}));

describe('useTicker hook', () => {
  it('initializes with current clock time', async () => {
    const fixedNow = 1700000000000;
    const { result, unmount } = await renderHook(() =>
      useTicker({ clock: () => fixedNow })
    );

    expect(result.current).toBe(fixedNow);
    await unmount();
  });

  it('ticks at specified intervals when active and focused', async () => {
    let tickCount = 0;
    const clock = () => {
      tickCount++;
      return 1000 + tickCount * 10;
    };

    const { result, unmount } = await renderHook(() =>
      useTicker({ intervalMs: 20, clock })
    );
    const initial = result.current;

    await waitFor(() => {
      expect(result.current).toBeGreaterThan(initial);
    });

    await unmount();
  });

  it('does not tick when enabled is false', async () => {
    let tickCount = 0;
    const clock = () => {
      tickCount++;
      return 1000 + tickCount * 10;
    };

    const { result, unmount } = await renderHook(() =>
      useTicker({ intervalMs: 20, enabled: false, clock })
    );

    const initial = result.current;
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current).toBe(initial);
    await unmount();
  });

  it('pauses ticking when AppState changes to background and resumes when active', async () => {
    let currentClock = 1000;
    const clock = () => currentClock;
    let appStateListener: ((state: AppStateStatus) => void) | undefined;

    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() } as any;
      });

    const { result, unmount } = await renderHook(() =>
      useTicker({ intervalMs: 30, clock })
    );
    expect(result.current).toBe(1000);

    // App goes to background
    await act(async () => {
      appStateListener?.('background');
    });

    currentClock = 5000;
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Should NOT have updated to 5000 while paused in background
    expect(result.current).toBe(1000);

    // App returns to active
    await act(async () => {
      currentClock = 6000;
      appStateListener?.('active');
    });

    // Immediately synchronizes upon return
    expect(result.current).toBe(6000);

    await unmount();
    addEventListenerSpy.mockRestore();
  });
});

describe('useStatsCore hook', () => {
  let db: SQLiteDatabase;
  const BASE_TIME = 1700000000000; // Reference fixed timestamp

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('returns initial loading state and null stats before profile is loaded', async () => {
    const { result, unmount } = await renderHook(() =>
      useStatsCore(db, { clock: () => BASE_TIME, enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.nextMilestone).toBeNull();
    expect(result.current.milestonesProgress).toEqual([]);
    await unmount();
  });

  it('computes accurate smoke-free stats once profile is created', async () => {
    // Quit was 2 hours ago (7,200 seconds)
    const quitAt = BASE_TIME - 2 * 3600 * 1000;

    await saveProfile(db, {
      quit_at: quitAt,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 10,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const { result, unmount } = await renderHook(() =>
      useStatsCore(db, { clock: () => BASE_TIME, enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile).not.toBeNull();
    });

    const stats = result.current.stats;
    expect(stats).not.toBeNull();
    expect(stats?.elapsedMs).toBe(2 * 3600 * 1000);
    expect(stats?.time.hours).toBe(2);
    expect(stats?.time.minutes).toBe(0);
    expect(stats?.cigsAvoided).toBe(1); // 2/24 days * 20 cigs = 1.66 -> floor(1.66) = 1
    expect(stats?.moneySaved).toBe(0.5); // 1 / 20 * 10 = $0.50
    expect(stats?.lifeRegainedMinutes).toBe(11); // 1 cig * 11 min
    await unmount();
  });

  it('evaluates upcoming and completed health milestones', async () => {
    // Quit was 1 hour ago (3,600 seconds)
    // 20-min milestone (1,200s) should be completed.
    // 8-hour milestone (28,800s) should be next upcoming.
    const quitAt = BASE_TIME - 3600 * 1000;

    await saveProfile(db, {
      quit_at: quitAt,
      cigs_per_day: 20,
      pack_size: 20,
      pack_price: 12,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const { result, unmount } = await renderHook(() =>
      useStatsCore(db, { clock: () => BASE_TIME, enabled: false })
    );

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    expect(result.current.nextMilestone).not.toBeNull();
    expect(result.current.nextMilestone?.id).toBe('health_8h');
    expect(result.current.milestonesProgress.length).toBe(14);

    const firstMilestone = result.current.milestonesProgress[0];
    expect(firstMilestone.id).toBe('health_20m');
    expect(firstMilestone.isCompleted).toBe(true);
    expect(firstMilestone.progress).toBe(1);
    await unmount();
  });

  it('refreshes profile data when refresh() is called', async () => {
    const quitAt = BASE_TIME - 3600 * 1000;

    await saveProfile(db, {
      quit_at: quitAt,
      cigs_per_day: 10,
      pack_size: 20,
      pack_price: 8,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    const { result, unmount } = await renderHook(() =>
      useStatsCore(db, { clock: () => BASE_TIME, enabled: false })
    );

    await waitFor(() => {
      expect(result.current.profile?.cigs_per_day).toBe(10);
    });

    // Update profile in DB
    await saveProfile(db, {
      quit_at: quitAt,
      cigs_per_day: 30,
      pack_size: 20,
      pack_price: 8,
      currency: 'USD',
      approach: 'cold_turkey',
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.profile?.cigs_per_day).toBe(30);
    await unmount();
  });
});
