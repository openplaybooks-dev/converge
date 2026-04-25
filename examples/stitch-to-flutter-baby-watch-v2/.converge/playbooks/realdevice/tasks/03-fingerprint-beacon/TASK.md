---
id: 03-fingerprint-beacon
title: Fingerprint Beacon — Identify the Tag's Advertising Format
description: Human-in-loop checkpoint. Capture one advertising packet from the physical Nordic tag, identify its format (iBeacon UUID/major/minor, Eddystone namespace/instance, or vendor manufacturer-data), and record it in lib/config/beacon_signature.dart. This is on the critical path because iOS background scanning only works for known iBeacon UUIDs.
blocking: true
human_checkpoint: true
dependencies:
  - 02-add-runtime-deps
tags:
  - hardware
  - manual
  - beacon
inputs:
  - pubspec.yaml
outputs:
  - tool/scan_dump.dart
  - lib/config/beacon_signature.dart
  - docs/beacon-fingerprint.md
checks:
  - id: scan-tool-exists
    cmd: test -f tool/scan_dump.dart
    description: Scan-dump dev tool exists
  - id: signature-defined
    cmd: "test -f lib/config/beacon_signature.dart && grep -qE 'BeaconKind\\.(ibeacon|eddystone|raw)' lib/config/beacon_signature.dart"
    description: At least one beacon signature is recorded with a known kind
  - id: signature-has-id
    cmd: "grep -qE '(uuid|namespace|vendorAdData)' lib/config/beacon_signature.dart"
    description: Signature includes a concrete identifier (UUID, namespace, or raw ad data)
  - id: fingerprint-doc-exists
    cmd: test -f docs/beacon-fingerprint.md
    description: Human-readable fingerprint notes recorded
---

# Fingerprint Beacon — Identify the Tag's Advertising Format

This task is **human-in-loop**. The Converge engine cannot run BLE scans by itself — a person must physically hold the Alibaba Nordic IoT Tag near the phone and read the advertisement payload. The result drives every subsequent BLE task.

## Why this is critical

- **iOS background scanning** (CoreLocation iBeacon ranging) only works if the app declares the exact iBeacon UUID *a priori*. If the tag advertises something else (Eddystone, a vendor frame), the iOS background path in §07 falls back to "foreground-only on iOS".
- **Filtering** in `RealBleScanner` (§04) needs the advertisement format up front — we filter by UUID at the OS level so we don't drain the battery scanning everything.

## Sub-steps

### 1. Build the scan-dump tool

Create `tool/scan_dump.dart`:

```dart
import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FlutterBluePlus.adapterState.where((s) => s == BluetoothAdapterState.on).first;

  print('Starting 30s scan — bring the tag close to the phone now.');
  final seen = <String, ScanResult>{};
  final sub = FlutterBluePlus.scanResults.listen((results) {
    for (final r in results) {
      final id = r.device.remoteId.str;
      if (!seen.containsKey(id) || r.rssi > seen[id]!.rssi) {
        seen[id] = r;
      }
    }
  });

  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 30));
  await Future.delayed(const Duration(seconds: 31));
  await sub.cancel();

  final sorted = seen.values.toList()..sort((a, b) => b.rssi.compareTo(a.rssi));
  for (final r in sorted.take(10)) {
    print('---');
    print('id=${r.device.remoteId.str} rssi=${r.rssi}');
    print('name=${r.device.platformName.isEmpty ? "(none)" : r.device.platformName}');
    print('serviceUuids=${r.advertisementData.serviceUuids}');
    print('manufacturerData=${r.advertisementData.manufacturerData}');
    print('serviceData=${r.advertisementData.serviceData}');
  }
}
```

### 2. Run on a real phone with the tag

```bash
flutter run -t tool/scan_dump.dart
```

Bring the Alibaba tag within 1 m of the phone. The strongest stable advertiser is your tag.

### 3. Identify the format

Look at `manufacturerData` first:

- **iBeacon** — `manufacturerData[0x004C]` starts with `02 15` followed by 16 bytes of UUID, 2 bytes major, 2 bytes minor, 1 byte tx-power. Most Nordic tags ship as iBeacon.
- **Eddystone** — `serviceData[FEAA]` present; first byte indicates frame type (0x00 = UID with 10-byte namespace + 6-byte instance, 0x10 = URL, 0x20 = TLM).
- **Vendor / raw** — neither of the above. Record the raw `manufacturerData` company-id bytes and pattern.

### 4. Record in `lib/config/beacon_signature.dart`

```dart
enum BeaconKind { ibeacon, eddystone, raw }

class BeaconSignature {
  final BeaconKind kind;
  final String? uuid;
  final int? major;
  final int? minor;
  final String? namespace;
  final String? instance;
  final List<int>? vendorAdData;
  final String label;

  const BeaconSignature({
    required this.kind,
    required this.label,
    this.uuid,
    this.major,
    this.minor,
    this.namespace,
    this.instance,
    this.vendorAdData,
  });
}

const kPairedBeaconSignatures = <BeaconSignature>[
  // Example for iBeacon:
  BeaconSignature(
    kind: BeaconKind.ibeacon,
    label: 'BabyGuard tag #1',
    uuid: 'fda50693-a4e2-4fb1-afcf-c6eb07647825',
    major: 1,
    minor: 1,
  ),
];
```

Replace the example with the real values captured from the tag.

### 5. Document in `docs/beacon-fingerprint.md`

Record: tag model, date captured, raw advertisement bytes, identified format, decoded fields, and which Flutter library will be used to scan for it (flutter_beacon for iBeacon, flutter_blue_plus for everything else).

## Risks

- If multiple identical tags are present, `major`/`minor` distinguish them — write down which physical tag corresponds to which `(major, minor)` pair.
- Some Nordic dev kits ship in a "configurable" mode and require a vendor app to enable iBeacon advertising. If the scan dump shows no iBeacon frames, check the tag's manual for an "iBeacon mode" toggle.
- Eddystone-only tags will work foreground on both platforms but **cannot** be tracked in iOS background — note this in the fingerprint doc so §07 plans accordingly.
