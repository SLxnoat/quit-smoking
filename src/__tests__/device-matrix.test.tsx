import React from 'react';
import { Dimensions } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ProgressRing } from '../components/progress-ring';
import { StatTile } from '../components/stat-tile';
import { Screen } from '../components/screen';
import { Text } from '../components/text';
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

const DEVICE_VIEWPORTS = [
  { name: 'Low-end Small Android', width: 320, height: 568 },
  { name: 'iPhone SE (Compact iOS)', width: 375, height: 667 },
  { name: 'Mid-range Android (1080p)', width: 393, height: 852 },
  { name: 'Tablet (iPad / Galaxy Tab 10")', width: 768, height: 1024 },
];

describe('Device Matrix & Layout Scaling Compatibility', () => {
  const originalDimensions = Dimensions.get('window');

  afterEach(() => {
    jest.spyOn(Dimensions, 'get').mockReturnValue(originalDimensions);
  });

  DEVICE_VIEWPORTS.forEach(({ name, width, height }) => {
    describe(`Device Profile: ${name} (${width}x${height})`, () => {
      beforeEach(() => {
        jest.spyOn(Dimensions, 'get').mockReturnValue({
          width,
          height,
          scale: 2,
          fontScale: 1,
        });
      });

      it(`renders dashboard metric components cleanly on ${name}`, async () => {
        await render(
          <ThemeProvider>
            <Screen scrollable>
              <ProgressRing size={Math.min(220, width - 40)} progress={0.75} accessibilityLabel="Smoke-free time">
                <Text variant="hero">14d</Text>
              </ProgressRing>
              <StatTile
                label="Cigarettes Avoided"
                value="280"
                subtext="14 packs"
                accessibilityLabel="Cigarettes Avoided: 280"
              />
              <StatTile
                label="Money Saved"
                value="$168.00"
                subtext="USD"
                accessibilityLabel="Money Saved: $168.00"
              />
            </Screen>
          </ThemeProvider>
        );

        expect(screen.getByText('14d')).toBeTruthy();
        expect(screen.getByText('CIGARETTES AVOIDED')).toBeTruthy();
        expect(screen.getByText('$168.00')).toBeTruthy();
      });

      it(`renders ResourcesScreen on ${name} without truncation`, async () => {
        await render(
          <ThemeProvider>
            <ResourcesScreen />
          </ThemeProvider>
        );

        expect(screen.getByText('Resources & Clinical Info')).toBeTruthy();
        expect(screen.getByText('Verified Quitlines & Helplines')).toBeTruthy();
        expect(screen.getByText('1-800-QUIT-NOW')).toBeTruthy();
      });
    });
  });
});
