# 02 — Product Requirements Document (PRD)

**Product:** Ember — offline quit-smoking motivation app · **Platforms:** iOS, Android (Expo) · **Version:** 1.0 (MVP) · **Status:** Draft

## 1. Vision
A calm, private, offline companion that keeps a person motivated through the first 90 days of quitting and beyond, using proven psychological techniques.

## 2. Goals / Non-goals
**Goals:** works 100% offline; no account; < 25 MB install; cold start < 2 s; craving help in ≤ 2 taps; professional, accessible UI.
**Non-goals (v1):** social/community, cloud sync, medication prescribing, wearables, paid subscription, ads.

## 3. User Stories & Requirements

### Epic A — Onboarding & Profile
| ID | Requirement | Priority |
|---|---|---|
| A1 | As a user, I set my quit date/time (or "I quit just now"). | P0 |
| A2 | I enter cigarettes/day, pack price, pack size, currency. | P0 |
| A3 | I write/select my personal reasons for quitting (min 1). | P0 |
| A4 | I choose triggers I struggle with (pre-defined + custom). | P1 |
| A5 | I choose quit approach (cold turkey / gradual reduce) — gradual shows daily allowance. | P2 |
| A6 | Optional PIN/biometric lock. | P1 |

### Epic B — Progress Dashboard
| ID | Requirement | Priority |
|---|---|---|
| B1 | Live smoke-free timer (days/hours/min). | P0 |
| B2 | Money saved, cigarettes avoided, life regained (est.), tar avoided. | P0 |
| B3 | Health recovery timeline with next milestone countdown. | P0 |
| B4 | Daily motivational quote/tip (offline library, rotating). | P0 |
| B5 | Goals: user-defined reward (e.g., "new shoes $120") with % progress. | P1 |

### Epic C — Craving SOS
| ID | Requirement | Priority |
|---|---|---|
| C1 | Big "I have a craving" button on home. | P0 |
| C2 | Craving timer (urge surfing, 5–10 min) with rotating coping prompts. | P0 |
| C3 | Guided breathing (4-7-8 / box) with haptics. | P0 |
| C4 | 4Ds checklist and distraction mini-activities (tap game, 5-4-3-2-1 grounding). | P1 |
| C5 | Show user's own reasons + progress during craving. | P0 |
| C6 | Log outcome: resisted / smoked; intensity 1–10; trigger; mood. | P0 |
| C7 | Quick-call a support contact (native dialer). | P2 |

### Epic D — Daily Check-in & Journal
| ID | Requirement | Priority |
|---|---|---|
| D1 | Mood/stress/confidence sliders, optional note. | P0 |
| D2 | CBT thought record (situation → thought → reframe). | P1 |
| D3 | Insights: craving heatmap by hour/weekday, top triggers, mood trend. | P1 |

### Epic E — Learn (offline content)
| ID | Requirement | Priority |
|---|---|---|
| E1 | 30-day micro-lesson programme (2-min reads: CBT, MI, mindfulness). | P1 |
| E2 | Article library: withdrawal, NRT overview (signpost clinician), weight, sleep, alcohol, stress. | P1 |
| E3 | Favorites/bookmarks. | P2 |

### Epic F — Achievements & Motivation
| ID | Requirement | Priority |
|---|---|---|
| F1 | Milestone badges (20 min, 24 h, 3 d, 1 w, 1 m, 3 m, 6 m, 1 y). | P0 |
| F2 | Celebratory animation + shareable local image card (no tracking). | P2 |
| F3 | Milestone/craving-window local notifications. | P1 |

### Epic G — Slip / Relapse Support
| ID | Requirement | Priority |
|---|---|---|
| G1 | "I smoked" flow: compassionate message, trigger review, new commitment. | P0 |
| G2 | Reset current streak, preserve lifetime stats. | P0 |

### Epic H — Settings & Data
| ID | Requirement | Priority |
|---|---|---|
| H1 | Theme (light/dark/system), text size, language (EN first; i18n-ready). | P1 |
| H2 | Export/import backup as JSON file (manual, via share sheet). | P1 |
| H3 | Delete all data. | P0 |
| H4 | Resources: quitline numbers by region, disclaimer, sources. | P0 |

## 4. Non-functional Requirements
- **Offline:** zero network permission needed. All content bundled.
- **Performance:** 60 fps, TTI < 2 s mid-range Android, APK/IPA < 25 MB.
- **Privacy:** all data in on-device SQLite; no analytics/SDKs.
- **Accessibility:** WCAG 2.2 AA, screen reader labels, dynamic type, reduce-motion.
- **Reliability:** versioned DB migrations; crash-free > 99.5%.
- **Battery:** timers derived from timestamps (not intervals ticking in background).
- **Compatibility:** iOS 16+, Android 8+ (confirm against Expo SDK 58 minimums).

## 5. Success Criteria
D7 retention ≥ 40%, D30 ≥ 20% (store-level proxies, no in-app tracking); 4.5★ rating; ≥ 60% of cravings logged as "resisted".

## 6. Risks
| Risk | Mitigation |
|---|---|
| Medical liability | Disclaimers, clinician-reviewed content, signposting |
| Streak shame → churn | Lifetime stats, compassionate copy |
| Notification fatigue | Opt-in, caps, quiet hours |
| Data loss (offline only) | Manual export/import; backup reminders |

## 7. Release Plan
MVP (P0) → v1.1 (P1: insights, lessons, thought records) → v1.2 (P2: gradual-reduction, share cards, widgets).
