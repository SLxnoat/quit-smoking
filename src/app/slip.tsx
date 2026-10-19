import React, { useEffect, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { Button, Card, Screen, Text } from '../components';
import { useTheme } from '../hooks';
import { getProfile } from '../db/repositories/profile.repo';
import { getActiveTriggers, type Trigger } from '../db/repositories/triggers.repo';
import { isHapticsEnabled } from '../db/repositories/settings.repo';
import { getLifetimeStats, type LifetimeStats } from '../db/repositories/slips.repo';
import { recordSlip } from '../services/slip.service';

export default function SlipScreen() {
  const { theme } = useTheme();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ initialTriggerId?: string }>();

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);

  const [cigarettes, setCigarettes] = useState<number>(1);
  const [selectedTriggerId, setSelectedTriggerId] = useState<number | null>(
    params.initialTriggerId ? Number(params.initialTriggerId) : null
  );
  const [reflection, setReflection] = useState<string>('');
  const [resetStreak, setResetStreak] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);

  const hapticsAllowed = useRef<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [prof, trigs, hapticsPref] = await Promise.all([
          getProfile(db),
          getActiveTriggers(db),
          isHapticsEnabled(db),
        ]);
        if (!isMounted) return;
        hapticsAllowed.current = hapticsPref;
        setTriggers(trigs);
        if (prof) {
          const stats = await getLifetimeStats(db, prof.quit_at);
          if (isMounted) setLifetimeStats(stats);
        }
      } catch {
        // Fallback gracefully
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [db]);

  const triggerHaptic = (type: 'selection' | 'notification' | 'impact') => {
    if (!hapticsAllowed.current) return;
    try {
      if (type === 'selection') Haptics.selectionAsync().catch(() => {});
      else if (type === 'notification')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  };

  const handleCommit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('impact');

    try {
      const result = await recordSlip(db, {
        occurredAt: Date.now(),
        cigarettes,
        triggerId: selectedTriggerId,
        reflection: reflection.trim() || null,
        resetStreak,
      });

      setLifetimeStats(result.lifetimeStats);
      setIsCommitted(true);
      triggerHaptic('notification');

      AccessibilityInfo.announceForAccessibility(
        'Your commitment is renewed. Lifetime smoke-free days are safely preserved.'
      );
    } catch {
      Alert.alert(
        'Unable to Save',
        'Could not save your slip record. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  const lifetimeDays = lifetimeStats?.lifetimeSmokeFreeDays ?? 0;

  if (isCommitted) {
    return (
      <Screen style={styles.successScreen} contentContainerStyle={styles.successContainer}>
        <View
          style={[
            styles.successIconCircle,
            { backgroundColor: `${theme.colors.primary}22` },
          ]}
        >
          <Text style={styles.successEmoji}>🌱</Text>
        </View>

        <Text variant="title1" center style={styles.successTitle}>
          Back On Track
        </Text>

        <Text
          variant="body"
          color="secondary"
          center
          style={styles.successMessage}
        >
          A slip is simply a moment, not a verdict. You carry forward all{' '}
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {lifetimeDays} lifetime smoke-free days
          </Text>{' '}
          and every single bit of lung and heart recovery.
        </Text>

        <Card style={styles.recommitmentCard}>
          <Text variant="subtitle" style={[styles.cardHeader, { color: theme.colors.primary }]}>
            Your Moving-Forward Plan
          </Text>
          <Text variant="body" color="secondary" style={styles.planText}>
            {reflection.trim()
              ? `"${reflection.trim()}"`
              : 'Take 5 slow breaths whenever an urge visits, drink a full glass of cold water, and remember your reasons.'}
          </Text>
        </Card>

        <Button
          title="Return to Home Dashboard"
          variant="primary"
          onPress={() => router.replace('/(tabs)' as any)}
          style={styles.returnButton}
          accessibilityLabel="Return to Home Dashboard"
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen scrollable contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Close slip support"
            accessibilityRole="button"
          >
            <Text variant="body" style={{ color: theme.colors.primary, fontSize: 16 }}>
              ✕ Close
            </Text>
          </TouchableOpacity>
          <Text variant="subtitle" style={styles.headerTitle}>
            Slip Support
          </Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Compassionate Hero Banner */}
        <Card style={[styles.heroCard, { backgroundColor: `${theme.colors.primary}18` }]}>
          <View style={styles.heroRow}>
            <Text style={styles.heroEmoji}>🤝</Text>
            <View style={{ flex: 1 }}>
              <Text variant="title2" style={[styles.heroTitle, { color: theme.colors.primary }]}>
                A Slip Is Not Failure
              </Text>
              <Text variant="body" style={[styles.heroBody, { color: theme.colors.textPrimary }]}>
                Almost everyone who ever quit had moments like this. The only thing that
                matters is how you respond right now.
              </Text>
            </View>
          </View>

          {/* Lifetime Days Protected Banner */}
          <View
            style={[
              styles.lifetimeBadge,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text variant="caption" color="secondary">
              Lifetime smoke-free progress:
            </Text>
            <Text variant="subtitle" style={{ color: theme.colors.primary, marginTop: 2 }}>
              {lifetimeDays} Days Intact & Preserved
            </Text>
          </View>
        </Card>

        {/* How many cigarettes */}
        <Text variant="subtitle" style={styles.sectionTitle}>
          How many cigarettes were smoked?
        </Text>
        <View style={styles.counterRow}>
          {[1, 2, 3, 5].map((amt) => {
            const isSelected = cigarettes === amt;
            return (
              <TouchableOpacity
                key={amt}
                onPress={() => {
                  triggerHaptic('selection');
                  setCigarettes(amt);
                }}
                style={[
                  styles.cigChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                accessibilityLabel={`${amt} cigarette${amt > 1 ? 's' : ''}`}
                accessibilityRole="button"
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isSelected
                      ? '#FFFFFF'
                      : theme.colors.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  {amt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* What triggered it? */}
        <Text variant="subtitle" style={styles.sectionTitle}>
          What was the primary trigger?
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.triggerScroll}
        >
          {triggers.map((t) => {
            const isSelected = selectedTriggerId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedTriggerId(isSelected ? null : t.id);
                }}
                style={[
                  styles.triggerChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                accessibilityLabel={`Trigger ${t.label}`}
                accessibilityRole="button"
              >
                <Text
                  variant="caption"
                  style={{
                    color: isSelected
                      ? '#FFFFFF'
                      : theme.colors.textPrimary,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Reflection */}
        <Text variant="subtitle" style={styles.sectionTitle}>
          Reflection & Plan for Next Time
        </Text>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder="What was happening? How can you protect yourself next time?"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          accessibilityLabel="Reflection and plan input"
        />

        {/* Streak Option Switch */}
        <Card style={styles.streakOptionCard}>
          <View style={styles.streakRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="bodyMedium" style={[styles.streakLabel, { fontWeight: '700' }]}>
                {resetStreak ? 'Reset current streak timer' : 'Keep current streak running'}
              </Text>
              <Text variant="caption" color="secondary" style={styles.streakSub}>
                {resetStreak
                  ? 'Starts a fresh streak timer right now. Lifetime days and all achievements remain fully preserved.'
                  : 'Treats this as an isolated slip. Deducts cigarettes from avoided count and keeps streak moving.'}
              </Text>
            </View>
            <Switch
              value={resetStreak}
              onValueChange={(val) => {
                triggerHaptic('selection');
                setResetStreak(val);
              }}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Reset streak switch"
            />
          </View>
        </Card>

        {/* Action Button */}
        <Button
          title={isSubmitting ? 'Recording...' : 'Commit & Move Forward'}
          variant="primary"
          onPress={handleCommit}
          disabled={isSubmitting}
          style={styles.commitButton}
          accessibilityLabel="Commit and move forward"
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEmoji: {
    fontSize: 32,
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  lifetimeBadge: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cigChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  triggerChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  textInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  streakOptionCard: {
    padding: 14,
    marginBottom: 24,
    borderRadius: 14,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  streakSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  commitButton: {
    marginTop: 4,
    marginBottom: 20,
  },
  successScreen: {
    flex: 1,
    justifyContent: 'center',
  },
  successContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  recommitmentCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    marginBottom: 28,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  planText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  returnButton: {
    width: '100%',
  },
});
