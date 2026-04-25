---
id: 04-ble-adapter
title: BLE Adapter Layer — Real and Fake Scanners Behind One Interface
description: Build an abstract BleScanner interface emitting beacon observations as a stream, with a Real impl (flutter_blue_plus + flutter_beacon, filtered by signatures from §03) and a Fake impl (scripted observations for unit tests and dev mode). Wire a Riverpod provider that selects impl based on --dart-define.
blocking: true
dependencies:
  - 03-fingerprint-beacon
tags:
  - ble
  - architecture
  - testing
inputs:
  - lib/config/beacon_signature.dart
  - lib/providers/beacon_provider.dart
  - lib/providers/beacon_provider.g.dart
outputs:
  - lib/ble/ble_scanner.dart
  - lib/ble/real_ble_scanner.dart
  - lib/ble/fake_ble_scanner.dart
  - lib/ble/beacon_observation.dart
  - lib/providers/ble_scanner_provider.dart
  - lib/providers/ble_scanner_provider.g.dart
  - test/ble/fake_ble_scanner_test.dart
checks:
  - id: ble-files-exist
    cmd: "test -f lib/ble/ble_scanner.dart && test -f lib/ble/real_ble_scanner.dart && test -f lib/ble/fake_ble_scanner.dart"
    description: All BLE adapter files exist
  - id: provider-exists
    cmd: test -f lib/providers/ble_scanner_provider.dart
    description: BLE scanner provider exists
  - id: ble-tests-pass
    cmd: flutter test test/ble/
    description: BLE adapter unit tests pass
  - id: dart-analyze-ble
    cmd: dart analyze lib/ble/ lib/providers/ble_scanner_provider.dart
    description: BLE module passes dart analysis
---

# BLE Adapter Layer

Define a single `BleScanner` interface that the rest of the app talks to. Two implementations let us:

1. **Run on a real phone** with the user's Nordic tag (`RealBleScanner`)
2. **Run unit tests + dev demos** without hardware (`FakeBleScanner`)

Selecting the impl is a build-time decision via `--dart-define=USE_FAKE_BLE=true`.

## Sub-steps

### 1. Value type

`lib/ble/beacon_observation.dart`:

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'beacon_observation.freezed.dart';

@freezed
class BeaconObservation with _$BeaconObservation {
  const factory BeaconObservation({
    required String id,
    required int rssi,
    required double distanceMeters,
    required DateTime lastSeen,
  }) = _BeaconObservation;
}
```

`id` is a stable identifier per signature (`'<uuid>:<major>:<minor>'` for iBeacon, `'<namespace>:<instance>'` for Eddystone, `'mac:<address>'` for raw).

### 2. Interface

`lib/ble/ble_scanner.dart`:

```dart
import 'beacon_observation.dart';

abstract class BleScanner {
  Stream<List<BeaconObservation>> observations();
  Future<void> start();
  Future<void> stop();
}
```

### 3. Real impl

`lib/ble/real_ble_scanner.dart` — combines two libraries:

- For each `BeaconSignature` in `kPairedBeaconSignatures` of kind `ibeacon`: register a `Region` with `flutter_beacon` and call `flutterBeacon.ranging(regions)`. This is the only path that works on iOS in the background.
- For Eddystone or `raw` signatures: use `flutter_blue_plus` `FlutterBluePlus.startScan(withServiceUuids: [...])` (Eddystone uses `0xFEAA`) or filter by manufacturerData prefix.
- Merge both streams into a single `Stream<List<BeaconObservation>>`.

Apply runtime permission check on `start()`: `Permission.bluetoothScan`, `Permission.bluetoothConnect`, `Permission.locationWhenInUse`. Throw a typed `BleScanPermissionDenied` if any are denied.

Distance approximation: standard log-distance path-loss model — `distanceMeters = pow(10, (txPower - rssi) / (10 * n))` with `n=2.0` for indoor, `txPower` from the iBeacon advertising frame (defaults to `-59` if absent).

### 4. Fake impl

`lib/ble/fake_ble_scanner.dart` — drives a `StreamController<List<BeaconObservation>>` from a scripted timeline. Constructor takes a `List<({Duration after, List<BeaconObservation> observations})>` and replays them on `start()`. Used by §05 state-machine tests and by dev mode.

### 5. Provider

`lib/providers/ble_scanner_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../ble/ble_scanner.dart';
import '../ble/real_ble_scanner.dart';
import '../ble/fake_ble_scanner.dart';
import '../ble/beacon_observation.dart';

part 'ble_scanner_provider.g.dart';

const _useFakeBle = bool.fromEnvironment('USE_FAKE_BLE', defaultValue: false);

@Riverpod(keepAlive: true)
BleScanner bleScanner(Ref ref) {
  return _useFakeBle ? FakeBleScanner.empty() : RealBleScanner();
}

@riverpod
Stream<List<BeaconObservation>> beaconObservations(Ref ref) {
  final scanner = ref.watch(bleScannerProvider);
  scanner.start();
  ref.onDispose(scanner.stop);
  return scanner.observations();
}
```

### 6. Update `Beacons` notifier

In `lib/providers/beacon_provider.dart`, change `Beacons.build()` to:

1. Load persisted paired beacons from sqflite (introduced in §06)
2. Watch `beaconObservationsProvider` and merge live RSSI/distance into each paired beacon

Existing screens that read `beaconsProvider` keep working — they just see live data now.

### 7. Tests

`test/ble/fake_ble_scanner_test.dart` — assert that scripted observations come through the stream in order with the right delays. Use `fake_async` for deterministic timing.

## Risks

- `flutter_beacon` and `flutter_blue_plus` both want to control the BLE adapter — start `flutter_beacon` ranging first, then add general scans on top.
- iOS `flutterBeacon.ranging` must be called from main isolate; the foreground/background bridge in §07 has to call into `RealBleScanner` through a service entry-point, not directly.
- Distance estimates from RSSI are noisy — the §05 state machine smooths over a 3-sample median.
