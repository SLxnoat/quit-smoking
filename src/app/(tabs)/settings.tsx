import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, CurrencyPicker, Screen, Text } from '../../components';
import { useTheme } from '../../hooks/use-theme';
import { useAppLock } from '../../hooks/use-app-lock';
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
import {
  hasNotificationPermissions,
  requestNotificationPermissions,
  rescheduleNotifications,
  scheduleAllNotifications,
} from '../../services/notifications.service';
import {
  deleteAllUserData,
  exportBackupToFile,
  pickAndImportBackupFile,
} from '../../services/backup.service';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { theme, mode, setMode } = useTheme();
  const { isLockEnabled, isSupported: isLockSupported, toggleLock } = useAppLock();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReasonText, setNewReasonText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Editable Form fields
  const [cigsPerDay, setCigsPerDay] = useState('');
  const [packSize, setPackSize] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [approach, setApproach] = useState<'cold_turkey' | 'gradual'>('cold_turkey');
  const [quitAt, setQuitAt] = useState<number>(0);

  const loadData = React.useCallback(async () => {
    try {
      const [prof, userReasons, hasPerm] = await Promise.all([
        getProfile(db),
        getReasons(db),
        hasNotificationPermissions(),
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
      setNotificationsEnabled(hasPerm);
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
      void rescheduleNotifications(db);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      Alert.alert('Save Failed', 'Could not save profile changes. Please try again.');
    }
  };

  const handleToggleNotifications = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationsEnabled(granted);
    if (granted) {
      const scheduled = await scheduleAllNotifications(db);
      setNotifMessage(`Enabled! Scheduled ${scheduled.length} upcoming reminders.`);
      setTimeout(() => setNotifMessage(null), 4000);
    } else {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in system settings to receive milestone and check-in reminders.'
      );
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

  const handleToggleLock = async (value: boolean) => {
    if (!isLockSupported && value) {
      Alert.alert(
        'Biometrics Unavailable',
        'Your device does not have biometric authentication or a device passcode enrolled. Please configure them in device settings.'
      );
      return;
    }
    const success = await toggleLock(value);
    if (!success) {
      Alert.alert('Authentication Failed', 'Could not verify your identity to change app lock settings.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportBackupToFile(db);
    } catch {
      Alert.alert('Export Failed', 'An error occurred while creating your backup file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Import Backup',
      'Restoring a backup will overwrite your current progress, journal entries, and craving records with the backup file data. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File & Restore',
          onPress: async () => {
            setIsImporting(true);
            try {
              const res = await pickAndImportBackupFile(db);
              if (res.success) {
                await loadData();
                Alert.alert('Backup Restored', 'Your data has been successfully imported.');
              }
            } catch (err: any) {
              Alert.alert(
                'Import Failed',
                err?.message ?? 'The selected file is not a valid Ember backup file or is corrupted.'
              );
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Data?',
      'This will erase your quit date, personal reasons, craving history, journal entries, and achievements. Predefined triggers and educational content will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete...',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This action is permanent and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Erase Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await deleteAllUserData(db);
                      router.replace('/(onboarding)/welcome');
                    } catch {
                      Alert.alert('Error', 'Failed to delete data. Please try again.');
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
            <CurrencyPicker
              value={currency}
              onSelect={(code) => {
                setCurrency(code);
                if (formErrors.currency) {
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.currency;
                    return next;
                  });
                }
              }}
              label="Currency"
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

        {/* SECTION 4: NOTIFICATIONS & REMINDERS */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Reminders &amp; Quiet Hours
            </Text>
          </View>

          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginBottom: 8 }}>
            Scheduled milestone celebrations and daily check-in reminders. Quiet hours (10 PM &ndash;
            8 AM) are automatically respected (capped at 3/day).
          </Text>

          {notifMessage && (
            <Card
              variant="flat"
              padding="sm"
              style={[styles.successNotice, { backgroundColor: `${theme.colors.success}22` }]}
            >
              <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '700' }}>
                ✓ {notifMessage}
              </Text>
            </Card>
          )}

          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                Notifications
              </Text>
              <Text variant="caption" color="secondary">
                {notificationsEnabled ? 'Permission granted' : 'Disabled'}
              </Text>
            </View>

            <Button
              title={notificationsEnabled ? 'Resync Schedule' : 'Enable Reminders'}
              variant={notificationsEnabled ? 'outline' : 'primary'}
              size="sm"
              onPress={handleToggleNotifications}
              accessibilityLabel="Toggle notification reminders"
            />
          </View>
        </Card>

        {/* SECTION 5: SECURITY & APP LOCK */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="lock-closed-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Security &amp; App Lock
            </Text>
          </View>

          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginBottom: 12 }}>
            Protect your health progress and personal thoughts. When enabled, Face ID, fingerprint,
            or device passcode is required after 30 seconds in the background.
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                Biometric &amp; Passcode Lock
              </Text>
              <Text variant="caption" color="secondary">
                {isLockEnabled
                  ? 'Active · Locks on background timeout'
                  : isLockSupported
                  ? 'Disabled'
                  : 'Screen lock not configured on device'}
              </Text>
            </View>
            <Switch
              value={isLockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              accessibilityLabel="Toggle biometric and passcode lock"
            />
          </View>
        </Card>

        {/* SECTION 6: BACKUP & DATA MANAGEMENT */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="server-outline" size={22} color={theme.colors.primary} />
            <Text variant="title3" color="primary" style={styles.sectionTitle}>
              Backup &amp; Data Management
            </Text>
          </View>

          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginBottom: 14 }}>
            Export all your quit history, journal reflections, and metrics to a validated JSON file,
            or restore an existing backup. All data is kept 100% on your device.
          </Text>

          <View style={styles.backupActions}>
            <Button
              title={isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
              variant="outline"
              size="sm"
              onPress={handleExport}
              disabled={isExporting}
              accessibilityLabel="Export all data to a JSON backup file"
            />
            <Button
              title={isImporting ? 'Restoring...' : 'Import Backup (JSON)'}
              variant="outline"
              size="sm"
              onPress={handleImport}
              disabled={isImporting}
              accessibilityLabel="Import data from a JSON backup file"
            />
          </View>

          <View
            style={[
              styles.dangerZone,
              {
                borderTopColor: theme.colors.cardBorder,
              },
            ]}
          >
            <Text variant="caption" color="danger" style={{ fontWeight: '700', marginBottom: 4 }}>
              DANGER ZONE
            </Text>
            <Text variant="caption" color="secondary" style={{ marginBottom: 10, lineHeight: 16 }}>
              Permanently erase all personal profile details, cravings, journal entries, and
              unlocked badges. Predefined trigger guides and psychoeducation lessons remain intact.
            </Text>
            <Button
              title={isDeleting ? 'Erasing...' : 'Delete All Data'}
              variant="danger"
              size="sm"
              onPress={handleDeleteAll}
              disabled={isDeleting}
              accessibilityLabel="Permanently delete all user data"
            />
          </View>
        </Card>

        {/* SECTION 7: CLINICAL & QUITLINES */}
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

          <TouchableOpacity
            onPress={() => router.push('/resources' as any)}
            style={[
              styles.resourcesLinkBtn,
              { borderColor: theme.colors.cardBorder, backgroundColor: `${theme.colors.primary}10` },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View full clinical resources, verified quitlines, citations, and licenses"
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" color="brand" style={{ fontWeight: '700' }}>
                Clinical Citations &amp; Global Directory
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Verified phone numbers, WHO/CDC sources, and software licenses &rarr;
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 8: PRIVACY & ABOUT */}
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
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dangerZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 4,
  },
  resourcesLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
});
