import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { HeatmapChart } from '../../components/heatmap-chart';
import { TriggersChart } from '../../components/triggers-chart';
import { MoodChart } from '../../components/mood-chart';
import { useTheme } from '../../hooks/use-theme';
import {
  Checkin,
  deleteCheckin,
  getAllCheckins,
  getLocalDayString,
  getTodayCheckin,
  upsertCheckin,
} from '../../db/repositories/checkins.repo';
import {
  createThoughtRecord,
  deleteThoughtRecord,
  getThoughtRecords,
  ThoughtRecord,
  updateThoughtRecord,
} from '../../db/repositories/thought-records.repo';
import { getCravingLogs } from '../../db/repositories/craving.repo';
import { getActiveTriggers } from '../../db/repositories/triggers.repo';
import { getSlips } from '../../db/repositories/slips.repo';
import {
  calculateHeatmap,
  calculateMoodTrend,
  calculateOutcomeStats,
  calculateTopTriggers,
  HeatmapInsights,
  MoodTrendInsights,
  TopTriggersInsights,
  CravingOutcomeStats,
} from '../../domain/insights';

type JournalTab = 'checkin' | 'thought' | 'history' | 'insights';
type HistoryFilter = 'all' | 'checkin' | 'thought';

export default function JournalScreen() {
  const { theme } = useTheme();
  const db = useSQLiteContext();

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState<JournalTab>('checkin');

  // Check-in Form State
  const [todayCheckin, setTodayCheckin] = useState<Checkin | null>(null);
  const [mood, setMood] = useState<number>(7);
  const [stress, setStress] = useState<number>(4);
  const [confidence, setConfidence] = useState<number>(8);
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [checkinNote, setCheckinNote] = useState<string>('');
  const [isSavingCheckin, setIsSavingCheckin] = useState<boolean>(false);
  const [checkinSuccessMsg, setCheckinSuccessMsg] = useState<string | null>(null);

  // CBT Thought Record Form State
  const [situation, setSituation] = useState<string>('');
  const [thought, setThought] = useState<string>('');
  const [emotion, setEmotion] = useState<string>('');
  const [reframe, setReframe] = useState<string>('');
  const [beliefBefore, setBeliefBefore] = useState<number>(80);
  const [beliefAfter, setBeliefAfter] = useState<number>(20);
  const [isSavingThought, setIsSavingThought] = useState<boolean>(false);
  const [thoughtSuccessMsg, setThoughtSuccessMsg] = useState<string | null>(null);

  // Editing Thought Record State
  const [editingThought, setEditingThought] = useState<ThoughtRecord | null>(null);
  const [editSituation, setEditSituation] = useState<string>('');
  const [editThought, setEditThought] = useState<string>('');
  const [editEmotion, setEditEmotion] = useState<string>('');
  const [editReframe, setEditReframe] = useState<string>('');
  const [editBeliefAfter, setEditBeliefAfter] = useState<number>(20);

  // History & Insights Data State
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [checkinsList, setCheckinsList] = useState<Checkin[]>([]);
  const [thoughtRecordsList, setThoughtRecordsList] = useState<ThoughtRecord[]>([]);

  // Insights Output State
  const [heatmapData, setHeatmapData] = useState<HeatmapInsights | null>(null);
  const [triggersData, setTriggersData] = useState<TopTriggersInsights | null>(null);
  const [moodTrendData, setMoodTrendData] = useState<MoodTrendInsights | null>(null);
  const [outcomeData, setOutcomeData] = useState<CravingOutcomeStats | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [today, checkins, thoughts, cravings, triggers, slips] = await Promise.all([
        getTodayCheckin(db),
        getAllCheckins(db),
        getThoughtRecords(db),
        getCravingLogs(db),
        getActiveTriggers(db),
        getSlips(db),
      ]);

      setTodayCheckin(today);
      if (today) {
        if (today.mood !== null) setMood(today.mood);
        if (today.stress !== null) setStress(today.stress);
        if (today.confidence !== null) setConfidence(today.confidence);
        if (today.sleep_quality !== null) setSleepQuality(today.sleep_quality);
        if (today.note) setCheckinNote(today.note);
      }

      setCheckinsList(checkins);
      setThoughtRecordsList(thoughts);

      // Compute Insights
      setHeatmapData(calculateHeatmap(cravings));
      setTriggersData(calculateTopTriggers(cravings, triggers, slips));
      setMoodTrendData(calculateMoodTrend(checkins, 7));
      setOutcomeData(calculateOutcomeStats(cravings));
    } catch {
      // Fallback gracefully
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const triggerHaptic = (type: 'selection' | 'success' | 'impact') => {
    try {
      if (type === 'selection') Haptics.selectionAsync().catch(() => {});
      else if (type === 'success')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  };

  // Checkin Submit Handler (Upsert per local day)
  const handleSaveCheckin = async () => {
    setIsSavingCheckin(true);
    triggerHaptic('impact');

    try {
      const updated = await upsertCheckin(db, {
        day: getLocalDayString(),
        mood,
        stress,
        confidence,
        sleep_quality: sleepQuality,
        note: checkinNote.trim() || null,
      });

      setTodayCheckin(updated);
      setCheckinSuccessMsg("Today's check-in saved! Keep up the momentum.");
      triggerHaptic('success');
      void loadData();
      setTimeout(() => setCheckinSuccessMsg(null), 4000);
    } catch {
      Alert.alert('Error', 'Unable to save check-in. Please try again.');
    } finally {
      setIsSavingCheckin(false);
    }
  };

  // Thought Record Submit Handler
  const handleSaveThought = async () => {
    if (!situation.trim() || !thought.trim() || !reframe.trim()) {
      Alert.alert('Incomplete Record', 'Please enter the situation, your thought, and a reframe.');
      return;
    }

    setIsSavingThought(true);
    triggerHaptic('impact');

    try {
      await createThoughtRecord(db, {
        situation: situation.trim(),
        thought: thought.trim(),
        emotion: emotion.trim() || 'Urge / Stress',
        reframe: reframe.trim(),
        belief_before: beliefBefore,
        belief_after: beliefAfter,
      });

      // Clear Form
      setSituation('');
      setThought('');
      setEmotion('');
      setReframe('');
      setBeliefBefore(80);
      setBeliefAfter(20);

      setThoughtSuccessMsg('CBT Thought Record saved successfully!');
      triggerHaptic('success');
      void loadData();
      setTimeout(() => setThoughtSuccessMsg(null), 4000);
    } catch {
      Alert.alert('Error', 'Unable to save thought record. Please try again.');
    } finally {
      setIsSavingThought(false);
    }
  };

  // Delete Handlers
  const handleDeleteCheckin = (id: number) => {
    Alert.alert('Delete Check-In', 'Are you sure you want to delete this check-in entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCheckin(db, id);
          triggerHaptic('impact');
          void loadData();
        },
      },
    ]);
  };

  const handleDeleteThought = (id: number) => {
    Alert.alert('Delete Thought Record', 'Are you sure you want to delete this thought record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteThoughtRecord(db, id);
          triggerHaptic('impact');
          void loadData();
        },
      },
    ]);
  };

  // Edit Thought Handler
  const openEditThought = (item: ThoughtRecord) => {
    setEditingThought(item);
    setEditSituation(item.situation || '');
    setEditThought(item.thought || '');
    setEditEmotion(item.emotion || '');
    setEditReframe(item.reframe || '');
    setEditBeliefAfter(item.belief_after ?? 20);
  };

  const handleUpdateThought = async () => {
    if (!editingThought) return;
    try {
      await updateThoughtRecord(db, editingThought.id, {
        situation: editSituation.trim(),
        thought: editThought.trim(),
        emotion: editEmotion.trim(),
        reframe: editReframe.trim(),
        belief_after: editBeliefAfter,
      });
      setEditingThought(null);
      triggerHaptic('success');
      void loadData();
    } catch {
      Alert.alert('Error', 'Unable to update thought record.');
    }
  };

  // Filtered History
  const combinedHistory = [
    ...checkinsList.map((c) => ({ type: 'checkin' as const, date: c.created_at, data: c })),
    ...thoughtRecordsList.map((t) => ({ type: 'thought' as const, date: t.created_at, data: t })),
  ].sort((a, b) => b.date - a.date);

  const filteredHistory = combinedHistory.filter((item) => {
    if (historyFilter === 'all') return true;
    return item.type === historyFilter;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen scrollable contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text variant="title1" color="primary">
              Journal &amp; Insights
            </Text>
            <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
              Cognitive reflection, daily check-ins &amp; urge analytics
            </Text>
          </View>
        </View>

        {/* 4-Segment Subtab Navigation */}
        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: theme.isDark ? '#16262B' : '#E2EBE8' },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('checkin');
            }}
            style={[
              styles.segmentButton,
              activeTab === 'checkin' && { backgroundColor: theme.colors.cardBackground },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'checkin' }}
            accessibilityLabel="Daily check-in tab"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color: activeTab === 'checkin' ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              Check-In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('thought');
            }}
            style={[
              styles.segmentButton,
              activeTab === 'thought' && { backgroundColor: theme.colors.cardBackground },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'thought' }}
            accessibilityLabel="CBT thought record tab"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color: activeTab === 'thought' ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              Thoughts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('history');
            }}
            style={[
              styles.segmentButton,
              activeTab === 'history' && { backgroundColor: theme.colors.cardBackground },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'history' }}
            accessibilityLabel="Journal history list"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color: activeTab === 'history' ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('insights');
            }}
            style={[
              styles.segmentButton,
              activeTab === 'insights' && { backgroundColor: theme.colors.cardBackground },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'insights' }}
            accessibilityLabel="Analytics and insights charts tab"
          >
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                color: activeTab === 'insights' ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================
            SUBTAB 1: DAILY CHECK-IN (UPSERT PER LOCAL DAY)
            ======================================================== */}
        {activeTab === 'checkin' && (
          <View style={styles.sectionContainer}>
            {/* Status Reassurance Card */}
            <Card
              variant="flat"
              padding="md"
              style={[
                styles.statusBanner,
                {
                  backgroundColor: todayCheckin
                    ? `${theme.colors.success}18`
                    : `${theme.colors.primary}14`,
                  borderColor: todayCheckin ? theme.colors.success : theme.colors.primary,
                },
              ]}
            >
              <View style={styles.statusRow}>
                <Ionicons
                  name={todayCheckin ? 'checkmark-circle' : 'calendar'}
                  size={20}
                  color={todayCheckin ? theme.colors.success : theme.colors.primary}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text variant="bodySmall" color="primary" style={{ fontWeight: '700' }}>
                    {todayCheckin
                      ? `Checked in for today (${getLocalDayString()})`
                      : `Daily Check-In &bull; ${getLocalDayString()}`}
                  </Text>
                  <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {todayCheckin
                      ? 'You can update your metrics or notes anytime today.'
                      : 'Take 60 seconds to track your mood and protect your recovery.'}
                  </Text>
                </View>
              </View>
            </Card>

            {checkinSuccessMsg && (
              <Card
                variant="flat"
                padding="sm"
                style={[styles.toastCard, { backgroundColor: `${theme.colors.success}22` }]}
              >
                <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700' }}>
                  ✓ {checkinSuccessMsg}
                </Text>
              </Card>
            )}

            {/* Metric 1: Mood */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  Mood
                </Text>
                <Text variant="bodyMedium" color="brand" style={{ fontWeight: '700' }}>
                  {mood}/10 &bull; {mood <= 3 ? '😞 Low' : mood <= 6 ? '😐 Neutral' : mood <= 8 ? '😊 Good' : '🌟 Great'}
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = mood === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => {
                        triggerHaptic('selection');
                        setMood(num);
                      }}
                      style={[
                        styles.scaleChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mood ${num}`}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Metric 2: Stress */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  Stress Level
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: '700',
                    color: stress <= 3 ? theme.colors.success : stress <= 6 ? theme.colors.accentAmber : theme.colors.danger,
                  }}
                >
                  {stress}/10 &bull; {stress <= 3 ? '😌 Calm' : stress <= 6 ? '😐 Moderate' : stress <= 8 ? '😣 High' : '🚨 Severe'}
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = stress === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => {
                        triggerHaptic('selection');
                        setStress(num);
                      }}
                      style={[
                        styles.scaleChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.accentAmber
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.accentAmber : theme.colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Stress ${num}`}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Metric 3: Confidence */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  Smoke-Free Confidence
                </Text>
                <Text variant="bodyMedium" color="brand" style={{ fontWeight: '700' }}>
                  {confidence}/10 &bull; {confidence <= 3 ? '😟 Wavering' : confidence <= 6 ? '✊ Steady' : confidence <= 8 ? '💪 Resilient' : '🛡️ Unshakeable'}
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = confidence === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => {
                        triggerHaptic('selection');
                        setConfidence(num);
                      }}
                      style={[
                        styles.scaleChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Confidence ${num}`}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Metric 4: Sleep Quality */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  Sleep Quality
                </Text>
                <Text variant="bodyMedium" color="brand" style={{ fontWeight: '700' }}>
                  {sleepQuality}/10 &bull; {sleepQuality <= 3 ? '🥱 Restless' : sleepQuality <= 6 ? '🛏️ Fair' : sleepQuality <= 8 ? '😴 Restful' : '🌙 Deep Sleep'}
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = sleepQuality === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => {
                        triggerHaptic('selection');
                        setSleepQuality(num);
                      }}
                      style={[
                        styles.scaleChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Sleep quality ${num}`}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Optional Daily Note */}
            <Card variant="flat" padding="md" style={styles.formCard}>
              <Text variant="subtitle" color="primary" style={{ marginBottom: 6 }}>
                Daily Reflection Note (Optional)
              </Text>
              <TextInput
                value={checkinNote}
                onChangeText={setCheckinNote}
                placeholder="How did you cope with cravings today? What are you grateful for?"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                accessibilityLabel="Daily reflection note"
              />
            </Card>

            {/* Submit Upsert Button */}
            <Button
              title={
                isSavingCheckin
                  ? 'Saving...'
                  : todayCheckin
                  ? "Update Today's Check-In"
                  : "Save Today's Check-In"
              }
              variant="primary"
              onPress={handleSaveCheckin}
              disabled={isSavingCheckin}
              style={{ marginTop: 8 }}
              accessibilityLabel="Save check-in"
            />
          </View>
        )}

        {/* ========================================================
            SUBTAB 2: CBT THOUGHT RECORD
            ======================================================== */}
        {activeTab === 'thought' && (
          <View style={styles.sectionContainer}>
            <Card
              variant="flat"
              padding="md"
              style={[styles.statusBanner, { backgroundColor: `${theme.colors.primary}14` }]}
            >
              <Text variant="subtitle" color="brand" style={{ fontWeight: '700' }}>
                CBT Cognitive Restructuring
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Identify automatic craving thoughts, examine the evidence, and craft a balanced
                cognitive reframe to weaken urges.
              </Text>
            </Card>

            {thoughtSuccessMsg && (
              <Card
                variant="flat"
                padding="sm"
                style={[styles.toastCard, { backgroundColor: `${theme.colors.success}22` }]}
              >
                <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700' }}>
                  ✓ {thoughtSuccessMsg}
                </Text>
              </Card>
            )}

            {/* 1. Situation */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <Text variant="subtitle" color="primary">
                1. Situation / Context
              </Text>
              <Text variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                Where were you? What was happening? Who was there?
              </Text>
              <TextInput
                value={situation}
                onChangeText={setSituation}
                placeholder="e.g. Stuck in traffic after an exhausting work presentation."
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                accessibilityLabel="Situation input"
              />
            </Card>

            {/* 2. Automatic Thought */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <Text variant="subtitle" color="primary">
                2. Automatic Negative / Craving Thought
              </Text>
              <Text variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                What exact thought crossed your mind?
              </Text>
              <TextInput
                value={thought}
                onChangeText={setThought}
                placeholder='e.g. "Just one cigarette will relieve this stress and make me feel better."'
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                accessibilityLabel="Automatic thought input"
              />
            </Card>

            {/* 3. Emotion */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <Text variant="subtitle" color="primary">
                3. Emotion / Feeling
              </Text>
              <Text variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                What did you feel emotionally?
              </Text>
              <TextInput
                value={emotion}
                onChangeText={setEmotion}
                placeholder="e.g. Overwhelmed, frustrated, irritable (8/10)"
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                accessibilityLabel="Emotion input"
              />
            </Card>

            {/* 4. Belief Before */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  4. Belief in Negative Thought (Before)
                </Text>
                <Text variant="bodyMedium" color="brand" style={{ fontWeight: '700' }}>
                  {beliefBefore}%
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[20, 40, 60, 80, 100].map((pct) => {
                  const isSelected = beliefBefore === pct;
                  return (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => {
                        triggerHaptic('selection');
                        setBeliefBefore(pct);
                      }}
                      style={[
                        styles.beliefChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* 5. Cognitive Reframe */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <Text variant="subtitle" color="primary">
                5. Balanced Cognitive Reframe
              </Text>
              <Text variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                What is the objective reality? What would you tell a friend?
              </Text>
              <TextInput
                value={reframe}
                onChangeText={setReframe}
                placeholder='e.g. "Smoking does not remove traffic; it only introduces guilt and restarts nicotine withdrawal. Taking 5 slow breaths will calm my nervous system safely."'
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                accessibilityLabel="Cognitive reframe input"
              />
            </Card>

            {/* 6. Belief After */}
            <Card variant="outlined" padding="md" style={styles.formCard}>
              <View style={styles.metricHeaderRow}>
                <Text variant="subtitle" color="primary">
                  6. Belief in Negative Thought (After Reframe)
                </Text>
                <Text variant="bodyMedium" color="success" style={{ fontWeight: '700' }}>
                  {beliefAfter}%
                </Text>
              </View>
              <View style={styles.sliderChipsRow}>
                {[0, 15, 30, 50, 75].map((pct) => {
                  const isSelected = beliefAfter === pct;
                  return (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => {
                        triggerHaptic('selection');
                        setBeliefAfter(pct);
                      }}
                      style={[
                        styles.beliefChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.success
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.success : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                        }}
                      >
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Save Thought Record Button */}
            <Button
              title={isSavingThought ? 'Saving...' : 'Save CBT Thought Record'}
              variant="primary"
              onPress={handleSaveThought}
              disabled={isSavingThought}
              style={{ marginTop: 8 }}
              accessibilityLabel="Save CBT Thought Record"
            />
          </View>
        )}

        {/* ========================================================
            SUBTAB 3: JOURNAL HISTORY LIST & EDIT / DELETE
            ======================================================== */}
        {activeTab === 'history' && (
          <View style={styles.sectionContainer}>
            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {(['all', 'checkin', 'thought'] as const).map((filter) => {
                const isSelected = historyFilter === filter;
                const label =
                  filter === 'all'
                    ? 'All Entries'
                    : filter === 'checkin'
                    ? 'Check-Ins'
                    : 'Thought Records';
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => {
                      triggerHaptic('selection');
                      setHistoryFilter(filter);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Text
                      variant="caption"
                      style={{
                        fontWeight: '700',
                        color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* History Feed */}
            {filteredHistory.length === 0 ? (
              <EmptyState
                icon="📖"
                title="Your Journal is Empty"
                description="Complete your first daily check-in or CBT thought record to begin building your emotional archive."
                actionTitle="Complete Today's Check-In"
                onAction={() => setActiveTab('checkin')}
              />
            ) : (
              <View style={styles.historyList}>
                {filteredHistory.map((item) => {
                  if (item.type === 'checkin') {
                    const c = item.data as Checkin;
                    return (
                      <Card key={`checkin-${c.id}`} variant="outlined" padding="md" style={styles.historyCard}>
                        <View style={styles.historyHeaderRow}>
                          <View style={styles.tagBadge}>
                            <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                            <Text variant="caption" color="brand" style={{ fontWeight: '700', marginLeft: 4 }}>
                              DAILY CHECK-IN &bull; {c.day}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteCheckin(c.id)}
                            accessibilityLabel={`Delete check-in for ${c.day}`}
                          >
                            <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
                          </TouchableOpacity>
                        </View>

                        {/* Ratings Badges */}
                        <View style={styles.metricPillsRow}>
                          <View style={[styles.metricPill, { backgroundColor: `${theme.colors.primary}18` }]}>
                            <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                              Mood: {c.mood ?? '—'}/10
                            </Text>
                          </View>
                          <View style={[styles.metricPill, { backgroundColor: `${theme.colors.accentAmber}18` }]}>
                            <Text variant="caption" style={{ color: theme.colors.accentAmber, fontWeight: '700' }}>
                              Stress: {c.stress ?? '—'}/10
                            </Text>
                          </View>
                          <View style={[styles.metricPill, { backgroundColor: `${theme.colors.success}18` }]}>
                            <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700' }}>
                              Confidence: {c.confidence ?? '—'}/10
                            </Text>
                          </View>
                        </View>

                        {c.note && (
                          <Text variant="bodySmall" color="secondary" style={styles.noteText}>
                            &ldquo;{c.note}&rdquo;
                          </Text>
                        )}
                      </Card>
                    );
                  } else {
                    const t = item.data as ThoughtRecord;
                    const dateFormatted = new Date(t.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <Card key={`thought-${t.id}`} variant="outlined" padding="md" style={styles.historyCard}>
                        <View style={styles.historyHeaderRow}>
                          <View style={styles.tagBadge}>
                            <Ionicons name="bulb-outline" size={14} color={theme.colors.accentAmber} />
                            <Text variant="caption" style={{ color: theme.colors.accentAmber, fontWeight: '700', marginLeft: 4 }}>
                              CBT THOUGHT RECORD &bull; {dateFormatted}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => openEditThought(t)}
                              accessibilityLabel={`Edit thought record`}
                            >
                              <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteThought(t.id)}
                              accessibilityLabel={`Delete thought record`}
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text variant="caption" color="tertiary" style={{ marginTop: 4 }}>
                          Situation: {t.situation}
                        </Text>
                        <Text variant="bodyMedium" color="primary" style={styles.thoughtQuote}>
                          Thought: &ldquo;{t.thought}&rdquo;
                        </Text>

                        {/* Belief Shift Pill */}
                        <View style={styles.beliefShiftRow}>
                          <Text variant="caption" color="secondary">
                            Belief shift:
                          </Text>
                          <Text variant="caption" style={{ color: theme.colors.danger, fontWeight: '700' }}>
                            {t.belief_before ?? 0}%
                          </Text>
                          <Ionicons name="arrow-forward" size={12} color={theme.colors.textSecondary} />
                          <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700' }}>
                            {t.belief_after ?? 0}%
                          </Text>
                        </View>

                        <View style={[styles.reframeBox, { backgroundColor: theme.isDark ? '#142125' : '#F0F5F3' }]}>
                          <Text variant="caption" color="brand" style={{ fontWeight: '700', marginBottom: 2 }}>
                            Reframe:
                          </Text>
                          <Text variant="bodySmall" color="primary">
                            {t.reframe}
                          </Text>
                        </View>
                      </Card>
                    );
                  }
                })}
              </View>
            )}
          </View>
        )}

        {/* ========================================================
            SUBTAB 4: INSIGHTS & CHARTS
            ======================================================== */}
        {activeTab === 'insights' && (
          <View style={styles.sectionContainer}>
            {/* Outcome Stats Card */}
            {outcomeData && (
              <Card variant="flat" padding="md" style={styles.outcomeBanner}>
                <View style={styles.outcomeHeaderRow}>
                  <Text style={{ fontSize: 28 }}>🛡️</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text variant="subtitle" color="primary">
                      Craving Success Rate
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
                      {outcomeData.summaryText}
                    </Text>
                  </View>
                </View>
                <View style={styles.outcomeCountersRow}>
                  <View style={styles.outcomePill}>
                    <Text variant="caption" color="secondary">
                      Resisted
                    </Text>
                    <Text variant="title3" color="primary" style={{ fontWeight: '700' }}>
                      {outcomeData.resisted}
                    </Text>
                  </View>
                  <View style={styles.outcomePill}>
                    <Text variant="caption" color="secondary">
                      Smoked
                    </Text>
                    <Text variant="title3" color="primary" style={{ fontWeight: '700' }}>
                      {outcomeData.smoked}
                    </Text>
                  </View>
                  <View style={styles.outcomePill}>
                    <Text variant="caption" color="secondary">
                      Success Rate
                    </Text>
                    <Text variant="title3" color="brand" style={{ fontWeight: '700' }}>
                      {outcomeData.resistedPercentage}%
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Chart 1: Heatmap by Hour & Weekday */}
            {heatmapData && <HeatmapChart data={heatmapData} />}

            {/* Chart 2: Top Triggers Breakdown */}
            {triggersData && <TriggersChart data={triggersData} />}

            {/* Chart 3: Mood & Stress Trend */}
            {moodTrendData && <MoodChart data={moodTrendData} />}
          </View>
        )}

        {/* Modal for Editing Thought Record */}
        <Modal
          visible={!!editingThought}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingThought(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border },
              ]}
            >
              <Text variant="title2" color="primary" style={{ marginBottom: 12 }}>
                Edit Thought Record
              </Text>

              <Text variant="caption" color="secondary" style={styles.fieldLabel}>
                Situation
              </Text>
              <TextInput
                value={editSituation}
                onChangeText={setEditSituation}
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />

              <Text variant="caption" color="secondary" style={styles.fieldLabel}>
                Automatic Thought
              </Text>
              <TextInput
                value={editThought}
                onChangeText={setEditThought}
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />

              <Text variant="caption" color="secondary" style={styles.fieldLabel}>
                Cognitive Reframe
              </Text>
              <TextInput
                value={editReframe}
                onChangeText={setEditReframe}
                multiline
                numberOfLines={3}
                style={[styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setEditingThought(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Changes"
                  variant="primary"
                  onPress={handleUpdateThought}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topHeader: {
    marginBottom: 14,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  sectionContainer: {
    gap: 12,
  },
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastCard: {
    borderRadius: 10,
    marginBottom: 8,
  },
  formCard: {
    borderRadius: 14,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  scaleChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beliefChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 75,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 14,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  metricPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  noteText: {
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 6,
  },
  thoughtQuote: {
    fontStyle: 'italic',
    marginVertical: 6,
  },
  beliefShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reframeBox: {
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  outcomeBanner: {
    borderRadius: 14,
    marginBottom: 4,
  },
  outcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  outcomeCountersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  outcomePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
