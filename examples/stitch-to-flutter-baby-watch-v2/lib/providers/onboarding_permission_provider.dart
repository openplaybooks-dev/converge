import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'onboarding_permission_provider.g.dart';

@riverpod
class OnboardingPermissions extends _$OnboardingPermissions {
  @override
  List<OnboardingPermission> build() =>
      List<OnboardingPermission>.unmodifiable(mockOnboardingPermissions);
}
