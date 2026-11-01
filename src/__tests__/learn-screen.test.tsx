import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../hooks/use-theme';
import LearnScreen from '../app/(tabs)/learn';

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

// Mock SQLite db with content
const mockDb = {
  getAllAsync: jest.fn().mockImplementation(async (query: string, params: any[] = []) => {
    if (query.includes("WHERE type = 'lesson'") || params.includes('lesson')) {
      return [
        {
          id: 'lesson-day-001',
          type: 'lesson',
          locale: 'en',
          title: 'Your Smoke-Free Beginning',
          body: 'Within just 20 minutes, heart rate drops.',
          category: 'physiology',
          day_index: 1,
          author_or_source: 'WHO Guidelines',
        },
        {
          id: 'lesson-day-002',
          type: 'lesson',
          locale: 'en',
          title: 'The 3-Minute Craving Peak',
          body: 'Cravings peak in 3 to 5 minutes.',
          category: 'cbt',
          day_index: 2,
          author_or_source: 'NHS Smokefree',
        },
      ];
    }
    if (params.includes('article')) {
      return [
        {
          id: 'article-001',
          type: 'article',
          locale: 'en',
          title: 'The 4 Phases of Nicotine Withdrawal',
          body: 'Withdrawal unfolds in predictable stages.',
          category: 'physiology',
          day_index: null,
          author_or_source: 'Mayo Clinic',
        },
      ];
    }
    if (params.includes('exercise')) {
      return [
        {
          id: 'exercise-001',
          type: 'exercise',
          locale: 'en',
          title: 'Box Breathing (4-4-4-4)',
          body: 'Inhale 4, hold 4, exhale 4, hold 4.',
          category: 'breathing',
          day_index: null,
          author_or_source: 'Navy SEALs Breath Training',
        },
      ];
    }
    if (query.includes('FROM lesson_completions')) {
      return [];
    }
    if (query.includes('FROM bookmarks')) {
      return [];
    }
    if (query.includes('FROM content_items')) {
      return [
        {
          id: 'lesson-day-001',
          type: 'lesson',
          locale: 'en',
          title: 'Your Smoke-Free Beginning',
          body: 'Within just 20 minutes, heart rate drops.',
          category: 'physiology',
          day_index: 1,
          author_or_source: 'WHO Guidelines',
        },
        {
          id: 'article-001',
          type: 'article',
          locale: 'en',
          title: 'The 4 Phases of Nicotine Withdrawal',
          body: 'Withdrawal unfolds in predictable stages.',
          category: 'physiology',
          day_index: null,
          author_or_source: 'Mayo Clinic',
        },
      ];
    }
    return [];
  }),
  getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM profile')) {
      return {
        id: 1,
        quit_at: Date.now() - 3600000, // 1 hour ago -> Day 1
        cigs_per_day: 10,
        pack_size: 20,
        pack_price: 10,
        currency: 'USD',
        created_at: 1000,
      };
    }
    if (query.includes("AND day_index = ?")) {
      return {
        id: 'lesson-day-001',
        type: 'lesson',
        locale: 'en',
        title: 'Your Smoke-Free Beginning',
        body: 'Within just 20 minutes, heart rate drops.',
        category: 'physiology',
        day_index: 1,
        author_or_source: 'WHO Guidelines',
      };
    }
    if (query.includes('FROM bookmarks WHERE content_id = ?')) {
      return null;
    }
    if (query.includes('FROM lesson_completions WHERE lesson_id = ?')) {
      return null;
    }
    return null;
  }),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('LearnScreen (Sprint 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders learn header, today lesson card, and subtabs', async () => {
    await render(
      <ThemeProvider>
        <LearnScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Learn & Grow')).toBeTruthy();
    expect(screen.getByText('30-Day Path')).toBeTruthy();
    expect(screen.getByText('Articles')).toBeTruthy();
    expect(screen.getByText('Exercises')).toBeTruthy();
    expect(screen.getByText(/Bookmarks/)).toBeTruthy();

    // Today's lesson hero
    expect(screen.getAllByText('Your Smoke-Free Beginning').length).toBeGreaterThanOrEqual(1);
  });

  it('opens lesson detail modal and allows marking completion', async () => {
    await render(
      <ThemeProvider>
        <LearnScreen />
      </ThemeProvider>
    );

    expect(await screen.findByText('Learn & Grow')).toBeTruthy();

    // Tap day 1 lesson card
    const day1Btn = screen.getByLabelText(/Day 1: Your Smoke-Free Beginning/i);
    await act(async () => {
      fireEvent.press(day1Btn);
    });

    // Detail modal opens with clinical banner
    expect(await screen.findByText('Clinically Reviewed & Evidence-Based')).toBeTruthy();
    expect(screen.getAllByText('Within just 20 minutes, heart rate drops.').length).toBeGreaterThanOrEqual(1);

    // Mark as complete
    const completeBtn = screen.getByLabelText('Mark lesson as complete');
    await act(async () => {
      fireEvent.press(completeBtn);
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO lesson_completions'),
      expect.anything()
    );
  });

  it('navigates to Articles subtab and displays clinical articles', async () => {
    await render(
      <ThemeProvider>
        <LearnScreen />
      </ThemeProvider>
    );

    const articlesTab = screen.getByLabelText('Articles tab');
    await act(async () => {
      fireEvent.press(articlesTab);
    });

    expect(await screen.findByText('The 4 Phases of Nicotine Withdrawal')).toBeTruthy();
    expect(screen.getByText(/Withdrawal unfolds in predictable stages/)).toBeTruthy();
  });

  it('navigates to Exercises subtab and displays coping tools', async () => {
    await render(
      <ThemeProvider>
        <LearnScreen />
      </ThemeProvider>
    );

    const exercisesTab = screen.getByLabelText('Exercises tab');
    await act(async () => {
      fireEvent.press(exercisesTab);
    });

    expect(await screen.findByText('Box Breathing (4-4-4-4)')).toBeTruthy();
  });

  it('navigates to Bookmarks tab with empty state when no items saved', async () => {
    await render(
      <ThemeProvider>
        <LearnScreen />
      </ThemeProvider>
    );

    const bookmarksTab = screen.getByLabelText('Bookmarks tab');
    await act(async () => {
      fireEvent.press(bookmarksTab);
    });

    expect(await screen.findByText('No Bookmarks Yet')).toBeTruthy();
  });
});
