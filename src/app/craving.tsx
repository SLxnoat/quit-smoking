import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Button, Card, Screen, Text } from '../components';
import { CelebrationModal } from '../components/celebration-modal';
import { useTheme } from '../hooks/use-theme';
import { useAchievements } from '../hooks/use-achievements';
import { useStats } from '../hooks/use-stats';
import { getReasons, type Reason } from '../db/repositories/reasons.repo';
import { getActiveTriggers, type Trigger } from '../db/repositories/triggers.repo';
import {
  createCravingLog,
  getResistedCravingsCount,
  type CravingOutcome,
} from '../db/repositories/craving.repo';
import {
  getSupportContacts,
  seedDefaultSupportContacts,
  type SupportContact,
} from '../db/repositories/support-contacts.repo';
import {
  isHapticsEnabled,
  isReduceMotionSetting,
} from '../db/repositories/settings.repo';
import {
  BREATHING_PATTERNS,
  FOUR_DS_CHECKLIST,
  GROUNDING_54321_STEPS,
  URGE_SURFING_PROMPTS,
  calculateIntensityDelta,
  getIntensityLabel,
  type BreathingPattern,
} from '../domain/craving';

type CravingPhase = 'assess' | 'urge_surf' | 'breathe' | 'distract' | 'support' | 'log';

export default function CravingModalScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const { stats } = useStats();
  const {
    latestCelebration,
    dismissCelebration,
    evaluateAndUnlock,
  } = useAchievements();

  const startedAtRef = useRef<number>(0);
  useEffect(() => {
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now();
    }
  }, []);

  // Flow State
  const [phase, setPhase] = useState<CravingPhase>('assess');
  const [intensityBefore, setIntensityBefore] = useState(7);
  const [intensityAfter, setIntensityAfter] = useState(2);
  const [selectedTriggerId, setSelectedTriggerId] = useState<number | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CravingOutcome>('resisted');
  const [reflectionNote, setReflectionNote] = useState('');

  // Loaded DB data
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [reasonIndex, setReasonIndex] = useState(0);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);

  // Accessibility and Hardware Settings
  const hapticsAllowed = useRef<boolean>(true);
  const reduceMotionActive = useRef<boolean>(false);

  // Tool: Urge Surfing State
  const [surfTotalSeconds, setSurfTotalSeconds] = useState(180); // 3 minutes default
  const [surfRemaining, setSurfRemaining] = useState(180);
  const [isSurfActive, setIsSurfActive] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  // Tool: Breathing State
  const [breathingPatternKey, setBreathingPatternKey] = useState<'4-7-8' | 'box'>('4-7-8');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4);
  const [isBreathingActive, setIsBreathingActive] = useState(true);
  const [breathingCycles, setBreathingCycles] = useState(1);

  // Reanimated Circle for Breathing
  const breathCircleScale = useSharedValue(1);

  // Tool: Distraction State
  const [distractionTab, setDistractionTab] = useState<'4ds' | 'grounding'>('4ds');
  const [checked4Ds, setChecked4Ds] = useState<Record<string, boolean>>({});
  const [groundingStepIndex, setGroundingStepIndex] = useState(0);

  // Load Reasons, Triggers, and Support Contacts on Mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        await seedDefaultSupportContacts(db);
        const [loadedReasons, loadedTriggers, contacts, hapticsPref, motionPref] =
          await Promise.all([
            getReasons(db),
            getActiveTriggers(db),
            getSupportContacts(db),
            isHapticsEnabled(db),
            isReduceMotionSetting(db),
          ]);
        if (isMounted) {
          setReasons(loadedReasons);
          setTriggers(loadedTriggers);
          setSupportContacts(contacts);
          hapticsAllowed.current = hapticsPref;
          const sysReduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
          reduceMotionActive.current = motionPref || sysReduceMotion;
          if (loadedTriggers.length > 0) {
            setSelectedTriggerId(loadedTriggers[0].id);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, [db]);

  const triggerHaptic = (style: 'selection' | 'light' | 'medium' | 'heavy' | 'success') => {
    if (!hapticsAllowed.current) return;
    try {
      if (style === 'selection') Haptics.selectionAsync().catch(() => {});
      else if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      else if (style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      else if (style === 'success')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  };

  const changePhase = (nextPhase: CravingPhase) => {
    setPhase(nextPhase);
    const announcements: Record<CravingPhase, string> = {
      assess: 'Craving assessment. Rate your urge intensity and select coping tool.',
      urge_surf: 'Urge surfing timer. Ride out the wave of craving.',
      breathe: 'Guided deep breathing exercise.',
      distract: 'Distraction tools and sensory grounding.',
      support: 'Support contacts and quitlines.',
      log: 'Craving outcome log.',
    };
    AccessibilityInfo.announceForAccessibility(announcements[nextPhase]);
  };

  // Urge Surfing Timer Effect
  useEffect(() => {
    if (phase !== 'urge_surf' || !isSurfActive) return;

    const timer = setInterval(() => {
      setSurfRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSurfActive(false);
          triggerHaptic('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isSurfActive]);

  // Rotate Urge Surfing Prompts every 15s
  useEffect(() => {
    if (phase !== 'urge_surf' || !isSurfActive) return;

    const promptInterval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % URGE_SURFING_PROMPTS.length);
    }, 15000);

    return () => clearInterval(promptInterval);
  }, [phase, isSurfActive]);

  // Breathing Exercise Ticker & Animation Effect
  const currentPattern: BreathingPattern = BREATHING_PATTERNS[breathingPatternKey];
  const activeBreathPhase = currentPattern.phases[currentPhaseIndex];

  useEffect(() => {
    if (phase !== 'breathe' || !isBreathingActive) return;

    // Trigger phase animation
    const durationMs = activeBreathPhase.durationSec * 1000;
    if (reduceMotionActive.current) {
      breathCircleScale.value = 1.0;
    } else {
      if (activeBreathPhase.name === 'Inhale') {
        triggerHaptic('medium');
        breathCircleScale.value = withTiming(1.65, {
          duration: durationMs,
          easing: Easing.inOut(Easing.ease),
        });
      } else if (activeBreathPhase.name === 'Hold') {
        triggerHaptic('light');
        breathCircleScale.value = withTiming(1.65, { duration: durationMs });
      } else if (activeBreathPhase.name === 'Exhale') {
        triggerHaptic('heavy');
        breathCircleScale.value = withTiming(1.0, {
          duration: durationMs,
          easing: Easing.inOut(Easing.ease),
        });
      }
    }

    const countdown = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          // Advance phase
          const nextIndex = (currentPhaseIndex + 1) % currentPattern.phases.length;
          if (nextIndex === 0) {
            setBreathingCycles((c) => c + 1);
          }
          setCurrentPhaseIndex(nextIndex);
          return currentPattern.phases[nextIndex].durationSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [
    phase,
    isBreathingActive,
    breathingPatternKey,
    currentPhaseIndex,
    activeBreathPhase,
    currentPattern.phases,
    breathCircleScale,
  ]);

  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: breathCircleScale.value }],
    };
  });

  const handleSelectTool = (tool: 'urge_surf' | 'breathe' | 'distract' | 'support') => {
    setSelectedTool(tool);
    if (tool === 'urge_surf') {
      setIsSurfActive(true);
      setSurfRemaining(surfTotalSeconds);
    } else if (tool === 'breathe') {
      setIsBreathingActive(true);
      setCurrentPhaseIndex(0);
      setPhaseSecondsLeft(currentPattern.phases[0].durationSec);
    }
    changePhase(tool);
  };

  const toggle4DCheck = (id: string) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setChecked4Ds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveOutcome = async () => {
    const started = startedAtRef.current || Date.now();
    const durationSec = Math.max(1, Math.floor((Date.now() - started) / 1000));

    try {
      await createCravingLog(db, {
        started_at: started,
        duration_sec: durationSec,
        intensity_before: intensityBefore,
        intensity_after: intensityAfter,
        outcome,
        trigger_id: selectedTriggerId,
        tool_used: selectedTool,
        note: reflectionNote.trim() || null,
      });

      // If resisted, evaluate cravings achievements!
      if (outcome === 'resisted') {
        const resistedCount = await getResistedCravingsCount(db);
        await evaluateAndUnlock({
          elapsedSeconds: stats?.time.totalSeconds ?? 0,
          cravingsResisted: resistedCount,
          moneySaved: stats?.moneySaved ?? 0,
        });
      }

      router.back();
    } catch {
      Alert.alert('Error', 'Could not save craving log. Please try again.');
    }
  };

  const intensityBeforeInfo = getIntensityLabel(intensityBefore);
  const intensityDelta = calculateIntensityDelta(intensityBefore, intensityAfter);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen scrollable contentContainerStyle={styles.scrollContent}>
        {/* Top Modal Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => {
              if (phase !== 'assess' && phase !== 'log') {
                setPhase('assess');
              } else {
                router.back();
              }
            }}
            style={[styles.closeButton, { borderColor: theme.colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Close craving modal"
          >
            <Ionicons
              name={phase !== 'assess' && phase !== 'log' ? 'arrow-back' : 'close'}
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <View style={styles.badgeWrapper}>
            <View
              style={[
                styles.sosPill,
                { backgroundColor: theme.colors.primary + '22' },
              ]}
            >
              <Ionicons name="shield-half" size={14} color={theme.colors.primary} />
              <Text variant="caption" color="brand" style={{ fontWeight: '700', marginLeft: 4 }}>
                CRAVING SOS
              </Text>
            </View>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* ========================================================
            PHASE 1: ASSESS (Intensity Before, Trigger, Reasons, Tools)
            ======================================================== */}
        {phase === 'assess' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="title1" color="primary">
                Ride Out the Urge
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Cravings feel overwhelming, but they peak quickly and naturally collapse.
              </Text>
            </View>

            {/* 1. Intensity Before Slider / Chip Scale */}
            <Card variant="elevated" padding="md" style={styles.cardSection}>
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                How intense is this urge right now?
              </Text>

              <View style={styles.intensityScaleRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = intensityBefore === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setIntensityBefore(num)}
                      style={[
                        styles.intensityChip,
                        { borderColor: theme.colors.cardBorder },
                        isSelected && {
                          backgroundColor:
                            num <= 3
                              ? theme.colors.success
                              : num <= 6
                              ? theme.colors.accentAmber
                              : theme.colors.danger,
                          borderColor: 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Intensity ${num}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.text,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.adviceBox,
                  { backgroundColor: theme.isDark ? '#142125' : '#F0F5F3' },
                ]}
              >
                <Text
                  variant="caption"
                  color={
                    intensityBeforeInfo.colorType === 'success'
                      ? 'success'
                      : intensityBeforeInfo.colorType === 'warning'
                      ? 'warning'
                      : 'danger'
                  }
                  style={{ fontWeight: '700', marginBottom: 2 }}
                >
                  {intensityBeforeInfo.label} ({intensityBefore}/10)
                </Text>
                <Text variant="caption" color="secondary">
                  {intensityBeforeInfo.advice}
                </Text>
              </View>
            </Card>

            {/* 2. Personal Reasons Carousel */}
            {reasons.length > 0 && (
              <Card variant="outlined" padding="md" style={styles.cardSection}>
                <View style={styles.reasonHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="heart" size={16} color={theme.colors.danger} />
                    <Text
                      variant="caption"
                      color="brand"
                      style={{ fontWeight: '700', marginLeft: 6 }}
                    >
                      YOUR WHY • REASON {reasonIndex + 1}/{reasons.length}
                    </Text>
                  </View>

                  {reasons.length > 1 && (
                    <View style={styles.carouselNav}>
                      <TouchableOpacity
                        onPress={() =>
                          setReasonIndex((prev) => (prev > 0 ? prev - 1 : reasons.length - 1))
                        }
                        style={styles.carouselArrow}
                        accessibilityLabel="Previous reason"
                      >
                        <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setReasonIndex((prev) => (prev < reasons.length - 1 ? prev + 1 : 0))
                        }
                        style={styles.carouselArrow}
                        accessibilityLabel="Next reason"
                      >
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text variant="title3" color="primary" style={styles.reasonBody}>
                  &ldquo;{reasons[reasonIndex].text}&rdquo;
                </Text>
              </Card>
            )}

            {/* 3. Trigger Selector */}
            {triggers.length > 0 && (
              <Card variant="flat" padding="md" style={styles.cardSection}>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: 8 }}>
                  What sparked this urge?
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.triggerChipsRow}>
                    {triggers.map((t) => {
                      const isSelected = selectedTriggerId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          onPress={() => setSelectedTriggerId(t.id)}
                          style={[
                            styles.triggerChip,
                            { borderColor: theme.colors.cardBorder },
                            isSelected && {
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.primary,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: isSelected ? '#FFFFFF' : theme.colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            }}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </Card>
            )}

            {/* 4. Choose Calming Tool */}
            <View style={styles.toolsMenu}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: 10 }}>
                CHOOSE A COPING TOOL
              </Text>

              {/* Tool Option 1: Urge Surfing */}
              <TouchableOpacity
                onPress={() => handleSelectTool('urge_surf')}
                style={[
                  styles.toolMenuItem,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ride the Wave Urge Surfing Timer"
              >
                <View style={[styles.toolIconBox, { backgroundColor: '#0F9D8A22' }]}>
                  <Text style={{ fontSize: 24 }}>🌊</Text>
                </View>
                <View style={styles.toolTextBox}>
                  <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                    Ride the Wave (Urge Surfing)
                  </Text>
                  <Text variant="caption" color="secondary">
                    3–5 minute timer with rotating psychological anchors.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Tool Option 2: Breathing */}
              <TouchableOpacity
                onPress={() => handleSelectTool('breathe')}
                style={[
                  styles.toolMenuItem,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Guided Deep Breathing"
              >
                <View style={[styles.toolIconBox, { backgroundColor: '#2E9E5B22' }]}>
                  <Text style={{ fontSize: 24 }}>🫁</Text>
                </View>
                <View style={styles.toolTextBox}>
                  <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                    Guided Breathing (4-7-8 &amp; Box)
                  </Text>
                  <Text variant="caption" color="secondary">
                    Animated circle with synced haptics to trigger calming reflex.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Tool Option 3: Distraction Tools */}
              <TouchableOpacity
                onPress={() => handleSelectTool('distract')}
                style={[
                  styles.toolMenuItem,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Distraction Tools: 4Ds and 5-4-3-2-1 Grounding"
              >
                <View style={[styles.toolIconBox, { backgroundColor: '#F5A52422' }]}>
                  <Text style={{ fontSize: 24 }}>🎯</Text>
                </View>
                <View style={styles.toolTextBox}>
                  <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                    Distraction &amp; Grounding
                  </Text>
                  <Text variant="caption" color="secondary">
                    NHS 4Ds checklist and 5-4-3-2-1 sensory grounding.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Tool Option 4: Reach Out / Call Support */}
              <TouchableOpacity
                onPress={() => handleSelectTool('support')}
                style={[
                  styles.toolMenuItem,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reach Out: Call Support or Helpline"
              >
                <View style={[styles.toolIconBox, { backgroundColor: '#3B82F622' }]}>
                  <Text style={{ fontSize: 24 }}>📞</Text>
                </View>
                <View style={styles.toolTextBox}>
                  <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                    Reach Out (Support &amp; Quitlines)
                  </Text>
                  <Text variant="caption" color="secondary">
                    Free national quitlines and personal support contacts.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Skip directly to log */}
            <TouchableOpacity
              onPress={() => {
                setSelectedTool('none');
                changePhase('log');
              }}
              style={styles.skipToLogButton}
              accessibilityRole="button"
              accessibilityLabel="Urge has passed, log outcome directly"
            >
              <Text variant="caption" color="brand">
                The urge has already passed &bull; Log outcome directly &rarr;
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================
            PHASE 2A: URGE SURFING TIMER
            ======================================================== */}
        {phase === 'urge_surf' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="title1" color="primary">
                Ride the Wave
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Observe the urge rising, peaking, and breaking without giving in.
              </Text>
            </View>

            {/* Duration Selector */}
            <View style={styles.surfDurationRow}>
              {[180, 300, 600].map((secs) => (
                <TouchableOpacity
                  key={secs}
                  onPress={() => {
                    setSurfTotalSeconds(secs);
                    setSurfRemaining(secs);
                  }}
                  style={[
                    styles.surfDurationTab,
                    { borderColor: theme.colors.cardBorder },
                    surfTotalSeconds === secs && {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${secs / 60} minutes`}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: surfTotalSeconds === secs ? '#FFFFFF' : theme.colors.text,
                      fontWeight: '700',
                    }}
                  >
                    {secs / 60} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hero Timer Display */}
            <Card variant="elevated" padding="lg" style={styles.timerCard}>
              <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 10 }}>🌊</Text>
              <Text variant="hero" color="primary" style={styles.timerHeroText}>
                {Math.floor(surfRemaining / 60)}:
                {(surfRemaining % 60).toString().padStart(2, '0')}
              </Text>
              <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                {surfRemaining === 0 ? 'Wave crest has passed!' : 'Remaining in this wave'}
              </Text>
            </Card>

            {/* Rotating Psychological Anchor Prompt */}
            <Card variant="outlined" padding="md" style={styles.promptCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} />
                <Text
                  variant="caption"
                  color="brand"
                  style={{ fontWeight: '700', marginLeft: 6 }}
                >
                  MINDFUL ANCHOR
                </Text>
              </View>
              <Text variant="body" color="primary" style={styles.promptText}>
                &ldquo;{URGE_SURFING_PROMPTS[promptIndex]}&rdquo;
              </Text>
            </Card>

            {/* Controls */}
            <View style={styles.actionButtonsCol}>
              <Button
                title={isSurfActive ? 'Pause Timer' : 'Resume Timer'}
                variant="outline"
                onPress={() => setIsSurfActive((prev) => !prev)}
              />
              <Button
                title="The Wave Passed — Log Outcome"
                variant="primary"
                onPress={() => setPhase('log')}
              />
            </View>
          </View>
        )}

        {/* ========================================================
            PHASE 2B: GUIDED BREATHING
            ======================================================== */}
        {phase === 'breathe' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="title1" color="primary">
                Deep Breathing
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Follow the circle. Slow, deep exhales trigger immediate biological calm.
              </Text>
            </View>

            {/* Pattern Switcher */}
            <View style={styles.breathPatternRow}>
              {(['4-7-8', 'box'] as const).map((pat) => (
                <TouchableOpacity
                  key={pat}
                  onPress={() => {
                    setBreathingPatternKey(pat);
                    setCurrentPhaseIndex(0);
                  }}
                  style={[
                    styles.breathPatternBtn,
                    { borderColor: theme.colors.cardBorder },
                    breathingPatternKey === pat && {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={BREATHING_PATTERNS[pat].name}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: breathingPatternKey === pat ? '#FFFFFF' : theme.colors.text,
                      fontWeight: '700',
                    }}
                  >
                    {pat === '4-7-8' ? '4-7-8 Relaxing' : 'Box (4-4-4-4)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Breathing Animation Canvas */}
            <View style={styles.breathingCanvas}>
              <Animated.View
                style={[
                  styles.animatedBreathCircle,
                  {
                    backgroundColor: `${theme.colors.primary}26`,
                    borderColor: theme.colors.primary,
                  },
                  animatedCircleStyle,
                ]}
              />

              <View style={styles.breathCenterLabel} accessibilityLiveRegion="polite">
                <Text
                  variant="title1"
                  color="primary"
                  style={{ textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '800' }}
                >
                  {activeBreathPhase.name}
                </Text>
                <Text variant="hero" color="brand" style={{ fontWeight: '800' }}>
                  {phaseSecondsLeft}s
                </Text>
                <Text variant="caption" color="secondary">
                  Cycle {breathingCycles}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtonsCol}>
              <Button
                title={isBreathingActive ? 'Pause Exercise' : 'Resume Exercise'}
                variant="outline"
                onPress={() => setIsBreathingActive((prev) => !prev)}
              />
              <Button
                title="I Feel Calmer — Log Outcome"
                variant="primary"
                onPress={() => setPhase('log')}
              />
            </View>
          </View>
        )}

        {/* ========================================================
            PHASE 2C: DISTRACTION TOOLS (4Ds & 5-4-3-2-1)
            ======================================================== */}
        {phase === 'distract' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="title1" color="primary">
                Ground &amp; Distract
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Re-engage your prefrontal cortex with evidence-based physical substitution.
              </Text>
            </View>

            {/* Tab switcher: 4Ds vs 5-4-3-2-1 */}
            <View style={styles.distractTabRow}>
              <TouchableOpacity
                onPress={() => setDistractionTab('4ds')}
                style={[
                  styles.distractTabBtn,
                  distractionTab === '4ds' && {
                    backgroundColor: theme.colors.cardBackground,
                    elevation: 2,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={distractionTab === '4ds' ? 'primary' : 'secondary'}
                  style={{ fontWeight: '700' }}
                >
                  NHS 4Ds Checklist
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDistractionTab('grounding')}
                style={[
                  styles.distractTabBtn,
                  distractionTab === 'grounding' && {
                    backgroundColor: theme.colors.cardBackground,
                    elevation: 2,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={distractionTab === 'grounding' ? 'primary' : 'secondary'}
                  style={{ fontWeight: '700' }}
                >
                  5-4-3-2-1 Sensory
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4Ds Checklist View */}
            {distractionTab === '4ds' && (
              <View style={{ gap: 12 }}>
                {FOUR_DS_CHECKLIST.map((item) => {
                  const isChecked = !!checked4Ds[item.id];
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggle4DCheck(item.id)}
                      style={[
                        styles.checklistItem,
                        {
                          backgroundColor: theme.colors.cardBackground,
                          borderColor: isChecked ? theme.colors.success : theme.colors.cardBorder,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isChecked }}
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          isChecked && {
                            backgroundColor: theme.colors.success,
                            borderColor: theme.colors.success,
                          },
                        ]}
                      >
                        {isChecked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="bodyMedium"
                          color="primary"
                          style={{
                            fontWeight: '700',
                            textDecorationLine: isChecked ? 'line-through' : 'none',
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 5-4-3-2-1 Sensory Grounding Stepper */}
            {distractionTab === 'grounding' && (
              <Card variant="elevated" padding="lg" style={styles.groundingCard}>
                <View style={styles.groundingStepHeader}>
                  <Ionicons
                    name={GROUNDING_54321_STEPS[groundingStepIndex].icon as any}
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text variant="title2" color="primary" style={{ marginTop: 8 }}>
                    {GROUNDING_54321_STEPS[groundingStepIndex].count} &bull;{' '}
                    {GROUNDING_54321_STEPS[groundingStepIndex].sense}
                  </Text>
                </View>

                <Text
                  variant="body"
                  color="secondary"
                  style={{ textAlign: 'center', lineHeight: 22, marginVertical: 14 }}
                >
                  {GROUNDING_54321_STEPS[groundingStepIndex].instruction}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {groundingStepIndex > 0 && (
                    <Button
                      title="Previous"
                      variant="ghost"
                      size="sm"
                      onPress={() => setGroundingStepIndex((i) => i - 1)}
                      style={{ flex: 1 }}
                    />
                  )}
                  {groundingStepIndex < GROUNDING_54321_STEPS.length - 1 ? (
                    <Button
                      title="Next Sense"
                      variant="primary"
                      size="sm"
                      onPress={() => setGroundingStepIndex((i) => i + 1)}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      title="Grounding Complete!"
                      variant="primary"
                      size="sm"
                      onPress={() => setPhase('log')}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            )}

            <View style={{ marginTop: 16 }}>
              <Button
                title="I Feel Calmer — Log Outcome"
                variant="primary"
                onPress={() => changePhase('log')}
              />
            </View>
          </View>
        )}

        {/* ========================================================
            PHASE 2D: SUPPORT CONTACTS & QUITLINES
            ======================================================== */}
        {phase === 'support' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                SUPPORT • YOU ARE NEVER ALONE
              </Text>
              <Text variant="title1" color="primary" style={{ marginTop: 4 }}>
                Reach Out
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Talking to someone directly disrupts acute craving loops and keeps you grounded.
              </Text>
            </View>

            <View style={{ gap: 12, marginVertical: 16 }}>
              {supportContacts.map((contact) => (
                <Card key={contact.id} variant="elevated" padding="md" style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactInfo}>
                      <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                        {contact.name}
                      </Text>
                      <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                        {contact.phone}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic('selection');
                        Linking.openURL(`tel:${contact.phone}`).catch(() => {
                          Alert.alert('Phone Call', `Dial: ${contact.phone}`);
                        });
                      }}
                      style={[styles.callButton, { backgroundColor: theme.colors.primary }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${contact.name}`}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                      <Text
                        variant="caption"
                        style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                title="I Feel Calmer — Log Outcome"
                variant="primary"
                onPress={() => changePhase('log')}
              />
            </View>
          </View>
        )}

        {/* ========================================================
            PHASE 3: OUTCOME LOGGING
            ======================================================== */}
        {phase === 'log' && (
          <View style={styles.sectionContainer}>
            <View style={styles.heroTextContainer}>
              <Text variant="title1" color="primary">
                Record Craving Outcome
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
                Tracking your urges proves your progress and unlocks willpower badges.
              </Text>
            </View>

            {/* Intensity After Selection */}
            <Card variant="elevated" padding="md" style={styles.cardSection}>
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                How intense is the urge now?
              </Text>

              <View style={styles.intensityScaleRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = intensityAfter === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setIntensityAfter(num)}
                      style={[
                        styles.intensityChip,
                        { borderColor: theme.colors.cardBorder },
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Intensity after ${num}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : theme.colors.text,
                        }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {intensityDelta > 0 && (
                <View
                  style={[
                    styles.deltaBadge,
                    { backgroundColor: `${theme.colors.success}22` },
                  ]}
                >
                  <Ionicons name="trending-down" size={16} color={theme.colors.success} />
                  <Text
                    variant="caption"
                    color="success"
                    style={{ fontWeight: '700', marginLeft: 6 }}
                  >
                    Intensity dropped by {intensityDelta} points!
                  </Text>
                </View>
              )}
            </Card>

            {/* Outcome Selection */}
            <Card variant="outlined" padding="md" style={styles.cardSection}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: 10 }}>
                WHAT HAPPENED?
              </Text>

              <View style={{ gap: 10 }}>
                {/* Option 1: Resisted */}
                <TouchableOpacity
                  onPress={() => setOutcome('resisted')}
                  style={[
                    styles.outcomeCardOption,
                    { borderColor: theme.colors.cardBorder },
                    outcome === 'resisted' && {
                      backgroundColor: `${theme.colors.success}18`,
                      borderColor: theme.colors.success,
                      borderWidth: 1.5,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: outcome === 'resisted' }}
                >
                  <Text style={{ fontSize: 26, marginRight: 12 }}>🎉</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                      I Resisted the Craving!
                    </Text>
                    <Text variant="caption" color="secondary">
                      I rode out the urge without taking a single puff.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Smoked */}
                <TouchableOpacity
                  onPress={() => setOutcome('smoked')}
                  style={[
                    styles.outcomeCardOption,
                    { borderColor: theme.colors.cardBorder },
                    outcome === 'smoked' && {
                      backgroundColor: `${theme.colors.accentAmber}18`,
                      borderColor: theme.colors.accentAmber,
                      borderWidth: 1.5,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: outcome === 'smoked' }}
                >
                  <Text style={{ fontSize: 26, marginRight: 12 }}>🌱</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                      I Slipped / Smoked
                    </Text>
                    <Text variant="caption" color="secondary">
                      A slip is not failure. What matters is recommitting now.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 3: Abandoned */}
                <TouchableOpacity
                  onPress={() => setOutcome('abandoned')}
                  style={[
                    styles.outcomeCardOption,
                    { borderColor: theme.colors.cardBorder },
                    outcome === 'abandoned' && {
                      backgroundColor: `${theme.colors.cardBorder}44`,
                      borderColor: theme.colors.textSecondary,
                      borderWidth: 1.5,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: outcome === 'abandoned' }}
                >
                  <Text style={{ fontSize: 26, marginRight: 12 }}>🚪</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                      Abandoned Session
                    </Text>
                    <Text variant="caption" color="secondary">
                      Urge passed or session canceled.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {outcome === 'smoked' && (
                <View
                  style={[
                    styles.slipNoticeCard,
                    {
                      backgroundColor: `${theme.colors.accentAmber}18`,
                      borderColor: theme.colors.accentAmber,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 22, marginRight: 8 }}>🤝</Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.textPrimary, fontWeight: '700' }}
                    >
                      A slip is not a failure
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" style={{ marginBottom: 12 }}>
                    Your lifetime smoke-free days and milestones are never erased. You can
                    reflect on this slip and recommit right now.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('selection');
                      router.push({
                        pathname: '/slip' as any,
                        params: {
                          initialTriggerId: selectedTriggerId ? String(selectedTriggerId) : '',
                        },
                      });
                    }}
                    style={[styles.slipSupportBtn, { backgroundColor: theme.colors.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel="Open slip support and recommit"
                  >
                    <Text
                      variant="caption"
                      style={{ color: '#FFFFFF', fontWeight: '700' }}
                    >
                      Open Slip Support &amp; Recommit &rarr;
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>

            {/* Optional Reflection Note */}
            <Card variant="flat" padding="md" style={styles.cardSection}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: 6 }}>
                Reflection Note (Optional)
              </Text>
              <TextInput
                style={[
                  styles.reflectionInput,
                  {
                    backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                    borderColor: theme.colors.cardBorder,
                    color: theme.colors.text,
                  },
                ]}
                value={reflectionNote}
                onChangeText={setReflectionNote}
                placeholder="What helped you most? What was your mindset?"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </Card>

            <Button
              title="Save &amp; Complete Session"
              variant="primary"
              onPress={handleSaveOutcome}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* Milestone Celebration Modal */}
        <CelebrationModal
          visible={!!latestCelebration}
          achievement={latestCelebration}
          onDismiss={dismissCelebration}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    alignItems: 'center',
  },
  sosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionContainer: {
    gap: 16,
  },
  heroTextContainer: {
    marginBottom: 4,
  },
  cardSection: {
    borderRadius: 18,
  },
  intensityScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 4,
  },
  intensityChip: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceBox: {
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  reasonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carouselNav: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselArrow: {
    padding: 4,
  },
  reasonBody: {
    fontStyle: 'italic',
    lineHeight: 26,
  },
  triggerChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triggerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  toolsMenu: {
    marginTop: 4,
  },
  toolMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  toolIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toolTextBox: {
    flex: 1,
    gap: 2,
  },
  skipToLogButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  surfDurationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  surfDurationTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  timerCard: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 24,
  },
  timerHeroText: {
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 6,
  },
  promptCard: {
    borderRadius: 16,
  },
  promptText: {
    lineHeight: 22,
    fontStyle: 'italic',
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 8,
  },
  breathPatternRow: {
    flexDirection: 'row',
    gap: 10,
  },
  breathPatternBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  breathingCanvas: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  animatedBreathCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    position: 'absolute',
  },
  breathCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  distractTabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#14212522',
  },
  distractTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#78909C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundingCard: {
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 20,
  },
  groundingStepHeader: {
    alignItems: 'center',
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  outcomeCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  reflectionInput: {
    height: 70,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  contactCard: {
    borderRadius: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  slipNoticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  slipSupportBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
