import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './card';
import { Text } from './text';
import { useTheme } from '../hooks/use-theme';
import { MoodTrendInsights } from '../domain/insights';

export interface MoodChartProps {
  data: MoodTrendInsights;
}

export function MoodChart({ data }: MoodChartProps) {
  const { theme } = useTheme();

  return (
    <Card
      variant="outlined"
      padding="md"
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Mood & Stress Trend: ${data.summaryText}`}
    >
      <View style={styles.header}>
        <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
          WELLBEING &bull; CHECK-IN TRENDS
        </Text>
        <Text variant="title3" color="primary" style={{ marginTop: 2 }}>
          Mood &amp; Stress Trend
        </Text>
      </View>

      {/* Stats Summary Cards */}
      <View style={styles.metricsRow}>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.isDark ? '#142125' : '#F0F7F4' },
          ]}
        >
          <Text variant="caption" color="secondary">
            Avg Mood
          </Text>
          <Text variant="title3" color="primary" style={{ fontWeight: '700', marginTop: 2 }}>
            {data.averageMood !== null ? `${data.averageMood}/10` : '—'}
          </Text>
          <Text
            variant="caption"
            style={{
              color:
                data.moodTrend === 'improving'
                  ? theme.colors.success
                  : data.moodTrend === 'declining'
                  ? theme.colors.danger
                  : theme.colors.textSecondary,
              fontWeight: '700',
              marginTop: 2,
            }}
          >
            {data.moodTrend === 'improving'
              ? '↗ Improving'
              : data.moodTrend === 'declining'
              ? '↘ Declining'
              : '→ Stable'}
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.isDark ? '#142125' : '#F0F7F4' },
          ]}
        >
          <Text variant="caption" color="secondary">
            Avg Stress
          </Text>
          <Text variant="title3" color="primary" style={{ fontWeight: '700', marginTop: 2 }}>
            {data.averageStress !== null ? `${data.averageStress}/10` : '—'}
          </Text>
          <Text
            variant="caption"
            style={{
              color:
                data.stressTrend === 'improving'
                  ? theme.colors.success
                  : data.stressTrend === 'declining'
                  ? theme.colors.danger
                  : theme.colors.textSecondary,
              fontWeight: '700',
              marginTop: 2,
            }}
          >
            {data.stressTrend === 'improving'
              ? '↘ Lower Stress'
              : data.stressTrend === 'declining'
              ? '↗ Higher Stress'
              : '→ Stable'}
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.isDark ? '#142125' : '#F0F7F4' },
          ]}
        >
          <Text variant="caption" color="secondary">
            Check-ins
          </Text>
          <Text variant="title3" color="primary" style={{ fontWeight: '700', marginTop: 2 }}>
            {data.checkinsRecorded}/{data.totalDays}
          </Text>
          <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>
            days logged
          </Text>
        </View>
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

      {/* 7-Day Bar Visualization */}
      <View style={styles.chartContainer}>
        {/* Height reference lines */}
        <View style={styles.chartBackground}>
          <View style={[styles.gridLine, { borderColor: theme.colors.cardBorder }]} />
          <View style={[styles.gridLine, { borderColor: theme.colors.cardBorder }]} />
          <View style={[styles.gridLine, { borderColor: theme.colors.cardBorder }]} />
        </View>

        {/* Days Columns */}
        <View style={styles.barsRow}>
          {data.days.map((item) => {
            const moodHeight = item.mood !== null ? Math.max(6, item.mood * 8) : 0;
            const stressHeight = item.stress !== null ? Math.max(6, item.stress * 8) : 0;

            return (
              <View
                key={item.day}
                style={styles.dayColumn}
                accessibilityRole="text"
                accessibilityLabel={`${item.dayLabel} (${item.day}): ${
                  item.hasCheckin
                    ? `Mood ${item.mood}/10, Stress ${item.stress}/10`
                    : 'No check-in'
                }`}
              >
                <View style={styles.barsPair}>
                  {item.hasCheckin ? (
                    <>
                      {/* Mood Bar */}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: moodHeight,
                            backgroundColor: theme.colors.primary,
                          },
                        ]}
                      />
                      {/* Stress Bar */}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: stressHeight,
                            backgroundColor: theme.colors.accentAmber,
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <View
                      style={[
                        styles.emptyBarPlaceholder,
                        { backgroundColor: theme.isDark ? '#1C2C30' : '#E0EAE7' },
                      ]}
                    />
                  )}
                </View>

                {/* Day Label */}
                <Text
                  variant="caption"
                  color={item.hasCheckin ? 'primary' : 'tertiary'}
                  style={[
                    styles.dayText,
                    item.hasCheckin && { fontWeight: '700' },
                  ]}
                >
                  {item.dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Chart Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text variant="caption" color="secondary">
            Mood (1-10)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accentAmber }]} />
          <Text variant="caption" color="secondary">
            Stress (1-10)
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryCard: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  summaryText: {
    lineHeight: 18,
  },
  chartContainer: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
    position: 'relative',
  },
  chartBackground: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  gridLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 6,
    height: 85,
    justifyContent: 'center',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  emptyBarPlaceholder: {
    width: 4,
    height: 12,
    borderRadius: 2,
  },
  dayText: {
    fontSize: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000015',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
