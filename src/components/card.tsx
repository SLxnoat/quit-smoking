import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/use-theme';

export type CardVariant = 'elevated' | 'outlined' | 'flat';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: PressableProps['onPress'];
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Card({
  variant = 'outlined',
  padding = 'md',
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const { theme } = useTheme();

  const paddingStyle = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.base,
    lg: theme.spacing.xl,
  }[padding];

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.borderSubtle,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 2,
        };
      case 'flat':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 0,
        };
      case 'outlined':
      default:
        return {
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: theme.radius.lg,
    padding: paddingStyle,
    ...getVariantStyles(),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed, style]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
});
