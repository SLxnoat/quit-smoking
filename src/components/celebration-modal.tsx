import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './text';
import { Button } from './button';
import { useTheme } from '../hooks/use-theme';
import { type AchievementDefinition } from '../domain/milestones';

export interface CelebrationModalProps {
  visible: boolean;
  achievement: AchievementDefinition | null;
  onDismiss: () => void;
}

export function CelebrationModal({
  visible,
  achievement,
  onDismiss,
}: CelebrationModalProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const iconBounce = useSharedValue(1);

  useEffect(() => {
    if (visible && achievement) {
      // Trigger haptic feedback
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {}
        );
      } catch {
        // Ignored on unsupported platforms / testing
      }

      // Entrance animation
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 12, stiffness: 120 });
      iconBounce.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withSpring(1, { damping: 8, stiffness: 140 })
      );
    } else {
      scale.value = 0.7;
      opacity.value = 0;
      iconBounce.value = 1;
    }
  }, [visible, achievement, opacity, scale, iconBounce]);

  const animatedDialogStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconBounce.value }],
    };
  });

  if (!visible || !achievement) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      accessibilityRole="alert"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss celebration"
        />

        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
            },
            animatedDialogStyle,
          ]}
        >
          {/* Confetti / Burst Header */}
          <View style={styles.badgeHeader}>
            <Text style={styles.sparkleLeft}>✨</Text>
            <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
              <Text style={styles.icon}>{achievement.icon}</Text>
            </Animated.View>
            <Text style={styles.sparkleRight}>🎉</Text>
          </View>

          <View style={styles.content}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: theme.colors.accentAmber + '22' },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: theme.colors.accentAmber,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Milestone Unlocked
              </Text>
            </View>

            <Text
              variant="title2"
              style={[styles.title, { color: theme.colors.text }]}
            >
              {achievement.title}
            </Text>

            <Text
              variant="body"
              style={[styles.description, { color: theme.colors.textSecondary }]}
            >
              {achievement.description}
            </Text>
          </View>

          <Button
            title="Awesome, Keep Going!"
            variant="primary"
            onPress={onDismiss}
            style={styles.actionButton}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  sparkleLeft: {
    fontSize: 28,
    marginRight: 10,
  },
  sparkleRight: {
    fontSize: 28,
    marginLeft: 10,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245, 165, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actionButton: {
    width: '100%',
  },
});
