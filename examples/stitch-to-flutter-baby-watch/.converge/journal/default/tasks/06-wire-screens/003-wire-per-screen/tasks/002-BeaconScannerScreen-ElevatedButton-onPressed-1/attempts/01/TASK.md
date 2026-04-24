# Task: 06-wire-screens/003-wire-per-screen/002-BeaconScannerScreen-ElevatedButton-onPressed-1

Wire the **ElevatedButton** `onPressed` handler for `BeaconScannerScreen-ElevatedButton-onPressed-1` in `lib/screens/beacon_scanner/beacon_scanner_screen.dart` (marker `// @converge:element BeaconScannerScreen-ElevatedButton-onPressed-1` must stay).

**Current status:** empty
**Required action:** Refresh beacon scan

## Implementation

Wire to the appropriate action based on context:
- Navigation: `context.push('/route')`
- Provider mutation: `ref.read(provider.notifier).method()`
- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`
- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Do not remove or move `// @converge:element BeaconScannerScreen-ElevatedButton-onPressed-1` (added by 002 Analyze Navigations); only edit the handler body
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment