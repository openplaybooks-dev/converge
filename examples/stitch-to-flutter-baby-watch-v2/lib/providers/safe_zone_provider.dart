import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'safe_zone_provider.g.dart';

@riverpod
class SafeZones extends _$SafeZones {
  @override
  List<SafeZone> build() => List<SafeZone>.unmodifiable(mockSafeZones);
}
