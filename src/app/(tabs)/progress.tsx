import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, Text } from '../../components';
import { CelebrationModal } from '../../components/celebration-modal';
import { useTheme } from '../../hooks/use-theme';
import { useStats } from '../../hooks/use-stats';
import { useAchievements } from '../../hooks/use-achievements';
import { useGoals } from '../../hooks/use-goals';
import {
  ALL_ACHIEVEMENTS,
  type AchievementCategory,
  type AchievementDefinition,
} from '../../domain/milestones';
import { formatDuration } from '../../domain/stats';
import { GoalSchema } from '../../domain/validation';

type ActiveView = 'timeline' | 'badges' | 'goals';
type BadgeFilter = 'all' | AchievementCategory;

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { stats, milestonesProgress, profile, isLoading } = useStats();
  const {
    unlockedKeys,
    latestCelebration,
    dismissCelebration,
    evaluateAndUnlock,
  } = useAchievements();
  const { goals, addGoal, removeGoal, checkAchieved } = useGoals();

  const [activeView, setActiveView] = useState<ActiveView>('timeline');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');

  // New Goal Form State
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);

  // Auto-evaluate achievements and goals when stats change
  useEffect(() => {
    if (!stats) return;

    void evaluateAndUnlock({
      elapsedSeconds: stats.time.totalSeconds,
      moneySaved: stats.moneySaved,
    });

    void checkAchieved(stats.moneySaved);
  }, [stats, evaluateAndUnlock, checkAchieved]);

  // Count completed recovery milestones
  const completedCount = useMemo(
    () => milestonesProgress.filter((m) => m.isCompleted).length,
    [milestonesProgress]
  );

  // Filter badges by category
  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'all') {
      return ALL_ACHIEVEMENTS;
    }
    return ALL_ACHIEVEMENTS.filter((b) => b.category === badgeFilter);
  }, [badgeFilter]);

  const unlockedBadgesCount = useMemo(() => {
    let count = 0;
    for (const ach of ALL_ACHIEVEMENTS) {
      if (unlockedKeys.has(ach.key)) count++;
    }
    return count;
  }, [unlockedKeys]);

  const currencySymbol = profile?.currency === 'USD' ? '$' : `${profile?.currency ?? '$'} `;

  const handleCreateGoal = async () => {
    setGoalError(null);
    const parsed = GoalSchema.safeParse({
      title: goalTitle,
      targetAmount: parseFloat(goalTarget),
    });

    if (!parsed.success) {
      setGoalError(parsed.error.issues[0]?.message ?? 'Invalid goal');
      return;
    }

    try {
      await addGoal({
        title: parsed.data.title,
        target_amount: parsed.data.targetAmount,
      });
      setGoalTitle('');
      setGoalTarget('');
      setShowAddGoal(false);
    } catch {
      setGoalError('Could not create goal');
    }
  };

  if (isLoading) {
    return (
      <Screen style={styles.centerContainer}>
        <Text variant="bodyMedium" color="secondary">
          Loading recovery progress...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.scrollContent}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text variant="caption" color="brand" style={styles.headerTag}>
          HEALTH &amp; ACHIEVEMENTS
        </Text>
        <Text variant="title1" color="primary">
          Your Recovery
        </Text>
        <Text variant="bodySmall" color="secondary">
          Evidence-based timeline of biological healing, milestone badges, and savings goals.
        </Text>
      </View>

      {/* Summary Stat Card */}
      <Card variant="elevated" padding="md" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text variant="caption" color="secondary">
              HEALTH BENCHMARKS
            </Text>
            <Text variant="title2" color="primary">
              {completedCount} / {milestonesProgress.length}
            </Text>
            <Text variant="caption" color="brand">
              {Math.round((completedCount / (milestonesProgress.length || 1)) * 100)}% restored
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.cardBorder }]} />

          <View style={styles.summaryCol}>
            <Text variant="caption" color="secondary">
              BADGES UNLOCKED
            </Text>
            <Text variant="title2" color="primary">
              {unlockedBadgesCount} / {ALL_ACHIEVEMENTS.length}
            </Text>
            <Text variant="caption" color="brand">
              {ALL_ACHIEVEMENTS.length - unlockedBadgesCount} upcoming
            </Text>
          </View>
        </View>
      </Card>

      {/* View Segment Switcher (3 Segments: Timeline, Badges, Goals) */}
      <View
        style={[
          styles.segmentedContainer,
          { backgroundColor: theme.isDark ? '#142125' : '#E6EFECEE' },
        ]}
      >
        <TouchableOpacity
          onPress={() => setActiveView('timeline')}
          style={[
            styles.segmentButton,
            activeView === 'timeline' && {
              backgroundColor: theme.colors.cardBackground,
              elevation: 2,
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Health"
          accessibilityState={{ selected: activeView === 'timeline' }}
        >
          <Ionicons
            name="pulse"
            size={15}
            color={activeView === 'timeline' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            variant="caption"
            color={activeView === 'timeline' ? 'primary' : 'secondary'}
            style={activeView === 'timeline' ? styles.activeTabText : undefined}
          >
            Health
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveView('badges')}
          style={[
            styles.segmentButton,
            activeView === 'badges' && {
              backgroundColor: theme.colors.cardBackground,
              elevation: 2,
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Badges"
          accessibilityState={{ selected: activeView === 'badges' }}
        >
          <Ionicons
            name="ribbon"
            size={15}
            color={activeView === 'badges' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            variant="caption"
            color={activeView === 'badges' ? 'primary' : 'secondary'}
            style={activeView === 'badges' ? styles.activeTabText : undefined}
          >
            Badges ({unlockedBadgesCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveView('goals')}
          style={[
            styles.segmentButton,
            activeView === 'goals' && {
              backgroundColor: theme.colors.cardBackground,
              elevation: 2,
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Goals"
          accessibilityState={{ selected: activeView === 'goals' }}
        >
          <Ionicons
            name="gift-outline"
            size={15}
            color={activeView === 'goals' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            variant="caption"
            color={activeView === 'goals' ? 'primary' : 'secondary'}
            style={activeView === 'goals' ? styles.activeTabText : undefined}
          >
            Goals ({goals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* VIEW 1: HEALTH TIMELINE STEPPER */}
      {activeView === 'timeline' && (
        <View style={styles.timelineContainer}>
          {milestonesProgress.map((item, index) => {
            const isLast = index === milestonesProgress.length - 1;
            const isCurrent = !item.isCompleted && (index === 0 || milestonesProgress[index - 1].isCompleted);

            return (
              <View key={item.id} style={styles.stepperRow}>
                {/* Stepper Node Column */}
                <View style={styles.nodeColumn}>
                  <View
                    style={[
                      styles.nodeCircle,
                      item.isCompleted && {
                        backgroundColor: theme.colors.success,
                        borderColor: theme.colors.success,
                      },
                      isCurrent && {
                        borderColor: theme.colors.primary,
                        backgroundColor: theme.colors.cardBackground,
                        borderWidth: 2.5,
                      },
                      !item.isCompleted && !isCurrent && {
                        borderColor: theme.colors.cardBorder,
                        backgroundColor: theme.colors.cardBackground,
                      },
                    ]}
                  >
                    {item.isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : isCurrent ? (
                      <View
                        style={[styles.pulsingCenterDot, { backgroundColor: theme.colors.primary }]}
                      />
                    ) : (
                      <View
                        style={[styles.futureCenterDot, { backgroundColor: theme.colors.textSecondary }]}
                      />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.connectingLine,
                        {
                          backgroundColor: item.isCompleted
                            ? theme.colors.success
                            : theme.colors.cardBorder,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Milestone Details Card */}
                <View style={styles.stepContent}>
                  <Card
                    variant={isCurrent ? 'elevated' : 'flat'}
                    padding="md"
                    style={[
                      styles.stepCard,
                      isCurrent && {
                        borderColor: `${theme.colors.primary}66`,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <View style={styles.stepCardHeader}>
                      <Text
                        variant="caption"
                        color={item.isCompleted ? 'success' : isCurrent ? 'brand' : 'secondary'}
                        style={styles.stepDuration}
                      >
                        {item.timeLabel}
                      </Text>

                      {item.isCompleted ? (
                        <View
                          style={[
                            styles.badgePill,
                            { backgroundColor: `${theme.colors.success}22` },
                          ]}
                        >
                          <Text variant="caption" color="success" style={{ fontWeight: '700' }}>
                            Reached
                          </Text>
                        </View>
                      ) : isCurrent ? (
                        <View
                          style={[
                            styles.badgePill,
                            { backgroundColor: `${theme.colors.primary}22` },
                          ]}
                        >
                          <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                            {Math.round(item.progress * 100)}%
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text variant="title3" color="primary">
                      {item.title}
                    </Text>

                    <Text variant="bodySmall" color="secondary" style={styles.descriptionText}>
                      {item.description}
                    </Text>

                    {/* In-progress progress bar */}
                    {isCurrent && (
                      <View style={styles.stepperProgressBarContainer}>
                        <View
                          style={[
                            styles.stepperProgressBarBackground,
                            { backgroundColor: `${theme.colors.primary}22` },
                          ]}
                        >
                          <View
                            style={[
                              styles.stepperProgressBarFill,
                              {
                                width: `${Math.round(item.progress * 100)}%`,
                                backgroundColor: theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text variant="caption" color="secondary">
                          {formatDuration(item.secondsRemaining)} remaining
                        </Text>
                      </View>
                    )}

                    <Text variant="caption" color="secondary" style={styles.sourceText}>
                      Evidence source: {item.source}
                    </Text>
                  </Card>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* VIEW 2: BADGES GRID */}
      {activeView === 'badges' && (
        <View style={styles.badgesSection}>
          {/* Category Filter Chips */}
          <View style={styles.filterChipsRow}>
            {(['all', 'time', 'money', 'craving'] as const).map((cat) => {
              const isActive = badgeFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setBadgeFilter(cat)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? theme.colors.primary
                        : theme.isDark
                        ? '#142125'
                        : '#E6EFECEE',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.filterChipText,
                      { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Badges 2-Column Grid */}
          <View style={styles.badgesGrid}>
            {filteredBadges.map((badge: AchievementDefinition) => {
              const isUnlocked = unlockedKeys.has(badge.key);

              return (
                <Card
                  key={badge.key}
                  variant={isUnlocked ? 'elevated' : 'flat'}
                  padding="md"
                  style={[
                    styles.badgeCard,
                    isUnlocked
                      ? {
                          borderColor: `${theme.colors.accentAmber}66`,
                          borderWidth: 1.5,
                        }
                      : {
                          opacity: 0.6,
                        },
                  ]}
                >
                  <View style={styles.badgeTopRow}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    {isUnlocked ? (
                      <View
                        style={[
                          styles.badgeUnlockedTag,
                          { backgroundColor: `${theme.colors.accentAmber}22` },
                        ]}
                      >
                        <Ionicons name="sparkles" size={12} color={theme.colors.accentAmber} />
                        <Text
                          variant="caption"
                          style={[styles.badgeTagText, { color: theme.colors.accentAmber }]}
                        >
                          UNLOCKED
                        </Text>
                      </View>
                    ) : (
                      <Ionicons
                        name="lock-closed"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    )}
                  </View>

                  <Text variant="bodyMedium" color="primary" style={styles.badgeTitle}>
                    {badge.title}
                  </Text>

                  <Text variant="caption" color="secondary" style={styles.badgeDescription}>
                    {badge.description}
                  </Text>
                </Card>
              );
            })}
          </View>
        </View>
      )}

      {/* VIEW 3: GOALS & REWARDS */}
      {activeView === 'goals' && (
        <View style={styles.goalsSection}>
          {/* Header Savings Banner */}
          <Card variant="outlined" padding="md" style={styles.savingsHeroCard}>
            <View style={styles.savingsHeroRow}>
              <View>
                <Text variant="caption" color="secondary">
                  AVAILABLE SMOKE-FREE SAVINGS
                </Text>
                <Text variant="title1" color="primary">
                  {currencySymbol}{(stats?.moneySaved ?? 0).toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.piggyIconBadge,
                  { backgroundColor: `${theme.colors.accentAmber}22` },
                ]}
              >
                <Text style={{ fontSize: 28 }}>🎁</Text>
              </View>
            </View>
            <Text variant="caption" color="secondary" style={{ marginTop: 6 }}>
              Turn your tobacco savings into tangible rewards you truly deserve.
            </Text>
          </Card>

          {/* Add Goal Toggle / Form */}
          {showAddGoal ? (
            <Card variant="elevated" padding="md" style={styles.newGoalCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="flag-outline" size={20} color={theme.colors.primary} />
                <Text variant="title3" color="primary" style={{ marginLeft: 6 }}>
                  Create New Goal / Reward
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text variant="caption" color="secondary">
                  Goal Title
                </Text>
                <TextInput
                  style={[
                    styles.goalInput,
                    {
                      backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                      borderColor: theme.colors.cardBorder,
                      color: theme.colors.text,
                    },
                  ]}
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                  placeholder="e.g. Wireless Headphones, Weekend Trip"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="caption" color="secondary">
                  Target Amount ({currencySymbol.trim()})
                </Text>
                <TextInput
                  style={[
                    styles.goalInput,
                    {
                      backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                      borderColor: theme.colors.cardBorder,
                      color: theme.colors.text,
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  placeholder="e.g. 150.00"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              {goalError && (
                <Text variant="caption" color="danger" style={{ marginBottom: 8 }}>
                  {goalError}
                </Text>
              )}

              <View style={styles.goalFormButtons}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setShowAddGoal(false);
                    setGoalError(null);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Goal"
                  variant="primary"
                  size="sm"
                  onPress={handleCreateGoal}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ) : (
            <Button
              title="+ Add New Savings Goal"
              variant="outline"
              onPress={() => setShowAddGoal(true)}
              style={styles.addGoalBtn}
            />
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <Card variant="flat" padding="lg" style={styles.emptyGoalsCard}>
              <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🎯</Text>
              <Text variant="bodyMedium" color="primary" style={{ textAlign: 'center', fontWeight: '600' }}>
                No goals created yet
              </Text>
              <Text variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 4 }}>
                Add your first savings reward above (e.g. dinner date, book, gadget) to keep your
                motivation soaring!
              </Text>
            </Card>
          ) : (
            <View style={styles.goalsList}>
              {goals.map((goal) => {
                const moneySaved = stats?.moneySaved ?? 0;
                const isAchieved = goal.achieved_at !== null || moneySaved >= goal.target_amount;
                const progressPct = Math.min(100, Math.round((moneySaved / goal.target_amount) * 100));

                return (
                  <Card
                    key={goal.id}
                    variant={isAchieved ? 'elevated' : 'flat'}
                    padding="md"
                    style={[
                      styles.goalCard,
                      isAchieved && {
                        borderColor: `${theme.colors.success}66`,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <View style={styles.goalHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                          {goal.title}
                        </Text>
                        <Text variant="caption" color="secondary">
                          Target: {currencySymbol}{goal.target_amount.toFixed(2)}
                        </Text>
                      </View>

                      {isAchieved ? (
                        <View
                          style={[
                            styles.badgePill,
                            { backgroundColor: `${theme.colors.success}22` },
                          ]}
                        >
                          <Text variant="caption" color="success" style={{ fontWeight: '700' }}>
                            Achieved 🎉
                          </Text>
                        </View>
                      ) : (
                        <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                          {progressPct}%
                        </Text>
                      )}

                      <TouchableOpacity
                        onPress={() => removeGoal(goal.id)}
                        style={styles.deleteGoalBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete goal ${goal.title}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View
                      style={[
                        styles.goalProgressBarBg,
                        { backgroundColor: theme.isDark ? '#142125' : '#E6EFECEE' },
                      ]}
                    >
                      <View
                        style={[
                          styles.goalProgressBarFill,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: isAchieved
                              ? theme.colors.success
                              : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Celebration Modal (Animated with Reanimated) */}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTag: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 16,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTabText: {
    fontWeight: '700',
  },
  timelineContainer: {
    marginTop: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    minHeight: 120,
  },
  nodeColumn: {
    width: 32,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pulsingCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  futureCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  connectingLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  stepCard: {
    gap: 8,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepDuration: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  descriptionText: {
    lineHeight: 18,
  },
  stepperProgressBarContainer: {
    gap: 4,
    marginTop: 4,
  },
  stepperProgressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepperProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sourceText: {
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.8,
  },
  badgesSection: {
    gap: 16,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterChipText: {
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    gap: 6,
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeUnlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTagText: {
    fontWeight: '700',
    fontSize: 10,
  },
  badgeTitle: {
    fontWeight: '700',
  },
  badgeDescription: {
    lineHeight: 16,
  },
  goalsSection: {
    gap: 16,
  },
  savingsHeroCard: {
    borderRadius: 16,
  },
  savingsHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  piggyIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalBtn: {
    width: '100%',
  },
  newGoalCard: {
    borderRadius: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  goalInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    fontSize: 14,
  },
  goalFormButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  emptyGoalsCard: {
    borderRadius: 16,
    alignItems: 'center',
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    borderRadius: 14,
    gap: 10,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteGoalBtn: {
    padding: 6,
    marginLeft: 8,
  },
  goalProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
