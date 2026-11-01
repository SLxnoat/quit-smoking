import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Card } from './card';
import { Text } from './text';
import { useTheme } from '../hooks/use-theme';
import {
  HeatmapInsights,
  TIME_BLOCKS,
  WEEKDAYS,
  formatHour,
} from '../domain/insights';

export interface HeatmapChartProps {
  data: HeatmapInsights;
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'blocks' | 'hourly'>('blocks');
  const [selectedCell, setSelectedCell] = useState<{
    weekday: string;
    timeLabel: string;
    count: number;
  } | null>(null);

  const getCellOpacity = (count: number, max: number): number => {
    if (count === 0 || max === 0) return 0.06;
    const ratio = count / max;
    // Map 0..1 ratio to 0.2..0.95 opacity
    return Math.min(0.95, Math.max(0.2, ratio));
  };

  return (
    <Card
      variant="outlined"
      padding="md"
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Craving Heatmap: ${data.summaryText}`}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
            PATTERNS &bull; CRAVING HEATMAP
          </Text>
          <Text variant="title3" color="primary" style={{ marginTop: 2 }}>
            Urge Frequency
          </Text>
        </View>

        {/* View Toggle */}
        <View
          style={[
            styles.toggleContainer,
            { backgroundColor: theme.isDark ? '#1C2C30' : '#E2EBE8' },
          ]}
        >
          <TouchableOpacity
            onPress={() => setViewMode('blocks')}
            style={[
              styles.toggleButton,
              viewMode === 'blocks' && {
                backgroundColor: theme.colors.cardBackground,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Time blocks view"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color:
                  viewMode === 'blocks'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              }}
            >
              Blocks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('hourly')}
            style={[
              styles.toggleButton,
              viewMode === 'hourly' && {
                backgroundColor: theme.colors.cardBackground,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="24-hour detailed view"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color:
                  viewMode === 'hourly'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              }}
            >
              24-Hour
            </Text>
          </TouchableOpacity>
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

      {/* Selected Cell Feedback */}
      {selectedCell && (
        <View style={styles.selectionFeedback}>
          <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
            {selectedCell.weekday} &bull; {selectedCell.timeLabel}:{' '}
            <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
              {selectedCell.count} urge{selectedCell.count !== 1 ? 's' : ''}
            </Text>
          </Text>
        </View>
      )}

      {/* View Mode: Time Blocks (4 Columns x 7 Rows) */}
      {viewMode === 'blocks' && (
        <View style={styles.blocksGridContainer}>
          {/* Column Header */}
          <View style={styles.blocksHeaderRow}>
            <View style={styles.weekdayLabelCol} />
            {TIME_BLOCKS.map((block) => (
              <View key={block.key} style={styles.blockColHeader}>
                <Text variant="caption" color="secondary" style={styles.headerLabel}>
                  {block.label}
                </Text>
                <Text variant="caption" color="tertiary" style={styles.subHeaderLabel}>
                  {block.startHour}h-{block.endHour + 1}h
                </Text>
              </View>
            ))}
          </View>

          {/* 7 Days Rows */}
          {WEEKDAYS.map((dayName, wIndex) => (
            <View key={dayName} style={styles.gridRow}>
              <View style={styles.weekdayLabelCol}>
                <Text variant="caption" color="secondary" style={styles.dayLabel}>
                  {dayName}
                </Text>
              </View>
              {TIME_BLOCKS.map((block, bIndex) => {
                const count = data.blockMatrix[wIndex][bIndex];
                const opacity = getCellOpacity(count, data.maxBlockCount);
                const isSelected =
                  selectedCell?.weekday === dayName &&
                  selectedCell?.timeLabel === block.label;

                return (
                  <TouchableOpacity
                    key={block.key}
                    activeOpacity={0.7}
                    onPress={() =>
                      setSelectedCell({
                        weekday: dayName,
                        timeLabel: block.label,
                        count,
                      })
                    }
                    style={[
                      styles.blockCell,
                      {
                        backgroundColor: theme.colors.primary,
                        opacity,
                        borderColor: isSelected
                          ? theme.colors.textPrimary
                          : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayName} ${block.label}: ${count} cravings`}
                  >
                    {count > 0 && (
                      <Text
                        variant="caption"
                        style={[
                          styles.cellCountText,
                          {
                            color: opacity > 0.45 ? '#FFFFFF' : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* View Mode: 24-Hour Detailed Scrollable Grid */}
      {viewMode === 'hourly' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.hourlyScrollContainer}
        >
          <View>
            {/* Hour Numbers Row (0 to 23) */}
            <View style={styles.hourlyHeaderRow}>
              <View style={styles.weekdayLabelCol} />
              {Array.from({ length: 24 }, (_, h) => (
                <View key={h} style={styles.hourlyColHeader}>
                  <Text variant="caption" color="tertiary" style={styles.hourlyHeaderText}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>

            {/* Rows for 7 Days */}
            {WEEKDAYS.map((dayName, wIndex) => (
              <View key={dayName} style={styles.gridRow}>
                <View style={styles.weekdayLabelCol}>
                  <Text variant="caption" color="secondary" style={styles.dayLabel}>
                    {dayName}
                  </Text>
                </View>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = data.hourlyMatrix[wIndex][h];
                  const opacity = getCellOpacity(count, data.maxHourlyCount);
                  const isSelected =
                    selectedCell?.weekday === dayName &&
                    selectedCell?.timeLabel === formatHour(h);

                  return (
                    <TouchableOpacity
                      key={h}
                      activeOpacity={0.7}
                      onPress={() =>
                        setSelectedCell({
                          weekday: dayName,
                          timeLabel: formatHour(h),
                          count,
                        })
                      }
                      style={[
                        styles.hourlyCell,
                        {
                          backgroundColor: theme.colors.primary,
                          opacity,
                          borderColor: isSelected
                            ? theme.colors.textPrimary
                            : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${dayName} at ${formatHour(h)}: ${count} cravings`}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Heatmap Legend */}
      <View style={styles.legendRow}>
        <Text variant="caption" color="tertiary">
          Fewer
        </Text>
        <View style={styles.legendSwatches}>
          {[0.06, 0.25, 0.5, 0.75, 0.95].map((op, i) => (
            <View
              key={i}
              style={[
                styles.legendSwatch,
                { backgroundColor: theme.colors.primary, opacity: op },
              ]}
            />
          ))}
        </View>
        <Text variant="caption" color="tertiary">
          More Urges
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  summaryCard: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryText: {
    lineHeight: 18,
  },
  selectionFeedback: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  blocksGridContainer: {
    marginVertical: 4,
  },
  blocksHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  weekdayLabelCol: {
    width: 38,
    justifyContent: 'center',
  },
  dayLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
  blockColHeader: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  subHeaderLabel: {
    fontSize: 9,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockCell: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hourlyScrollContainer: {
    paddingVertical: 4,
  },
  hourlyHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  hourlyColHeader: {
    width: 18,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  hourlyHeaderText: {
    fontSize: 9,
  },
  hourlyCell: {
    width: 18,
    height: 20,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000015',
  },
  legendSwatches: {
    flexDirection: 'row',
    gap: 4,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
});
