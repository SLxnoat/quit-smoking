import React, { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useOnboardingDraft } from '../../hooks/use-onboarding-draft';
import { PREDEFINED_TRIGGERS } from '../../db/migrations';
import { useTheme } from '../../hooks/use-theme';

export default function TriggersScreen() {
  const { theme } = useTheme();
  const { draft, toggleTriggerKey, addCustomTriggerDraft } = useOnboardingDraft();

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customPlan, setCustomPlan] = useState('');

  const handleAddCustom = () => {
    if (!customLabel.trim()) return;
    addCustomTriggerDraft(customLabel.trim(), customPlan.trim() || undefined);
    setCustomLabel('');
    setCustomPlan('');
    setShowCustomModal(false);
  };

  const handleNext = () => {
    router.push('/(onboarding)/disclaimer');
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand">
            {t('onboarding.triggers.step')}
          </Text>
          <Text variant="title1" color="primary" center>
            {t('onboarding.triggers.title')}
          </Text>
          <Text variant="body" color="secondary" center>
            {t('onboarding.triggers.subtitle')}
          </Text>
        </View>

        <View style={styles.list}>
          {PREDEFINED_TRIGGERS.map((trigger) => {
            const isActive = draft.activeTriggerKeys.includes(trigger.key);
            return (
              <Card
                key={trigger.key}
                variant={isActive ? 'outlined' : 'flat'}
                padding="md"
                style={styles.triggerCard}
              >
                <View style={styles.triggerHeader}>
                  <Text variant="subtitle" color={isActive ? 'primary' : 'secondary'} style={styles.label}>
                    {trigger.label}
                  </Text>
                  <Switch
                    value={isActive}
                    onValueChange={() => toggleTriggerKey(trigger.key)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.tint }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {isActive && (
                  <View
                    style={[
                      styles.planBox,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" color="brand">
                      IF-THEN COPING PLAN
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {trigger.coping_plan}
                    </Text>
                  </View>
                )}
              </Card>
            );
          })}

          {draft.customTriggers.map((ct) => (
            <Card key={ct.label} variant="outlined" padding="md" style={styles.triggerCard}>
              <View style={styles.triggerHeader}>
                <Text variant="subtitle" color="brand" style={styles.label}>
                  ⭐ {ct.label}
                </Text>
              </View>
              {ct.copingPlan && (
                <View
                  style={[
                    styles.planBox,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <Text variant="caption" color="brand">
                    YOUR COPING PLAN
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {ct.copingPlan}
                  </Text>
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Custom trigger toggle/creator */}
        {!showCustomModal ? (
          <Button
            title={t('onboarding.triggers.customTriggerButton')}
            variant="outline"
            size="md"
            fullWidth
            onPress={() => setShowCustomModal(true)}
          />
        ) : (
          <Card variant="flat" padding="md" style={styles.customCard}>
            <Text variant="bodyMedium" color="primary">
              New Custom Trigger
            </Text>
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
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder={t('onboarding.triggers.customTriggerPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
            />
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
              value={customPlan}
              onChangeText={setCustomPlan}
              placeholder={t('onboarding.triggers.customTriggerPlanPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
            />
            <View style={styles.customButtons}>
              <Button
                title={t('common.cancel')}
                variant="ghost"
                size="sm"
                onPress={() => setShowCustomModal(false)}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                size="sm"
                onPress={handleAddCustom}
              />
            </View>
          </Card>
        )}

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
  list: {
    gap: 12,
  },
  triggerCard: {
    gap: 10,
  },
  triggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
  planBox: {
    padding: 10,
    gap: 4,
  },
  customCard: {
    gap: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  customButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  footer: {
    marginTop: 12,
    paddingBottom: 8,
  },
});
