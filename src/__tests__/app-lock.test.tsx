import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, View, Button, AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppLockProvider, useAppLock } from '../hooks/use-app-lock';
import { LockScreen } from '../components/lock-screen';
import { ThemeProvider } from '../hooks/use-theme';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return React.createElement(RNText, { testID: `icon-${name}` }, name);
  },
}));

// Mock SQLite
const mockSettings: Record<string, string> = {};
const mockDb = {
  getFirstAsync: jest.fn().mockImplementation(async (query: string, params?: any[]) => {
    if (query.includes('FROM settings WHERE key = ?')) {
      const key = params?.[0];
      return mockSettings[key] ? { value: mockSettings[key] } : null;
    }
    return null;
  }),
  runAsync: jest.fn().mockImplementation(async (query: string, ...args: any[]) => {
    const flatArgs = Array.isArray(args[0]) ? args[0] : args;
    if (query.includes('INSERT') && query.includes('settings')) {
      mockSettings[flatArgs[0]] = flatArgs[1];
    }
    return { changes: 1, lastInsertRowId: 1 };
  }),
  execAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

function LockTestConsumer() {
  const { isLocked, isLockEnabled, unlock, toggleLock, lockNow } = useAppLock();

  return (
    <View testID="consumer">
      <Text testID="isLocked">{isLocked ? 'locked' : 'unlocked'}</Text>
      <Text testID="isLockEnabled">{isLockEnabled ? 'enabled' : 'disabled'}</Text>
      <Button title="Unlock" onPress={() => void unlock()} testID="btn-unlock" />
      <Button title="Enable Lock" onPress={() => void toggleLock(true)} testID="btn-enable" />
      <Button title="Disable Lock" onPress={() => void toggleLock(false)} testID="btn-disable" />
      <Button title="Lock Now" onPress={lockNow} testID="btn-lock-now" />
    </View>
  );
}

describe('App Lock & Biometrics (FR-SEC-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockSettings['app_lock_enabled'];
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders LockScreen with unlock button and calls biometric authenticate', async () => {
    await render(
      <ThemeProvider>
        <AppLockProvider>
          <LockScreen />
        </AppLockProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Ember is Locked')).toBeTruthy();
    expect(screen.getByLabelText('Unlock Ember with biometrics or passcode')).toBeTruthy();

    await waitFor(() => {
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
    });
  });

  it('enables lock after biometric verification', async () => {
    await render(
      <ThemeProvider>
        <AppLockProvider>
          <LockTestConsumer />
        </AppLockProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isLockEnabled').props.children).toBe('disabled');
    });

    // Press enable
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-enable'));
    });

    await waitFor(() => {
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: expect.stringContaining('enable App Lock') })
      );
      expect(screen.getByTestId('isLockEnabled').props.children).toBe('enabled');
    });

    // Lock now
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-lock-now'));
    });

    expect(screen.getByTestId('isLocked').props.children).toBe('locked');

    // Unlock
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-unlock'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('isLocked').props.children).toBe('unlocked');
    });
  });

  it('locks app on returning from background after timeout', async () => {
    let appStateCallback: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((event: any, handler: any) => {
      if (event === 'change') {
        appStateCallback = handler;
      }
      return { remove: jest.fn() } as any;
    });

    await render(
      <ThemeProvider>
        <AppLockProvider>
          <LockTestConsumer />
        </AppLockProvider>
      </ThemeProvider>
    );

    // Enable lock
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-enable'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('isLockEnabled').props.children).toBe('enabled');
    });

    // Simulate backgrounding
    expect(appStateCallback).toBeDefined();

    const realNow = Date.now;
    let mockTime = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

    // App goes to background
    await act(async () => {
      appStateCallback!('background');
    });

    // Advance time by 45 seconds (> 30s timeout)
    mockTime += 45 * 1000;

    // App returns to active
    await act(async () => {
      appStateCallback!('active');
    });

    // Expect locked
    await waitFor(() => {
      expect(screen.getByTestId('isLocked').props.children).toBe('locked');
    });

    jest.spyOn(Date, 'now').mockImplementation(realNow);
  });
});
