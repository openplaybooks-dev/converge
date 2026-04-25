---
id: 09-safe-zone-check
title: Safe Zone Check — Suppress Alert When Inside an Active Zone
description: When HomeAlertPhase transitions lostCountdown → alertActive, capture one GPS fix via geolocator and compute haversine distance to every active SafeZone. If insideZone, suppress the alert and append an AlertEvent kind=safe with suppressedByZoneId.
blocking: true
dependencies:
  - 08-alerting
tags:
  - safe-zone
  - geolocation
  - alert-suppression
inputs:
  - lib/providers/home_alert_phase_provider.dart
  - lib/providers/safe_zone_provider.dart
  - lib/providers/alert_event_provider.dart
  - lib/models/
outputs:
  - lib/services/safe_zone_evaluator.dart
  - lib/models/alert_event.dart
  - lib/providers/home_alert_phase_provider.dart
  - test/services/safe_zone_evaluator_test.dart
checks:
  - id: evaluator-exists
    cmd: test -f lib/services/safe_zone_evaluator.dart
    description: Safe zone evaluator exists
  - id: model-has-suppression-field
    cmd: "grep -q suppressedByZoneId lib/models/alert_event.dart"
    description: AlertEvent model has suppressedByZoneId field
  - id: evaluator-tests-pass
    cmd: flutter test test/services/safe_zone_evaluator_test.dart
    description: Safe zone evaluator unit tests pass
  - id: dart-analyze
    cmd: dart analyze lib/services/safe_zone_evaluator.dart lib/providers/home_alert_phase_provider.dart
    description: Module passes dart analysis
---

# Safe Zone Check — Alert Suppression

PRD §"Aggregate beacon safety" describes a richer rule (peer presence + safe zone), but multi-user is out of scope here. This task implements the **safe-zone-only** half of that gate.

## When the check runs

Only at the boundary `lostCountdown → alertActive`. We do **not** poll GPS continuously (PRD constraint: "GPS captured on-demand only at disconnect, alert, and safe-zone check"). One fix per alert candidate.

## Sub-steps

### 1. Extend the model

`lib/models/alert_event.dart` — add field:

```dart
@freezed
class AlertEvent with _$AlertEvent {
  const factory AlertEvent({
    required String id,
    required String beaconId,
    required AlertEventKind kind,
    required DateTime occurredAt,
    int? durationSeconds,
    String? suppressedByZoneId,
  }) = _AlertEvent;
}

enum AlertEventKind { alert, reconnect, safe }
```

Regenerate freezed files: `dart run build_runner build --delete-conflicting-outputs`.

### 2. Evaluator service

`lib/services/safe_zone_evaluator.dart`:

```dart
class SafeZoneResult {
  final bool insideZone;
  final String? zoneId;
  const SafeZoneResult({required this.insideZone, this.zoneId});
}

class SafeZoneEvaluator {
  SafeZoneEvaluator(this._zonesProvider, this._geolocator);
  final List<SafeZone> Function() _zonesProvider;
  final Future<Position> Function() _geolocator;

  Future<SafeZoneResult> checkOnLostCountdown() async {
    final zones = _zonesProvider().where((z) => z.isActive).toList();
    if (zones.isEmpty) return const SafeZoneResult(insideZone: false);
    final pos = await _geolocator().timeout(const Duration(seconds: 5));
    for (final z in zones) {
      if (_haversineMeters(pos.latitude, pos.longitude, z.lat, z.lng) <= z.radiusM) {
        return SafeZoneResult(insideZone: true, zoneId: z.id);
      }
    }
    return const SafeZoneResult(insideZone: false);
  }

  static double _haversineMeters(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371000.0;
    final dLat = _rad(lat2 - lat1);
    final dLng = _rad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_rad(lat1)) * cos(_rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    return 2 * r * asin(sqrt(a));
  }

  static double _rad(double deg) => deg * pi / 180.0;
}
```

Inject `_geolocator` so tests can stub it. Production wires `Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high)`.

### 3. Integrate with the notifier

In `HomeAlertPhaseNotifier`, change the `lostCountdown → alertActive` transition:

```dart
final result = await ref.read(safeZoneEvaluatorProvider).checkOnLostCountdown();
if (result.insideZone) {
  ref.read(alertEventsProvider.notifier).append(AlertEvent(
    id: const Uuid().v4(),
    beaconId: _activeBeacon.id,
    kind: AlertEventKind.safe,
    occurredAt: DateTime.now(),
    suppressedByZoneId: result.zoneId,
  ));
  state = HomeAlertPhase.idle;  // bounce back, no alert
} else {
  state = HomeAlertPhase.alertActive;  // proceeds to §08 alert pipeline
}
```

### 4. UI surface

In `lib/screens/history/history_screen.dart`, render the `kind == safe` events with the mint tint per PRD ("safe events render with mint tint"); show `suppressedByZoneId` resolved to a zone name below the row.

### 5. Tests

`test/services/safe_zone_evaluator_test.dart`:

```dart
test('returns insideZone=true when within radius', () async {
  final evaluator = SafeZoneEvaluator(
    () => [SafeZone(id: 'z1', name: 'Home', lat: 10.0, lng: 106.0, radiusM: 100, isActive: true)],
    () async => Position(latitude: 10.0001, longitude: 106.0001, /* ~15m offset */),
  );
  final result = await evaluator.checkOnLostCountdown();
  expect(result.insideZone, isTrue);
  expect(result.zoneId, 'z1');
});

test('returns insideZone=false when outside all zones', () async { /* ... */ });
test('returns insideZone=false when no active zones', () async { /* ... */ });
test('returns insideZone=false when geolocator times out', () async { /* ... */ });
```

## Risks

- `Geolocator.getCurrentPosition` can take 10+ seconds outdoors with weak GPS. The 5-second timeout above means: if GPS doesn't return in time, we **proceed with the alert** (fail-open for safety). Document this trade-off in `docs/safe-zone-evaluation.md`.
- Inactive zones (`isActive == false`) are excluded — settings UI in §06 must let the user toggle this.
- For dense urban environments (multipath GPS error 20-50m), a 100m radius is the recommended minimum. Surface this in onboarding when the user creates their first zone.
