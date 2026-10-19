import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card } from './card';
import { Text } from './text';
import { useTheme } from '../hooks/use-theme';

export interface StatTileProps {
  /**
   * Title or description of the metric (e.g., "Money Saved").
   */
  label: string;
  /**
   * The formatted metric value (e.g., "$42.50", "120 avoided").
   */
  value: string;
  /**
   * Optional supporting subtext (e.g., "calculated since quit").
   */
  subtext?: string;
  /**
   * Icon emoji or element to display alongside the metric.
   */
  icon?: React.ReactNode;
  /**
   * Accent color for visual distinction (e.g., amber, success, brand).
   */
  accentColor?: string;
  /**
   * Optional container style.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional test identifier.
   */
  testID?: string;
}

export function StatTile({
  label,
  value,
  subtext,
  icon,
  accentColor,
  style,
  testID,
}: StatTileProps) {
  const { theme } = useTheme();

  return (
    <Card
      testID={testID}
      variant="outlined"
      padding="md"
      style={[styles.card, { borderColor: accentColor ? `${accentColor}44` : theme.colors.cardBorder }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${subtext ? `, ${subtext}` : ''}`}
    >
      <View style={styles.header}>
        {icon && typeof icon === 'string' ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : (
          icon
        )}
        <Text variant="caption" color="secondary" style={styles.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>

      <Text
        variant="title2"
        color="primary"
        style={[styles.value, accentColor ? { color: accentColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>

      {subtext && (
        <Text variant="caption" color="secondary" numberOfLines={1} style={styles.subtext}>
          {subtext}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    letterSpacing: 0.8,
    fontWeight: '700',
    flexShrink: 1,
  },
  value: {
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  subtext: {
    marginTop: 2,
    opacity: 0.85,
  },
});
