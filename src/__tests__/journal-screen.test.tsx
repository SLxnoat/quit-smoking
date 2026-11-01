import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../hooks/use-theme';
import JournalScreen from '../app/(tabs)/journal';

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: jest.fn(),
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

// Mock SQLite db
let mockTodayCheckin: any = null;

const mockDb = {
  getAllAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM checkins')) {
      return [
        {
          id: 1,
          day: '2026-11-01',
          mood: 8,
          stress: 3,
          confidence: 9,
          sleep_quality: 7,
          note: 'Feeling strong today',
          created_at: 1730480000,
        },
      ];
    }
    if (query.includes('FROM thought_records')) {
      return [
        {
          id: 1,
          created_at: 1730480000,
          situation: 'Work stress deadline',
          thought: 'A cigarette will calm me down',
          emotion: 'Anxious',
          belief_before: 80,
          reframe: 'Smoking creates more stress. Breathing helps.',
          belief_after: 25,
        },
      ];
    }
    if (query.includes('FROM craving_logs')) {
      return [
        {
          id: 1,
          intensity: 7,
          trigger_id: 1,
          outcome: 'resisted',
          intensity_after: 2,
          created_at: 1730480000,
        },
      ];
    }
    if (query.includes('FROM slip_logs')) {
      return [];
    }
    if (query.includes('FROM triggers')) {
      return [
        { id: 1, key: 'stress', label: 'Stress / Anxiety', is_custom: 0, is_active: 1 },
      ];
    }
    return [];
  }),
  getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM checkins WHERE day = ?')) {
      return mockTodayCheckin;
    }
    return null;
  }),
  runAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('INSERT INTO checkins')) {
      mockTodayCheckin = {
        id: 1,
        day: '2026-11-02',
        mood: 7,
        stress: 4,
        confidence: 8,
        sleep_quality: 7,
        note: 'Resisted cravings after lunch',
        created_at: 1730480000,
      };
    }
    return { changes: 1, lastInsertRowId: 1 };
  }),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('JournalScreen (Sprint 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTodayCheckin = null;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders tab headers correctly', async () => {
    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Journal & Insights')).toBeTruthy();
    expect(screen.getByText('Check-In')).toBeTruthy();
    expect(screen.getByText('Thoughts')).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('Insights')).toBeTruthy();
  });

  it('submits a daily check-in successfully', async () => {
    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Journal & Insights')).toBeTruthy();

    const noteInput = screen.getByLabelText('Daily reflection note');
    await fireEvent.changeText(noteInput, 'Resisted cravings after lunch');

    const saveButton = screen.getByLabelText('Save check-in');
    await fireEvent.press(saveButton);

    expect(screen.getByText(/Today's check-in saved!/i)).toBeTruthy();

    expect(mockDb.runAsync).toHaveBeenCalled();
    const hasCheckinInsert = mockDb.runAsync.mock.calls.some((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO checkins')
    );
    expect(hasCheckinInsert).toBe(true);
  });

  it('navigates to Thought Record tab and allows filling CBT form', async () => {
    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Journal & Insights')).toBeTruthy();

    const thoughtsTab = screen.getByLabelText('CBT thought record tab');
    await fireEvent.press(thoughtsTab);

    expect(await screen.findByLabelText('Situation input')).toBeTruthy();

    const situationInput = screen.getByLabelText('Situation input');
    const thoughtInput = screen.getByLabelText('Automatic thought input');
    const reframeInput = screen.getByLabelText('Cognitive reframe input');

    await fireEvent.changeText(situationInput, 'Saw a coworker smoking');
    await fireEvent.changeText(thoughtInput, 'I miss joining them');
    await fireEvent.changeText(reframeInput, 'I am building healthy lungs and saving money');

    const saveThoughtButton = screen.getByLabelText('Save CBT Thought Record');
    await fireEvent.press(saveThoughtButton);

    expect(screen.getByText(/CBT Thought Record saved successfully!/i)).toBeTruthy();

    expect(mockDb.runAsync).toHaveBeenCalled();
    const hasThoughtInsert = mockDb.runAsync.mock.calls.some((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO thought_records')
    );
    expect(hasThoughtInsert).toBe(true);
  });

  it('navigates to History tab and displays timeline items', async () => {
    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Journal & Insights')).toBeTruthy();

    const historyTab = screen.getByLabelText('Journal history list');
    await fireEvent.press(historyTab);

    expect(await screen.findByText('“Feeling strong today”')).toBeTruthy();
    expect(screen.getByText(/Work stress deadline/)).toBeTruthy();
  });

  it('navigates to Insights tab and renders charts', async () => {
    await render(
      <ThemeProvider>
        <JournalScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Journal & Insights')).toBeTruthy();

    const insightsTab = screen.getByLabelText('Analytics and insights charts tab');
    await fireEvent.press(insightsTab);

    expect(await screen.findByText('Urge Frequency')).toBeTruthy();
    expect(screen.getByText('Top Craving Triggers')).toBeTruthy();
    expect(screen.getByText('Mood & Stress Trend')).toBeTruthy();
  });
});
