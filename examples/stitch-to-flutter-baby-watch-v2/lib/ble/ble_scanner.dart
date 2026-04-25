import 'beacon_observation.dart';

abstract class BleScanner {
  Stream<List<BeaconObservation>> observations();
  Future<void> start();
  Future<void> stop();
}

class BleScanPermissionDenied implements Exception {
  const BleScanPermissionDenied(this.permission);

  final String permission;

  @override
  String toString() => 'BleScanPermissionDenied: $permission';
}
