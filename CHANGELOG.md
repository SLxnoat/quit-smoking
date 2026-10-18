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
