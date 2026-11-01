import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './card';
import { Text } from './text';
import { useTheme } from '../hooks/use-theme';
import { TopTriggersInsights } from '../domain/insights';

export interface TriggersChartProps {
  data: TopTriggersInsights;
}

export function TriggersChart({ data }: TriggersChartProps) {
  const { theme } = useTheme();

  return (
    <Card
      variant="outlined"
      padding="md"
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Top Triggers: ${data.summaryText}`}
    >
      <View style={styles.header}>
        <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
          TRIGGERS &bull; SITUATIONAL ANALYSIS
        </Text>
        <Text variant="title3" color="primary" style={{ marginTop: 2 }}>
          Top Craving Triggers
        </Text>
      </View>

      {/* Accessible Text Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.isDark ? '#142125' : '#F2F7F5' },
        ]}
      >
        <Text variant="bodySmall" color="primary" style={styles.summaryText}>
          {data.summaryText}
        </Text>
      </View>

      {/* Triggers List */}
      {data.triggers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodySmall" color="secondary" center>
            No triggers logged yet. Tag triggers during Craving SOS to uncover your triggers.
          </Text>
        </View>
      ) : (
        <View style={styles.barsContainer}>
          {data.triggers.map((item, index) => {
            const barWidthPercent = `${Math.max(6, item.percentage)}%` as const;

            return (
              <View
                key={item.triggerId ?? `untagged-${index}`}
                style={styles.triggerItem}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: item.percentage }}
                accessibilityLabel={`${item.label}: ${item.percentage}%, ${item.count} occurrences (${item.resistedCount} resisted)`}
              >
                <View style={styles.triggerLabelRow}>
                  <Text
                    variant="bodySmall"
                    color="primary"
                    numberOfLines={1}
                    style={styles.triggerLabel}
                  >
                    {item.label}
                  </Text>
                  <View style={styles.countBadgeRow}>
                    <Text variant="caption" color="secondary" style={styles.countText}>
                      {item.count} urge{item.count !== 1 ? 's' : ''} ({item.percentage}%)
                    </Text>
                  </View>
                </View>

                {/* Progress Bar Background & Fill */}
                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: theme.isDark ? '#1E2F34' : '#E0EAE7' },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: barWidthPercent,
                        backgroundColor:
                          index === 0
                            ? theme.colors.primary
                            : index === 1
                            ? theme.colors.accentAmber
                            : theme.isDark
                            ? '#3A5C55'
                            : '#668F85',
                      },
                    ]}
                  />
                </View>

                {/* Breakdown subtext */}
                <View style={styles.breakdownRow}>
                  <Text variant="caption" color="tertiary" style={styles.subtext}>
                    Resisted: {item.resistedCount} &bull; Smoked: {item.smokedCount}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 10,
  },
  summaryCard: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  summaryText: {
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  barsContainer: {
    gap: 14,
  },
  triggerItem: {
    width: '100%',
  },
  triggerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  triggerLabel: {
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  countBadgeRow: {
    alignItems: 'flex-end',
  },
  countText: {
    fontWeight: '600',
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  breakdownRow: {
    marginTop: 4,
  },
  subtext: {
    fontSize: 10,
  },
});
