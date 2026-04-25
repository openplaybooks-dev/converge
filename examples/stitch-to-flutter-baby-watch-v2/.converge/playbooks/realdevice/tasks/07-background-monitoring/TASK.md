---
id: 07-background-monitoring
title: Background Monitoring — Foreground Service (Android) + Region Monitoring (iOS)
description: Keep the BLE scan alive when the app is backgrounded. Android uses flutter_background_service to host a foreground service with a persistent notification. iOS uses flutter_beacon's region monitoring (didEnterRegion / didExitRegion) — which requires the iBeacon UUID known at compile time (depends on §03).
blocking: true
dependencies:
  - 05-home-state-machine
tags:
  - background
  - foreground-service
  - ios-region-monitoring
inputs:
  - lib/ble/real_ble_scanner.dart
  - lib/providers/home_alert_phase_provider.dart
  - lib/config/beacon_signature.dart
  - lib/main.dart
outputs:
  - lib/services/background_service.dart
  - lib/main.dart
  - docs/background-monitoring.md
  - android/app/src/main/AndroidManifest.xml
checks:
  - id: service-file-exists
    cmd: test -f lib/services/background_service.dart
    description: Background service module exists
  - id: main-initializes-service
    cmd: "grep -q 'BackgroundService.initialize' lib/main.dart"
    description: main.dart calls BackgroundService.initialize before runApp
  - id: android-service-declared
    cmd: "grep -q 'flutter_background_service' android/app/src/main/AndroidManifest.xml || grep -q '<service' android/app/src/main/AndroidManifest.xml"
    description: Android manifest declares the foreground service
  - id: ios-bg-mode
    cmd: "grep -q 'bluetooth-central' ios/Runner/Info.plist"
    description: iOS Info.plist declares bluetooth-central background mode
  - id: docs-exist
    cmd: test -f docs/background-monitoring.md
    description: Background monitoring docs exist (including iOS limitations)
  - id: dart-analyze
    cmd: dart analyze lib/services/
    description: Services module passes dart analysis
---

# Background Monitoring

Two distinct paths because iOS and Android background BLE rules diverge sharply.

## Android — foreground service

Use `flutter_background_service` to host a long-lived service that:

- Runs `RealBleScanner` continuously
- Holds a foreground notification (required by Android 8+) titled "BabyGuard đang theo dõi" with body "Bé Na · An toàn" updated as phase changes
- Publishes phase changes via `IsolateNameServer` so the foreground UI's `HomeAlertPhaseNotifier` syncs from it

`AndroidManifest.xml` additions inside `<application>`:

```xml
<service
    android:name="id.flutter.flutter_background_service.BackgroundService"
    android:foregroundServiceType="connectedDevice|location"
    android:exported="false" />
```

`foregroundServiceType` must include `connectedDevice` for BLE and `location` for the safe-zone GPS check.

## iOS — region monitoring

iOS does not allow a general BLE scan in the background. The only path is **`CLLocationManager` iBeacon region monitoring**, which `flutter_beacon` wraps. This requires:

- The iBeacon UUID known at compile time (from §03 fingerprinting)
- The app declared `bluetooth-central` and `location` in `UIBackgroundModes` (already done in §01)

When the OS detects `didEnterRegion` or `didExitRegion`, it wakes the app for ~10 seconds. During that window we update the phase notifier and fire a local notification if needed (alerting handled in §08).

If §03 fingerprinted the tag as Eddystone or `raw` (not iBeacon), iOS background monitoring is **impossible**. Document this in `docs/background-monitoring.md` and surface it in onboarding ("Trên iOS, nền tảng chỉ hỗ trợ iBeacon — beacon hiện tại sẽ chỉ giám sát khi mở app").

## Sub-steps

### 1. `lib/services/background_service.dart`

```dart
class BackgroundService {
  static Future<void> initialize() async {
    if (Platform.isAndroid) {
      await _initializeAndroid();
    } else if (Platform.isIOS) {
      await _initializeIos();
    }
  }
  // ...
}
```

Android branch configures `FlutterBackgroundService` with the foreground notification copy and starts the scanner inside the service entry point. iOS branch sets up `flutter_beacon` regions from `kPairedBeaconSignatures` and listens for region events.

### 2. `lib/main.dart`

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalDb.instance.open();
  await BackgroundService.initialize();
  runApp(const ProviderScope(child: BabyWatchApp()));
}
```

### 3. Phase sync bridge

When the service's BLE scanner inside the background isolate detects a phase transition, it sends a `{phase: '...', timestamp: ...}` message to the main isolate via `IsolateNameServer.lookupPortByName('home_alert_phase_port')`. The foreground notifier listens on that port and `forcePhase`s the new state.

### 4. Documentation

`docs/background-monitoring.md` covers:

- Android lifecycle (foreground service notification cannot be dismissed by the user without killing monitoring)
- iOS limitations (iBeacon-only; ~10s wake budget; region monitoring is OS-throttled to a few transitions/minute)
- Battery considerations (BLE scan duty cycle, recommended `setBackgroundScanPeriod`)
- Troubleshooting (DOZE mode on Android, Background App Refresh on iOS)

## Risks

- Android OEMs (Xiaomi, Huawei, Oppo) aggressively kill foreground services. Document the per-OEM allow-list step in `docs/background-monitoring.md`.
- iOS region monitoring will **not** trigger if the tag is in range when the app starts — the user must move out and back in for the first event. Add a manual "Refresh" button on Home for the first run.
- The foreground service notification text contains the beacon name — make sure that's localised (Vietnamese default per PRD).
