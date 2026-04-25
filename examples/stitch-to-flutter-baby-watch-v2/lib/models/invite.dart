import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'invite.freezed.dart';
part 'invite.g.dart';

@freezed
sealed class Invite with _$Invite {
  const factory Invite({
    required String id,
    required String beaconId,
    required String beaconName,
    required String inviterGuardianId,
    required String inviterDisplayName,
    required String inviterRoleLabel,
    required String inviteeEmail,
    required List<String> permissionPoints,
    required InviteStatus status,
    required DateTime createdAt,
    DateTime? respondedAt,
  }) = _Invite;

  factory Invite.fromJson(Map<String, dynamic> json) => _$InviteFromJson(json);
}
