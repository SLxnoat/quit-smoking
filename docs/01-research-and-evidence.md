# 01 — Research & Evidence Base

> Working name: **Ember** (placeholder). Offline-first, lightweight quit-smoking companion.

## 1. Problem
Tobacco use is the leading preventable cause of death worldwide (WHO: >8M deaths/yr). Most smokers want to quit, but only ~5–7% succeed unaided per attempt; most relapse within the first 2 weeks to 3 months. Cravings are short (typically 3–5 minutes peak) yet intense, and relapse is driven by triggers (stress, alcohol, coffee, social, boredom, after meals).

## 2. What evidence says works (and how the app uses it)
| Evidence-based technique | Source family | App feature |
|---|---|---|
| Self-monitoring and goal setting | Behaviour-change taxonomy (BCTT, Michie et al.) | Quit date, daily check-in, craving log |
| Feedback on progress / rewards | Operant conditioning, BCTT | Smoke-free timer, money saved, milestones, badges |
| Cognitive Behavioural Therapy (CBT) | Cochrane reviews on behavioural support | Trigger tracking, thought-reframing exercises, coping plans |
| Urge surfing / mindfulness (MBSR/MBRP) | Bowen & Marlatt; mindfulness-based relapse prevention | Guided craving timer, breathing, body-scan |
| Motivational Interviewing (MI) | Miller & Rollnick | "My reasons" onboarding, decisional balance, importance/confidence rulers |
| Implementation intentions ("if-then") | Gollwitzer | Personal if-then coping plans |
| Health-recovery information | US Surgeon General, NHS | Health recovery timeline |
| Relapse-prevention / "slip" normalisation (abstinence violation effect) | Marlatt | Compassionate slip flow; no streak-shaming |
| Delay & distract (4Ds: Delay, Deep breathe, Drink water, Do something else) | NHS Smokefree, CDC | Craving SOS toolkit |
| Social support | Cochrane | Offline "support contacts" quick call/SMS (device-native) |

Note: Apps are an adjunct. Evidence is strongest for combined behavioural support + pharmacotherapy (NRT, varenicline, bupropion). The app must signpost to clinicians/quitlines and never give medical dosing advice.

## 3. Competitor scan (summary)
| App | Strengths | Gaps we exploit |
|---|---|---|
| Smoke Free | Clean tracking, milestones | Subscription push, ads/online features |
| Kwit | Gamification | Heavy, cloud-linked |
| QuitNow | Community | Requires account, online, privacy concerns |
| Quit Genius | Clinical CBT programme | Paywalled, online |
| I Am Sober / Sober Time | Streaks | Not smoking-specific |

**Opportunity:** a *fully offline*, *no-account*, *no-ads*, *tiny-size*, privacy-first app with CBT/mindfulness depth and warm, non-judgemental tone.

## 4. Target users (personas)
1. **Ravi, 34, desk worker** — 15 cigs/day, stress smoker; wants quick craving help and money saved view.
2. **Nadia, 27, social smoker** — triggers are alcohol/friends; wants trigger planning.
3. **Kamal, 55, long-term smoker** — health-driven, low tech comfort; needs large type, simplicity.
4. **Relapser Sam, 41** — tried 4×; needs shame-free slip handling.

## 5. Behavioural & psychological design principles
- **Autonomy-supportive** (Self-Determination Theory): user's own reasons, never nagging.
- **Compassion over streak anxiety**: a slip resets the *current streak* but never erases *lifetime* progress (cigarettes avoided, total smoke-free days).
- **Just-in-time support**: craving help ≤ 2 taps from launch.
- **Variable, small rewards**: milestone celebrations, rotating daily messages.
- **Low friction**: check-in under 20 seconds.
- **Safety**: crisis/mental-health signposting if user reports severe distress.

## 6. Key metrics (for local, private analytics only)
Days smoke-free, cravings resisted, cigs not smoked, money saved, check-in adherence. No telemetry leaves the device.

## 7. Regulatory & ethical notes
- Not a medical device; wellness/behaviour support disclaimer.
- Health claims cited to WHO/NHS/CDC; content reviewed by a clinician before release.
- Privacy: no data collection; GDPR/CCPA trivially satisfied; app-store "Data not collected".
- Accessibility: WCAG 2.2 AA targets.

## 8. Reference sources to cite in-app (About → Sources)
WHO Tobacco fact sheet; NHS Better Health Smokefree; CDC "Benefits of quitting"; US Surgeon General 2020 cessation report; Cochrane reviews on behavioural interventions and NRT; Michie et al. BCT Taxonomy v1; Bowen & Marlatt (2009) urge surfing; Miller & Rollnick, Motivational Interviewing.

> Verify all statistics and the health-timeline wording against the primary sources before publication.
