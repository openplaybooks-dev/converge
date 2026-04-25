---
id: 10-device-verification
title: Device Verification — End-to-End on Real Hardware
description: Manual test matrix on one Android phone + one iOS phone with the Alibaba Nordic tag. Walk-away/walk-back transitions, alert firing (foreground + backgrounded), safe-zone suppression. Final cleanup of legacy home variant screens.
blocking: true
human_checkpoint: true
dependencies:
  - 06-wire-real-handlers
  - 07-background-monitoring
  - 09-safe-zone-check
tags:
  - manual
  - verification
  - device-test
inputs:
  - lib/
  - test/
  - ios/
  - android/
outputs:
  - docs/device-test-plan.md
  - docs/device-test-results.md
checks:
  - id: dart-analyze
    cmd: dart analyze lib/ test/
    description: Final dart analysis is clean
  - id: flutter-test
    cmd: flutter test
    description: Full test suite passes
  - id: legacy-screens-removed
    cmd: "! ls lib/screens/home_safe/home_safe_screen_legacy.dart 2>/dev/null && ! ls lib/screens/home_weak/home_weak_screen_legacy.dart 2>/dev/null && ! ls lib/screens/home_alert/home_alert_screen_legacy.dart 2>/dev/null"
    description: Old home variant screens are removed (only the unified HomeScreen remains)
  - id: test-plan-exists
    cmd: test -f docs/device-test-plan.md
    description: Manual device test plan documented
  - id: test-results-exist
    cmd: test -f docs/device-test-results.md && grep -qE 'PASS|FAIL' docs/device-test-results.md
    description: Manual test results captured with PASS/FAIL markers
---

# Device Verification — End-to-End on Real Hardware

This task is **human-in-loop**. Walk through the test matrix below on real phones with the real tag, capture pass/fail in `docs/device-test-results.md`, and clean up the legacy variant screens.

## Test matrix

For each row, use one Android phone (≥ Android 9) and one iOS phone (≥ iOS 14):

| # | Scenario | Setup | Expected |
|---|---|---|---|
| 1 | First-run permissions | Fresh install | Onboarding prompts for Bluetooth + Location + Notifications; all three "Granted" pills appear; tapping Done navigates to /home |
| 2 | Beacon discovery | Tap Add Beacon, place tag within 1m | Discovered list shows the tag with strong RSSI bars within 5s |
| 3 | Pair beacon | Tap "Lưu" with a name "Bé Na" | Beacon appears on Home as "An toàn" pill, persists across app restart |
| 4 | Walk-away weak | Walk 5m away | Pill turns yellow "Tín hiệu yếu" within 10s |
| 5 | Walk-away countdown | Stay 15m away for `timeoutInterval / 2` (default 60s) | Pill shows "Đếm ngược" with countdown timer |
| 6 | Walk-away alert | Stay away until full timeout (default 2min) | Pill turns peach "Cảnh báo!", audio plays, phone vibrates, local notification fires |
| 7 | Walk-back reconnect | Walk back to within 2m of tag | Pill returns to "An toàn", audio + notification cancel, History shows "Kết nối lại" event |
| 8 | Background alert | Repeat row 6 with screen off | Notification still fires (Android via foreground service; iOS via region monitoring) |
| 9 | Notification deep-link | Tap the notification from row 8 | App opens directly to /home in alert state (not Onboarding) |
| 10 | Safe zone create | Stand still, tap Safe Zones FAB, name "Nhà", save | Zone created at current GPS, toggle is on, appears in list |
| 11 | Safe zone suppression | Repeat row 6 while inside the safe zone | Pill stays at "An toàn", no audio, no notification, History shows "An toàn" event with zone name |
| 12 | Safe zone toggle off | Toggle the zone off, repeat row 6 | Alert fires normally (suppression bypassed) |
| 13 | Multiple beacons | Pair a second tag, walk away from one only | Home shows separate status per beacon; only the absent one alerts |
| 14 | Settings persist | Change timeout to 5min, restart app | Setting still 5min |
| 15 | History filter | Apply "Last 7 days" filter | List filters to the past 7 days; empty state if no events |

## Sub-steps

### 1. Author the plan

`docs/device-test-plan.md` — copy the matrix above with empty Result columns and per-platform notes.

### 2. Run the matrix

For each row × platform: execute, capture pass/fail, screenshot/log key states. Annotate failures with reproduction steps and suspected root cause.

### 3. Capture results

`docs/device-test-results.md` — fill in the matrix with PASS / FAIL / SKIP. For SKIPs (e.g. iOS background row if §03 fingerprinted Eddystone-only), note "iOS limitation per §07 docs".

### 4. Final cleanup

Delete the legacy variant screens (renamed in §05):

```bash
rm lib/screens/home_safe/home_safe_screen_legacy.dart
rm lib/screens/home_weak/home_weak_screen_legacy.dart
rm lib/screens/home_alert/home_alert_screen_legacy.dart
# If the variant directories now contain only widgets, leave them — they're consumed by HomeScreen.
# If a variant dir is empty after cleanup, remove it.
```

### 5. Final gates

```bash
dart analyze lib/ test/
flutter test
```

Both must exit clean.

## Risks

- Pre-paired tags from a previous test session can cause the iOS region-monitoring "first event" gap (per §07 risks). Reset the test by toggling Bluetooth off/on between rows 8 and 9.
- Battery drain — running rows 4-12 back-to-back will burn 10-15% phone battery. Plan a charging break.
- DOZE mode on Android can throttle the foreground service after 60+ minutes of inactivity. Document the per-OEM workaround that worked during testing in `docs/background-monitoring.md`.
