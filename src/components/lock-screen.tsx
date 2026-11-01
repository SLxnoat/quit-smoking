import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { Text } from './text';
import { useAppLock } from '../hooks/use-app-lock';
import { useTheme } from '../hooks/use-theme';

export function LockScreen() {
  const { unlock } = useAppLock();
  const { theme } = useTheme();

  useEffect(() => {
    // Attempt biometric unlock automatically when screen is shown
    void unlock();
  }, [unlock]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#0E1A1D' : '#F7FAF9' },
      ]}
      accessibilityRole="none"
      accessibilityLabel="Ember lock screen"
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${theme.colors.primary}22` },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={48}
            color={theme.colors.primary}
          />
        </View>

        <Text variant="title1" color="primary" style={styles.title}>
          Ember is Locked
        </Text>

        <Text variant="bodySmall" color="secondary" center style={styles.subtitle}>
          Your quit journey, journal reflections, and personal health data are protected.
        </Text>

        <Button
          title="Unlock with Biometrics"
          variant="primary"
          size="lg"
          onPress={() => void unlock()}
          style={styles.unlockBtn}
          accessibilityLabel="Unlock Ember with biometrics or passcode"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 10,
    fontWeight: '800',
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 22,
  },
  unlockBtn: {
    width: '100%',
  },
});
