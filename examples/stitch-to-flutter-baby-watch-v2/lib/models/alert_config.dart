import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'alert_config.freezed.dart';
part 'alert_config.g.dart';

@freezed
sealed class AlertConfig with _$AlertConfig {
  const factory AlertConfig({
    required String guardianId,
    required TimeoutInterval timeoutInterval,
    required bool audioAlertEnabled,
    required bool vibrationEnabled,
    required MuteDuration muteDuration,
    DateTime? muteUntil,
    required int rssiThresholdDbm,
    required String scanIntervalLabel,
    required int scanIntervalSeconds,
    required bool doNotDisturb,
    required bool notifyOnReconnect,
    required bool notifyOnZoneExit,
    String? quietHoursStart,
    String? quietHoursEnd,
  }) = _AlertConfig;

  factory AlertConfig.fromJson(Map<String, dynamic> json) =>
      _$AlertConfigFromJson(json);
}
