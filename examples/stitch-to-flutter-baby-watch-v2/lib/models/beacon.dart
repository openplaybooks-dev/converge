import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'beacon.freezed.dart';
part 'beacon.g.dart';

@freezed
sealed class Beacon with _$Beacon {
  const factory Beacon({
    required String id,
    required String name,
    required BeaconSubjectKind subjectKind,
    required int battery,
    required SignalStrength signalStrength,
    int? rssi,
    required DateTime lastSeenAt,
    String? lastKnownPlace,
    required String uuid,
    required int major,
    required int minor,
    required bool isPaired,
    required bool isGroupSynced,
    required String ownerGuardianId,
    required List<String> assignedGuardianIds,
    String? safeZoneId,
  }) = _Beacon;

  factory Beacon.fromJson(Map<String, dynamic> json) => _$BeaconFromJson(json);
}
