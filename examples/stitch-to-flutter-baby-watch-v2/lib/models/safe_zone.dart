import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';
import 'lat_lng.dart';

part 'safe_zone.freezed.dart';
part 'safe_zone.g.dart';

@freezed
sealed class SafeZone with _$SafeZone {
  const factory SafeZone({
    required String id,
    required String name,
    required SafeZoneIcon iconKey,
    required String address,
    required LatLng center,
    required double radiusMeters,
    required String radiusLabel,
    required bool isActive,
  }) = _SafeZone;

  factory SafeZone.fromJson(Map<String, dynamic> json) =>
      _$SafeZoneFromJson(json);
}
