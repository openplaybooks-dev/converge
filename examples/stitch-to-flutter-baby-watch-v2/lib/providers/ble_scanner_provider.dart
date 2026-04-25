import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../ble/beacon_observation.dart';
import '../ble/ble_scanner.dart';
import '../ble/fake_ble_scanner.dart';
import '../ble/real_ble_scanner.dart';

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
