import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Screen, Text } from '../components';
import { useTheme } from '../hooks/use-theme';

export default function HomeScreen() {
  const { mode, setMode } = useTheme();

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="caption" color="brand" style={styles.tag}>
            OFFLINE &bull; PRIVATE &bull; COMPASSIONATE
          </Text>
          <Text variant="hero" color="primary" center>
            Ember
          </Text>
          <Text variant="body" color="secondary" center style={styles.subtitle}>
            Your calm companion to a smoke-free life.
          </Text>
        </View>

        <Card variant="elevated" padding="lg" style={styles.card}>
          <Text variant="title3" color="primary" center>
            Sprint 0: Foundation Ready
          </Text>
          <Text variant="bodySmall" color="secondary" center style={styles.cardBody}>
            Offline SQLite, typed design tokens, UI primitives, and security configurations
            are initialized.
          </Text>
          <Button
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
            variant="outline"
            size="md"
            onPress={toggleTheme}
            style={styles.button}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  content: {
    gap: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
  },
  card: {
    gap: 16,
  },
  cardBody: {
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
  },
});