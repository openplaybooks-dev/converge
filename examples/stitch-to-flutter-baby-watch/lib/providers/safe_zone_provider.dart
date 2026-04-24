import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'safe_zone_provider.g.dart';

@riverpod
SafeZone safeZone(SafeZoneRef ref) {
  return mockSafeZones.first;
}