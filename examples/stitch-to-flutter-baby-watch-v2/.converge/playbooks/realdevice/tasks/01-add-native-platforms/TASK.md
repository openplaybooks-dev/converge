---
id: 01-add-native-platforms
title: Add Native Platforms — iOS + Android Scaffolding
description: Add ios/ and android/ folders (currently web-only) and inject all required Bluetooth, location, notification, and foreground-service permissions into Info.plist and AndroidManifest.xml
blocking: true
tags:
  - native
  - ios
  - android
  - permissions
inputs:
  - pubspec.yaml
  - web/
outputs:
  - ios/Runner/Info.plist
  - android/app/src/main/AndroidManifest.xml
  - android/app/build.gradle.kts
checks:
  - id: ios-folder-exists
    cmd: test -d ios && test -f ios/Runner/Info.plist
    description: iOS platform folder exists with Info.plist
  - id: android-folder-exists
    cmd: test -d android && test -f android/app/src/main/AndroidManifest.xml
    description: Android platform folder exists with manifest
  - id: ios-bluetooth-perm
    cmd: grep -q NSBluetoothAlwaysUsageDescription ios/Runner/Info.plist
    description: iOS declares Bluetooth usage description
  - id: ios-location-perm
    cmd: grep -q NSLocationWhenInUseUsageDescription ios/Runner/Info.plist
    description: iOS declares location usage description
  - id: ios-background-modes
    cmd: grep -q "bluetooth-central" ios/Runner/Info.plist
    description: iOS declares bluetooth-central background mode
  - id: android-ble-perm
    cmd: grep -q "BLUETOOTH_SCAN" android/app/src/main/AndroidManifest.xml
    description: Android declares BLUETOOTH_SCAN permission
  - id: android-foreground-service
    cmd: grep -q "FOREGROUND_SERVICE" android/app/src/main/AndroidManifest.xml
    description: Android declares foreground service permission
  - id: android-min-sdk
    cmd: "grep -E 'minSdk(Version)?\\s+23' android/app/build.gradle.kts || grep -E 'minSdk\\s*=\\s*23' android/app/build.gradle.kts"
    description: Android minSdk is at least 23
---

# Add Native Platforms — iOS + Android Scaffolding

The app was originally scaffolded **web-only** (`web/` exists, `ios/` and `android/` do not). This task creates the native platform folders and injects every permission and usage string needed for BLE scanning, location-based safe-zone checks, foreground service monitoring, and local notifications.

## Sub-steps

### 1. Create native folders

```bash
flutter create --platforms=ios,android --org com.babyguard .
```

This adds `ios/` and `android/` without touching existing `lib/`, `test/`, `web/`, or `pubspec.yaml`.

### 2. Bump Android SDK levels

In `android/app/build.gradle.kts` (Kotlin DSL — current Flutter default):
- `minSdk = 23` (BLE scan + foreground service support)
- `compileSdk = 34`
- `targetSdk = 34` (required for Android 12+ runtime BLE permissions)

### 3. iOS — `ios/Runner/Info.plist`

Add inside the top-level `<dict>`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>BabyGuard cần Bluetooth để theo dõi beacon của bé.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>BabyGuard cần Bluetooth để kết nối với beacon.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>BabyGuard cần vị trí để xác định vùng an toàn khi mất tín hiệu.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BabyGuard cần vị trí nền để theo dõi vùng an toàn ngay cả khi tắt màn hình.</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
  <string>location</string>
  <string>fetch</string>
</array>
```

### 4. Android — `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>` (above `<application>`):

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" tools:targetApi="s" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Make sure the `<manifest>` root element declares `xmlns:tools="http://schemas.android.com/tools"`.

## Risks

- `flutter create` will not overwrite existing files, but it may fail if there's a partial scaffold. If it complains, run from a clean working tree.
- The `neverForLocation` flag on `BLUETOOTH_SCAN` is required so Android does not require `ACCESS_FINE_LOCATION` for the scan itself — but we still need `ACCESS_FINE_LOCATION` for the safe-zone GPS check.
