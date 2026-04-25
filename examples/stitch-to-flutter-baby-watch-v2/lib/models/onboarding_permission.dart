import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'onboarding_permission.freezed.dart';
part 'onboarding_permission.g.dart';

@freezed
sealed class OnboardingPermission with _$OnboardingPermission {
  const factory OnboardingPermission({
    required PermissionKey key,
    @JsonKey(includeFromJson: false, includeToJson: false) IconData? icon,
    required String title,
    required String body,
    String? footnote,
    required bool granted,
  }) = _OnboardingPermission;

  factory OnboardingPermission.fromJson(Map<String, dynamic> json) =>
      _$OnboardingPermissionFromJson(json);
}
