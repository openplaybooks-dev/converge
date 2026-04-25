import 'package:baby_watch/ble/beacon_observation.dart';
import 'package:baby_watch/ble/fake_ble_scanner.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FakeBleScanner', () {
    test('emits scripted observations in order with the right delays', () {
      fakeAsync((async) {
        final t0 = DateTime(2026, 1, 1);
        final frame1 = [
          BeaconObservation(id: 'a', rssi: -60, distanceMeters: 1.0, lastSeen: t0),
        ];
        final frame2 = [
          BeaconObservation(id: 'a', rssi: -55, distanceMeters: 0.6, lastSeen: t0),
          BeaconObservation(id: 'b', rssi: -70, distanceMeters: 2.5, lastSeen: t0),
        ];

        final scanner = FakeBleScanner([
          (after: const Duration(seconds: 1), observations: frame1),
          (after: const Duration(seconds: 3), observations: frame2),
        ]);

        final emitted = <List<BeaconObservation>>[];
        scanner.observations().listen(emitted.add);
        scanner.start();

        async.elapse(const Duration(milliseconds: 500));
        expect(emitted, isEmpty);

        async.elapse(const Duration(milliseconds: 600));
        expect(emitted, hasLength(1));
        expect(emitted.first, frame1);

        async.elapse(const Duration(seconds: 2));
        expect(emitted, hasLength(2));
        expect(emitted.last, frame2);
      });
    });

    test('stop cancels pending scripted frames', () {
      fakeAsync((async) {
        final t0 = DateTime(2026, 1, 1);
        final frame = [
          BeaconObservation(id: 'a', rssi: -60, distanceMeters: 1.0, lastSeen: t0),
        ];
        final scanner = FakeBleScanner([
          (after: const Duration(seconds: 5), observations: frame),
        ]);

        final emitted = <List<BeaconObservation>>[];
        scanner.observations().listen(emitted.add);
        scanner.start();

        async.elapse(const Duration(seconds: 1));
        scanner.stop();
        async.elapse(const Duration(seconds: 10));

        expect(emitted, isEmpty);
      });
    });
  });
}
