import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ProgressRing } from '../components/progress-ring';
import { StatTile } from '../components/stat-tile';
import { Text } from '../components/text';
import { ThemeProvider } from '../hooks/use-theme';
import HomeScreen from '../app/(tabs)/index';
import ProgressScreen from '../app/(tabs)/progress';
import SettingsScreen from '../app/(tabs)/settings';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    replace: jest.fn(),
  },
  useFocusEffect: (callback: () => (() => void) | void) => {
    const useEffect = jest.requireActual('react').useEffect;
    useEffect(() => {
      const cleanup = callback();
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }, [callback]);
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return React.createElement(RNText, { testID: `icon-${name}` }, name);
  },
}));

// Mock useStats hook
const mockUseStats = jest.fn();
jest.mock('../hooks/use-stats', () => ({
  useStats: () => mockUseStats(),
}));

// Mock content repo
jest.mock('../db/repositories/content.repo', () => ({
  getDailyQuote: jest.fn().mockResolvedValue({
    id: 'quote_01',
    type: 'quote',
    body: 'Cravings are not commands; they are simply temporary ripples.',
    author_or_source: 'Mindfulness Relapse Prevention',
    category: 'resilience',
  }),
}));

// Mock expo-sqlite
const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM profile')) {
      return {
        id: 1,
        quit_at: 1700000000000,
        cigs_per_day: 15,
        pack_size: 20,
        pack_price: 12.0,
        currency: 'USD',
        approach: 'cold_turkey',
        created_at: 1700000000000,
      };
    }
    return null;
  }),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('UI Components: ProgressRing & StatTile', () => {
  it('renders ProgressRing with accessible progressbar attributes and children', async () => {
    await render(
      <ThemeProvider>
        <ProgressRing progress={0.75} size={160} strokeWidth={12}>
          <Text variant="title1">75%</Text>
        </ProgressRing>
      </ThemeProvider>
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeTruthy();
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
    });
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('clamps negative and overflow progress values between 0 and 1', async () => {
    const { rerender } = await render(
      <ThemeProvider>
        <ProgressRing progress={-0.2} size={120}>
          <Text>Underflow</Text>
        </ProgressRing>
      </ThemeProvider>
    );

    let progressBar = screen.getByRole('progressbar');
    expect(progressBar.props.accessibilityValue.now).toBe(0);

    await rerender(
      <ThemeProvider>
        <ProgressRing progress={1.5} size={120}>
          <Text>Overflow</Text>
        </ProgressRing>
      </ThemeProvider>
    );

    progressBar = screen.getByRole('progressbar');
    expect(progressBar.props.accessibilityValue.now).toBe(100);
  });

  it('renders StatTile with label, formatted value, icon, and optional subtext', async () => {
    await render(
      <ThemeProvider>
        <StatTile
          label="Cigarettes Avoided"
          value="120"
          subtext="+10 today"
          icon="🚭"
          testID="avoided-tile"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('avoided-tile')).toBeTruthy();
    expect(screen.getByText('CIGARETTES AVOIDED')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('+10 today')).toBeTruthy();
    expect(screen.getByText('🚭')).toBeTruthy();
  });
});

describe('HomeScreen', () => {
  const dummyProfile = {
    id: 1,
    quit_at: Date.now() - 3 * 86400 * 1000,
    cigs_per_day: 20,
    pack_size: 20,
    pack_price: 12.0,
    currency: 'USD',
    approach: 'cold_turkey' as const,
    created_at: Date.now() - 3 * 86400 * 1000,
  };

  const dummyStats = {
    elapsedMs: 3 * 86400 * 1000,
    time: { days: 3, hours: 0, minutes: 0, seconds: 0, totalSeconds: 3 * 86400 },
    cigsAvoided: 60,
    moneySaved: 36.0,
    lifeRegainedMinutes: 660,
    lifeRegainedFormatted: '11h',
    isFutureQuit: false,
  };

  const dummyNextMilestone = {
    id: 'nicotine_free_body',
    title: '100% Nicotine-Free Body',
    thresholdSeconds: 72 * 3600,
    timeLabel: '72 hours',
    description: 'Nicotine is completely eliminated from your body.',
    source: 'NHS Smokefree',
    category: 'respiratory' as const,
    isCompleted: false,
    progress: 0.95,
    secondsRemaining: 3600,
  };

  beforeEach(() => {
    mockUseStats.mockReturnValue({
      profile: dummyProfile,
      stats: dummyStats,
      nextMilestone: dummyNextMilestone,
      milestonesProgress: [dummyNextMilestone],
      isLoading: false,
      refresh: jest.fn(),
      now: Date.now(),
    });
  });

  it('renders smoke-free timer ring, 3 stat tiles, and next milestone card', async () => {
    await render(
      <ThemeProvider>
        <HomeScreen />
      </ThemeProvider>
    );

    // Header & Timer Ring
    expect(screen.getByText('Ember')).toBeTruthy();
    expect(screen.getByText('SMOKE-FREE')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('DAYS')).toBeTruthy();

    // 3 Stat Tiles
    expect(screen.getByText('SAVED')).toBeTruthy();
    expect(screen.getByText('$36.00')).toBeTruthy();

    expect(screen.getByText('AVOIDED')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();

    expect(screen.getByText('REGAINED')).toBeTruthy();
    expect(screen.getByText('11h')).toBeTruthy();

    // Next Milestone
    expect(screen.getByText('100% Nicotine-Free Body')).toBeTruthy();
    expect(screen.getByText('Nicotine is completely eliminated from your body.')).toBeTruthy();

    // Daily Inspiration Quote
    expect(await screen.findByText(/Cravings are not commands/)).toBeTruthy();

    // Craving SOS trigger card
    expect(screen.getByText('Experiencing an Urge?')).toBeTruthy();
  });

  it('navigates to progress tab when tapping the next milestone card', async () => {
    await render(
      <ThemeProvider>
        <HomeScreen />
      </ThemeProvider>
    );

    const milestoneBtn = screen.getByLabelText(/Next milestone: 100% Nicotine-Free Body/i);
    fireEvent.press(milestoneBtn);

    expect(mockPush).toHaveBeenCalledWith('/progress');
  });
});

describe('ProgressScreen', () => {
  const dummyMilestonesProgress = [
    {
      id: 'health_20m',
      title: 'Pulse & Blood Pressure Normalizing',
      thresholdSeconds: 1200,
      afterMinutes: 20,
      timeLabel: '20 minutes',
      description: 'Heart rate drops.',
      source: 'WHO',
      category: 'cardiovascular' as const,
      isCompleted: true,
      progress: 1,
      secondsRemaining: 0,
    },
    {
      id: 'health_8h',
      title: 'Carbon Monoxide Halved',
      thresholdSeconds: 28800,
      afterMinutes: 480,
      timeLabel: '8 hours',
      description: 'CO drops by half.',
      source: 'CDC',
      category: 'cardiovascular' as const,
      isCompleted: false,
      progress: 0.45,
      secondsRemaining: 15000,
    },
  ];

  beforeEach(() => {
    mockUseStats.mockReturnValue({
      profile: {
        id: 1,
        currency: 'USD',
      },
      stats: {
        elapsedMs: 5000 * 1000,
        time: { days: 0, hours: 1, minutes: 23, seconds: 20, totalSeconds: 5000 },
        cigsAvoided: 5,
        moneySaved: 5.0,
        lifeRegainedMinutes: 55,
        lifeRegainedFormatted: '55m',
        isFutureQuit: false,
      },
      milestonesProgress: dummyMilestonesProgress,
      isLoading: false,
      refresh: jest.fn(),
      now: Date.now(),
    });
  });

  it('renders recovery stepper with reached and in-progress milestone nodes', async () => {
    await render(
      <ThemeProvider>
        <ProgressScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Your Recovery')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy(); // 1 of 2 completed
    expect(screen.getByText('Pulse & Blood Pressure Normalizing')).toBeTruthy();
    expect(screen.getByText('Reached')).toBeTruthy();

    expect(screen.getByText('Carbon Monoxide Halved')).toBeTruthy();
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('switches to badges view and filters by category', async () => {
    await render(
      <ThemeProvider>
        <ProgressScreen />
      </ThemeProvider>
    );

    // Switch to Badges view
    const badgesTab = screen.getByRole('tab', { name: /Badges/i });
    await act(async () => {
      fireEvent.press(badgesTab);
    });

    // Check that badges are rendered
    expect(screen.getAllByText('First Step').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('One Hour Strong').length).toBeGreaterThanOrEqual(1);

    // Filter by Money category
    const moneyFilterChip = screen.getByText('MONEY');
    await act(async () => {
      fireEvent.press(moneyFilterChip);
    });

    expect(screen.getByText('Pocket Money')).toBeTruthy();
  });

  it('switches to goals view and displays savings banner and add button', async () => {
    await render(
      <ThemeProvider>
        <ProgressScreen />
      </ThemeProvider>
    );

    // Switch to Goals view
    const goalsTab = screen.getByRole('tab', { name: /Goals/i });
    await act(async () => {
      fireEvent.press(goalsTab);
    });

    expect(screen.getByText('AVAILABLE SMOKE-FREE SAVINGS')).toBeTruthy();
    expect(screen.getByText('+ Add New Savings Goal')).toBeTruthy();
  });
});

describe('SettingsScreen', () => {
  it('renders settings with profile inputs, appearance options, and safety quitlines', async () => {
    await render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Smoking Habits & Cost')).toBeTruthy();
    expect(screen.getByText('Quit Date & Time')).toBeTruthy();
    expect(screen.getByText('Save Profile Changes')).toBeTruthy();
    expect(screen.getByText('Clinical Safety & Helplines')).toBeTruthy();
    expect(screen.getByText('1-800-QUIT-NOW (1-800-784-8669)')).toBeTruthy();
    expect(screen.getByText('100% Offline & Private')).toBeTruthy();
  });
});
