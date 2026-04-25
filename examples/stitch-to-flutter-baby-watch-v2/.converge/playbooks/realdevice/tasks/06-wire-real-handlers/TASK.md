---
id: 06-wire-real-handlers
title: Wire Real Handlers — Replace All phase-05 TODOs with Provider-Backed Logic
description: "Replace every `// TODO(phase-05)` marker in lib/screens/ with a real handler that mutates a Riverpod provider, navigates via go_router, persists to sqflite, or requests permissions. Co-guardian screens stay static (out of scope) but their TODOs are renamed to `// SCOPE: phase-2`."
blocking: true
dependencies:
  - 05-home-state-machine
tags:
  - wiring
  - providers
  - navigation
  - persistence
inputs:
  - lib/screens/**/*.dart
  - lib/providers/**/*.dart
  - lib/widgets/app_bottom_nav_bar.dart
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/app_bottom_nav_bar.dart
  - lib/data/local_db.dart
checks:
  - id: no-phase-05-todos
    cmd: "! grep -rn 'TODO(phase-05)' lib/screens/"
    description: All phase-05 wiring TODOs are resolved
  - id: scope-phase-2-marked
    cmd: "grep -q 'SCOPE: phase-2' lib/screens/co_guardians_list/co_guardians_list_screen.dart"
    description: Co-guardian screens marked as phase-2 scope
  - id: no-empty-handlers
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs
    description: No empty handlers anywhere in lib/screens or lib/widgets
  - id: bottom-nav-routes
    cmd: "test $(grep -c 'context.go' lib/widgets/app_bottom_nav_bar.dart) -ge 4"
    description: Bottom nav has at least 4 go_router navigations
  - id: dart-analyze
    cmd: dart analyze lib/
    description: Library passes dart analysis
---

# Wire Real Handlers

Mirror the structure of the existing `default/06-wire-screens` epic, but with one key difference: handlers now mutate **real provider state** backed by sqflite persistence and the BLE adapter, not mock-only data.

The existing audit script `.converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs` is reused as the no-empty-handlers gate.

## Sub-steps

### 1. Local persistence

`lib/data/local_db.dart` — sqflite database with three tables:

- `paired_beacons (id TEXT PRIMARY KEY, signature_json TEXT, name TEXT, paired_at INTEGER)`
- `safe_zones (id TEXT PRIMARY KEY, name TEXT, lat REAL, lng REAL, radius_m INTEGER, active INTEGER)`
- `alert_events (id TEXT PRIMARY KEY, beacon_id TEXT, kind TEXT, occurred_at INTEGER, duration_s INTEGER, suppressed_by_zone_id TEXT)`

Singleton `LocalDb.instance` opened in `main.dart` before `runApp`.

### 2. Per-screen wiring

| Screen | Provider | Handler |
|---|---|---|
| `onboarding/onboarding_screen.dart` | `onboardingPermissionsProvider` | "Allow" → `permission_handler.request()` for the matching permission, then advance the page indicator. Final "Done" → `context.go('/home')`. |
| `add_beacon/add_beacon_screen.dart` | `beaconsProvider`, `beaconObservationsProvider` | "Scan" → calls `BleScanner.start()` for 30 s; discovered list shows live obs; "Connect" on a row → `Beacons.pair(observation, name)` writes to `paired_beacons`. |
| `home/home_screen.dart` | `homeAlertPhaseProvider`, `beaconsProvider` | Tracking start/stop → `BleScanner.start/stop`; mute chips → `AlertConfigs.mute(duration)`; alert action buttons → `AlertEvents.acknowledge`. |
| `safe_zones/safe_zones_screen.dart` | `safeZonesProvider` | FAB → opens `AddSafeZoneSheet` (uses one `Geolocator.getCurrentPosition()` for centre), persists via `SafeZones.add`. Toggle switch → `SafeZones.toggle(id)`. Delete → `SafeZones.remove(id)`. |
| `settings/settings_screen.dart` | `alertConfigsProvider` | Every `// @converge:element action:toggle-*` and `set-timeout-*` marker → matching `AlertConfigs` mutator. Persist to `shared_preferences`. |
| `history/history_screen.dart` | `alertEventsProvider`, new `historyFilterProvider` | Filter pills → update `historyFilterProvider<HistoryFilter>` (`today`, `yesterday`, `last7`); list re-filters by `occurred_at`. |
| `beacon_detail/beacon_detail_screen.dart` | `beaconsProvider` | "Unpair" → `Beacons.unpair(id)` deletes from sqflite, then `context.pop()`. |

### 3. Bottom nav

`lib/widgets/app_bottom_nav_bar.dart` — read `GoRouterState.of(context).matchedLocation` to highlight the active tab. Each tab calls `context.go('/home' | '/devices' | '/safe-zones' | '/settings')`. Replace any references to `home_bottom_nav_bar.dart`, `add_beacon_bottom_nav.dart`, `beacon_detail_bottom_nav.dart` with the unified `AppBottomNavBar`.

### 4. Co-guardian screens (out of scope)

`lib/screens/co_guardians_list/co_guardians_list_screen.dart` and any co-guardian widgets keep their static UI. Replace `// TODO(phase-05)` markers with `// SCOPE: phase-2 — co-guardian flow not in realdevice playbook`. The existing `Guardians`/`Invites` providers continue to return mock data unchanged.

### 5. Verify

Run the existing audit script:

```bash
node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs
```

Plus the no-TODO grep. Both must pass.

## Risks

- `permission_handler` on iOS requires the matching `NS*UsageDescription` strings from §01 — if any are missing, the request silently returns `denied`.
- sqflite on iOS requires `path_provider` (already a transitive dep). Confirm `getApplicationDocumentsDirectory()` resolves on first launch.
- The `historyFilterProvider` is new — add it under `lib/providers/` and regenerate (`build_runner`).
