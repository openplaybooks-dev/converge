---
id: 003-BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1
title: Wire ElevatedButton.onPressed
checks:
  - id: handler-wired
    description: "ElevatedButton.onPressed has real logic in lib/screens/beacon_scanner/beacon_scanner_screen.dart (@converge:element BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1)"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/beacon_scanner/beacon_scanner_screen.dart --id BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1 onPressed
---

Wire the **ElevatedButton** `onPressed` handler for `BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1` in `lib/screens/beacon_scanner/beacon_scanner_screen.dart` (marker `// @converge:element BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Connect to discovered beacon
**Target:** overlay:pairing

## Implementation

```dart
onPressed: () => context.push('overlay:pairing'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
