import React, { useCallback, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { Button, Card, EmptyState, Screen, Text } from '../../components';
import { useTheme } from '../../hooks/use-theme';
import { getProfile } from '../../db/repositories/profile.repo';
import {
  completeLesson,
  getCompletedLessonIds,
  getContentItems,
  getLessons,
  getTodayLesson,
  isBookmarked,
  toggleBookmark,
  uncompleteLesson,
  type ContentItem,
} from '../../db/repositories/content.repo';

type LearnSubTab = 'path' | 'articles' | 'exercises' | 'bookmarks';

export default function LearnScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<LearnSubTab>('path');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Content Data State
  const [todayLesson, setTodayLesson] = useState<ContentItem | null>(null);
  const [currentDayNumber, setCurrentDayNumber] = useState<number>(1);
  const [isFutureQuit, setIsFutureQuit] = useState<boolean>(false);
  const [lessonsList, setLessonsList] = useState<ContentItem[]>([]);
  const [articlesList, setArticlesList] = useState<ContentItem[]>([]);
  const [exercisesList, setExercisesList] = useState<ContentItem[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<ContentItem[]>([]);
  const [bookmarkedIdSet, setBookmarkedIdSet] = useState<Set<string>>(new Set());

  // Modal Detail State
  const [activeDetailItem, setActiveDetailItem] = useState<ContentItem | null>(null);
  const [isDetailBookmarked, setIsDetailBookmarked] = useState<boolean>(false);
  const [isDetailCompleted, setIsDetailCompleted] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const userProfile = await getProfile(db);

      const [lessons, articles, exercises, completedIds] = await Promise.all([
        getLessons(db),
        getContentItems(db, { type: 'article' }),
        getContentItems(db, { type: 'exercise' }),
        getCompletedLessonIds(db),
      ]);

      setLessonsList(lessons);
      setArticlesList(articles);
      setExercisesList(exercises);
      setCompletedLessonIds(completedIds);

      if (userProfile) {
        const todayRes = await getTodayLesson(db, userProfile.quit_at);
        setTodayLesson(todayRes.lesson);
        setCurrentDayNumber(todayRes.currentDay);
        setIsFutureQuit(todayRes.isFutureQuit);
      } else {
        const day1 = lessons.find((l) => l.day_index === 1) ?? null;
        setTodayLesson(day1);
        setCurrentDayNumber(1);
      }

      // Load bookmarks
      const allContent = await getContentItems(db);
      const bSet = new Set<string>();
      const bItems: ContentItem[] = [];
      for (const item of allContent) {
        const b = await isBookmarked(db, item.id);
        if (b) {
          bSet.add(item.id);
          bItems.push(item);
        }
      }
      setBookmarkedIdSet(bSet);
      setBookmarkedItems(bItems);
    } catch {
      // Fallback gracefully
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const triggerHaptic = (type: 'selection' | 'success') => {
    try {
      if (type === 'selection') Haptics.selectionAsync().catch(() => {});
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  };

  const handleOpenDetail = async (item: ContentItem) => {
    triggerHaptic('selection');
    setActiveDetailItem(item);
    const b = bookmarkedIdSet.has(item.id);
    setIsDetailBookmarked(b);
    if (item.type === 'lesson') {
      setIsDetailCompleted(completedLessonIds.has(item.id));
    }
  };

  const handleToggleBookmark = async (item: ContentItem) => {
    triggerHaptic('selection');
    const newState = await toggleBookmark(db, item.id);
    setBookmarkedIdSet((prev) => {
      const next = new Set(prev);
      if (newState) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    if (activeDetailItem?.id === item.id) {
      setIsDetailBookmarked(newState);
    }
    void loadData();
  };

  const handleToggleLessonComplete = async (lessonId: string) => {
    triggerHaptic('success');
    const isDone = completedLessonIds.has(lessonId);
    if (isDone) {
      await uncompleteLesson(db, lessonId);
      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
      setIsDetailCompleted(false);
    } else {
      await completeLesson(db, lessonId);
      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(lessonId);
        return next;
      });
      setIsDetailCompleted(true);
    }
  };

  // Filter items by search query and category
  const filterList = (items: ContentItem[]) => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category?.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  };

  const completedCount = completedLessonIds.size;
  const completionPercentage = Math.round((completedCount / 30) * 100);

  return (
    <Screen scrollable contentContainerStyle={styles.scrollContent}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text variant="title1" color="primary">
          Learn &amp; Grow
        </Text>
        <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
          30-day cessation path, clinical guides &amp; mindful coping tools
        </Text>
      </View>

      {/* Today's Micro-Lesson Hero Card */}
      {todayLesson && !searchQuery && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleOpenDetail(todayLesson)}
          accessibilityRole="button"
          accessibilityLabel={`Today's Lesson: Day ${currentDayNumber}, ${todayLesson.title}. Tap to read.`}
        >
          <Card variant="elevated" padding="md" style={styles.todayHeroCard}>
            <View style={styles.todayHeaderRow}>
              <View
                style={[
                  styles.dayBadge,
                  { backgroundColor: `${theme.colors.primary}1A` },
                ]}
              >
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                <Text variant="caption" color="brand" style={{ fontWeight: '700', marginLeft: 4 }}>
                  {isFutureQuit ? 'PREVIEW LESSON' : `DAY ${currentDayNumber} OF 30`}
                </Text>
              </View>

              <View style={styles.statusRow}>
                {completedLessonIds.has(todayLesson.id) ? (
                  <View style={[styles.doneBadge, { backgroundColor: `${theme.colors.success}22` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                    <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700', marginLeft: 3 }}>
                      Completed
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.timeBadge, { backgroundColor: theme.colors.cardBorder }]}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                    <Text variant="caption" color="secondary" style={{ marginLeft: 3 }}>
                      1 min read
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text variant="title3" color="primary" style={{ marginTop: 8 }}>
              {todayLesson.title}
            </Text>
            <Text variant="bodySmall" color="secondary" numberOfLines={2} style={styles.heroSnippet}>
              {todayLesson.body}
            </Text>

            <View style={styles.heroFooter}>
              <Text variant="caption" color="brand" style={{ fontWeight: '600' }}>
                Read Today&apos;s Lesson &rarr;
              </Text>
              <Text variant="caption" color="tertiary">
                {todayLesson.author_or_source}
              </Text>
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search lessons, articles, or coping exercises..."
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          accessibilityLabel="Search lessons and articles"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4 Subtab Navigation Pills */}
      <View
        style={[
          styles.subtabContainer,
          { backgroundColor: theme.isDark ? '#15252A' : '#E2EBE8' },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('path');
            setSelectedCategory('all');
          }}
          style={[
            styles.subtabButton,
            activeTab === 'path' && { backgroundColor: theme.colors.cardBackground },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'path' }}
          accessibilityLabel="30-day path tab"
        >
          <Text
            variant="caption"
            style={{
              fontWeight: '700',
              color: activeTab === 'path' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            30-Day Path
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('articles');
            setSelectedCategory('all');
          }}
          style={[
            styles.subtabButton,
            activeTab === 'articles' && { backgroundColor: theme.colors.cardBackground },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'articles' }}
          accessibilityLabel="Articles tab"
        >
          <Text
            variant="caption"
            style={{
              fontWeight: '700',
              color: activeTab === 'articles' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            Articles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('exercises');
            setSelectedCategory('all');
          }}
          style={[
            styles.subtabButton,
            activeTab === 'exercises' && { backgroundColor: theme.colors.cardBackground },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'exercises' }}
          accessibilityLabel="Exercises tab"
        >
          <Text
            variant="caption"
            style={{
              fontWeight: '700',
              color: activeTab === 'exercises' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            Exercises
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('bookmarks');
            setSelectedCategory('all');
          }}
          style={[
            styles.subtabButton,
            activeTab === 'bookmarks' && { backgroundColor: theme.colors.cardBackground },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'bookmarks' }}
          accessibilityLabel="Bookmarks tab"
        >
          <Text
            variant="caption"
            style={{
              fontWeight: '700',
              color: activeTab === 'bookmarks' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            Bookmarks ({bookmarkedIdSet.size})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================
          SUBTAB 1: 30-DAY PATH
          ======================================================== */}
      {activeTab === 'path' && (
        <View style={styles.tabContentSection}>
          {/* Progress Header Card */}
          <Card variant="flat" padding="md" style={styles.pathProgressCard}>
            <View style={styles.progressHeaderRow}>
              <Text variant="subtitle" color="primary">
                Program Progress
              </Text>
              <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                {completedCount} / 30 Completed ({completionPercentage}%)
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.colors.cardBorder }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(2, completionPercentage))}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
          </Card>

          {/* 30-Day Grid */}
          <View style={styles.daysGrid}>
            {filterList(lessonsList).map((lesson) => {
              const day = lesson.day_index ?? 1;
              const isCompleted = completedLessonIds.has(lesson.id);
              const isToday = day === currentDayNumber;

              return (
                <TouchableOpacity
                  key={lesson.id}
                  activeOpacity={0.8}
                  onPress={() => handleOpenDetail(lesson)}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isToday
                        ? theme.colors.primary
                        : isCompleted
                        ? theme.colors.success
                        : theme.colors.border,
                      borderWidth: isToday ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}: ${lesson.title}. Status: ${
                    isCompleted ? 'Completed' : isToday ? 'Current Day' : 'Upcoming'
                  }`}
                >
                  <View style={styles.dayCardTopRow}>
                    <View
                      style={[
                        styles.dayNumberCircle,
                        {
                          backgroundColor: isToday
                            ? theme.colors.primary
                            : isCompleted
                            ? `${theme.colors.success}22`
                            : `${theme.colors.textSecondary}18`,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '800',
                          color: isToday
                            ? '#FFFFFF'
                            : isCompleted
                            ? theme.colors.success
                            : theme.colors.textSecondary,
                        }}
                      >
                        {day}
                      </Text>
                    </View>

                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    ) : isToday ? (
                      <Text variant="caption" color="brand" style={{ fontWeight: '800', fontSize: 10 }}>
                        TODAY
                      </Text>
                    ) : null}
                  </View>

                  <Text variant="bodySmall" color="primary" numberOfLines={2} style={styles.dayCardTitle}>
                    {lesson.title}
                  </Text>
                  <Text variant="caption" color="tertiary" numberOfLines={1} style={{ marginTop: 4 }}>
                    {lesson.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ========================================================
          SUBTAB 2: ARTICLES
          ======================================================== */}
      {activeTab === 'articles' && (
        <View style={styles.tabContentSection}>
          {filterList(articlesList).length === 0 ? (
            <EmptyState
              icon="📚"
              title="No Articles Found"
              description="No articles matched your current search query."
              actionTitle="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <View style={styles.itemsList}>
              {filterList(articlesList).map((art) => (
                <TouchableOpacity
                  key={art.id}
                  activeOpacity={0.88}
                  onPress={() => handleOpenDetail(art)}
                  accessibilityRole="button"
                  accessibilityLabel={`Article: ${art.title}`}
                >
                  <Card variant="outlined" padding="md" style={styles.articleCard}>
                    <View style={styles.articleHeaderRow}>
                      <View style={[styles.categoryTag, { backgroundColor: `${theme.colors.primary}18` }]}>
                        <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                          {art.category?.toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleBookmark(art)}
                        accessibilityLabel={bookmarkedIdSet.has(art.id) ? 'Remove bookmark' : 'Bookmark article'}
                      >
                        <Ionicons
                          name={bookmarkedIdSet.has(art.id) ? 'bookmark' : 'bookmark-outline'}
                          size={18}
                          color={bookmarkedIdSet.has(art.id) ? theme.colors.primary : theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text variant="subtitle" color="primary" style={{ marginTop: 6 }}>
                      {art.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 4 }}>
                      {art.body}
                    </Text>

                    <View style={styles.itemFooterRow}>
                      <Text variant="caption" color="tertiary">
                        Source: {art.author_or_source}
                      </Text>
                      <Text variant="caption" color="brand">
                        Read Guide &rarr;
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ========================================================
          SUBTAB 3: EXERCISES
          ======================================================== */}
      {activeTab === 'exercises' && (
        <View style={styles.tabContentSection}>
          {filterList(exercisesList).length === 0 ? (
            <EmptyState
              icon="🧘"
              title="No Exercises Found"
              description="No exercises matched your current search query."
              actionTitle="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <View style={styles.itemsList}>
              {filterList(exercisesList).map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  activeOpacity={0.88}
                  onPress={() => handleOpenDetail(ex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Exercise: ${ex.title}`}
                >
                  <Card variant="outlined" padding="md" style={styles.articleCard}>
                    <View style={styles.articleHeaderRow}>
                      <View style={[styles.categoryTag, { backgroundColor: `${theme.colors.accentAmber}18` }]}>
                        <Text variant="caption" style={{ color: theme.colors.accentAmber, fontWeight: '700' }}>
                          {ex.category?.toUpperCase()} &bull; COPING TOOL
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleBookmark(ex)}
                        accessibilityLabel={bookmarkedIdSet.has(ex.id) ? 'Remove bookmark' : 'Bookmark exercise'}
                      >
                        <Ionicons
                          name={bookmarkedIdSet.has(ex.id) ? 'bookmark' : 'bookmark-outline'}
                          size={18}
                          color={bookmarkedIdSet.has(ex.id) ? theme.colors.primary : theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text variant="subtitle" color="primary" style={{ marginTop: 6 }}>
                      {ex.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 4 }}>
                      {ex.body}
                    </Text>

                    <View style={styles.itemFooterRow}>
                      <Text variant="caption" color="tertiary">
                        {ex.author_or_source}
                      </Text>
                      <Text variant="caption" color="brand">
                        Practice Exercise &rarr;
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ========================================================
          SUBTAB 4: BOOKMARKS
          ======================================================== */}
      {activeTab === 'bookmarks' && (
        <View style={styles.tabContentSection}>
          {bookmarkedItems.length === 0 ? (
            <EmptyState
              icon="🔖"
              title="No Bookmarks Yet"
              description="Tap the bookmark icon on any lesson, article, or exercise to save it here for quick access."
              actionTitle="Explore 30-Day Path"
              onAction={() => setActiveTab('path')}
            />
          ) : (
            <View style={styles.itemsList}>
              {filterList(bookmarkedItems).map((b) => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.88}
                  onPress={() => handleOpenDetail(b)}
                  accessibilityRole="button"
                  accessibilityLabel={`Saved item: ${b.title}`}
                >
                  <Card variant="outlined" padding="md" style={styles.articleCard}>
                    <View style={styles.articleHeaderRow}>
                      <View style={[styles.categoryTag, { backgroundColor: `${theme.colors.primary}18` }]}>
                        <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                          {b.type.toUpperCase()} &bull; {b.category?.toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleBookmark(b)}
                        accessibilityLabel="Remove from bookmarks"
                      >
                        <Ionicons name="bookmark" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text variant="subtitle" color="primary" style={{ marginTop: 6 }}>
                      {b.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 4 }}>
                      {b.body}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Content Detail Modal */}
      <Modal
        visible={!!activeDetailItem}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDetailItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.colors.cardBackground },
            ]}
          >
            {activeDetailItem && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHeaderRow}>
                  <View style={[styles.categoryTag, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                      {activeDetailItem.type === 'lesson'
                        ? `DAY ${activeDetailItem.day_index} LESSON`
                        : activeDetailItem.type.toUpperCase()}{' '}
                      &bull; {activeDetailItem.category?.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleBookmark(activeDetailItem)}
                      accessibilityLabel={isDetailBookmarked ? 'Remove bookmark' : 'Add to bookmarks'}
                      style={styles.modalIconButton}
                    >
                      <Ionicons
                        name={isDetailBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={22}
                        color={isDetailBookmarked ? theme.colors.primary : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveDetailItem(null)}
                      accessibilityLabel="Close modal"
                      style={styles.modalIconButton}
                    >
                      <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text variant="title2" color="primary" style={{ marginTop: 12 }}>
                  {activeDetailItem.title}
                </Text>

                {/* Clinical Review Metadata Banner */}
                <Card
                  variant="flat"
                  padding="sm"
                  style={[
                    styles.clinicalBanner,
                    { backgroundColor: theme.isDark ? '#142125' : '#F0F5F3' },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
                      Clinically Reviewed &amp; Evidence-Based
                    </Text>
                    <Text variant="caption" color="secondary" style={{ fontSize: 11, marginTop: 1 }}>
                      Source: {activeDetailItem.author_or_source}
                    </Text>
                  </View>
                </Card>

                <Text variant="body" color="primary" style={styles.modalBodyText}>
                  {activeDetailItem.body}
                </Text>

                {/* Lesson Completion Action Button */}
                {activeDetailItem.type === 'lesson' && (
                  <Button
                    title={isDetailCompleted ? 'Completed ✓ (Tap to Undo)' : 'Mark as Complete ✓'}
                    variant={isDetailCompleted ? 'outline' : 'primary'}
                    onPress={() => handleToggleLessonComplete(activeDetailItem.id)}
                    style={{ marginTop: 24, marginBottom: 12 }}
                    accessibilityLabel={
                      isDetailCompleted
                        ? 'Lesson completed. Tap to undo completion.'
                        : 'Mark lesson as complete'
                    }
                  />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    marginTop: 6,
    marginBottom: 4,
  },
  todayHeroCard: {
    borderRadius: 16,
    gap: 4,
  },
  todayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  heroSnippet: {
    lineHeight: 18,
    marginTop: 2,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  subtabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  subtabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabContentSection: {
    gap: 12,
  },
  pathProgressCard: {
    gap: 8,
    borderRadius: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  dayCard: {
    width: '31%',
    borderRadius: 12,
    padding: 10,
    minHeight: 90,
  },
  dayCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardTitle: {
    fontWeight: '600',
    lineHeight: 16,
  },
  itemsList: {
    gap: 12,
  },
  articleCard: {
    borderRadius: 14,
  },
  articleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconButton: {
    padding: 4,
  },
  clinicalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  modalBodyText: {
    lineHeight: 24,
    fontSize: 16,
  },
});
