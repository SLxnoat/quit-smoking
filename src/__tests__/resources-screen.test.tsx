import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ResourcesScreen from '../app/resources';
import { ThemeProvider } from '../hooks/use-theme';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
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

describe('ResourcesScreen (FR-INF-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  });

  it('renders verified quitlines, clinical sources, disclaimer, and licenses', async () => {
    await render(
      <ThemeProvider>
        <ResourcesScreen />
      </ThemeProvider>
    );

    // Quitlines
    expect(screen.getByText('Verified Quitlines & Helplines')).toBeTruthy();
    expect(screen.getByText('1-800-QUIT-NOW')).toBeTruthy();
    expect(screen.getByText('NHS Smokefree Helpline')).toBeTruthy();
    expect(screen.getByText('Pan-Canadian Quitline')).toBeTruthy();
    expect(screen.getByText('Quitline Australia')).toBeTruthy();

    // Medical Disclaimer
    expect(screen.getByText('Medical Disclaimer')).toBeTruthy();
    expect(screen.getByText('Not a Medical Device or Clinical Treatment')).toBeTruthy();

    // Clinical Sources
    expect(screen.getByText('Scientific Sources & Clinical Evidence')).toBeTruthy();
    expect(screen.getByText('World Health Organization (WHO)')).toBeTruthy();
    expect(screen.getByText('US Surgeon General & CDC')).toBeTruthy();

    // Privacy & Licenses
    expect(screen.getByText('Open Source Software & Privacy')).toBeTruthy();
    expect(screen.getAllByText(/React Native/).length).toBeGreaterThanOrEqual(1);
  });

  it('opens dialer when tapping a helpline card', async () => {
    await render(
      <ThemeProvider>
        <ResourcesScreen />
      </ThemeProvider>
    );

    const usQuitline = screen.getByLabelText('Call National Quitline Network at 1-800-QUIT-NOW');
    fireEvent.press(usQuitline);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('18007848669'));
    });
  });
});
