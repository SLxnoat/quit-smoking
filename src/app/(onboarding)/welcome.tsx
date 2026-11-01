import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useTheme } from '../../hooks/use-theme';

export default function WelcomeScreen() {
  const { theme } = useTheme();

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand" style={styles.badge}>
            {t('onboarding.welcome.badge')}
          </Text>
          <Text variant="hero" color="primary" center>
            {t('onboarding.welcome.title')}
          </Text>
          <Text variant="body" color="secondary" center style={styles.subtitle}>
            {t('onboarding.welcome.subtitle')}
          </Text>
        </View>

        <View style={styles.features}>
          <Card variant="flat" padding="md" style={styles.featureCard}>
            <View style={styles.featureHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                {t('onboarding.welcome.featureOffline')}
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={styles.featureText}>
              {t('onboarding.welcome.featureOfflineDesc')}
            </Text>
          </Card>

          <Card variant="flat" padding="md" style={styles.featureCard}>
            <View style={styles.featureHeaderRow}>
              <Ionicons name="medical-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                {t('onboarding.welcome.featureEvidence')}
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={styles.featureText}>
              {t('onboarding.welcome.featureEvidenceDesc')}
            </Text>
          </Card>

          <Card variant="flat" padding="md" style={styles.featureCard}>
            <View style={styles.featureHeaderRow}>
              <Ionicons name="heart-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                {t('onboarding.welcome.featureCompassion')}
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={styles.featureText}>
              {t('onboarding.welcome.featureCompassionDesc')}
            </Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button
            title={t('onboarding.welcome.cta')}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(onboarding)/quit-date')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    paddingHorizontal: 12,
  },
  features: {
    gap: 12,
    marginVertical: 12,
  },
  featureCard: {
    gap: 6,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    paddingBottom: 8,
  },
});
