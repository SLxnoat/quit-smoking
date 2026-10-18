import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { AppTheme, Palette, Radius, Spacing, Typography } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const systemColorScheme = useRNColorScheme();

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const theme: AppTheme = useMemo(() => {
    return {
      colors: isDark ? Palette.dark : Palette.light,
      isDark,
      spacing: Spacing,
      radius: Radius,
      typography: Typography,
    };
  }, [isDark]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      setMode,
      isDark,
    }),
    [theme, mode, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
