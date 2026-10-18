import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useOnboardingDraft } from '../../hooks/use-onboarding-draft';
import { DisclaimerSchema } from '../../domain/validation';
import { useTheme } from '../../hooks/use-theme';

export default function DisclaimerScreen() {
  const { theme } = useTheme();
  const db = useSQLiteContext();
  const { commitOnboarding } = useOnboardingDraft();

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCommit = async () => {
    setError(null);
    const result = DisclaimerSchema.safeParse({ accepted });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please accept the disclaimer to continue');
      return;
    }

    try {
      setLoading(true);
      await commitOnboarding(db);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand">
            {t('onboarding.disclaimer.step')}
          </Text>
          <Text variant="title1" color="primary" center>
            {t('onboarding.disclaimer.title')}
          </Text>
          <Text variant="body" color="secondary" center>
            {t('onboarding.disclaimer.subtitle')}
          </Text>
        </View>

        {error && (
          <Card variant="flat" padding="sm" style={styles.errorCard}>
            <Text variant="bodySmall" color="danger" center>
              ⚠️ {error}
            </Text>
          </Card>
        )}

        <View style={styles.cardContainer}>
          <Card variant="flat" padding="md" style={styles.pointsCard}>
            <View style={styles.pointRow}>
              <Text variant="bodySmall" color="brand">
                1.
              </Text>
              <Text variant="bodySmall" color="primary" style={styles.pointText}>
                {t('onboarding.disclaimer.point1')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text variant="bodySmall" color="brand">
                2.
              </Text>
              <Text variant="bodySmall" color="primary" style={styles.pointText}>
                {t('onboarding.disclaimer.point2')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text variant="bodySmall" color="brand">
                3.
              </Text>
              <Text variant="bodySmall" color="primary" style={styles.pointText}>
                {t('onboarding.disclaimer.point3')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text variant="bodySmall" color="brand">
                4.
              </Text>
              <Text variant="bodySmall" color="primary" style={styles.pointText}>
                {t('onboarding.disclaimer.point4')}
              </Text>
            </View>
          </Card>

          {/* Interactive Checkbox */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted(!accepted)}
            style={[
              styles.checkboxRow,
              {
                backgroundColor: theme.colors.card,
                borderColor: accepted ? theme.colors.tint : theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: accepted ? theme.colors.tint : theme.colors.textTertiary,
                  backgroundColor: accepted ? theme.colors.tint : 'transparent',
                },
              ]}
            >
              {accepted && (
                <Text variant="caption" color="inverse" style={styles.checkmark}>
                  ✓
                </Text>
              )}
            </View>
            <Text variant="bodySmall" color="primary" style={styles.checkboxLabel}>
              {t('onboarding.disclaimer.agreeCheckbox')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button
            title={t('onboarding.disclaimer.commitButton')}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!accepted || loading}
            onPress={handleCommit}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  errorCard: {
    backgroundColor: '#FDECEC',
    borderColor: '#D64545',
    borderWidth: 1,
  },
  cardContainer: {
    gap: 16,
  },
  pointsCard: {
    gap: 12,
  },
  pointRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  pointText: {
    flex: 1,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: '800',
    fontSize: 12,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    marginTop: 12,
    paddingBottom: 8,
  },
});
