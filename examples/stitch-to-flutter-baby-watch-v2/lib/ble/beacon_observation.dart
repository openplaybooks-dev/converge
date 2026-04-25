import 'package:freezed_annotation/freezed_annotation.dart';

part 'beacon_observation.freezed.dart';

@freezed
sealed class BeaconObservation with _$BeaconObservation {
  const factory BeaconObservation({
    required String id,
    required int rssi,
    required double distanceMeters,
    required DateTime lastSeen,
  }) = _BeaconObservation;
}
