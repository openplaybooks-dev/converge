import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'guardian.freezed.dart';
part 'guardian.g.dart';

@freezed
sealed class Guardian with _$Guardian {
  const factory Guardian({
    required String id,
    required String displayName,
    required String initials,
    String? avatarUrl,
    required GuardianRole role,
    required GuardianProximity proximity,
    required DateTime lastSeenAt,
    String? email,
    String? phone,
    String? planName,
    required bool isVerified,
  }) = _Guardian;

  factory Guardian.fromJson(Map<String, dynamic> json) =>
      _$GuardianFromJson(json);
}
