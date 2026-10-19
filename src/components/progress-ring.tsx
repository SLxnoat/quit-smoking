import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export interface ProgressRingProps {
  /**
   * Diameter of the progress ring in points. Defaults to 220.
   */
  size?: number;
  /**
   * Stroke width of the ring circle. Defaults to 12.
   */
  strokeWidth?: number;
  /**
   * Progress value between 0.0 and 1.0.
   */
  progress: number;
  /**
   * Custom color for the active progress stroke. Defaults to theme primary color.
   */
  progressColor?: string;
  /**
   * Custom color for the background track. Defaults to cardBorder color.
   */
  trackColor?: string;
  /**
   * Content displayed at the center of the ring.
   */
  children?: React.ReactNode;
  /**
   * Optional outer container styling.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Accessibility label for screen readers.
   */
  accessibilityLabel?: string;
}

/**
 * Pure React Native circular progress ring.
 *
 * Utilizes half-plane transform rotation to achieve a smooth 360° circular progress stroke
 * without requiring external native SVG dependencies or bridge overhead.
 */
export function ProgressRing({
  size = 220,
  strokeWidth = 12,
  progress,
  progressColor,
  trackColor,
  children,
  style,
  accessibilityLabel = 'Progress indicator',
}: ProgressRingProps) {
  const { theme } = useTheme();

  const activeColor = progressColor ?? theme.colors.primary;
  const bgTrackColor = trackColor ?? theme.colors.cardBorder;

  const clampedProgress = Math.min(1, Math.max(0, isNaN(progress) ? 0 : progress));
  const degrees = clampedProgress * 360;

  // Split degrees between right (0° - 180°) and left (180° - 360°) halves
  const firstHalfAngle = Math.min(180, degrees);
  const secondHalfAngle = Math.max(0, degrees - 180);

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
      }}
    >
      {/* Background Track Circle */}
      <View
        style={[
          styles.trackCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: bgTrackColor,
          },
        ]}
      />

      {/* First Half Circle (0° - 180°) */}
      <View
        style={[
          styles.halfContainer,
          {
            width: size / 2,
            height: size,
            left: size / 2,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: activeColor,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              left: -size / 2,
              transform: [{ rotate: `${-135 + firstHalfAngle}deg` }],
            },
          ]}
        />
      </View>

      {/* Second Half Circle (180° - 360°) */}
      <View
        style={[
          styles.halfContainer,
          {
            width: size / 2,
            height: size,
            left: 0,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: activeColor,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              left: 0,
              transform: [{ rotate: `${-135 + secondHalfAngle}deg` }],
            },
          ]}
        />
      </View>

      {/* Center Content Overlay */}
      {children && (
        <View
          style={[
            styles.contentOverlay,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trackCircle: {
    position: 'absolute',
  },
  halfContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
  },
  contentOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
