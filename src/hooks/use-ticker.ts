import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

export interface UseTickerOptions {
  /**
   * Interval in milliseconds between ticks. Defaults to 1000ms.
   */
  intervalMs?: number;
  /**
   * Whether the ticker is currently running. Defaults to true.
   */
  enabled?: boolean;
  /**
   * Clock function to get the current timestamp. Defaults to Date.now.
   */
  clock?: () => number;
}

/**
 * Focus-aware and AppState-aware real-time ticker hook.
 *
 * Pauses interval updates when the screen is blurred or the app is sent to the
 * background to preserve battery life and CPU cycles. Immediately synchronizes
 * with `Date.now()` upon refocus or resume so stats are immediately accurate.
 *
 * @returns Current timestamp in milliseconds (number).
 */
export function useTicker({
  intervalMs = 1000,
  enabled = true,
  clock = Date.now,
}: UseTickerOptions = {}): number {
  const [now, setNow] = useState<number>(clock);
  const clockRef = useRef(clock);

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(() => {
    return typeof AppState.currentState === 'string'
      ? AppState.currentState === 'active'
      : true;
  });
  const isFirstMount = useRef(true);

  // Focus awareness via Expo Router
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      if (isFirstMount.current) {
        isFirstMount.current = false;
      } else {
        setNow(clockRef.current());
      }
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  // AppState awareness (active / background / inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const active = nextState === 'active';
        setIsActive(active);
        if (active) {
          setNow(clockRef.current());
        }
      }
    );

    return () => {
      subscription?.remove?.();
    };
  }, []);

  // Interval timer runs only when enabled, screen is focused, and app is active
  useEffect(() => {
    if (!enabled || !isFocused || !isActive) {
      return;
    }

    const timer = setInterval(() => {
      setNow(clockRef.current());
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, isFocused, isActive, intervalMs]);

  return now;
}
