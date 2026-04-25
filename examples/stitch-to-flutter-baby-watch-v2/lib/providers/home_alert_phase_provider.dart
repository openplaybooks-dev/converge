import 'dart:async';
import 'dart:collection';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../ble/beacon_observation.dart';
import '../models/alert_config.dart';
import '../models/enums.dart';
import '../state/home_alert_phase.dart';
import 'alert_config_provider.dart';
import 'ble_scanner_provider.dart';

part 'home_alert_phase_provider.g.dart';

Duration timeoutDurationOf(TimeoutInterval interval) {
  switch (interval) {
    case TimeoutInterval.min2:
      return const Duration(minutes: 2);
    case TimeoutInterval.min5:
      return const Duration(minutes: 5);
    case TimeoutInterval.min10:
      return const Duration(minutes: 10);
  }
}

@Riverpod(keepAlive: true)
class HomeAlertPhaseController extends _$HomeAlertPhaseController {
  static const int _windowSize = 3;

  final Queue<int> _rssiWindow = Queue<int>();
  Timer? _halfTimer;
  Timer? _fullTimer;
  String? _trackedBeaconId;
  bool _safeZoneSuppresses = false;

  @override
  HomeAlertPhase build() {
    ref.listen<AsyncValue<List<BeaconObservation>>>(
      beaconObservationsProvider,
      (previous, next) {
        next.whenData(_onObservations);
      },
    );
    ref.onDispose(() {
      _halfTimer?.cancel();
      _fullTimer?.cancel();
    });
    return HomeAlertPhase.idle;
  }

  AlertConfig? get _config {
    final configs = ref.read(alertConfigsProvider);
    return configs.isEmpty ? null : configs.first;
  }

  void forcePhase(HomeAlertPhase phase) {
    state = phase;
  }

  void setSafeZoneSuppresses(bool value) {
    _safeZoneSuppresses = value;
  }

  void ingestObservation(BeaconObservation obs) {
    _trackedBeaconId ??= obs.id;
    if (obs.id != _trackedBeaconId) return;
    _onObservations([obs]);
  }

  void _onObservations(List<BeaconObservation> all) {
    if (all.isEmpty) return;
    final beaconId = _trackedBeaconId ?? all.first.id;
    _trackedBeaconId = beaconId;
    final match = all.firstWhere(
      (o) => o.id == beaconId,
      orElse: () => all.first,
    );
    _handleObservation(match);
  }

  void _handleObservation(BeaconObservation obs) {
    final config = _config;
    if (config == null) return;

    _rssiWindow.addLast(obs.rssi);
    while (_rssiWindow.length > _windowSize) {
      _rssiWindow.removeFirst();
    }

    final aboveThreshold = obs.rssi >= config.rssiThresholdDbm;
    final weakSignal = _windowSuggestsWeak(config.rssiThresholdDbm);

    switch (state) {
      case HomeAlertPhase.idle:
        if (weakSignal) {
          state = HomeAlertPhase.weak;
        }
        break;
      case HomeAlertPhase.weak:
        if (aboveThreshold) {
          state = HomeAlertPhase.idle;
        }
        break;
      case HomeAlertPhase.lostCountdown:
        if (aboveThreshold) {
          state = HomeAlertPhase.idle;
        }
        break;
      case HomeAlertPhase.alertActive:
        if (aboveThreshold) {
          state = HomeAlertPhase.idle;
          _logReconnect(obs);
        }
        break;
    }

    _restartTimers(config);
  }

  void _restartTimers(AlertConfig config) {
    _halfTimer?.cancel();
    _fullTimer?.cancel();
    final timeout = timeoutDurationOf(config.timeoutInterval);
    final half = Duration(milliseconds: timeout.inMilliseconds ~/ 2);
    _halfTimer = Timer(half, _onHalfTimeout);
    _fullTimer = Timer(timeout, _onFullTimeout);
  }

  void _onHalfTimeout() {
    if (state == HomeAlertPhase.idle || state == HomeAlertPhase.weak) {
      state = HomeAlertPhase.lostCountdown;
    }
  }

  void _onFullTimeout() {
    if (state == HomeAlertPhase.lostCountdown) {
      if (!_safeZoneSuppresses) {
        state = HomeAlertPhase.alertActive;
      }
    }
  }

  int _medianRssi() {
    final sorted = List<int>.from(_rssiWindow)..sort();
    if (sorted.isEmpty) return 0;
    final mid = sorted.length ~/ 2;
    if (sorted.length.isOdd) return sorted[mid];
    return ((sorted[mid - 1] + sorted[mid]) / 2).round();
  }

  void _logReconnect(BeaconObservation obs) {
    // Reconnect logging is wired in §08 once notification plumbing exists.
  }
}
