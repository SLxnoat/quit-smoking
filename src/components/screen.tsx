import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safeAreaEdges?: SafeAreaViewProps['edges'];
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  statusBarStyle?: 'auto' | 'light' | 'dark' | 'inverted';
}

export function Screen({
  children,
  scrollable = false,
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
  statusBarStyle,
}: ScreenProps) {
  const { theme, isDark } = useTheme();

  const effectiveStatusBarStyle = statusBarStyle ?? (isDark ? 'light' : 'dark');

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  };

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { padding: theme.spacing.base },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { padding: theme.spacing.base }, contentContainerStyle]}>
      {children}
    </View>
  );

  const inner = keyboardAvoiding && Platform.OS === 'ios' ? (
    <KeyboardAvoidingView behavior="padding" style={styles.keyboardContainer}>
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={[containerStyle, style]}>
      <StatusBar style={effectiveStatusBarStyle} />
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
});
