import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'pregnancy_profile.freezed.dart';
part 'pregnancy_profile.g.dart';

@freezed
abstract class PregnancyProfile with _$PregnancyProfile {
  const factory PregnancyProfile({
    required DateTime dueDate,
    required DateTime lastMenstrualPeriod,
    required int currentWeek,
    required int currentTrimester,
    required String userName,
    required double height,
    required WeightUnit units,
    required String avatarInitial,
  }) = _PregnancyProfile;

  factory PregnancyProfile.fromJson(Map<String, dynamic> json) =>
      _$PregnancyProfileFromJson(json);
}
