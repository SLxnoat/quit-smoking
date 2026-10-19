import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../hooks/use-theme';
import SlipScreen from '../app/slip';

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: jest.fn(),
    replace: (route: string) => mockReplace(route),
  },
  useLocalSearchParams: () => ({ initialTriggerId: '1' }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return React.createElement(RNText, { testID: `icon-${name}` }, name);
  },
}));

// Mock SQLite
const mockDb = {
  getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM profile')) {
      return {
        id: 1,
        quit_at: 1000000,
        cigs_per_day: 20,
        pack_size: 20,
        pack_price: 15,
        currency: 'USD',
        approach: 'cold_turkey',
        created_at: 1000000,
      };
    }
    if (query.includes('COUNT(*) as count FROM slips')) {
      return { count: 0 };
    }
    if (query.includes('SUM(cigarettes) as total FROM slips')) {
      return { total: 0 };
    }
    return null;
  }),
  getAllAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM triggers')) {
      return [
        { id: 1, key: 'stress', label: 'Stress / Anxiety', is_custom: 0, is_active: 1 },
        { id: 2, key: 'coffee', label: 'Morning Coffee', is_custom: 0, is_active: 1 },
      ];
    }
    if (query.includes('FROM slips WHERE reset_streak = 1')) {
      return [];
    }
    return [];
  }),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
    await cb();
  }),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('SlipScreen Compassionate Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders compassionate copy, triggers, and streak reset options', async () => {
    await render(
      <ThemeProvider>
        <SlipScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Slip Support')).toBeTruthy();
    expect(screen.getByText('A Slip Is Not Failure')).toBeTruthy();
    expect(screen.getByText(/Almost everyone who ever quit had moments like this/i)).toBeTruthy();
    expect(screen.getByText('How many cigarettes were smoked?')).toBeTruthy();
    expect(screen.getByText('What was the primary trigger?')).toBeTruthy();
    expect(screen.getByText('Reflection & Plan for Next Time')).toBeTruthy();
    expect(screen.getByText(/Reset current streak timer/i)).toBeTruthy();
  });

  it('allows selecting cigarette count, inputting reflection, and committing recommitment', async () => {
    await render(
      <ThemeProvider>
        <SlipScreen />
      </ThemeProvider>
    );

    // Select 2 cigarettes
    const twoCigsBtn = screen.getByLabelText('2 cigarettes');
    await act(async () => {
      fireEvent.press(twoCigsBtn);
    });

    // Enter reflection
    const input = screen.getByLabelText('Reflection and plan input');
    await act(async () => {
      fireEvent.changeText(input, 'Took a breath and went for a run instead.');
    });

    // Commit
    const commitBtn = screen.getByLabelText('Commit and move forward');
    await act(async () => {
      fireEvent.press(commitBtn);
    });

    // Expect success screen "Back On Track"
    expect(await screen.findByText('Back On Track')).toBeTruthy();
    expect(screen.getByText(/A slip is simply a moment, not a verdict/i)).toBeTruthy();
    expect(screen.getByText(/"Took a breath and went for a run instead."/)).toBeTruthy();

    // Tap return button
    const returnBtn = screen.getByLabelText('Return to Home Dashboard');
    await act(async () => {
      fireEvent.press(returnBtn);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
