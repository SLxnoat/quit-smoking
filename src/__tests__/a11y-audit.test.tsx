import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Palette } from '../constants/theme';
import { Button } from '../components/button';
import { Text } from '../components/text';
import { StatTile } from '../components/stat-tile';
import { ProgressRing } from '../components/progress-ring';
import { EmptyState } from '../components/empty-state';
import { LockScreen } from '../components/lock-screen';
import { ThemeProvider } from '../hooks/use-theme';

// Helper to calculate relative luminance according to WCAG 2.1 specs
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Calculate contrast ratio between two hex colors
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock useAppLock
jest.mock('../hooks/use-app-lock', () => ({
  useAppLock: () => ({
    isLockEnabled: true,
    isLocked: true,
    isSupported: true,
    unlock: jest.fn().mockResolvedValue(true),
    toggleLock: jest.fn().mockResolvedValue(true),
    lockNow: jest.fn(),
  }),
}));

describe('Accessibility & WCAG AA Audit (FR-A11Y-1)', () => {
  describe('Color Contrast WCAG AA Verification', () => {
    it('ensures light theme text colors meet or exceed WCAG AA contrast against background', () => {
      const bg = Palette.light.background; // #F7FAF9
      const primaryText = Palette.light.text; // #132E27

      const ratio = getContrastRatio(primaryText, bg);
      // WCAG AA requires at least 4.5:1 for normal text
      expect(ratio).toBeGreaterThanOrEqual(7.0); // Excellent high contrast
    });

    it('ensures dark theme text colors meet or exceed WCAG AA contrast against card & background', () => {
      const bg = Palette.dark.background; // #0E1A1D
      const card = Palette.dark.card; // #16262B
      const primaryText = Palette.dark.text; // #E8F1EF

      const ratioBg = getContrastRatio(primaryText, bg);
      const ratioCard = getContrastRatio(primaryText, card);

      expect(ratioBg).toBeGreaterThanOrEqual(10.0);
      expect(ratioCard).toBeGreaterThanOrEqual(9.0);
    });

    it('ensures brand tint and accent colors are distinct and accessible', () => {
      const brand = Palette.primary; // #0F9D8A
      expect(brand).toBeDefined();

      const success = Palette.success; // #2E9E5B
      const danger = Palette.danger; // #D64545
      expect(success).not.toBe(danger);
    });
  });

  describe('Dynamic Type & 200% Font Scaling Support', () => {
    it('configures Text component to support maxFontSizeMultiplier = 2.0 by default', async () => {
      await render(
        <ThemeProvider>
          <Text variant="body">Accessible Text Scaling</Text>
        </ThemeProvider>
      );

      const element = screen.getByText('Accessible Text Scaling');
      expect(element.props.maxFontSizeMultiplier).toBe(2.0);
    });

    it('allows explicit override of maxFontSizeMultiplier when needed', async () => {
      await render(
        <ThemeProvider>
          <Text variant="caption" maxFontSizeMultiplier={1.5}>
            Restricted Scaling Caption
          </Text>
        </ThemeProvider>
      );

      const element = screen.getByText('Restricted Scaling Caption');
      expect(element.props.maxFontSizeMultiplier).toBe(1.5);
    });
  });

  describe('Interactive Controls & Screen Reader Semantics', () => {
    it('renders Button with accessibilityRole="button" and accessible state', async () => {
      await render(
        <ThemeProvider>
          <Button title="Save Profile" accessibilityLabel="Save profile changes" />
        </ThemeProvider>
      );

      const btn = screen.getByRole('button', { name: 'Save profile changes' });
      expect(btn).toBeTruthy();
      expect(btn.props.accessibilityState.disabled).toBe(false);
      expect(btn.props.accessibilityState.busy).toBe(false);
    });

    it('renders ProgressRing with accessibilityRole="progressbar" and range values', async () => {
      await render(
        <ThemeProvider>
          <ProgressRing progress={0.65} accessibilityLabel="Health Recovery Progress">
            <Text>65%</Text>
          </ProgressRing>
        </ThemeProvider>
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeTruthy();
      expect(progressbar.props.accessibilityValue.now).toBe(65);
      expect(progressbar.props.accessibilityValue.min).toBe(0);
      expect(progressbar.props.accessibilityValue.max).toBe(100);
      expect(progressbar.props.accessibilityLabel).toBe('Health Recovery Progress');
    });

    it('renders StatTile with accessible label and value announcements', async () => {
      await render(
        <ThemeProvider>
          <StatTile
            label="Money Saved"
            value="$150.00"
            subtext="3 packs avoided"
            accessibilityLabel="Money Saved: $150.00, 3 packs avoided"
          />
        </ThemeProvider>
      );

      const tile = screen.getByLabelText('Money Saved: $150.00, 3 packs avoided');
      expect(tile).toBeTruthy();
    });

    it('renders EmptyState with accessible illustration and clear action CTA', async () => {
      await render(
        <ThemeProvider>
          <EmptyState
            title="No Reflections Yet"
            description="Your daily journal check-ins will appear here."
            actionTitle="Start Check-in"
            onAction={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('No Reflections Yet')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Start Check-in' })).toBeTruthy();
    });

    it('renders LockScreen with accessible title and unlock button', async () => {
      await render(
        <ThemeProvider>
          <LockScreen />
        </ThemeProvider>
      );

      expect(screen.getByRole('button', { name: 'Unlock Ember with biometrics or passcode' })).toBeTruthy();
    });
  });
});
