import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, Text } from '../../components';
import { useTheme } from '../../hooks/use-theme';
import {
  getProfile,
  saveProfile,
  type Profile,
} from '../../db/repositories/profile.repo';
import {
  addReason,
  deleteReason,
  getReasons,
  type Reason,
} from '../../db/repositories/reasons.repo';
import { ProfileEditSchema } from '../../domain/validation';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { theme, mode, setMode } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReasonText, setNewReasonText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Editable Form fields
  const [cigsPerDay, setCigsPerDay] = useState('');
  const [packSize, setPackSize] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [approach, setApproach] = useState<'cold_turkey' | 'gradual'>('cold_turkey');
  const [quitAt, setQuitAt] = useState<number>(0);

  const loadData = React.useCallback(async () => {
    try {
      const [prof, userReasons] = await Promise.all([
        getProfile(db),
        getReasons(db),
      ]);
      if (prof) {
        setProfile(prof);
        setCigsPerDay(prof.cigs_per_day.toString());
        setPackSize(prof.pack_size.toString());
        setPackPrice(prof.pack_price.toString());
        setCurrency(prof.currency);
        setApproach(prof.approach);
        setQuitAt(prof.quit_at);
      }
      setReasons(userReasons);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveProfile = async () => {
    setFormErrors({});
    setSaveSuccess(false);

    const parsed = ProfileEditSchema.safeParse({
      quitAt,
      cigsPerDay: parseFloat(cigsPerDay),
      packSize: parseInt(packSize, 10),
      packPrice: parseFloat(packPrice),
      currency,
      approach,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? 'general';
        errors[field] = issue.message;
      }
      setFormErrors(errors);
      return;
    }

    try {
      const updated = await saveProfile(db, {
        quit_at: parsed.data.quitAt,
        cigs_per_day: parsed.data.cigsPerDay,
        pack_size: parsed.data.packSize,
        pack_price: parsed.data.packPrice,
        currency: parsed.data.currency,
        approach: parsed.data.approach,
        years_smoked: profile?.years_smoked,
        confidence: profile?.confidence,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      Alert.alert('Save Failed', 'Could not save profile changes. Please try again.');
    }
  };

  const handleSetQuitToNow = () => {
    setQuitAt(Date.now());
  };

  const handleAddReason = async () => {
    const text = newReasonText.trim();
    if (text.length < 2) return;

    try {
      await addReason(db, text);
      setNewReasonText('');
      const updated = await getReasons(db);
      setReasons(updated);
    } catch {
      Alert.alert('Error', 'Could not add reason');
    }
  };

  const handleDeleteReason = async (id: number) => {
    if (reasons.length <= 1) {
      Alert.alert('Required', 'You must keep at least 1 reason for quitting.');
      return;
    }

    try {
      await deleteReason(db, id);
      const updated = await getReasons(db);
      setReasons(updated);
    } catch {
      Alert.alert('Error', 'Could not delete reason');
    }
  };

  if (isLoading) {
    return (
      <Screen style={styles.centerContainer}>
        <Text variant="bodyMedium" color="secondary">
          Loading settings...
        </Text>
      </Screen>
    );
  }

  const quitDateDisplay =
    quitAt > 0
      ? new Date(quitAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Not set';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen scrollable contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="caption" color="brand" style={styles.headerTag}>
            PREFERENCES &amp; DATA
          </Text>
          <Text variant="title1" color="primary">
            Settings
          </Text>
          <Text variant="bodySmall" color="secondary">
            Manage your smoking profile, reasons, appearance, and clinical safety info.
          </Text>
        </View>

        {/* SECTION 1: PROFILE & HABITS */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Smoking Habits &amp; Cost
            </Text>
          </View>

          {/* Quit Date Field */}
          <View style={styles.fieldRow}>
            <Text variant="bodySmall" color="secondary">
              Quit Date &amp; Time
            </Text>
            <View style={styles.quitDateContainer}>
              <Text variant="bodyMedium" color="primary" style={{ fontWeight: '600' }}>
                {quitDateDisplay}
              </Text>
              <TouchableOpacity
                onPress={handleSetQuitToNow}
                style={[styles.resetQuitBtn, { borderColor: theme.colors.cardBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Set quit date to right now"
              >
                <Text variant="caption" color="brand">
                  Reset to Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cigs per day */}
          <View style={styles.inputGroup}>
            <Text variant="bodySmall" color="secondary">
              Cigarettes Smoked Per Day
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                  borderColor: formErrors.cigsPerDay ? theme.colors.danger : theme.colors.cardBorder,
                  color: theme.colors.text,
                },
              ]}
              keyboardType="numeric"
              value={cigsPerDay}
              onChangeText={setCigsPerDay}
              placeholder="e.g. 15"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {formErrors.cigsPerDay && (
              <Text variant="caption" color="danger">
                {formErrors.cigsPerDay}
              </Text>
            )}
          </View>

          {/* Pack Size */}
          <View style={styles.inputGroup}>
            <Text variant="bodySmall" color="secondary">
              Pack Size (cigarettes per pack)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                  borderColor: formErrors.packSize ? theme.colors.danger : theme.colors.cardBorder,
                  color: theme.colors.text,
                },
              ]}
              keyboardType="number-pad"
              value={packSize}
              onChangeText={setPackSize}
              placeholder="e.g. 20"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {formErrors.packSize && (
              <Text variant="caption" color="danger">
                {formErrors.packSize}
              </Text>
            )}
          </View>

          {/* Pack Price */}
          <View style={styles.inputGroup}>
            <Text variant="bodySmall" color="secondary">
              Price Per Pack
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                  borderColor: formErrors.packPrice ? theme.colors.danger : theme.colors.cardBorder,
                  color: theme.colors.text,
                },
              ]}
              keyboardType="decimal-pad"
              value={packPrice}
              onChangeText={setPackPrice}
              placeholder="e.g. 12.50"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {formErrors.packPrice && (
              <Text variant="caption" color="danger">
                {formErrors.packPrice}
              </Text>
            )}
          </View>

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text variant="bodySmall" color="secondary">
              Currency Code
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                  borderColor: formErrors.currency ? theme.colors.danger : theme.colors.cardBorder,
                  color: theme.colors.text,
                },
              ]}
              autoCapitalize="characters"
              maxLength={4}
              value={currency}
              onChangeText={setCurrency}
              placeholder="USD"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {formErrors.currency && (
              <Text variant="caption" color="danger">
                {formErrors.currency}
              </Text>
            )}
          </View>

          {/* Approach Switcher */}
          <View style={styles.inputGroup}>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: 6 }}>
              Quit Method
            </Text>
            <View style={styles.approachRow}>
              <TouchableOpacity
                onPress={() => setApproach('cold_turkey')}
                style={[
                  styles.approachButton,
                  { borderColor: theme.colors.cardBorder },
                  approach === 'cold_turkey' && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={{
                    color: approach === 'cold_turkey' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                  }}
                >
                  Cold Turkey
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setApproach('gradual')}
                style={[
                  styles.approachButton,
                  { borderColor: theme.colors.cardBorder },
                  approach === 'gradual' && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={{
                    color: approach === 'gradual' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                  }}
                >
                  Gradual Reduction
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {saveSuccess && (
            <View style={styles.successNotice}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text variant="caption" color="success" style={{ marginLeft: 6 }}>
                Profile saved successfully!
              </Text>
            </View>
          )}

          <Button
            title="Save Profile Changes"
            variant="primary"
            onPress={handleSaveProfile}
            style={styles.saveBtn}
          />
        </Card>

        {/* SECTION 2: MY REASONS */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="heart-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              My Reasons for Quitting
            </Text>
          </View>

          <Text variant="bodySmall" color="secondary" style={styles.sectionSubtitle}>
            These are shown during intense cravings to keep you grounded.
          </Text>

          <View style={styles.reasonsList}>
            {reasons.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.reasonItem,
                  {
                    backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <Text variant="bodyMedium" color="primary" style={styles.reasonText}>
                  {r.text}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteReason(r.id)}
                  style={styles.deleteReasonBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete reason: ${r.text}`}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Add Reason Input */}
          <View style={styles.addReasonRow}>
            <TextInput
              style={[
                styles.addReasonInput,
                {
                  backgroundColor: theme.isDark ? '#142125' : '#F0F5F3',
                  borderColor: theme.colors.cardBorder,
                  color: theme.colors.text,
                },
              ]}
              value={newReasonText}
              onChangeText={setNewReasonText}
              placeholder="Add another personal reason..."
              placeholderTextColor={theme.colors.textSecondary}
            />
            <Button
              title="Add"
              variant="outline"
              size="sm"
              onPress={handleAddReason}
              disabled={newReasonText.trim().length < 2}
            />
          </View>
        </Card>

        {/* SECTION 3: APPEARANCE PREFERENCES */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-palette-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Appearance
            </Text>
          </View>

          <View style={styles.themeOptionsRow}>
            {(['system', 'light', 'dark'] as const).map((tMode) => (
              <TouchableOpacity
                key={tMode}
                onPress={() => setMode(tMode)}
                style={[
                  styles.themeOptionBtn,
                  { borderColor: theme.colors.cardBorder },
                  mode === tMode && {
                    backgroundColor: `${theme.colors.primary}22`,
                    borderColor: theme.colors.primary,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === tMode }}
              >
                <Ionicons
                  name={
                    tMode === 'light'
                      ? 'sunny'
                      : tMode === 'dark'
                      ? 'moon'
                      : 'phone-portrait-outline'
                  }
                  size={18}
                  color={mode === tMode ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    marginLeft: 6,
                    color: mode === tMode ? theme.colors.primary : theme.colors.text,
                    fontWeight: mode === tMode ? '700' : '500',
                    textTransform: 'capitalize',
                  }}
                >
                  {tMode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* SECTION 4: CLINICAL & QUITLINES */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="medkit-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Clinical Safety &amp; Helplines
            </Text>
          </View>

          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginBottom: 12 }}>
            Ember is a self-management support companion, not medical device software. Nicotine
            withdrawal may involve temporary symptoms. Consult a physician for personalized medical
            guidance.
          </Text>

          <View style={styles.quitlinesList}>
            <View style={styles.quitlineItem}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                United States
              </Text>
              <Text variant="caption" color="brand">
                1-800-QUIT-NOW (1-800-784-8669)
              </Text>
            </View>

            <View style={styles.quitlineItem}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                United Kingdom
              </Text>
              <Text variant="caption" color="brand">
                NHS Smokefree: 0300 123 1044
              </Text>
            </View>

            <View style={styles.quitlineItem}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                Canada
              </Text>
              <Text variant="caption" color="brand">
                1-866-366-3667 (Pan-Canadian Quitline)
              </Text>
            </View>

            <View style={styles.quitlineItem}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                Australia
              </Text>
              <Text variant="caption" color="brand">
                Quitline: 13 7848
              </Text>
            </View>
          </View>
        </Card>

        {/* SECTION 5: PRIVACY & ABOUT */}
        <Card variant="outlined" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.success} />
            <Text variant="bodySmall" color="primary" style={{ fontWeight: '700', marginLeft: 8 }}>
              100% Offline &amp; Private
            </Text>
          </View>
          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginTop: 4 }}>
            All your habit records, journal logs, and statistics reside solely on your device in an
            encrypted SQLite database. No tracking, no cloud telemetry, no account needed.
          </Text>
          <Text variant="caption" color="secondary" style={{ marginTop: 12 }}>
            Version 1.0.0 · Evidence based on WHO &amp; CDC guidelines.
          </Text>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTag: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  sectionSubtitle: {
    marginBottom: 12,
  },
  fieldRow: {
    marginBottom: 14,
  },
  quitDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  resetQuitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 15,
  },
  approachRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approachButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 4,
  },
  reasonsList: {
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    marginRight: 8,
  },
  deleteReasonBtn: {
    padding: 4,
  },
  addReasonRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addReasonInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quitlinesList: {
    gap: 8,
  },
  quitlineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
