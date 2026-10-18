import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '../hooks/use-theme';
import { OnboardingDraftProvider } from '../hooks/use-onboarding-draft';
import { DB_NAME } from '../db/client';
import { migrateDb } from '../db/migrations';
import { hasCompletedOnboarding } from '../db/repositories/settings.repo';

function AppNavigationGate() {
  const db = useSQLiteContext();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [completedOnboarding, setCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const completed = await hasCompletedOnboarding(db);
        if (isMounted) {
          setCompletedOnboarding(completed);
          setIsReady(true);
        }
      } catch {
        if (isMounted) {
          setCompletedOnboarding(false);
          setIsReady(true);
        }
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    if (!isReady || completedOnboarding === null) return;

    const inOnboardingGroup = (segments as string[])[0] === '(onboarding)';

    if (!completedOnboarding && !inOnboardingGroup) {
      router.replace('/(onboarding)/welcome');
    } else if (completedOnboarding && inOnboardingGroup) {
      router.replace('/');
    }
  }, [isReady, completedOnboarding, segments]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F9D8A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
        <OnboardingDraftProvider>
          <AppNavigationGate />
        </OnboardingDraftProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1A1D',
  },
});