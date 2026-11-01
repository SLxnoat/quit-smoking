import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card } from './card';
import { Text } from './text';
import { Button } from './button';
import { useTheme } from '../hooks/use-theme';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = '📝',
  title,
  description,
  actionTitle,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Card
      variant="flat"
      padding="lg"
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#142125' : '#F2F7F5',
          borderColor: theme.colors.cardBorder,
        },
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${theme.colors.primary}18` },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text variant="title3" color="primary" center style={styles.title}>
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary" center style={styles.description}>
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={styles.actionButton}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    marginBottom: 6,
    fontWeight: '700',
  },
  description: {
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionButton: {
    minWidth: 160,
  },
});
