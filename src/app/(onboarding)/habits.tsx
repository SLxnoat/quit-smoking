import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { useOnboardingDraft } from '../../hooks/use-onboarding-draft';
import { HabitsSchema } from '../../domain/validation';
import { useTheme } from '../../hooks/use-theme';

export default function HabitsScreen() {
  const { theme } = useTheme();
  const { draft, setHabits } = useOnboardingDraft();

  const [cigsPerDay, setCigsPerDay] = useState(draft.cigsPerDay.toString());
  const [packSize, setPackSize] = useState(draft.packSize.toString());
  const [packPrice, setPackPrice] = useState(draft.packPrice.toString());
  const [currency, setCurrency] = useState(draft.currency);
  const [yearsSmoked, setYearsSmoked] = useState(
    draft.yearsSmoked ? draft.yearsSmoked.toString() : ''
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNext = () => {
    setErrorMessage(null);
    const parsedData = {
      cigsPerDay: parseFloat(cigsPerDay),
      packSize: parseInt(packSize, 10),
      packPrice: parseFloat(packPrice),
      currency: currency.trim() || '$',
      yearsSmoked: yearsSmoked ? parseFloat(yearsSmoked) : null,
    };

    const result = HabitsSchema.safeParse(parsedData);
    if (!result.success) {
      setErrorMessage(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setHabits(result.data);
    router.push('/(onboarding)/reasons');
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      color: theme.colors.text,
      borderRadius: theme.radius.md,
    },
  ];

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" color="brand">
            {t('onboarding.habits.step')}
          </Text>
          <Text variant="title1" color="primary" center>
            {t('onboarding.habits.title')}
          </Text>
          <Text variant="body" color="secondary" center>
            {t('onboarding.habits.subtitle')}
          </Text>
        </View>

        {errorMessage && (
          <Card variant="flat" padding="sm" style={styles.errorCard}>
            <Text variant="bodySmall" color="danger" center>
              ⚠️ {errorMessage}
            </Text>
          </Card>
        )}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text variant="bodyMedium" color="primary">
              {t('onboarding.habits.cigsPerDayLabel')}
            </Text>
            <TextInput
              style={inputStyle}
              keyboardType="number-pad"
              value={cigsPerDay}
              onChangeText={setCigsPerDay}
              placeholder={t('onboarding.habits.cigsPerDayPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.flexHalf]}>
              <Text variant="bodyMedium" color="primary">
                {t('onboarding.habits.packSizeLabel')}
              </Text>
              <TextInput
                style={inputStyle}
                keyboardType="number-pad"
                value={packSize}
                onChangeText={setPackSize}
                placeholder={t('onboarding.habits.packSizePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={[styles.field, styles.flexHalf]}>
              <Text variant="bodyMedium" color="primary">
                {t('onboarding.habits.currencyLabel')}
              </Text>
              <TextInput
                style={inputStyle}
                value={currency}
                onChangeText={setCurrency}
                maxLength={5}
                placeholder={t('onboarding.habits.currencyPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text variant="bodyMedium" color="primary">
              {t('onboarding.habits.packPriceLabel')}
            </Text>
            <TextInput
              style={inputStyle}
              keyboardType="decimal-pad"
              value={packPrice}
              onChangeText={setPackPrice}
              placeholder={t('onboarding.habits.packPricePlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.field}>
            <Text variant="bodyMedium" color="primary">
              {t('onboarding.habits.yearsSmokedLabel')}
            </Text>
            <TextInput
              style={inputStyle}
              keyboardType="number-pad"
              value={yearsSmoked}
              onChangeText={setYearsSmoked}
              placeholder={t('onboarding.habits.yearsSmokedPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
            />
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
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexHalf: {
    flex: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  footer: {
    marginTop: 12,
    paddingBottom: 8,
  },
});
