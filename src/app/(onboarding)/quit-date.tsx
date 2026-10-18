import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useOnboardingDraft } from '../../hooks/use-onboarding-draft';

export default function QuitDateScreen() {
  const { draft, setQuitAt } = useOnboardingDraft();
  const [selectedPreset, setSelectedPreset] = useState<'now' | '1d' | '3d' | '7d'>('now');

  const handleSelectPreset = (preset: 'now' | '1d' | '3d' | '7d') => {
    setSelectedPreset(preset);
    const now = Date.now();
    switch (preset) {
      case 'now':
        setQuitAt(now);
        break;
      case '1d':
        setQuitAt(now - 24 * 60 * 60 * 1000);
        break;
      case '3d':
        setQuitAt(now - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        setQuitAt(now - 7 * 24 * 60 * 60 * 1000);
        break;
    }
  };

  const handleNext = () => {
    router.push('/(onboarding)/habits');
  };

  const formattedQuitTime = new Date(draft.quitAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand">
            {t('onboarding.quitDate.step')}
          </Text>
          <Text variant="title1" color="primary" center>
            {t('onboarding.quitDate.title')}
          </Text>
          <Text variant="body" color="secondary" center>
            {t('onboarding.quitDate.subtitle')}
          </Text>
        </View>

        <View style={styles.options}>
          <Card
            variant={selectedPreset === 'now' ? 'outlined' : 'flat'}
            padding="md"
            onPress={() => handleSelectPreset('now')}
            style={selectedPreset === 'now' ? styles.selectedCard : undefined}
          >
            <Text variant="subtitle" color={selectedPreset === 'now' ? 'brand' : 'primary'}>
              ✨ {t('onboarding.quitDate.optionJustNow')}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {t('onboarding.quitDate.optionJustNowDesc')}
            </Text>
          </Card>

          <Card
            variant={selectedPreset === '1d' ? 'outlined' : 'flat'}
            padding="md"
            onPress={() => handleSelectPreset('1d')}
            style={selectedPreset === '1d' ? styles.selectedCard : undefined}
          >
            <Text variant="subtitle" color={selectedPreset === '1d' ? 'brand' : 'primary'}>
              ⏳ 1 day ago (24 hours)
            </Text>
            <Text variant="bodySmall" color="secondary">
              Already made it past the first critical day.
            </Text>
          </Card>

          <Card
            variant={selectedPreset === '3d' ? 'outlined' : 'flat'}
            padding="md"
            onPress={() => handleSelectPreset('3d')}
            style={selectedPreset === '3d' ? styles.selectedCard : undefined}
          >
            <Text variant="subtitle" color={selectedPreset === '3d' ? 'brand' : 'primary'}>
              💪 3 days ago (72 hours)
            </Text>
            <Text variant="bodySmall" color="secondary">
              Physical nicotine withdrawal is at its turning point.
            </Text>
          </Card>

          <Card
            variant={selectedPreset === '7d' ? 'outlined' : 'flat'}
            padding="md"
            onPress={() => handleSelectPreset('7d')}
            style={selectedPreset === '7d' ? styles.selectedCard : undefined}
          >
            <Text variant="subtitle" color={selectedPreset === '7d' ? 'brand' : 'primary'}>
              🏆 1 week ago
            </Text>
            <Text variant="bodySmall" color="secondary">
              A full week smoke-free. Your taste and smell are returning.
            </Text>
          </Card>
        </View>

        <Card variant="flat" padding="md" style={styles.summaryCard}>
          <Text variant="caption" color="secondary">
            RECORDED QUIT TIMESTAMP
          </Text>
          <Text variant="bodyMedium" color="primary">
            {formattedQuitTime}
          </Text>
        </Card>

        <View style={styles.footer}>
          <Button
            title={t('common.next')}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleNext}
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
  options: {
    gap: 12,
  },
  selectedCard: {
    borderColor: '#0F9D8A',
    borderWidth: 2,
  },
  summaryCard: {
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    marginTop: 8,
    paddingBottom: 8,
  },
});
