import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/use-theme';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();

  const handlePress: PressableProps['onPress'] = (event) => {
    if (disabled || loading) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Haptics not supported on web/simulator, safe to ignore
      });
    }
    onPress?.(event);
  };

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) {
      return theme.isDark ? '#1C2B30' : '#E8ECEB';
    }
    switch (variant) {
      case 'primary':
        return pressed ? '#0B7A6B' : theme.colors.tint;
      case 'secondary':
        return pressed ? theme.colors.border : theme.colors.surfaceVariant;
      case 'outline':
      case 'ghost':
        return pressed ? theme.colors.surfaceVariant : 'transparent';
      case 'danger':
        return pressed ? '#B03535' : '#D64545';
    }
  };

  const getBorderColor = () => {
    if (disabled) return 'transparent';
    if (variant === 'outline') return theme.colors.border;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return 'tertiary';
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'inverse';
      case 'secondary':
        return 'primary';
      case 'outline':
        return 'brand';
      case 'ghost':
        return 'secondary';
    }
  };

  const sizeStyles = {
    sm: {
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      minHeight: 36,
    },
    md: {
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.base,
      minHeight: 48,
    },
    lg: {
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 56,
    },
  }[size];

  const textVariant = size === 'sm' ? 'bodySmall' : size === 'lg' ? 'subtitle' : 'bodyMedium';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: theme.radius.lg,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.tint}
        />
      ) : (
        <Text variant={textVariant} color={getTextColor()} center>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
});
