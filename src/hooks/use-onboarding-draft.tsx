import React, { createContext, useContext, useState } from 'react';
import { type SQLiteDatabase } from 'expo-sqlite';
import { saveProfile } from '../db/repositories/profile.repo';
import { saveReasons } from '../db/repositories/reasons.repo';
import {
  addCustomTrigger,
  setTriggerActiveByKey,
} from '../db/repositories/triggers.repo';
import {
  setDisclaimerAccepted,
  setOnboardingCompleted,
} from '../db/repositories/settings.repo';
import { PREDEFINED_TRIGGERS } from '../db/migrations';

export interface OnboardingDraft {
  quitAt: number;
  cigsPerDay: number;
  packSize: number;
  packPrice: number;
  currency: string;
  yearsSmoked: number | null;
  reasons: string[];
  activeTriggerKeys: string[];
  customTriggers: { label: string; copingPlan?: string }[];
}

interface OnboardingDraftContextValue {
  draft: OnboardingDraft;
  setQuitAt: (quitAt: number) => void;
  setHabits: (habits: {
    cigsPerDay: number;
    packSize: number;
    packPrice: number;
    currency: string;
    yearsSmoked?: number | null;
  }) => void;
  addReason: (reason: string) => void;
  removeReason: (reason: string) => void;
  toggleTriggerKey: (key: string) => void;
  addCustomTriggerDraft: (label: string, copingPlan?: string) => void;
  commitOnboarding: (db: SQLiteDatabase) => Promise<void>;
}

const defaultDraft: OnboardingDraft = {
  quitAt: Date.now(),
  cigsPerDay: 15,
  packSize: 20,
  packPrice: 10.0,
  currency: '$',
  yearsSmoked: null,
  reasons: ['Better lung capacity & vitality', 'Save money for things I love'],
  activeTriggerKeys: PREDEFINED_TRIGGERS.map((t) => t.key),
  customTriggers: [],
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);

  const setQuitAt = (quitAt: number) => {
    setDraft((prev) => ({ ...prev, quitAt }));
  };

  const setHabits = (habits: {
    cigsPerDay: number;
    packSize: number;
    packPrice: number;
    currency: string;
    yearsSmoked?: number | null;
  }) => {
    setDraft((prev) => ({
      ...prev,
      cigsPerDay: habits.cigsPerDay,
      packSize: habits.packSize,
      packPrice: habits.packPrice,
      currency: habits.currency,
      yearsSmoked: habits.yearsSmoked ?? null,
    }));
  };

  const addReason = (reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setDraft((prev) => {
      if (prev.reasons.includes(trimmed)) return prev;
      return { ...prev, reasons: [...prev.reasons, trimmed] };
    });
  };

  const removeReason = (reason: string) => {
    setDraft((prev) => ({
      ...prev,
      reasons: prev.reasons.filter((r) => r !== reason),
    }));
  };

  const toggleTriggerKey = (key: string) => {
    setDraft((prev) => {
      const active = prev.activeTriggerKeys.includes(key);
      return {
        ...prev,
        activeTriggerKeys: active
          ? prev.activeTriggerKeys.filter((k) => k !== key)
          : [...prev.activeTriggerKeys, key],
      };
    });
  };

  const addCustomTriggerDraft = (label: string, copingPlan?: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      customTriggers: [
        ...prev.customTriggers,
        { label: trimmed, copingPlan: copingPlan?.trim() },
      ],
    }));
  };

  const commitOnboarding = async (db: SQLiteDatabase) => {
    await db.withTransactionAsync(async () => {
      // 1. Save Profile
      await saveProfile(db, {
        quit_at: draft.quitAt,
        cigs_per_day: draft.cigsPerDay,
        pack_size: draft.packSize,
        pack_price: draft.packPrice,
        currency: draft.currency,
        years_smoked: draft.yearsSmoked,
        approach: 'cold_turkey',
        confidence: 8,
      });

      // 2. Save Reasons
      await saveReasons(db, draft.reasons);

      // 3. Update Predefined Trigger active statuses
      for (const t of PREDEFINED_TRIGGERS) {
        const isActive = draft.activeTriggerKeys.includes(t.key);
        await setTriggerActiveByKey(db, t.key, isActive);
      }

      // 4. Save Custom Triggers
      for (const ct of draft.customTriggers) {
        await addCustomTrigger(db, ct.label, ct.copingPlan);
      }

      // 5. Accept disclaimer and mark onboarding completed
      await setDisclaimerAccepted(db, true);
      await setOnboardingCompleted(db, true);
    });
  };

  return (
    <OnboardingDraftContext.Provider
      value={{
        draft,
        setQuitAt,
        setHabits,
        addReason,
        removeReason,
        toggleTriggerKey,
        addCustomTriggerDraft,
        commitOnboarding,
      }}
    >
      {children}
    </OnboardingDraftContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingDraftContextValue {
  const context = useContext(OnboardingDraftContext);
  if (!context) {
    throw new Error('useOnboardingDraft must be used within an OnboardingDraftProvider');
  }
  return context;
}
