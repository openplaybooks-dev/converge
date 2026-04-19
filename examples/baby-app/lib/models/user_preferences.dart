import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'user_preferences.freezed.dart';
part 'user_preferences.g.dart';

@freezed
abstract class UserPreferences with _$UserPreferences {
  const factory UserPreferences({
    required bool dailyRemindersEnabled,
    required bool checkupAlertsEnabled,
    required bool selfCareNudgesEnabled,
    required bool reducedMotionEnabled,
    required WeightUnit units,
  }) = _UserPreferences;

  factory UserPreferences.fromJson(Map<String, dynamic> json) =>
      _$UserPreferencesFromJson(json);
}
