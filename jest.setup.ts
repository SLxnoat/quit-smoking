/* eslint-disable @typescript-eslint/no-require-imports */

jest.setTimeout(15000);

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const ViewComponent = React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref })
  );
  ViewComponent.displayName = 'AnimatedView';

  const TextComponent = React.forwardRef((props: any, ref: any) =>
    React.createElement(Text, { ...props, ref })
  );
  TextComponent.displayName = 'AnimatedText';

  return {
    __esModule: true,
    default: {
      View: ViewComponent,
      Text: TextComponent,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (initialValue: any) => ({ value: initialValue }),
    useAnimatedStyle: (styleFactory: () => any) => styleFactory(),
    withTiming: (toValue: any) => toValue,
    withSpring: (toValue: any) => toValue,
    withSequence: (...values: any[]) => values[values.length - 1],
    withDelay: (_delay: number, val: any) => val,
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      quad: (t: number) => t,
      cubic: (t: number) => t,
      bezier: () => (t: number) => t,
      in: () => (t: number) => t,
      out: () => (t: number) => t,
      inOut: () => (t: number) => t,
    },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  };
});

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
  },
}));

const mockFileSystem = {
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  EncodingType: {
    UTF8: 'utf8',
  },
};

jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('expo-file-system/legacy', () => mockFileSystem);

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: '/mock/cache/backup.json', name: 'backup.json' }],
  }),
}));
