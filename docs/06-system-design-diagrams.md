# 06 — System Design (Mermaid Diagrams)

## 1. System Context (C4 Level 1)
```mermaid
flowchart LR
  U([User]) -->|taps, inputs| APP[Ember Mobile App]
  APP -->|local notifications| OS[(iOS / Android OS)]
  APP -->|native dialer / share sheet| OS
  APP -.->|manual JSON export / import| FILES[(Device Files)]
  APP x--x NET((Internet))
  style NET stroke-dasharray: 5 5
```
The app has no network dependency; the Internet node is shown to make "no connection" explicit.

## 2. Container / Layer View (C4 Level 2)
```mermaid
flowchart TB
  subgraph UI["Presentation (src/app, src/components)"]
    S1[Screens / Routes]
    S2[UI Components]
  end
  subgraph APPL["Application (src/hooks)"]
    H1[useProfile]
    H2[useStats]
    H3[useCraving]
    H4[useContent]
  end
  subgraph DOM["Domain (src/domain) - pure TS"]
    D1[stats]
    D2[milestones]
    D3[healthTimeline]
    D4[insights]
  end
  subgraph DATA["Data (src/db)"]
    R1[Repositories]
    M[Migrations + Seed]
    DB[(SQLite - expo-sqlite)]
  end
  subgraph PLAT["Platform services"]
    N[expo-notifications]
    HP[expo-haptics]
    LA[expo-local-authentication]
    FS[file-system / sharing]
  end
  S1 --> S2
  S1 --> H1 & H2 & H3 & H4
  H1 & H2 & H3 & H4 --> D1 & D2 & D3 & D4
  H1 & H2 & H3 & H4 --> R1
  R1 --> DB
  M --> DB
  H3 --> HP
  H2 --> N
  S1 --> LA
  R1 --> FS
```

## 3. Navigation Map
```mermaid
flowchart TD
  Root[_layout.tsx] --> Boot{DB ready and migrated?}
  Boot -- no --> Splash[Splash]
  Boot -- yes --> Onb{Onboarded?}
  Onb -- no --> OB1[Welcome] --> OB2[Quit date] --> OB3[Habits and cost] --> OB4[Reasons] --> OB5[Triggers] --> OB6[Disclaimer and finish]
  Onb -- yes --> Lock{Lock on?}
  Lock -- yes --> Auth[Biometric / PIN] --> Tabs
  Lock -- no --> Tabs
  OB6 --> Tabs
  subgraph Tabs
    T1[Home] ; T2[Progress] ; T3[Learn] ; T4[Journal] ; T5[Settings]
  end
  T1 --> M1[[Craving SOS modal]]
  T1 --> M2[[Slip modal]]
  T1 --> M3[Check-in]
  T3 --> L1[Lesson / Article detail]
  T4 --> J1[Thought record]
  T5 --> S1x[Export / Import / Delete]
```

## 4. Sequence — App Cold Start
```mermaid
sequenceDiagram
  participant OS
  participant Root as _layout
  participant DB as SQLiteProvider
  participant Mig as Migrations
  participant Repo as ProfileRepo
  OS->>Root: launch
  Root->>DB: open ember.db
  DB->>Mig: onInit(db)
  Mig->>Mig: read PRAGMA user_version
  alt version < latest
    Mig->>DB: run pending migrations (transaction)
    Mig->>DB: seed / upsert content
  end
  Mig-->>Root: ready
  Root->>Repo: getProfile()
  Repo-->>Root: profile or null
  Root-->>OS: route to onboarding or tabs
```

## 5. Sequence — Craving SOS
```mermaid
sequenceDiagram
  actor User
  participant UI as CravingScreen
  participant Hook as useCraving
  participant Repo as CravingRepo
  User->>UI: tap "I have a craving"
  UI->>Hook: start(intensityBefore)
  Hook-->>UI: reasons + timer start
  User->>UI: pick tool (Breathe / Distract / Timer)
  UI->>UI: run tool (haptics, animation)
  User->>UI: finish
  UI->>User: ask outcome + trigger + intensity after
  User->>UI: Resisted
  UI->>Hook: complete(outcome=resisted)
  Hook->>Repo: insert craving_log
  Hook->>Hook: check achievements (e.g. 10 cravings resisted)
  Hook-->>UI: celebration
```

## 6. Sequence — Slip Flow
```mermaid
sequenceDiagram
  actor User
  participant UI as SlipScreen
  participant Svc as slipService
  participant DB as SQLite
  participant Notif as Notifications
  User->>UI: "I smoked"
  UI->>User: compassionate message
  User->>UI: trigger + reflection + reset?
  UI->>Svc: recordSlip(data)
  Svc->>DB: BEGIN
  Svc->>DB: insert slips
  Svc->>DB: update profile.quit_at (if reset)
  Svc->>DB: COMMIT
  Svc->>Notif: reschedule milestones
  Svc-->>UI: lifetime stats preserved
  UI->>User: new commitment screen
```

## 7. State Machine — Craving Session
```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Started: tap SOS
  Started --> ToolActive: choose tool
  ToolActive --> ToolActive: switch tool
  ToolActive --> Logging: timer ends / user finishes
  Started --> Abandoned: close modal
  Logging --> Resisted: outcome resisted
  Logging --> Smoked: outcome smoked
  Smoked --> SlipFlow
  Resisted --> [*]
  Abandoned --> [*]
  SlipFlow --> [*]
```

## 8. State Machine — User Journey Status
```mermaid
stateDiagram-v2
  [*] --> New
  New --> Onboarding
  Onboarding --> Active: quit date set
  Active --> Slipped: slip recorded
  Slipped --> Active: new commitment
  Active --> Milestone: threshold reached
  Milestone --> Active
  Active --> Maintenance: > 1 year
```

## 9. Class / Domain Model
```mermaid
classDiagram
  class Profile {
    +number quitAt
    +number cigsPerDay
    +number packSize
    +number packPrice
    +string currency
  }
  class StatsService {
    +elapsed(now) number
    +cigsAvoided(now) number
    +moneySaved(now) number
    +lifeRegainedMin(now) number
  }
  class MilestoneEngine {
    +evaluate(elapsed, unlocked) Achievement[]
  }
  class CravingLog
  class Slip
  class Trigger
  Profile --> StatsService
  StatsService --> MilestoneEngine
  CravingLog --> Trigger
  Slip --> Trigger
```

## 10. Data Flow — Backup Export / Import
```mermaid
flowchart LR
  A[Settings: Export] --> B[Read all user tables] --> C[Serialise JSON v1 + schemaVersion] --> D[Write cache file] --> E[Share sheet]
  F[Settings: Import] --> G[Pick file] --> H{Validate schema with zod} 
  H -- invalid --> I[Show error, no changes]
  H -- valid --> J[Confirm overwrite] --> K[Transaction: replace tables] --> L[Reschedule notifications]
```

## 11. Deployment / Release Pipeline
```mermaid
flowchart LR
  Dev[Developer] --> PR[Pull Request] --> CI[CI: lint, tsc, jest]
  CI --> Main[main branch]
  Main --> EASp[EAS Build preview]
  EASp --> QA[Internal testing]
  QA --> Tag[Release tag]
  Tag --> EASr[EAS Build production] --> Stores[App Store / Play Store]
  Main -.->|JS-only safe fix| OTA[eas update]
```
