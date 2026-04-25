---
id: 05-home-state-machine
title: Home State Machine — Single Screen, Four Phases
description: Replace the three separate home screens (home_safe, home_weak, home_alert) with one HomeScreen driven by a HomeAlertPhaseNotifier reading live BLE observations and AlertConfig timeouts. Phases are idle/weak/lostCountdown/alertActive per the PRD.
blocking: true
dependencies:
  - 04-ble-adapter
tags:
  - state-machine
  - home
  - refactor
inputs:
  - lib/screens/home_safe/
  - lib/screens/home_weak/
  - lib/screens/home_alert/
  - lib/providers/ble_scanner_provider.dart
  - lib/providers/alert_config_provider.dart
  - lib/router/app_router.dart
outputs:
  - lib/state/home_alert_phase.dart
  - lib/providers/home_alert_phase_provider.dart
  - lib/providers/home_alert_phase_provider.g.dart
  - lib/screens/home/home_screen.dart
  - lib/router/app_router.dart
  - test/state/home_alert_phase_test.dart
checks:
  - id: state-machine-test-passes
    cmd: flutter test test/state/home_alert_phase_test.dart
    description: State machine transitions correct on scripted FakeBleScanner timeline
  - id: unified-home-exists
    cmd: test -f lib/screens/home/home_screen.dart
    description: Unified HomeScreen exists
  - id: legacy-screens-marked
    cmd: "ls lib/screens/home_safe/home_safe_screen_legacy.dart lib/screens/home_weak/home_weak_screen_legacy.dart lib/screens/home_alert/home_alert_screen_legacy.dart >/dev/null 2>&1 || ! ls lib/screens/home_safe/home_safe_screen.dart >/dev/null 2>&1"
    description: Old home variant screens are renamed *_legacy.dart (or already removed)
  - id: router-uses-home-screen
    cmd: "grep -q 'HomeScreen()' lib/router/app_router.dart && ! grep -E 'HomeSafeScreen|HomeWeakScreen|HomeAlertScreen' lib/router/app_router.dart"
    description: Router routes /home to HomeScreen, not the variant screens
  - id: dart-analyze
    cmd: dart analyze lib/screens/home/ lib/state/ lib/providers/home_alert_phase_provider.dart
    description: Home module analyzes cleanly
---

# Home State Machine — Single Screen, Four Phases

The PRD is explicit: **the same screen renders all four `Home.alertPhase` states**. Currently the codebase has three separate screens (`home_safe`, `home_weak`, `home_alert`) — that's wrong. This task collapses them into one widget driven by a phase notifier whose state derives from BLE observations.

## Sub-steps

### 1. Phase enum

`lib/state/home_alert_phase.dart`:

```dart
enum HomeAlertPhase {
  idle,            // safe — beacon in range, RSSI strong
  weak,            // beacon in range, RSSI below threshold
  lostCountdown,   // no obs for timeoutInterval/2 — countdown to alert
  alertActive,     // full timeout elapsed AND not in safe zone
}
```

### 2. Notifier

`lib/providers/home_alert_phase_provider.dart` — a `Notifier<HomeAlertPhase>` that:

- Watches `beaconObservationsProvider` for the current paired beacon
- Reads `AlertConfig` (timeout, RSSI threshold) from `alertConfigsProvider`
- Maintains a sliding window of the last 3 observations
- Applies transition rules (see below)

### 3. Transition rules

| From | To | Condition |
|---|---|---|
| `idle` | `weak` | median RSSI of last 3 obs `< rssiThresholdDbm` |
| `weak` | `idle` | next obs RSSI `>= rssiThresholdDbm` |
| `weak` | `lostCountdown` | no new obs for `timeoutInterval / 2` |
| `idle` | `lostCountdown` | no new obs for `timeoutInterval / 2` |
| `lostCountdown` | `alertActive` | full `timeoutInterval` elapsed since last obs **AND** §09 safe-zone check returns `insideZone == false` |
| `lostCountdown` | `idle` | any new obs above threshold |
| `alertActive` | `idle` | any new obs above threshold (logs `reconnect` event via `AlertEvents.append`) |

The §09 safe-zone gate is wired in that task — for now leave a `safeZoneSuppresses` parameter defaulting to `false` so this task's test is hermetic.

### 4. Unified `HomeScreen`

`lib/screens/home/home_screen.dart` — `ConsumerWidget` that:

```dart
final phase = ref.watch(homeAlertPhaseProvider);
final beacon = ref.watch(activeBeaconProvider); // first paired beacon
return Scaffold(
  body: SingleChildScrollView(
    child: Column(
      children: [
        StatusPill(phase: phase),       // reuses widgets from home_safe/widgets/, etc.
        StatusIcon(phase: phase),
        MapCard(snapshot: beacon.lastGpsSnapshot),
        BeaconStrip(beacon: beacon, phase: phase),
        TrackingControls(phase: phase),
        if (phase == HomeAlertPhase.alertActive) AlertActionButtons(),
      ],
    ),
  ),
  bottomNavigationBar: const AppBottomNavBar(),
);
```

Pull `StatusPill`, `StatusIcon`, `BeaconStrip`, `TrackingControls`, `AlertActionButtons` from the existing variant directories (`home_safe/widgets/`, `home_weak/widgets/`, `home_alert/widgets/`). Each widget takes `phase` and swaps colour/text/icon internally — keep their files in place but make them phase-aware (or wrap them in a phase switch inside `HomeScreen`).

### 5. Rename old screens to *_legacy.dart

Don't delete `home_safe_screen.dart`, `home_weak_screen.dart`, `home_alert_screen.dart` yet — rename to `*_legacy.dart` so the audit trail is clear. They are removed in §10 once device verification has confirmed the new screen behaves correctly.

### 6. Router

In `lib/router/app_router.dart`:

```dart
GoRoute(
  path: '/home',
  builder: (context, state) => const HomeScreen(),
),
```

Drop the import of `HomeSafeScreen` (and any `HomeWeakScreen` / `HomeAlertScreen` references). Add a deep-link query param: `/home?phase=alertActive` — the notification tap handler in §08 uses this to force the alert state on resume.

### 7. Test

`test/state/home_alert_phase_test.dart` — instantiate a `FakeBleScanner` with a scripted timeline:

```
t=0s    obs(rssi=-50)              → expect idle
t=2s    obs(rssi=-50)              → expect idle
t=4s    obs(rssi=-80)              → expect weak (median < threshold)
t=64s   (no obs for timeout/2=60s) → expect lostCountdown
t=124s  (no obs for full timeout)  → expect alertActive
t=125s  obs(rssi=-50)              → expect idle, AlertEvent(kind: reconnect)
```

Use `fake_async` and `ProviderContainer` to test the notifier directly without rendering widgets.

## Risks

- The existing variant widgets may have hard-coded colours that don't generalise — check before reusing; add a `phase` param if needed.
- Router state preservation: when the user taps the notification (deep-link to `/home?phase=alertActive`), the notifier must accept an external "force phase" command to override its derived state. Add a `forcePhase(HomeAlertPhase)` method.
- Tests that depend on real BLE will fail in CI — make sure §07's CI run uses `--dart-define=USE_FAKE_BLE=true`.
