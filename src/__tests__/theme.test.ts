import { Palette, Radius, Spacing, Typography } from '../constants/theme';

describe('Design System Tokens', () => {
  it('defines consistent spacing values', () => {
    expect(Spacing.xs).toBe(4);
    expect(Spacing.sm).toBe(8);
    expect(Spacing.base).toBe(16);
    expect(Spacing.xl).toBe(24);
  });

  it('defines light and dark palette colors', () => {
    expect(Palette.light.background).toBe('#F7FAF9');
    expect(Palette.dark.background).toBe('#0E1A1D');
    expect(Palette.primary).toBe('#0F9D8A');
    expect(Palette.accentAmber).toBe('#F5A524');
    expect(Palette.success).toBe('#2E9E5B');
    expect(Palette.danger).toBe('#D64545');
  });

  it('defines border radius tokens', () => {
    expect(Radius.sm).toBe(8);
    expect(Radius.lg).toBe(16);
    expect(Radius.pill).toBe(9999);
  });

  it('defines standard typography scale', () => {
    expect(Typography.body.fontSize).toBe(16);
    expect(Typography.hero.fontSize).toBe(36);
    expect(Typography.timer.fontVariant).toContain('tabular-nums');
  });
});
