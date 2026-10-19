import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../hooks/use-theme';
import CravingModalScreen from '../app/craving';

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: jest.fn(),
    replace: jest.fn(),
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

// Mock useStats
jest.mock('../hooks/use-stats', () => ({
  useStats: () => ({
    stats: {
      time: { totalSeconds: 86400 },
      moneySaved: 20.0,
    },
  }),
}));

// Mock useAchievements
const mockEvaluateAndUnlock = jest.fn().mockResolvedValue([]);
jest.mock('../hooks/use-achievements', () => ({
  useAchievements: () => ({
    latestCelebration: null,
    dismissCelebration: jest.fn(),
    evaluateAndUnlock: mockEvaluateAndUnlock,
  }),
}));

// Mock SQLite
const mockDb = {
  getAllAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('FROM reasons')) {
      return [
        { id: 1, text: 'Protect my lung health', sort_order: 0, created_at: 1000 },
        { id: 2, text: 'Save money for travel', sort_order: 1, created_at: 1000 },
      ];
    }
    if (query.includes('FROM triggers')) {
      return [
        { id: 1, key: 'stress', label: 'Stress / Anxiety', is_custom: 0, is_active: 1 },
        { id: 2, key: 'coffee', label: 'Morning Coffee', is_custom: 0, is_active: 1 },
      ];
    }
    return [];
  }),
  getFirstAsync: jest.fn().mockImplementation(async (query: string) => {
    if (query.includes('SELECT COUNT(*) as count FROM craving_logs')) {
      return { count: 3 };
    }
    return null;
  }),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 10 }),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('CravingModalScreen Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial assessment with intensity selector, reasons carousel, and coping tools', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Ride Out the Urge')).toBeTruthy();
    expect(screen.getByText('CRAVING SOS')).toBeTruthy();
    expect(screen.getByText('How intense is this urge right now?')).toBeTruthy();

    // Reasons carousel item loaded from mock
    expect(await screen.findByText(/Protect my lung health/)).toBeTruthy();

    // Coping tools
    expect(screen.getByText(/Ride the Wave \(Urge Surfing\)/)).toBeTruthy();
    expect(screen.getByText(/Guided Breathing/)).toBeTruthy();
    expect(screen.getByText(/Distraction & Grounding/)).toBeTruthy();
  });

  it('allows navigating to urge surfing and toggling timer', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    const urgeSurfBtn = screen.getByLabelText('Ride the Wave Urge Surfing Timer');
    await act(async () => {
      fireEvent.press(urgeSurfBtn);
    });

    expect(screen.getByText('Ride the Wave')).toBeTruthy();
    expect(screen.getByText('3:00')).toBeTruthy();
    expect(screen.getByText('MINDFUL ANCHOR')).toBeTruthy();

    const pauseBtn = screen.getByText('Pause Timer');
    await act(async () => {
      fireEvent.press(pauseBtn);
    });

    expect(screen.getByText('Resume Timer')).toBeTruthy();
  });

  it('allows navigating to guided breathing exercise', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    const breathingBtn = screen.getByLabelText('Guided Deep Breathing');
    await act(async () => {
      fireEvent.press(breathingBtn);
    });

    expect(screen.getByText('Deep Breathing')).toBeTruthy();
    expect(screen.getByText(/Inhale/i)).toBeTruthy();

    // Switch to Box Breathing
    const boxBtn = screen.getByText('Box (4-4-4-4)');
    await act(async () => {
      fireEvent.press(boxBtn);
    });

    expect(screen.getByText('Box (4-4-4-4)')).toBeTruthy();
  });

  it('allows checking off 4Ds distraction items', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    const distractBtn = screen.getByLabelText('Distraction Tools: 4Ds and 5-4-3-2-1 Grounding');
    await act(async () => {
      fireEvent.press(distractBtn);
    });

    expect(screen.getByText('NHS 4Ds Checklist')).toBeTruthy();
    expect(screen.getByText('Delay for 5 Minutes')).toBeTruthy();

    // Check item
    const delayItem = screen.getByRole('checkbox', { name: /Delay for 5 Minutes/i });
    await act(async () => {
      fireEvent.press(delayItem);
    });

    expect(delayItem.props.accessibilityState.checked).toBe(true);
  });

  it('completes outcome logging and persists craving log', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    // Skip to log directly
    const logDirectly = screen.getByLabelText('Urge has passed, log outcome directly');
    await act(async () => {
      fireEvent.press(logDirectly);
    });

    expect(screen.getByText('Record Craving Outcome')).toBeTruthy();
    expect(screen.getByText('I Resisted the Craving!')).toBeTruthy();

    const saveBtn = screen.getByText('Save & Complete Session');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    // Check that runAsync was called to insert into craving_logs
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO craving_logs'),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'resisted',
      expect.anything(),
      expect.anything(),
      null
    );

    expect(mockBack).toHaveBeenCalled();
  });

  it('allows navigating to support contacts tool', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    const supportBtn = screen.getByLabelText('Reach Out: Call Support or Helpline');
    await act(async () => {
      fireEvent.press(supportBtn);
    });

    expect(screen.getByText('SUPPORT • YOU ARE NEVER ALONE')).toBeTruthy();
    expect(screen.getByText('Reach Out')).toBeTruthy();
  });

  it('renders compassionate slip advice card when outcome is smoked', async () => {
    await render(
      <ThemeProvider>
        <CravingModalScreen />
      </ThemeProvider>
    );

    const logDirectly = screen.getByLabelText('Urge has passed, log outcome directly');
    await act(async () => {
      fireEvent.press(logDirectly);
    });

    const smokedRadio = screen.getByText('I Slipped / Smoked');
    await act(async () => {
      fireEvent.press(smokedRadio);
    });

    expect(screen.getByText('A slip is not a failure')).toBeTruthy();
    expect(
      screen.getByText(/Your lifetime smoke-free days and milestones are never erased/i)
    ).toBeTruthy();
    expect(screen.getByLabelText('Open slip support and recommit')).toBeTruthy();
  });
});
