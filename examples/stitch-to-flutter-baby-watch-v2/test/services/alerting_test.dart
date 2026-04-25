import 'package:baby_watch/services/alert_player.dart';
import 'package:baby_watch/services/local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeAlertPlayer implements AlertPlayer {
  int startCalls = 0;
  int stopCalls = 0;

  @override
  Future<void> start() async {
    startCalls++;
  }

  @override
  Future<void> stop() async {
    stopCalls++;
  }
}

class _FakeLocalNotifications implements LocalNotifications {
  int initCalls = 0;
  int cancelCalls = 0;
  final List<String> firedFor = [];

  @override
  Future<void> initialize() async {
    initCalls++;
  }

  @override
  Future<void> fire({required String beaconName}) async {
    firedFor.add(beaconName);
  }

  @override
  Future<void> cancel() async {
    cancelCalls++;
  }
}

/// Mirrors the wiring in HomeAlertPhaseNotifier: on entry to alertActive,
/// start the player and fire a notification; on exit, stop and cancel.
Future<void> _onPhaseChanged({
  required String previous,
  required String next,
  required AlertPlayer player,
  required LocalNotifications notifications,
  required String beaconName,
}) async {
  if (next == 'alertActive') {
    await player.start();
    await notifications.fire(beaconName: beaconName);
  } else if (previous == 'alertActive') {
    await player.stop();
    await notifications.cancel();
  }
}

void main() {
  group('alerting wiring', () {
    test('entering alertActive starts player and fires notification', () async {
      final player = _FakeAlertPlayer();
      final notifications = _FakeLocalNotifications();

      await _onPhaseChanged(
        previous: 'monitoring',
        next: 'alertActive',
        player: player,
        notifications: notifications,
        beaconName: 'Bé Na',
      );

      expect(player.startCalls, 1);
      expect(player.stopCalls, 0);
      expect(notifications.firedFor, ['Bé Na']);
      expect(notifications.cancelCalls, 0);
    });

    test('leaving alertActive stops player and cancels notification', () async {
      final player = _FakeAlertPlayer();
      final notifications = _FakeLocalNotifications();

      await _onPhaseChanged(
        previous: 'alertActive',
        next: 'monitoring',
        player: player,
        notifications: notifications,
        beaconName: 'Bé Na',
      );

      expect(player.stopCalls, 1);
      expect(player.startCalls, 0);
      expect(notifications.cancelCalls, 1);
      expect(notifications.firedFor, isEmpty);
    });

    test('non-alert transitions do nothing', () async {
      final player = _FakeAlertPlayer();
      final notifications = _FakeLocalNotifications();

      await _onPhaseChanged(
        previous: 'safe',
        next: 'monitoring',
        player: player,
        notifications: notifications,
        beaconName: 'Bé Na',
      );

      expect(player.startCalls, 0);
      expect(player.stopCalls, 0);
      expect(notifications.firedFor, isEmpty);
      expect(notifications.cancelCalls, 0);
    });
  });
}
