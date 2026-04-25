import 'package:baby_watch/ble/beacon_observation.dart';
import 'package:baby_watch/ble/fake_ble_scanner.dart';
import 'package:baby_watch/models/alert_config.dart';
import 'package:baby_watch/models/enums.dart';
import 'package:baby_watch/providers/alert_config_provider.dart';
import 'package:baby_watch/providers/ble_scanner_provider.dart';
import 'package:baby_watch/providers/home_alert_phase_provider.dart';
import 'package:baby_watch/state/home_alert_phase.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _testConfig = AlertConfig(
  guardianId: 'g',
  timeoutInterval: TimeoutInterval.min2,
  audioAlertEnabled: true,
  vibrationEnabled: true,
  muteDuration: MuteDuration.min5,
  rssiThresholdDbm: -62,
  scanIntervalLabel: '15s',
  scanIntervalSeconds: 15,
  doNotDisturb: false,
  notifyOnReconnect: true,
  notifyOnZoneExit: false,
);

class _FixedAlertConfigs extends AlertConfigs {
  @override
  List<AlertConfig> build() => const [_testConfig];
}

BeaconObservation _obs(int rssi, DateTime t) =>
    BeaconObservation(id: 'b1', rssi: rssi, distanceMeters: 1.0, lastSeen: t);

void main() {
  test('phases follow scripted observation timeline', () {
    fakeAsync((async) {
      final container = ProviderContainer(overrides: [
        alertConfigsProvider.overrideWith(_FixedAlertConfigs.new),
        bleScannerProvider.overrideWith((ref) => FakeBleScanner.empty()),
      ]);
      addTearDown(container.dispose);

      final controller =
          container.read(homeAlertPhaseControllerProvider.notifier);

      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.idle);

      final t0 = DateTime(2026, 1, 1);
      controller.ingestObservation(_obs(-50, t0));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.idle);

      async.elapse(const Duration(seconds: 2));
      controller.ingestObservation(
          _obs(-50, t0.add(const Duration(seconds: 2))));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.idle);

      async.elapse(const Duration(seconds: 2));
      controller.ingestObservation(
          _obs(-80, t0.add(const Duration(seconds: 4))));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.weak);

      async.elapse(const Duration(seconds: 60));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.lostCountdown);

      async.elapse(const Duration(seconds: 60));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.alertActive);

      async.elapse(const Duration(seconds: 1));
      controller.ingestObservation(
          _obs(-50, t0.add(const Duration(seconds: 125))));
      expect(container.read(homeAlertPhaseControllerProvider),
          HomeAlertPhase.idle);
    });
  });

  test('forcePhase overrides derived state for deep-link resume', () {
    final container = ProviderContainer(overrides: [
      alertConfigsProvider.overrideWith(_FixedAlertConfigs.new),
      bleScannerProvider.overrideWith((ref) => FakeBleScanner.empty()),
    ]);
    addTearDown(container.dispose);

    final controller =
        container.read(homeAlertPhaseControllerProvider.notifier);
    controller.forcePhase(HomeAlertPhase.alertActive);
    expect(container.read(homeAlertPhaseControllerProvider),
        HomeAlertPhase.alertActive);
  });
}
