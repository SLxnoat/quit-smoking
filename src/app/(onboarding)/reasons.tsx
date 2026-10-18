import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useOnboardingDraft } from '../../hooks/use-onboarding-draft';
import { useTheme } from '../../hooks/use-theme';

const SUGGESTIONS = [
  'Better lung capacity & vitality',
  'Save thousands for life goals & travel',
  'Protect my family & loved ones from smoke',
  'Freedom from the anxiety of cravings',
  'Smell clean and feel confident every day',
  'Be here for the long haul with my family',
];

export default function ReasonsScreen() {
  const { theme } = useTheme();
  const { draft, addReason, removeReason } = useOnboardingDraft();
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddCustom = () => {
    if (!customText.trim()) return;
    addReason(customText.trim());
    setCustomText('');
    setError(null);
  };

  const handleNext = () => {
    if (draft.reasons.length === 0) {
      setError(t('onboarding.reasons.minNotice'));
      return;
    }
    setError(null);
    router.push('/(onboarding)/triggers');
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand">
            {t('onboarding.reasons.step')}
          </Text>
          <Text variant="title1" color="primary" center>
            {t('onboarding.reasons.title')}
          </Text>
          <Text variant="body" color="secondary" center>
            {t('onboarding.reasons.subtitle')}
          </Text>
        </View>

        {error && (
          <Card variant="flat" padding="sm" style={styles.errorCard}>
            <Text variant="bodySmall" color="danger" center>
              ⚠️ {error}
            </Text>
          </Card>
        )}

        {/* Selected reasons list */}
        <View style={styles.section}>
          <Text variant="subtitle" color="primary">
            Selected Reasons ({draft.reasons.length})
          </Text>
          {draft.reasons.length === 0 ? (
            <Card variant="flat" padding="md">
              <Text variant="bodySmall" color="secondary" center>
                No reasons added yet. Tap suggestions below or write your own.
              </Text>
            </Card>
          ) : (
            <View style={styles.selectedList}>
              {draft.reasons.map((reason) => (
                <View
                  key={reason}
                  style={[
                    styles.reasonItem,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text variant="bodyMedium" color="primary" style={styles.reasonText}>
                    ✨ {reason}
                  </Text>
                  <Pressable
                    onPress={() => removeReason(reason)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove reason ${reason}`}
                  >
                    <Text variant="bodyMedium" color="danger">
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Add custom input */}
        <View style={styles.section}>
          <Text variant="subtitle" color="primary">
            Add Your Own
          </Text>
          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  borderRadius: theme.radius.md,
                },
              ]}
              value={customText}
              onChangeText={setCustomText}
              placeholder={t('onboarding.reasons.addPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
            />
            <Button
              title={t('onboarding.reasons.addButton')}
              variant="secondary"
              size="md"
              onPress={handleAddCustom}
            />
          </View>
        </View>

        {/* Suggestions */}
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('onboarding.reasons.suggestionsLabel')}
          </Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((sug) => {
              const isSelected = draft.reasons.includes(sug);
              return (
                <Pressable
                  key={sug}
                  onPress={() => {
                    if (isSelected) {
                      removeReason(sug);
                    } else {
                      addReason(sug);
                      setError(null);
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.tint
                        : theme.colors.surfaceVariant,
                      borderColor: isSelected
                        ? theme.colors.tint
                        : theme.colors.border,
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    color={isSelected ? 'inverse' : 'primary'}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {sug}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
  errorCard: {
    backgroundColor: '#FDECEC',
    borderColor: '#D64545',
    borderWidth: 1,
  },
  section: {
    gap: 10,
  },
  selectedList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  reasonText: {
    flex: 1,
    marginRight: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  footer: {
    marginTop: 12,
    paddingBottom: 8,
  },
});
