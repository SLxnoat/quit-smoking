import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { Typography } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

export type TextVariant = keyof typeof Typography;
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'success' | 'danger' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  center?: boolean;
}

export function Text({
  variant = 'body',
  color = 'primary',
  center = false,
  style,
  children,
  ...rest
}: TextProps) {
  const { theme } = useTheme();

  const colorStyle = {
    color: (() => {
      switch (color) {
        case 'secondary':
          return theme.colors.textSecondary;
        case 'tertiary':
          return theme.colors.textTertiary;
        case 'brand':
          return theme.colors.tint;
        case 'success':
          return '#2E9E5B';
        case 'danger':
          return '#D64545';
        case 'inverse':
          return theme.isDark ? '#132E27' : '#FFFFFF';
        case 'primary':
        default:
          return theme.colors.text;
      }
    })(),
  };

  return (
    <RNText
      style={[
        theme.typography[variant],
        colorStyle,
        center && styles.center,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
});
