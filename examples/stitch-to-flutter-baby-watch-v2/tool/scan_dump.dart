import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FlutterBluePlus.adapterState.where((s) => s == BluetoothAdapterState.on).first;

  print('Starting 30s scan — bring the tag close to the phone now.');
  final seen = <String, ScanResult>{};
  final sub = FlutterBluePlus.scanResults.listen((results) {
    for (final r in results) {
      final id = r.device.remoteId.str;
      if (!seen.containsKey(id) || r.rssi > seen[id]!.rssi) {
        seen[id] = r;
      }
    }
  });

  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 30));
  await Future.delayed(const Duration(seconds: 31));
  await sub.cancel();

  final sorted = seen.values.toList()..sort((a, b) => b.rssi.compareTo(a.rssi));
  for (final r in sorted.take(10)) {
    print('---');
    print('id=${r.device.remoteId.str} rssi=${r.rssi}');
    print('name=${r.device.platformName.isEmpty ? "(none)" : r.device.platformName}');
    print('serviceUuids=${r.advertisementData.serviceUuids}');
    print('manufacturerData=${r.advertisementData.manufacturerData}');
    print('serviceData=${r.advertisementData.serviceData}');
  }
}
