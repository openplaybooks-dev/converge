import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'beacon_provider.g.dart';

@riverpod
class Beacons extends _$Beacons {
  @override
  List<Beacon> build() => List<Beacon>.unmodifiable(mockBeacons);
}
