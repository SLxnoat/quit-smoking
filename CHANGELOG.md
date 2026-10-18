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
