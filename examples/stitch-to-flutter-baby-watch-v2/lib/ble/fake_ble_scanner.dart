import 'dart:async';

import 'beacon_observation.dart';
import 'ble_scanner.dart';

typedef ScriptedFrame = ({Duration after, List<BeaconObservation> observations});

class FakeBleScanner implements BleScanner {
  FakeBleScanner(this._script);

  factory FakeBleScanner.empty() => FakeBleScanner(const []);

  final List<ScriptedFrame> _script;
  final StreamController<List<BeaconObservation>> _controller =
      StreamController<List<BeaconObservation>>.broadcast();
  final List<Timer> _timers = <Timer>[];
  bool _started = false;

  @override
  Stream<List<BeaconObservation>> observations() => _controller.stream;

  @override
  Future<void> start() async {
    if (_started) return;
    _started = true;
    for (final frame in _script) {
      _timers.add(
        Timer(frame.after, () {
          if (!_controller.isClosed) {
            _controller.add(frame.observations);
          }
        }),
      );
    }
  }

  @override
  Future<void> stop() async {
    for (final timer in _timers) {
      timer.cancel();
    }
    _timers.clear();
    _started = false;
    if (!_controller.isClosed) {
      await _controller.close();
    }
  }
}
