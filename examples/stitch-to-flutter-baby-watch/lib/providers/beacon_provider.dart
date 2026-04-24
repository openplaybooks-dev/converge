import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'beacon_provider.g.dart';

@riverpod
Beacon beacon(BeaconRef ref) {
  return mockBeacons.first;
}