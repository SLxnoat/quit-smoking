import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Screen, Text } from '../components';
import { useTheme } from '../hooks/use-theme';
import { getProfile, type Profile } from '../db/repositories/profile.repo';
import { getReasons, type Reason } from '../db/repositories/reasons.repo';
import { getActiveTriggers, type Trigger } from '../db/repositories/triggers.repo';
import { clearAllUserData } from '../db/repositories/settings.repo';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { mode, setMode } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [activeTriggers, setActiveTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prof, rList, tList] = await Promise.all([
          getProfile(db),
          getReasons(db),
          getActiveTriggers(db),
        ]);
        setProfile(prof);
        setReasons(rList);
        setActiveTriggers(tList);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [db]);

  const handleResetData = async () => {
    await clearAllUserData(db);
    router.replace('/(onboarding)/welcome');
  };

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <Text variant="bodyMedium" color="secondary">
          Loading your dashboard...
        </Text>
      </Screen>
    );
  }

  const quitFormatted = profile
    ? new Date(profile.quit_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not set';

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand" style={styles.tag}>
            SMOKE-FREE DASHBOARD &bull; SPRINT 1
          </Text>
          <Text variant="hero" color="primary" center>
            Ember
          </Text>
          <Text variant="body" color="secondary" center>
            Quit date: {quitFormatted}
          </Text>
        </View>

        <Card variant="elevated" padding="lg" style={styles.statsCard}>
          <Text variant="title3" color="primary">
            Habit Profile
          </Text>
          <View style={styles.row}>
            <Text variant="bodySmall" color="secondary">
              Cigarettes / day:
            </Text>
            <Text variant="bodyMedium" color="primary">
              {profile?.cigs_per_day ?? 0}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodySmall" color="secondary">
              Pack size:
            </Text>
            <Text variant="bodyMedium" color="primary">
              {profile?.pack_size ?? 20} cigs
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodySmall" color="secondary">
              Pack price:
            </Text>
            <Text variant="bodyMedium" color="primary">
              {profile?.currency ?? '$'}
              {profile?.pack_price ? profile.pack_price.toFixed(2) : '0.00'}
            </Text>
          </View>
        </Card>

        <Card variant="flat" padding="md" style={styles.reasonsCard}>
          <Text variant="subtitle" color="primary">
            Your Core Reasons ({reasons.length})
          </Text>
          {reasons.map((r) => (
            <Text key={r.id} variant="bodySmall" color="secondary">
              ✨ {r.text}
            </Text>
          ))}
        </Card>

        <Card variant="flat" padding="md" style={styles.triggersCard}>
          <Text variant="subtitle" color="primary">
            Active Coping Triggers ({activeTriggers.length})
          </Text>
          {activeTriggers.slice(0, 3).map((t) => (
            <View key={t.id} style={styles.triggerRow}>
              <Text variant="bodySmall" color="primary">
                &bull; {t.label}
              </Text>
              {t.coping_plan && (
                <Text variant="caption" color="secondary">
                  ↳ {t.coping_plan}
                </Text>
              )}
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
            variant="outline"
            size="md"
            onPress={toggleTheme}
          />
          <Button
            title="Reset All Data (Re-test Onboarding)"
            variant="danger"
            size="md"
            onPress={handleResetData}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingVertical: 16,
    gap: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  statsCard: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reasonsCard: {
    gap: 8,
  },
  triggersCard: {
    gap: 8,
  },
  triggerRow: {
    gap: 2,
  },
  actions: {
    gap: 12,
    marginTop: 8,
    paddingBottom: 8,
  },
});