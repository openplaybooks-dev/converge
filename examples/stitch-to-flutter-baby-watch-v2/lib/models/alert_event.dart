import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'alert_event.freezed.dart';
part 'alert_event.g.dart';

@freezed
sealed class AlertEvent with _$AlertEvent {
  const factory AlertEvent({
    required String id,
    required String beaconId,
    required String childName,
    required HistoryEventKind kind,
    required String title,
    required String eventLabel,
    required String badgeLabel,
    @JsonKey(includeFromJson: false, includeToJson: false) IconData? badgeIcon,
    required String statusLabel,
    required DateTime occurredAt,
    required String timeLabel,
    int? durationSeconds,
    String? safeZoneId,
    String? suppressedByZoneId,
    required bool acknowledged,
  }) = _AlertEvent;

  factory AlertEvent.fromJson(Map<String, dynamic> json) =>
      _$AlertEventFromJson(json);
}
