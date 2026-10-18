import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="quit-date" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="reasons" />
      <Stack.Screen name="triggers" />
      <Stack.Screen name="disclaimer" />
    </Stack>
  );
}
