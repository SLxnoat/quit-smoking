# Changelog

All notable changes to the Ember quit-smoking mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Sprint 0: Foundation & Tooling**
  - Integrated Expo SDK 58 compatible modules: `expo-sqlite`, `expo-notifications`, `expo-haptics`, `expo-local-authentication`, `expo-file-system`, `expo-sharing`, and `expo-document-picker`.
  - Configured test runner environment with `jest`, `jest-expo`, and `@testing-library/react-native`.
  - Added runtime schema validation with `zod`.
  - Cleaned template and demo code from starter project.
  - Implemented cohesive Design System tokens (palette, spacing, radius, typography) and `ThemeProvider` context supporting light, dark, and system modes.
  - Added core accessible UI primitives: `Screen`, `Text`, `Button`, `Card`.
  - Configured `app.json` for offline-only compliance (zero external network permissions, disabled cloud backups, Face ID usage string, notification plugin).
  - Added multi-environment `eas.json` profiles (`development`, `preview`, `production`).
  - Configured ESLint with `eslint-config-expo/flat` and Prettier.
  - Configured GitHub Actions CI workflow for linting, typechecking, tests, and Expo Doctor.
  - Added GitHub PR and issue templates.
- **Sprint 1: Data Layer & Onboarding**
  - Configured SQLite database client with WAL journaling and foreign key constraints ([client.ts](file:///run/media/charuka/f88b2156-0321-44f6-acba-12660ce484181/mobile/quit-smoking/src/db/client.ts)).
  - Implemented versioned migration engine using `PRAGMA user_version` with DDL for all 13 tables ([migrations.ts](file:///run/media/charuka/f88b2156-0321-44f6-acba-12660ce484181/mobile/quit-smoking/src/db/migrations.ts)).
  - Seeded predefined situational triggers with evidence-based if-then coping plans.
  - Built repositories for `profile`, `reasons`, `triggers`, and `settings`.
  - Implemented lightweight, type-safe i18n dictionary and lookup engine.
  - Added Zod schemas for validating quit dates, smoking habits, reasons, and disclaimer acceptance.
  - Built comprehensive 5-step onboarding wizard: Welcome, Quit Date, Habits & Cost, Core Reasons, Triggers & Coping Plans, and Medical Disclaimer.
  - Added onboarding gate in root `_layout.tsx` that redirects un-onboarded users while rendering persisted data on the dashboard for onboarded users.
  - Added unit test suites for database migrations, all repositories, and form validation schemas (33 passing tests).
- **Sprint 2: Motivation Engine, Dashboard, Achievements & Goals**
  - Pure domain calculations in `domain/stats.ts` (elapsed duration, cigarettes avoided, money saved, life regained with injectable clock).
  - Health recovery timeline (14 medical benchmarks from WHO, NHS, CDC) and achievement badges (20 milestone medals) in `domain/healthTimeline.ts` and `domain/milestones.ts`.
  - Offline content seeding in `src/db/seed/content.ts` with 15 stoic/psychological quotes, 12 evidence-based craving coping strategies (4Ds, 5-4-3-2-1), and milestones populated into `content_items`.
  - Content repository (`src/db/repositories/content.repo.ts`) providing deterministic daily quote rotation, randomized tips, and category filtering.
  - Focus- and AppState-aware `useTicker` hook (`src/hooks/use-ticker.ts`) that pauses when minimized or blurred to save battery while synchronizing immediately upon resumption.
  - `useStats` and `useStatsCore` hooks (`src/hooks/use-stats.ts`) integrating SQLite profile data, real-time ticking, and health milestones.
  - Interactive, accessible `ProgressRing` pure React Native component utilizing half-plane transforms without native SVG bridge overhead.
  - `StatTile` high-contrast metric component supporting tabular numbers, custom accent colors, and accessible text representations.
  - Home Dashboard (`src/app/(tabs)/index.tsx`) featuring hero timer ring, 3 stat tiles, dynamic next health milestone card with progress bar, daily motivation quote, and craving SOS trigger.
  - Recovery & Progress Screen (`src/app/(tabs)/progress.tsx`) with 3-segment switcher:
    - 14-node vertical Health Timeline stepper with completed checkmarks, in-progress countdowns, and evidence citations.
    - 20-badge Achievement Grid with category filter chips (All, Time, Money, Craving) and dynamic locked/unlocked visual feedback.
    - Goals & Rewards financial savings tracker with live progress bar, goal creation form with validation, and automatic achievement checks.
  - Achievements repository (`src/db/repositories/achievements.repo.ts`) with idempotent unlock operations and batch insertion.
  - Goals repository (`src/db/repositories/goals.repo.ts`) supporting CRUD and automated savings threshold unlocks.
  - `CelebrationModal` component powered by `react-native-reanimated` with spring scale-in, bounce animations, success haptics (`expo-haptics`), and accessibility dialog semantics.
  - Settings Screen (`src/app/(tabs)/settings.tsx`) featuring smoking habit profile editor with Zod validation, reasons manager (add/remove), light/dark/system theme picker, and clinical safety quitline directory.
  - Table-driven unit and integration tests covering TC-001 through TC-006, and TC-013 (UTC epoch arithmetic across DST changes), achieving 89 passing tests across 10 test suites.

