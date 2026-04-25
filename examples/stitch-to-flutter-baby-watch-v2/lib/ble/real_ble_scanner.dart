import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_beacon/flutter_beacon.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import 'beacon_observation.dart';
import 'ble_scanner.dart';

class IBeaconSignature {
  const IBeaconSignature({
    required this.uuid,
    required this.major,
    required this.minor,
  });

  final String uuid;
  final int major;
  final int minor;

  String get id => '$uuid:$major:$minor';
}

class RealBleScanner implements BleScanner {
  RealBleScanner({
    List<IBeaconSignature> iBeaconSignatures = const [],
    List<String> serviceUuids = const ['0000feaa-0000-1000-8000-00805f9b34fb'],
    double pathLossExponent = 2.0,
    int defaultTxPower = -59,
  })  : _iBeaconSignatures = iBeaconSignatures,
        _serviceUuids = serviceUuids,
        _pathLossExponent = pathLossExponent,
        _defaultTxPower = defaultTxPower;

  final List<IBeaconSignature> _iBeaconSignatures;
  final List<String> _serviceUuids;
  final double _pathLossExponent;
  final int _defaultTxPower;

  final StreamController<List<BeaconObservation>> _controller =
      StreamController<List<BeaconObservation>>.broadcast();
  StreamSubscription<RangingResult>? _rangingSub;
  StreamSubscription<List<ScanResult>>? _scanSub;
  bool _started = false;

  @override
  Stream<List<BeaconObservation>> observations() => _controller.stream;

  @override
  Future<void> start() async {
    if (_started) return;
    await _ensurePermissions();
    await flutterBeacon.initializeScanning;

    if (_iBeaconSignatures.isNotEmpty) {
      final regions = _iBeaconSignatures
          .map(
            (s) => Region(
              identifier: s.id,
              proximityUUID: s.uuid,
              major: s.major,
              minor: s.minor,
            ),
          )
          .toList();
      _rangingSub = flutterBeacon.ranging(regions).listen(_onRanging);
    }

    _scanSub = FlutterBluePlus.scanResults.listen(_onScanResults);
    await FlutterBluePlus.startScan(
      withServices: _serviceUuids.map(Guid.new).toList(),
    );

    _started = true;
  }

  @override
  Future<void> stop() async {
    _started = false;
    await _rangingSub?.cancel();
    _rangingSub = null;
    await _scanSub?.cancel();
    _scanSub = null;
    try {
      await FlutterBluePlus.stopScan();
    } catch (_) {
      // ignore — adapter may already be off
    }
    if (!_controller.isClosed) {
      await _controller.close();
    }
  }

  Future<void> _ensurePermissions() async {
    const required = <Permission>[
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ];
    for (final p in required) {
      final status = await p.request();
      if (!status.isGranted) {
        throw BleScanPermissionDenied(p.toString());
      }
    }
  }

  void _onRanging(RangingResult result) {
    final now = DateTime.now();
    final observations = result.beacons.map((b) {
      final txPower = b.txPower ?? _defaultTxPower;
      return BeaconObservation(
        id: '${b.proximityUUID}:${b.major}:${b.minor}',
        rssi: b.rssi,
        distanceMeters: _estimateDistance(b.rssi, txPower),
        lastSeen: now,
      );
    }).toList();
    if (observations.isNotEmpty && !_controller.isClosed) {
      _controller.add(observations);
    }
  }

  void _onScanResults(List<ScanResult> results) {
    final now = DateTime.now();
    final observations = results.map((r) {
      return BeaconObservation(
        id: 'mac:${r.device.remoteId.str}',
        rssi: r.rssi,
        distanceMeters: _estimateDistance(r.rssi, _defaultTxPower),
        lastSeen: now,
      );
    }).toList();
    if (observations.isNotEmpty && !_controller.isClosed) {
      _controller.add(observations);
    }
  }

  double _estimateDistance(int rssi, int txPower) {
    if (rssi == 0) return -1;
    return math.pow(10, (txPower - rssi) / (10 * _pathLossExponent)).toDouble();
  }
}
