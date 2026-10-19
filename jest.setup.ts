/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
