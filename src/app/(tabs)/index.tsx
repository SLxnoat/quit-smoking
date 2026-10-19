import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, ProgressRing, Screen, StatTile, Text } from '../../components';
import { CelebrationModal } from '../../components/celebration-modal';
import { useTheme } from '../../hooks/use-theme';
import { useStats } from '../../hooks/use-stats';
import { useAchievements } from '../../hooks/use-achievements';
import { getDailyQuote, type ContentItem } from '../../db/repositories/content.repo';
import { formatDuration } from '../../domain/stats';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { theme, mode, setMode } = useTheme();
  const { stats, nextMilestone, profile, isLoading } = useStats();
  const {
    latestCelebration,
    dismissCelebration,
    evaluateAndUnlock,
  } = useAchievements();

  const [dailyQuote, setDailyQuote] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (!stats) return;
    void evaluateAndUnlock({
      elapsedSeconds: stats.time.totalSeconds,
      moneySaved: stats.moneySaved,
    });
  }, [stats, evaluateAndUnlock]);

  useEffect(() => {
    let isMounted = true;
    async function loadQuote() {
      try {
        const quote = await getDailyQuote(db);
        if (isMounted) {
          setDailyQuote(quote);
        }
      } catch {
        // Fallback gracefully if database busy
      }
    }
    void loadQuote();
    return () => {
      isMounted = false;
    };
  }, [db]);

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  if (isLoading || !profile) {
    return (
      <Screen style={styles.centerContainer}>
        <Text variant="bodyMedium" color="secondary">
          Loading your smoke-free dashboard...
        </Text>
      </Screen>
    );
  }

  const isFutureQuit = stats?.isFutureQuit ?? false;
  const time = stats?.time;

  // Format currency symbol or code
  const currencySymbol = profile.currency === 'USD' ? '$' : `${profile.currency} `;

  // Formatted ticker string (HH:MM:SS)
  const pad = (n?: number) => (n ?? 0).toString().padStart(2, '0');
  const timerText = `${pad(time?.hours)}:${pad(time?.minutes)}:${pad(time?.seconds)}`;

  // Ring progress (progress towards next medical recovery milestone)
  const ringProgress = nextMilestone ? nextMilestone.progress : 1;

  return (
    <Screen scrollable contentContainerStyle={styles.scrollContent}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={[styles.flameBadge, { backgroundColor: `${theme.colors.primary}22` }]}>
            <Ionicons name="flame" size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text variant="title3" color="primary">
              Ember
            </Text>
            <Text variant="caption" color="secondary">
              {isFutureQuit ? 'Preparing for Quit Day' : 'Smoke-Free Journey'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggle, { borderColor: theme.colors.cardBorder }]}
          accessibilityRole="button"
          accessibilityLabel="Toggle Dark Mode"
        >
          <Ionicons
            name={mode === 'dark' ? 'sunny' : 'moon'}
            size={18}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Hero Timer Ring */}
      <View style={styles.ringSection}>
        <ProgressRing
          size={240}
          strokeWidth={14}
          progress={ringProgress}
          progressColor={isFutureQuit ? theme.colors.accentAmber : theme.colors.primary}
          trackColor={theme.isDark ? '#16272C' : '#E2EBE8'}
          accessibilityLabel={
            isFutureQuit
              ? 'Countdown until your quit date'
              : `Smoke-free duration: ${time?.days ?? 0} days and ${timerText}`
          }
        >
          <View style={styles.ringInner}>
            {isFutureQuit ? (
              <>
                <Text variant="caption" color="warning" style={styles.ringSubhead}>
                  QUIT COUNTDOWN
                </Text>
                <Text variant="title1" color="primary" style={styles.ringPrimaryNumber}>
                  {time?.days ?? 0}d
                </Text>
                <Text variant="timer" color="secondary" style={styles.ringTimer}>
                  {timerText}
                </Text>
                <Text variant="caption" color="secondary">
                  until smoke-free
                </Text>
              </>
            ) : (
              <>
                <Text variant="caption" color="brand" style={styles.ringSubhead}>
                  SMOKE-FREE
                </Text>
                {(time?.days ?? 0) > 0 ? (
                  <>
                    <Text variant="hero" color="primary" style={styles.ringPrimaryNumber}>
                      {time?.days}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={styles.daysLabel}>
                      {(time?.days ?? 0) === 1 ? 'DAY' : 'DAYS'}
                    </Text>
                  </>
                ) : (
                  <Text variant="title1" color="primary" style={styles.ringPrimaryNumber}>
                    {time?.hours}h
                  </Text>
                )}
                <Text variant="timer" color="primary" style={styles.ringTimer}>
                  {timerText}
                </Text>
              </>
            )}
          </View>
        </ProgressRing>
      </View>

      {/* 3 Stat Tiles Grid */}
      <View style={styles.statTilesRow}>
        <StatTile
          label="Saved"
          value={`${currencySymbol}${stats?.moneySaved.toFixed(2) ?? '0.00'}`}
          icon="💰"
          accentColor={theme.colors.accentAmber}
        />
        <StatTile
          label="Avoided"
          value={`${stats?.cigsAvoided ?? 0}`}
          subtext="cigs"
          icon="🚭"
          accentColor={theme.colors.primary}
        />
        <StatTile
          label="Regained"
          value={stats?.lifeRegainedFormatted ?? '0m'}
          subtext="life time"
          icon="🫁"
          accentColor={theme.colors.success}
        />
      </View>

      {/* Next Recovery Milestone Card */}
      {nextMilestone && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/progress' as any)}
          accessibilityRole="button"
          accessibilityLabel={`Next milestone: ${nextMilestone.title}. Tap to view full health timeline.`}
        >
          <Card variant="elevated" padding="md" style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <View style={styles.milestoneTitleContainer}>
                <Text variant="caption" color="brand" style={styles.milestoneCategory}>
                  NEXT HEALTH RECOVERY &bull; {nextMilestone.category.toUpperCase()}
                </Text>
                <Text variant="title3" color="primary">
                  {nextMilestone.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </View>

            <Text variant="bodySmall" color="secondary" style={styles.milestoneDescription}>
              {nextMilestone.description}
            </Text>

            {/* Linear Progress Bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBarBackground,
                  { backgroundColor: theme.isDark ? '#1C2C30' : '#E0EAE7' },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.round(nextMilestone.progress * 100))}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text variant="caption" color="secondary">
                  {Math.round(nextMilestone.progress * 100)}% complete
                </Text>
                <Text variant="caption" color="brand">
                  {formatDuration(Math.ceil(nextMilestone.secondsRemaining / 60))} remaining
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {/* Daily Motivation Quote */}
      {dailyQuote && (
        <Card variant="outlined" padding="md" style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.primary} />
            <Text variant="caption" color="brand" style={styles.quoteTag}>
              DAILY INSPIRATION &bull; #{dailyQuote.category?.toUpperCase() ?? 'MIND'}
            </Text>
          </View>
          <Text variant="body" color="primary" style={styles.quoteBody}>
            &ldquo;{dailyQuote.body}&rdquo;
          </Text>
          {dailyQuote.author_or_source && (
            <Text variant="caption" color="secondary" style={styles.quoteAuthor}>
              &mdash; {dailyQuote.author_or_source}
            </Text>
          )}
        </Card>
      )}

      {/* Craving SOS Trigger Button */}
      <TouchableOpacity
        onPress={() => router.push('/craving' as any)}
        accessibilityRole="button"
        accessibilityLabel="Experiencing an Urge? Tap for Craving SOS"
      >
        <Card variant="flat" padding="md" style={styles.sosCard}>
          <View style={styles.sosContent}>
            <View style={styles.sosIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.sosTextContainer}>
              <Text variant="title3" style={styles.sosTitle}>
                Experiencing an Urge?
              </Text>
              <Text variant="caption" style={styles.sosSubtitle}>
                Take 3 deep breaths. Urges peak in 3 minutes and always fade.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
          </View>
        </Card>
      </TouchableOpacity>

      {/* Compassionate Slip Support Entry */}
      <TouchableOpacity
        onPress={() => router.push('/slip' as any)}
        accessibilityRole="button"
        accessibilityLabel="Had a slip? Tap for compassionate support"
        style={styles.slipEntryRow}
      >
        <Ionicons name="heart-circle-outline" size={18} color={theme.colors.textSecondary} />
        <Text variant="caption" color="secondary" style={styles.slipEntryText}>
          Had a slip? We help you get right back on track without losing lifetime progress.
        </Text>
      </TouchableOpacity>

      {/* Floating SOS Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/craving' as any)}
        style={[
          styles.floatingSosButton,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Craving SOS - Immediate urge assistance"
      >
        <Ionicons name="shield-half" size={20} color="#FFFFFF" />
        <Text variant="bodySmall" style={styles.floatingSosText}>
          SOS
        </Text>
      </TouchableOpacity>

      {/* Milestone Celebration Modal */}
      <CelebrationModal
        visible={!!latestCelebration}
        achievement={latestCelebration}
        onDismiss={dismissCelebration}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flameBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSubhead: {
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 4,
  },
  ringPrimaryNumber: {
    fontWeight: '800',
    lineHeight: 46,
  },
  daysLabel: {
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 4,
  },
  ringTimer: {
    marginTop: 4,
  },
  statTilesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  milestoneCard: {
    gap: 10,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitleContainer: {
    flex: 1,
    gap: 2,
  },
  milestoneCategory: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  milestoneDescription: {
    lineHeight: 18,
  },
  progressContainer: {
    gap: 6,
    marginTop: 4,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteCard: {
    gap: 8,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quoteTag: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  quoteBody: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    textAlign: 'right',
  },
  sosCard: {
    backgroundColor: '#0B3C49',
    borderRadius: 16,
  },
  sosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F9D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextContainer: {
    flex: 1,
    gap: 2,
  },
  sosTitle: {
    color: '#FFFFFF',
  },
  sosSubtitle: {
    color: '#D0E3E1',
    lineHeight: 16,
  },
  floatingSosButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 999,
  },
  floatingSosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  slipEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  slipEntryText: {
    flex: 1,
    lineHeight: 16,
  },
});
