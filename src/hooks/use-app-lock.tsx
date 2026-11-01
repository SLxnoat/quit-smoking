import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting } from '../db/repositories/settings.repo';

const SETTING_KEY_APP_LOCK = 'app_lock_enabled';
const LOCK_BACKGROUND_TIMEOUT_MS = 30 * 1000; // 30 seconds of backgrounding triggers lock

interface AppLockContextValue {
  isLockEnabled: boolean;
  isLocked: boolean;
  isSupported: boolean;
  unlock: () => Promise<boolean>;
  toggleLock: (enable: boolean) => Promise<boolean>;
  lockNow: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const lastBackgroundedAtRef = useRef<number | null>(null);
  const isLockEnabledRef = useRef(false);

  useEffect(() => {
    isLockEnabledRef.current = isLockEnabled;
  }, [isLockEnabled]);

  // Initialize biometric support & check setting
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [hasHardware, isEnrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync().catch(() => false),
          LocalAuthentication.isEnrolledAsync().catch(() => false),
        ]);

        const supported = hasHardware && isEnrolled;
        if (isMounted) {
          setIsSupported(supported);
        }

        const lockSetting = await getSetting(db, SETTING_KEY_APP_LOCK);
        const enabled = lockSetting === 'true' && supported;

        if (isMounted) {
          setIsLockEnabled(enabled);
          if (enabled) {
            setIsLocked(true);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [db]);

  // Handle AppState transitions (Background -> Active timeout)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundedAtRef.current = Date.now();
      } else if (nextAppState === 'active') {
        const lastBg = lastBackgroundedAtRef.current;
        if (lastBg && isLockEnabledRef.current) {
          const elapsed = Date.now() - lastBg;
          if (elapsed >= LOCK_BACKGROUND_TIMEOUT_MS) {
            setIsLocked(true);
          }
        }
        lastBackgroundedAtRef.current = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const unlock = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Ember',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const toggleLock = async (enable: boolean): Promise<boolean> => {
    // Require biometric / PIN verification before enabling or disabling
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: enable ? 'Confirm biometrics to enable App Lock' : 'Confirm biometrics to disable App Lock',
      fallbackLabel: 'Use Device Passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return false;
    }

    const value = enable ? 'true' : 'false';
    await setSetting(db, SETTING_KEY_APP_LOCK, value);
    isLockEnabledRef.current = enable;
    setIsLockEnabled(enable);
    if (!enable) {
      setIsLocked(false);
    }
    return true;
  };

  const lockNow = () => {
    if (isLockEnabled) {
      setIsLocked(true);
    }
  };

  return (
    <AppLockContext.Provider
      value={{
        isLockEnabled,
        isLocked,
        isSupported,
        unlock,
        toggleLock,
        lockNow,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

const defaultAppLock: AppLockContextValue = {
  isLockEnabled: false,
  isLocked: false,
  isSupported: false,
  unlock: async () => true,
  toggleLock: async () => false,
  lockNow: () => {},
};

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  return ctx ?? defaultAppLock;
}
