---
id: 02-add-runtime-deps
title: Add Runtime Dependencies — BLE, Notifications, Background Service
description: Extend pubspec.yaml with all runtime packages needed for BLE scanning, iBeacon ranging, permission requests, local notifications, foreground service, geolocation, persistence, vibration, and audio playback
blocking: true
dependencies:
  - 01-add-native-platforms
tags:
  - dependencies
  - pub
inputs:
  - pubspec.yaml
outputs:
  - pubspec.yaml
  - pubspec.lock
checks:
  - id: deps-resolved
    cmd: "test -f pubspec.lock && grep -q flutter_blue_plus pubspec.lock && grep -q flutter_beacon pubspec.lock && grep -q flutter_local_notifications pubspec.lock"
    description: All required packages are in the lockfile
  - id: dart-analyze
    cmd: dart analyze lib/
    description: Library still analyzes cleanly after deps added
---

# Add Runtime Dependencies

Add the runtime packages needed for the real-device prototype. Use the latest stable versions when running `flutter pub add`.

## Sub-steps

### 1. Add packages

Run:

```bash
flutter pub add \
  flutter_blue_plus \
  flutter_beacon \
  permission_handler \
  flutter_local_notifications \
  flutter_background_service \
  geolocator \
  sqflite \
  path \
  vibration \
  just_audio
```

### 2. Regenerate code

After adding deps:

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

(Required because the existing `freezed`/`riverpod_generator` setup needs a refresh after lockfile changes.)

## Notes on each package

- `flutter_blue_plus` — general-purpose BLE central (scan, connect, GATT). Used for the dev-tool advertisement dump in §03 and as the foreground scanner in §04.
- `flutter_beacon` — wraps Android `BeaconManager` and iOS `CLLocationManager` for **iBeacon region monitoring + ranging**. Critical for iOS background path (Apple only allows known-UUID iBeacon scanning in background).
- `permission_handler` — runtime permission requests (Bluetooth, Location, Notifications). Required for Android 12+ runtime BLE perms.
- `flutter_local_notifications` — local-only notifications (no FCM/APNs). Used by the alert pipeline in §08.
- `flutter_background_service` — Android foreground service support. iOS uses `flutter_beacon`'s region monitoring instead (no general background scan possible on iOS).
- `geolocator` — on-demand GPS fix for safe-zone evaluation in §09. Not used for continuous tracking.
- `sqflite` + `path` — local persistence for paired beacons, safe zones, and the alert event log.
- `vibration` — alert haptic pattern.
- `just_audio` — alert tone playback.

## Risks

- `just_audio` requires platform setup that `flutter create` already covers; double-check `ios/Podfile` `platform :ios, '12.0'` after `pod install`.
- Some BLE packages have peer-dependency conflicts with `dio`. If `flutter pub get` fails, pin individual versions.
